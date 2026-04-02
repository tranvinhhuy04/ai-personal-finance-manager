import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import { InvoiceModel, IInvoice } from '../models/invoice.model';
import { transactionService } from './transaction.service';
import { outboxPublisher } from '../messaging/outbox.publisher';

export type CreateInvoiceInput = {
  user_id: string;
  image_url: string;
  extracted_data?: Record<string, unknown>;
};

export type UpdateInvoiceInput = {
  image_url?: string;
  extracted_data?: Record<string, unknown>;
  status?: 'PENDING' | 'PROCESSED' | 'REJECTED';
};

export type ConfirmInvoiceInput = {
  wallet_id: string;
  category_id: string;
  amount: string;
  transaction_type?: 'INCOME' | 'EXPENSE';
  currency?: string;
  description?: string;
  occurred_at?: string;
  extracted_data?: Record<string, unknown>;
};

function ensureObjectId(value: string, fieldName: string): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(`${fieldName} is invalid`, 400);
  }
  return new mongoose.Types.ObjectId(value);
}

function snapshotInvoice(invoice: IInvoice | any) {
  return {
    image_url: invoice.image_url,
    extracted_data: invoice.extracted_data ?? {},
    status: invoice.status,
    transaction_id: invoice.transaction_id ? invoice.transaction_id.toString() : null,
    deleted_at: invoice.deleted_at,
    updatedAt: invoice.updatedAt,
  };
}

class InvoiceService {
  async uploadInvoice(input: CreateInvoiceInput, changedBy: string) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const userId = ensureObjectId(input.user_id, 'user_id');
      const extractedData = input.extracted_data ?? {};

      const [invoice] = await InvoiceModel.create(
        [
          {
            user_id: userId,
            image_url: input.image_url,
            extracted_data: extractedData,
            status: 'PENDING',
            transaction_id: null,
            deleted_at: null,
            audit_trail: [
              {
                action: 'CREATED',
                changed_by: changedBy,
                timestamp: new Date(),
                previous_state: {},
                next_state: {
                  image_url: input.image_url,
                  extracted_data: extractedData,
                  status: 'PENDING',
                },
              },
            ],
          },
        ],
        { session }
      );

      await session.commitTransaction();
      return this.toResponse(invoice);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async listInvoices(userId: string) {
    const userObjectId = ensureObjectId(userId, 'user_id');

    const invoices = await InvoiceModel.find({
      user_id: userObjectId,
      deleted_at: null,
    })
      .sort({ createdAt: -1 })
      .lean();

    return invoices.map((invoice) => this.toResponse(invoice));
  }

  async updateInvoice(invoiceId: string, userId: string, payload: UpdateInvoiceInput, changedBy: string) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const invoiceObjectId = ensureObjectId(invoiceId, 'invoice_id');
      const userObjectId = ensureObjectId(userId, 'user_id');

      const invoice = await InvoiceModel.findOne({
        _id: invoiceObjectId,
        user_id: userObjectId,
      }).session(session);

      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      if (invoice.deleted_at || invoice.status === 'DELETED') {
        throw new AppError('Invoice has been soft-deleted', 410);
      }

      if (invoice.status === 'PROCESSED' && invoice.transaction_id) {
        throw new AppError('Processed invoice is locked. Create a reversal transaction instead of editing it.', 409);
      }

      const previousState = snapshotInvoice(invoice);

      if (payload.image_url !== undefined) {
        const imageUrl = String(payload.image_url).trim();
        if (!imageUrl) {
          throw new AppError('image_url cannot be empty', 400);
        }
        invoice.image_url = imageUrl;
      }

      if (payload.extracted_data !== undefined) {
        invoice.extracted_data = payload.extracted_data;
      }

      if (payload.status !== undefined) {
        if (payload.status === 'PROCESSED') {
          throw new AppError('Use the confirm endpoint to mark an invoice as PROCESSED', 400);
        }
        invoice.status = payload.status;
      }

      invoice.audit_trail.push({
        action: 'UPDATED',
        changed_by: changedBy,
        timestamp: new Date(),
        previous_state: previousState,
        next_state: snapshotInvoice(invoice),
      });

