import { Module } from '@nestjs/common';
import { SolanaAddressMonitorService } from './solana-address-monitor.service';
import { LoggerService } from 'src/logger.service';
import { InvoiceDbHandlerModule } from 'src/invoice-db-handler/invoice-db-handler.module';

@Module({
  imports: [InvoiceDbHandlerModule],
  providers: [SolanaAddressMonitorService, LoggerService],
})
export class AddressMonitorModule {}
