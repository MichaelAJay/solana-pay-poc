import { Injectable } from '@nestjs/common';
import { InvoiceDbHandlerService } from '../invoice-db-handler/invoice-db-handler.service';
import { CreateInvoicePayload, InvoiceStatus } from './types';
import BigNumber from 'bignumber.js';
import { encodeURL, TransferRequestURLFields } from '@solana/pay';
import { PublicKey } from '@solana/web3.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InvoiceService {
  private acceptanceAccountPublicKey: PublicKey;
  private mintAccountPublicKey: PublicKey; // public key of an SPL Token mint account (e.g. USDC, USDT)
  // !! NOTE !! - See https://docs.solanapay.com/spec#recipient

  constructor(
    private readonly invoiceDbHandler: InvoiceDbHandlerService,
    private readonly configService: ConfigService,
  ) {
    const acceptanceAccountPublicKey = this.configService.get<PublicKey>(
      'acceptanceAccountPublicKey',
    );
    if (!acceptanceAccountPublicKey) {
      console.error(
        'Acceptance account public key is not defined - exiting process.',
      );
      process.exit(1);
    }
    this.acceptanceAccountPublicKey = acceptanceAccountPublicKey;

    const mintAccountPublicKey = this.configService.get<PublicKey>(
      'mintAccountPublicKey',
    );
    if (!mintAccountPublicKey) {
      console.error(
        'Mint account public key is not defined - exiting process.',
      );
      process.exit(1);
    }
    this.mintAccountPublicKey = mintAccountPublicKey;
  }

  // CRUD
  async create(invoice: CreateInvoicePayload) {
    const { reference } = await this.invoiceDbHandler.create(invoice);
    return reference;
  }
  async getOne(reference: string) {
    return await this.invoiceDbHandler.getOneByReference(reference);
  }
  async list(status?: InvoiceStatus) {
    const list = await this.invoiceDbHandler.list(status);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return list.map(({ id, ...invoice }) => invoice);
  }

  // BC Interactions
  /**
   * @param {string} reference invoice.reference
   * @param amount in SOL
   * @returns URL
   */
  async createPaymentLink(reference: string) {
    // Ensure provided reference references an invoice
    const { amount, denomination } = await this.getOne(reference);
    const amountBN = new BigNumber(amount);
    const recipient = this.acceptanceAccountPublicKey;

    const transferRequestUrlFields: TransferRequestURLFields = {
      recipient,
      amount: amountBN,
      memo: reference,
    };

    if (denomination === 'SPL') {
      transferRequestUrlFields.splToken = this.mintAccountPublicKey;
    }

    const url = encodeURL(transferRequestUrlFields);
    return url;
  }
}
