import { Injectable } from '@nestjs/common';
import { Logs, Context } from '@solana/web3.js';
import * as path from 'path';
import { appendFile } from 'fs';

@Injectable()
export class LoggerService {
  private readonly logFilePath = path.join(process.cwd(), 'tx-log');
  log(logs: Logs, context: Context) {
    const serializedData = JSON.stringify({ logs, context });
    appendFile(this.logFilePath, `${serializedData}\n`, (err) => {
      if (err) {
        console.error('Failed to write to log file:', err);
      }
    });
  }
}
