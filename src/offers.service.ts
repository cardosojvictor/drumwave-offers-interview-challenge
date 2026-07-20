import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BillingClient } from './billing.client';
import { AcceptOfferDto } from './offers.dto';
import { OffersRepository } from './offers.repository';
import { OutboxRepository } from './outbox.repository';

@Injectable()
export class OffersService {
  constructor(
    private readonly offersRepository: OffersRepository,
    private readonly outboxRepository: OutboxRepository,
    private readonly billingClient: BillingClient,
  ) {}

  async acceptOffer(offerId: string, dto: AcceptOfferDto) {
    const offer = this.offersRepository.getOffer(offerId);
    if (!offer) {
      throw new NotFoundException('offer not found');
    }

    // Candidate task: enforce state transition guard.
    // Only CREATED -> AWAITING_CONDITIONS is allowed for this challenge.

    // Candidate task: enforce domain validations.
    // - hasAcceptedTerms must be true
    // - hasBankAccount must be true
    // - currency must match offer currency (USD)
    // Throw UnprocessableEntityException for rule violations.

    const existing = this.offersRepository.findAcceptanceByIdempotency(
      offerId,
      dto.idempotencyKey,
    );
    if (existing) {
      return {
        acceptanceId: existing.acceptanceId,
        status: 'AWAITING_CONDITIONS',
        reservedTxnId: existing.reservedTxnId,
        idempotentReplay: true,
      };
    }

    // Candidate task: call billing reserve only once per idempotency key.
    const reserve = await this.billingClient.reserveFunds({
      offerId,
      participantId: dto.participantId,
      amountInMinor: dto.amountInMinor,
      currency: dto.currency,
    });

    const acceptance = {
      acceptanceId: randomUUID(),
      offerId,
      participantId: dto.participantId,
      amountInMinor: dto.amountInMinor,
      currency: 'USD' as const,
      idempotencyKey: dto.idempotencyKey,
      reservedTxnId: reserve.txnId,
      createdAt: new Date().toISOString(),
    };

    // Candidate task: make these writes happen atomically in a real system.
    this.offersRepository.saveAcceptance(acceptance);
    this.offersRepository.updateOfferStatus(offerId, 'AWAITING_CONDITIONS');
    this.offersRepository.appendEvent(offerId, {
      aggregateId: offerId,
      eventType: 'OfferAccepted',
      createdAt: new Date().toISOString(),
      payload: {
        acceptanceId: acceptance.acceptanceId,
        participantId: acceptance.participantId,
        amountInMinor: acceptance.amountInMinor,
        currency: acceptance.currency,
        reservedTxnId: acceptance.reservedTxnId,
      },
    });
    this.outboxRepository.append(offerId, {
      topic: 'offers.accepted',
      partitionKey: dto.participantId,
      createdAt: new Date().toISOString(),
      payload: {
        offerId,
        acceptanceId: acceptance.acceptanceId,
      },
    });

    return {
      acceptanceId: acceptance.acceptanceId,
      status: 'AWAITING_CONDITIONS',
      reservedTxnId: acceptance.reservedTxnId,
      idempotentReplay: false,
    };
  }

  getEvents(offerId: string) {
    return this.offersRepository.getEvents(offerId);
  }

  getOutbox(offerId: string) {
    return this.outboxRepository.getByOffer(offerId);
  }

  // NOTE: intentionally left as example helper for candidates
  assertBusinessRule(check: boolean, message: string): void {
    if (!check) {
      throw new UnprocessableEntityException(message);
    }
  }
}
