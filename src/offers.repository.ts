import { Injectable } from '@nestjs/common';
import { AggregateEvent, Offer, OfferAcceptance } from './domain';

@Injectable()
export class OffersRepository {
  private readonly offers = new Map<string, Offer>([
    [
      'offer-1',
      {
        id: 'offer-1',
        status: 'CREATED',
        currency: 'USD',
      },
    ],
  ]);

  private readonly acceptancesByIdempotency = new Map<string, OfferAcceptance>();
  private readonly eventsByOffer = new Map<string, AggregateEvent[]>();

  getOffer(offerId: string): Offer | undefined {
    return this.offers.get(offerId);
  }

  updateOfferStatus(offerId: string, status: Offer['status']): void {
    const current = this.offers.get(offerId);
    if (!current) return;
    this.offers.set(offerId, { ...current, status });
  }

  findAcceptanceByIdempotency(
    offerId: string,
    idempotencyKey: string,
  ): OfferAcceptance | undefined {
    return this.acceptancesByIdempotency.get(`${offerId}:${idempotencyKey}`);
  }

  saveAcceptance(acceptance: OfferAcceptance): void {
    this.acceptancesByIdempotency.set(
      `${acceptance.offerId}:${acceptance.idempotencyKey}`,
      acceptance,
    );
  }

  appendEvent(offerId: string, event: AggregateEvent): void {
    const current = this.eventsByOffer.get(offerId) ?? [];
    this.eventsByOffer.set(offerId, [...current, event]);
  }

  getEvents(offerId: string): AggregateEvent[] {
    return this.eventsByOffer.get(offerId) ?? [];
  }
}
