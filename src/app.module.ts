import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { OffersRepository } from './offers.repository';
import { BillingClient } from './billing.client';
import { OutboxRepository } from './outbox.repository';
import { FailureInjectionService } from './failure-injection.service';

@Module({
  controllers: [OffersController],
  providers: [
    OffersService,
    OffersRepository,
    BillingClient,
    OutboxRepository,
    FailureInjectionService,
  ],
})
export class AppModule {}
