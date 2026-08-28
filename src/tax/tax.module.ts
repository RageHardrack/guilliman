import { Module } from '@nestjs/common';
import { TaxController } from './infrastructure/controllers/tax.controller';
import { TaxService } from './tax.service';

@Module({
  controllers: [TaxController],
  providers: [TaxService],
  exports: [TaxService],
})
export class TaxModule {}
