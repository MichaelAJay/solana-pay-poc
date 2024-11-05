import { Test, TestingModule } from '@nestjs/testing';
import { SolanaAddressMonitorService } from './solana-address-monitor.service';

describe('SolanaAddressMonitorService', () => {
  let service: SolanaAddressMonitorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SolanaAddressMonitorService],
    }).compile();

    service = module.get<SolanaAddressMonitorService>(SolanaAddressMonitorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
