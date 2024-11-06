import { Invoice } from '@prisma/client';
import { InvoiceStatus } from './invoice-status.type';
import { InvoiceDenomination } from './invoice-denomination.type';

export type ValidInvoice = {
  [P in keyof Invoice]: P extends 'status'
    ? InvoiceStatus
    : P extends 'denomination'
      ? InvoiceDenomination
      : Invoice[P];
};

export type CreateInvoicePayload = Pick<
  ValidInvoice,
  'amount' | 'description' | 'denomination'
>;

export interface ICreateInvoicePayload extends CreateInvoicePayload {}
