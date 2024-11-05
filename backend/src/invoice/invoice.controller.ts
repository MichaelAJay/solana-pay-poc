import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateInvoiceBodyDto } from './dtos';
import { InvoiceService } from './invoice.service';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  async createInvoice(@Body() body: CreateInvoiceBodyDto) {
    return this.invoiceService.create(body);
  }

  @Get('payment-link/:reference')
  async getPaymentLink(@Param('reference') reference: string) {
    return this.invoiceService.createPaymentLink(reference);
  }
}
