import { Module } from '@nestjs/common';

import { TaxService } from './tax.service';
import { TaxController } from './infrastructure/controllers/tax.controller';

@Module({
  controllers: [TaxController],
  providers: [TaxService],
  exports: [TaxService],
})
export class TaxModule {}
