import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ReserveFundsResult } from './domain';
import { randomUUID } from 'node:crypto';
import { FailureInjectionService } from './failure-injection.service';

@Injectable()
export class BillingClient {
  constructor(private readonly failureInjection: FailureInjectionService) {}

  async reserveFunds(params: {
    offerId: string;
    participantId: string;
    amountInMinor: number;
    currency: string;
  }): Promise<ReserveFundsResult> {
    if (this.failureInjection.shouldFail('billing.reserve')) {
      throw new ServiceUnavailableException('injected billing failure');
    }

    // Simulate external behavior: large amounts may fail.
    if (params.amountInMinor > 500_000) {
      throw new ServiceUnavailableException('billing reserve timeout');
    }

    // Simulate real network latency to an external billing system.
    await new Promise((resolve) => setTimeout(resolve, 15));

    return { txnId: `reserve_${randomUUID()}` };
  }
}
