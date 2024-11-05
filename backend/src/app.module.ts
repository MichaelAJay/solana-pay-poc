import { Module } from '@nestjs/common';
import { InvoiceModule } from './invoice/invoice.module';
import { PrismaService } from './prisma.service';
import { AddressMonitorModule } from './address-monitor/address-monitor.module';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from './logger.service';
import { InvoiceDbHandlerModule } from './invoice-db-handler/invoice-db-handler.module';
import configuration from './config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    InvoiceModule,
    AddressMonitorModule,
    InvoiceDbHandlerModule,
  ],
  controllers: [],
  providers: [PrismaService, LoggerService],
})
export class AppModule {}
