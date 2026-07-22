import { Global, Module } from '@nestjs/common';

import { DrizzleTransactionService } from './transaction.service';

/** Global module exposing shared data-layer helpers (transactions). */
@Global()
@Module({
  providers: [DrizzleTransactionService],
  exports: [DrizzleTransactionService],
})
export class SharedDataModule {}
