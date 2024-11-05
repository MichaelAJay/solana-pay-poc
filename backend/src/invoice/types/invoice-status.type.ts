export const invoiceStatuses = ['PENDING', 'PAID', 'EXPIRED'] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];
