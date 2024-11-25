import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Connection,
  Context,
  Logs,
  ParsedInstruction,
  ParsedTransactionWithMeta,
  PublicKey,
  SignaturesForAddressOptions,
} from '@solana/web3.js';
import { InvoiceDbHandlerService } from 'src/invoice-db-handler/invoice-db-handler.service';
import { LoggerService } from 'src/logger.service';

type TransactionType = 'transfer' | 'transferChecked';

@Injectable()
export class SolanaAddressMonitorService implements OnModuleInit {
  private connection: Connection;
  private acceptanceAccountPubKey: PublicKey;
  private splAtaPubKey: PublicKey;
  private allAcceptancePublicKeys: {
    publicKey: PublicKey;
    transactionType: TransactionType;
  }[];
  private transactionsToRun: ParsedTransactionWithMeta[];

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly invoiceDbHandler: InvoiceDbHandlerService,
  ) {
    this.transactionsToRun = [];

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
      this.allAcceptancePublicKeys.push({
        publicKey: this.acceptanceAccountPubKey,
        transactionType: 'transfer',
      });
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
      this.allAcceptancePublicKeys.push({
        publicKey: this.splAtaPubKey,
        transactionType: 'transferChecked',
      });
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

      // Playground for getting prior transactions

      // Note: Double iterate over all acceptance public keys. Should be fine. My thinking here is that we want to make sure we can catch up first
      for (const publicKeyElement of this.allAcceptancePublicKeys) {
        await this.catchup(publicKeyElement.publicKey);
      }

      const onLogsHandlerFactory = (
        transactionType: 'transfer' | 'transferChecked',
      ) => {
        return async (logs: Logs, ctx: Context) => {
          try {
            this.logger.log(logs, ctx);
            const { signature } = logs;

            let payerWallet: string | undefined = undefined;
            let reference: string | undefined = undefined;

            const tx = await this.connection.getParsedTransaction(signature);
            if (!tx) throw new Error('Tx not found');
            const { instructions } = tx.transaction.message;

            const splMemoProgramId =
              'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
            let memoInstruction = instructions.find((instruction) => {
              const programId = instruction.programId.toString();
              return programId === splMemoProgramId;
            });
            if (!memoInstruction) {
              throw new Error("Can't associate transaction with invoice");
            }
            if (!(memoInstruction as ParsedInstruction).parsed) {
              // Memo instruction is PartiallyDecodedInstruction - how do I parse it?
              memoInstruction = memoInstruction as ParsedInstruction;
            }
            if (
              typeof (memoInstruction as ParsedInstruction).parsed !== 'string'
            ) {
              // Log that the transaction can't be assocaited with an invoice because the memo instruction didn't have the expected form
              throw new Error("Can't associate transaction with invoice");
            }
            reference = (memoInstruction as ParsedInstruction).parsed as string;

            let transferInstruction = instructions.find(
              (instruction) =>
                (instruction as ParsedInstruction).parsed?.type ===
                transactionType,
            );
            if (!transferInstruction) {
              throw new Error("Can't find transfer instruction");
            }

            if (!(transferInstruction as ParsedInstruction).parsed) {
              // Transfer instruction is PartiallyDecodedInstruction - how do I parse it?
              transferInstruction = transferInstruction;
            }

            const { source } = (transferInstruction as ParsedInstruction).parsed
              .info as {
              destination: string;
              lamports: number;
              source: string;
            };
            payerWallet = source;

            if (!reference) {
              throw new Error('Reference not found - check log');
            }
            if (!payerWallet) {
              throw new Error('Payer wallet not found - check log');
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
          } catch (err) {
            console.log('ARGH!', transactionType);
            // throw err;
          }
        };
      };
      // Subscribe to logs
      // this.connection.onLogs(
      //   this.acceptanceAccountPubKey,
      //   onLogsHandlerFactory('transfer'),
      // );
      // this.connection.onLogs(
      //   this.splAtaPubKey,
      //   onLogsHandlerFactory('transferChecked'),
      // );
      // This is the one to try if my other thing doesn't work
      // this.connection.onLogs(
      //   this.acceptanceAccountPubKey,
      //   this.onLogsHandlerFactory('transfer'),
      // );
      // this.connection.onLogs(
      //   this.splAtaPubKey,
      //   this.onLogsHandlerFactory('transferChecked'),
      // );
      for (const publicKeyElement of this.allAcceptancePublicKeys) {
        const { publicKey, transactionType } = publicKeyElement;
        this.connection.onLogs(
          publicKey,
          this.onLogsHandlerFactory(transactionType),
        );
      }
      this.connection.onSlotChange((input) => {
        console.log(input);
      });
    } catch (err) {
      console.error(
        'SolanaAddressMonitorService error - exiting process.',
        err,
      );
      process.exit(1);
    }
  }

  private onLogsHandlerFactory(transactionType: TransactionType) {
    return async (logs: Logs, ctx: Context) => {
      try {
        this.logger.log(logs, ctx);
        const { signature } = logs;

        let payerWallet: string | undefined = undefined;
        let reference: string | undefined = undefined;

        const tx = await this.connection.getParsedTransaction(signature);
        if (!tx) throw new Error('Tx not found');
        const { instructions } = tx.transaction.message;

        const splMemoProgramId = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
        let memoInstruction = instructions.find((instruction) => {
          const programId = instruction.programId.toString();
          return programId === splMemoProgramId;
        });
        if (!memoInstruction) {
          throw new Error("Can't associate transaction with invoice");
        }
        if (!(memoInstruction as ParsedInstruction).parsed) {
          // Memo instruction is PartiallyDecodedInstruction - how do I parse it?
          memoInstruction = memoInstruction as ParsedInstruction;
        }
        if (typeof (memoInstruction as ParsedInstruction).parsed !== 'string') {
          // Log that the transaction can't be assocaited with an invoice because the memo instruction didn't have the expected form
          throw new Error("Can't associate transaction with invoice");
        }
        reference = (memoInstruction as ParsedInstruction).parsed as string;

        let transferInstruction = instructions.find(
          (instruction) =>
            (instruction as ParsedInstruction).parsed?.type === transactionType,
        );
        if (!transferInstruction) {
          throw new Error("Can't find transfer instruction");
        }

        if (!(transferInstruction as ParsedInstruction).parsed) {
          // Transfer instruction is PartiallyDecodedInstruction - how do I parse it?
          transferInstruction = transferInstruction;
        }

        const { source } = (transferInstruction as ParsedInstruction).parsed
          .info as {
          destination: string;
          lamports: number;
          source: string;
        };
        payerWallet = source;

        if (!reference) {
          throw new Error('Reference not found - check log');
        }
        if (!payerWallet) {
          throw new Error('Payer wallet not found - check log');
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
      } catch (err) {
        console.log('ARGH!', transactionType);
        // throw err;
      }
    };
  }

  private async catchup(publicKey: PublicKey) {
    // Get last transaction signature
    const mockLastSignature =
      '2ffPKhjHgvuu916DCfgx2mkfwm2FFBjTUBCGCgEihNXeT8rNZeugvrgaMiktPmBDPXnUhRsRo1BnnxPMymBhyUtj';
    const lastProcessedSignature = mockLastSignature;

    let hasMore = true; // Flag to continue fetching until all relevant signatures are retrieved
    let beforeSignature: string | undefined = undefined;
    while (hasMore) {
      try {
        const options: Omit<SignaturesForAddressOptions, 'limit'> & {
          limit: number;
        } = {
          before: beforeSignature, // Start searching backwards from this transaction signature.
          until: lastProcessedSignature, // Search until this transaction signature is reached, if found before limit
          limit: 100,
        };
        const signatures = await this.connection.getSignaturesForAddress(
          publicKey,
          options,
          'confirmed',
        );

        // Process each fetched signature
        for (const signatureInfo of signatures) {
          const { signature } = signatureInfo;
          console.log('Processing transaction signature:', signature);

          const transaction =
            await this.connection.getParsedTransaction(signature);
          if (!transaction) {
            continue;
          }
          this.transactionsToRun.push(transaction);
        }

        // Check if more signatures need to be fetched
        if (signatures.length < options.limit) {
          hasMore = false;
        } else {
          // Update 'beforeSignature' to the last signature in this batch
          beforeSignature = signatures[signatures.length - 1].signature;
        }

        /**
         * @TODO MUST UPDATE MOST RECENT KNOWN SIGNATURE
         */
      } catch (err) {
        console.error('Error while fetching signatures:', err);
        break;
      }
    }
  }
}
