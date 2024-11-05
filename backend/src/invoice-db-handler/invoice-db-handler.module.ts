import { Module } from '@nestjs/common';
import { InvoiceDbHandlerService } from './invoice-db-handler.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [InvoiceDbHandlerService, PrismaService],
  exports: [InvoiceDbHandlerService],
})
export class InvoiceDbHandlerModule {}
