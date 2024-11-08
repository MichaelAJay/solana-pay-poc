import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, Context, Logs, PublicKey } from '@solana/web3.js';
import { InvoiceDbHandlerService } from 'src/invoice-db-handler/invoice-db-handler.service';
import { LoggerService } from 'src/logger.service';

@Injectable()
export class SolanaAddressMonitorService implements OnModuleInit {
  private connection: Connection;
  private acceptanceAccountPubKey: PublicKey;
  private splAtaPubKey: PublicKey;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly invoiceDbHandler: InvoiceDbHandlerService,
  ) {
    const connectionURL = this.configService.get<string>(
      'SOLANA_JSON_RPC_ENDPOINT_URL',
    );
    if (!connectionURL) {
      console.error(
        'SOLANA_JSON_RPC_ENDPOINT_URL is not defined in the environment variables - exiting process.',
      );
      process.exit(1);
    }
    this.connection = new Connection(connectionURL, 'confirmed');

    const acceptanceAccountPubKeyString = this.configService.get<string>(
      'ACCEPTANCE_ACCOUNT_PUBLIC_KEY_STRING',
    );
    if (!acceptanceAccountPubKeyString) {
      console.error(
        'ACCEPTANCE_ACCOUNT_PUBLIC_KEY_STRING is not defined in the environment variables - exiting process.',
      );
      process.exit(1);
    }

    try {
      this.acceptanceAccountPubKey = new PublicKey(
        acceptanceAccountPubKeyString,
      );
    } catch (err) {
      console.error(
        'Invalid ACCEPTANCE_ACCOUNT_PUBLIC_KEY - exiting process.',
        err.message,
      );
      process.exit(1);
    }

    const splAtaPubKey = this.configService.get<string>(
      'SPL_ATA_PUBLIC_KEY_STRING',
    );
    if (!splAtaPubKey) {
      console.error(
        'SPL_ATA_PUBLIC_KEY_STRING is not defined in the environment variables - exiting process.',
      );
      process.exit(1);
    }

    try {
      this.splAtaPubKey = new PublicKey(splAtaPubKey);
    } catch (err) {
      console.error(
        'Invalid SPL_ATA_PUBLIC_KEY_STRING - exiting process.',
        err.message,
      );
      process.exit(1);
    }
  }

  async onModuleInit() {
    try {
      const version = await this.connection.getVersion();
      console.log('Connected to Solana node. Version:', version);

      // Verify that the acceptance account public key is valid
      const accountInfo = await this.connection.getAccountInfo(
        this.acceptanceAccountPubKey,
      );
      if (accountInfo === null) {
        console.error(
          'System wallet account not found on-chain. It might be a new account or on a different network. Exiting.',
        );
        process.exit(1);
      } else {
        console.log('System wallet account verified on-chain.');
      }

      const onLogsHandler = async (logs: Logs, ctx: Context) => {
        this.logger.log(logs, ctx);
        const { signature, logs: bcLogs } = logs;

        let payerWallet: string | undefined = undefined;
        let reference: string | undefined = undefined;
        for (const log of bcLogs) {
          if (log.includes('Program log: Signed by ')) {
            payerWallet = log.split('Program log: Signed by ')[1];
          } else if (log.includes('Program log: Memo')) {
            const memoMatch = log.match(
              /Program log: Memo \(len \d+\): "(.*)"/,
            );
            if (memoMatch && memoMatch[1]) {
              reference = memoMatch[1];
            }
          }
          if (payerWallet && reference) {
            break;
          }
        }

        if (!reference) {
          throw new Error('Reference not found - check log');
        }

        if (!payerWallet) {
          const tx = await this.connection.getParsedTransaction(signature);
          const signer = tx?.transaction?.message?.accountKeys?.find(
            (accountKey: any) => accountKey.signer,
          );
          if (signer) {
            payerWallet = signer.pubkey.toString();
          }
        }

        const invoice =
          await this.invoiceDbHandler.getOneByReference(reference);

        // For proof of concept, just assume that payment is always full
        await this.invoiceDbHandler.update(invoice.id, {
          status: 'PAID',
          paidAt: new Date(),
          payerWallet: payerWallet || 'not found',
          signature,
        });
      };

      // Subscribe to logs
      this.connection.onLogs(this.acceptanceAccountPubKey, onLogsHandler);
      this.connection.onLogs(this.splAtaPubKey, onLogsHandler);
    } catch (err) {
      console.error(
        'SolanaAddressMonitorService error - exiting process.',
        err,
      );
      process.exit(1);
    }
  }
}
