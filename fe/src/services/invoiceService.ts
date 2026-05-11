import { apiClient } from '@/lib/apiClient';
import type { Invoice, Transaction, UpdateInvoiceInput, ConfirmInvoiceInput, AIOcrResponse } from '@/types/finance';

export function getInvoices(): Promise<Invoice[]> {
  return apiClient.getInvoices();
}

export function updateInvoice(invoiceId: string, data: UpdateInvoiceInput): Promise<Invoice> {
  return apiClient.updateInvoice(invoiceId, data);
}

export function confirmInvoice(invoiceId: string, data: ConfirmInvoiceInput): Promise<{ invoice: Invoice; transaction: Transaction }> {
  return apiClient.confirmInvoice(invoiceId, data);
}

export function deleteInvoice(invoiceId: string): Promise<Invoice> {
  return apiClient.deleteInvoice(invoiceId);
}

export function ocrInvoice(file: File): Promise<AIOcrResponse> {
  return apiClient.ocrInvoice(file);
}