      await invoice.save({ session });
      await session.commitTransaction();

      return this.toResponse(invoice);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async softDeleteInvoice(invoiceId: string, userId: string, changedBy: string) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const invoiceObjectId = ensureObjectId(invoiceId, 'invoice_id');
      const userObjectId = ensureObjectId(userId, 'user_id');

      const invoice = await InvoiceModel.findOne({
        _id: invoiceObjectId,
        user_id: userObjectId,
      }).session(session);

      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      if (invoice.deleted_at || invoice.status === 'DELETED') {
        throw new AppError('Invoice is already deleted', 409);
      }

      const previousState = snapshotInvoice(invoice);
      invoice.status = 'DELETED';
      invoice.deleted_at = new Date();
      invoice.audit_trail.push({
        action: 'SOFT_DELETED',
        changed_by: changedBy,
        timestamp: new Date(),
        previous_state: previousState,
        next_state: snapshotInvoice(invoice),
      });

      await invoice.save({ session });
      await session.commitTransaction();

      return this.toResponse(invoice);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async confirmInvoice(invoiceId: string, userId: string, payload: ConfirmInvoiceInput, changedBy: string) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const invoiceObjectId = ensureObjectId(invoiceId, 'invoice_id');
      const userObjectId = ensureObjectId(userId, 'user_id');

      const invoice = await InvoiceModel.findOne({
        _id: invoiceObjectId,
        user_id: userObjectId,
      }).session(session);

      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      if (invoice.deleted_at || invoice.status === 'DELETED') {
        throw new AppError('Cannot confirm a deleted invoice', 410);
      }

      if (invoice.status === 'PROCESSED' || invoice.transaction_id) {
        throw new AppError('Invoice has already been confirmed into an immutable transaction', 409);
      }

      if (!payload.wallet_id) throw new AppError('wallet_id is required', 400);
      if (!payload.category_id) throw new AppError('category_id is required', 400);
      if (!payload.amount) throw new AppError('amount is required', 400);

      const previousState = snapshotInvoice(invoice);

      if (payload.extracted_data !== undefined) {
        invoice.extracted_data = {
          ...(invoice.extracted_data ?? {}),
          ...payload.extracted_data,
        };
      }

      const transaction = await transactionService.createTransaction({
        user_id: userId,
        wallet_id: payload.wallet_id,
        category_id: payload.category_id,
        amount: payload.amount,
        transaction_type: payload.transaction_type ?? 'EXPENSE',
        currency: payload.currency ?? 'VND',
        description: payload.description ?? 'Confirmed from invoice review',
        occurred_at: payload.occurred_at,
        source: 'INVOICE_CONFIRMATION',
        session,
      });

      invoice.status = 'PROCESSED';
      invoice.transaction_id = ensureObjectId(transaction.id, 'transaction_id');
      invoice.audit_trail.push({
        action: 'CONFIRMED_AS_TRANSACTION',
        changed_by: changedBy,
        timestamp: new Date(),
        previous_state: previousState,
        next_state: snapshotInvoice(invoice),
        note: 'Immutable transaction created from invoice confirmation',
      });

      await invoice.save({ session });
      await session.commitTransaction();

      outboxPublisher.publishPending().catch((error) => {
        console.error('[invoice-service] outbox publishPending failed after confirm', error);
      });

      return {
        invoice: this.toResponse(invoice),
        transaction,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  private toResponse(invoice: IInvoice | any) {
    return {
      id: invoice._id.toString(),
      user_id: invoice.user_id?.toString?.() ?? String(invoice.user_id ?? ''),
      image_url: invoice.image_url,
      extracted_data: invoice.extracted_data ?? {},
      status: invoice.status,
      transaction_id: invoice.transaction_id ? invoice.transaction_id.toString() : null,
      audit_trail: (invoice.audit_trail ?? []).map((entry: any) => ({
        action: entry.action,
        changed_by: entry.changed_by,
        timestamp: entry.timestamp,
        previous_state: entry.previous_state ?? {},
        next_state: entry.next_state ?? undefined,
        note: entry.note ?? null,
      })),
      deleted_at: invoice.deleted_at ?? null,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }
}

export const invoiceService = new InvoiceService();
