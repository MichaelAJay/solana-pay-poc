import { Invoice } from '@prisma/client';
import { InvoiceStatus } from './invoice-status.type';

export type ValidInvoice = {
  [P in keyof Invoice]: P extends 'status' ? InvoiceStatus : Invoice[P];
};

export type CreateInvoicePayload = Pick<Invoice, 'amount' | 'description'>;

export interface ICreateInvoicePayload extends CreateInvoicePayload {}
