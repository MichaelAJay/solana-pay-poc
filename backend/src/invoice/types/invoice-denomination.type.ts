export const invoiceDenominations = ['SOL', 'SPL'] as const;
export type InvoiceDenomination = (typeof invoiceDenominations)[number];
