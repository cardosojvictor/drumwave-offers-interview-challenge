export type OfferStatus =
  | 'CREATED'
  | 'AWAITING_CONDITIONS'
  | 'FUNDED'
  | 'FAILED';

export interface Offer {
  id: string;
  status: OfferStatus;
  currency: 'USD';
}

export interface OfferAcceptance {
  acceptanceId: string;
  offerId: string;
  participantId: string;
  amountInMinor: number;
  currency: 'USD';
  idempotencyKey: string;
  reservedTxnId: string;
  createdAt: string;
}

export interface AggregateEvent {
  aggregateId: string;
  eventType: 'OfferAccepted';
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface OutboxEvent {
  topic: 'offers.accepted';
  partitionKey: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ReserveFundsResult {
  txnId: string;
}
