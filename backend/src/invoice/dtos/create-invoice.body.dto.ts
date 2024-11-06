import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ICreateInvoicePayload } from '../types';
import {
  InvoiceDenomination,
  invoiceDenominations,
} from '../types/invoice-denomination.type';

export class CreateInvoiceBodyDto implements ICreateInvoicePayload {
  @IsNumber()
  amount: number;

  @IsEnum(invoiceDenominations)
  denomination: InvoiceDenomination;

  @IsOptional()
  @IsString()
  description: string | null;
}
