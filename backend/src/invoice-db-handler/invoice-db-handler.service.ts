import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { InvoiceStatus, invoiceStatuses, ValidInvoice } from '../invoice/types';
import { Invoice } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { randomBytes } from 'crypto';

@Injectable()
export class InvoiceDbHandlerService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    invoice: Pick<ValidInvoice, 'amount' | 'description'>,
    retries = 3,
  ): Promise<ValidInvoice> {
    try {
      const reference = randomBytes(8).toString('hex');
      const record = await this.prismaService.invoice.create({
        data: { ...invoice, reference },
      });

      const records = [record];
      if (!validateInvoices(records)) {
        throw new InternalServerErrorException(
          'Invalid record status was generated',
        );
      }

      return records[0];
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2002' // Unique constraint violation - assumedly on reference
      ) {
        if (retries > 0) {
          return await this.create(invoice, retries - 1);
        } else {
          // No more retries
          throw new InternalServerErrorException(
            'Unique reference could not be generated',
          );
        }
      } else {
        throw err;
      }
    }
  }
  async getOneByReference(reference: string) {
    console.log('reference', reference);
    const invoice = await this.prismaService.invoice.findUniqueOrThrow({
      where: { reference },
    });

    const invoices = [invoice];
    // Type guard & coercion
    if (!validateInvoices(invoices)) {
      throw new Error('Invalid invoice');
    }
    return invoices[0];
  }
  async list(status?: InvoiceStatus) {
    const invoices = await this.prismaService.invoice.findMany({
      where: status ? { status } : undefined,
    });

    // Type guard & coercion
    if (!validateInvoices(invoices)) {
      throw new Error('Invalid invoices');
    }

    return invoices;
  }
  async update(
    id: string,
    updates: Partial<
      Pick<ValidInvoice, 'status' | 'paidAt' | 'payerWallet' | 'signature'>
    >,
  ) {
    await this.prismaService.invoice.update({
      where: { id },
      data: updates,
    });
  }
}

// Helper methods
function validateInvoices(invoices: Invoice[]): invoices is ValidInvoice[] {
  return invoices.every((invoice) =>
    invoiceStatuses.includes(invoice.status as any),
  );
}
