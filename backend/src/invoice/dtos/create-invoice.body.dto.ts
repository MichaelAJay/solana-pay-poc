import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ICreateInvoicePayload } from '../types';

export class CreateInvoiceBodyDto implements ICreateInvoicePayload {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description: string | null;
}
