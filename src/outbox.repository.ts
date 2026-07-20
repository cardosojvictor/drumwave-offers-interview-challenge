import { Injectable } from '@nestjs/common';
import { OutboxEvent } from './domain';
import { FailureInjectionService } from './failure-injection.service';

@Injectable()
export class OutboxRepository {
  constructor(private readonly failureInjection: FailureInjectionService) {}

  private readonly outboxByOffer = new Map<string, OutboxEvent[]>();

  append(offerId: string, outbox: OutboxEvent): void {
    if (this.failureInjection.shouldFail('outbox.append')) {
      throw new Error('injected outbox write failure');
    }

    const current = this.outboxByOffer.get(offerId) ?? [];
    this.outboxByOffer.set(offerId, [...current, outbox]);
  }

  getByOffer(offerId: string): OutboxEvent[] {
    return this.outboxByOffer.get(offerId) ?? [];
  }
}
