import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { InvoiceDbHandlerModule } from 'src/invoice-db-handler/invoice-db-handler.module';

@Module({
  imports: [InvoiceDbHandlerModule],
  providers: [InvoiceService],
  controllers: [InvoiceController],
})
export class InvoiceModule {}
