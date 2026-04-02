import mongoose, { Schema } from 'mongoose';

export type InvoiceStatus = 'PENDING' | 'PROCESSED' | 'REJECTED' | 'DELETED';
export type InvoiceAuditAction =
  | 'CREATED'
  | 'UPDATED'
  | 'SOFT_DELETED'
  | 'CONFIRMED_AS_TRANSACTION';

export interface IInvoiceAuditEntry {
  action: InvoiceAuditAction | string;
  changed_by: string;
  timestamp: Date;
  previous_state: Record<string, unknown>;
  next_state?: Record<string, unknown>;
  note?: string | null;
}

export interface IInvoice {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  image_url: string;
  extracted_data: Record<string, unknown>;
  status: InvoiceStatus;
  transaction_id: mongoose.Types.ObjectId | null;
  audit_trail: IInvoiceAuditEntry[];
  deleted_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const auditTrailSchema = new Schema<IInvoiceAuditEntry>(
  {
    action: { type: String, required: true },
    changed_by: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    previous_state: { type: Schema.Types.Mixed, default: {} },
    next_state: { type: Schema.Types.Mixed, default: undefined },
    note: { type: String, default: null },
  },
  {
    _id: false,
    versionKey: false,
  }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    image_url: {
      type: String,
      required: true,
      trim: true,
    },
    extracted_data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSED', 'REJECTED', 'DELETED'],
      default: 'PENDING',
      index: true,
    },
    transaction_id: {
      type: Schema.Types.ObjectId,
      ref: 'transactions',
      default: null,
    },
    audit_trail: {
      type: [auditTrailSchema],
      default: [],
    },
    deleted_at: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

invoiceSchema.index({ user_id: 1, deleted_at: 1, createdAt: -1 });
invoiceSchema.index({ transaction_id: 1 });

export const InvoiceModel = mongoose.model<IInvoice>('invoices', invoiceSchema);
