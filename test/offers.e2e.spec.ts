import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { BillingClient } from '../src/billing.client';

describe('Offers Interview Challenge (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  const basePayload = {
    participantId: '1f6e7b0a-93d8-4ebd-8d7f-2a1de22df6c7',
    amountInMinor: 45000,
    currency: 'USD',
    idempotencyKey: 'idem-key-12345',
    hasAcceptedTerms: true,
    hasBankAccount: true,
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts an offer and appends one event + one outbox entry', async () => {
    const acceptRes = await request(app.getHttpServer())
      .post('/v1/offers/offer-1/accept')
      .send(basePayload)
      .expect(201);

    expect(acceptRes.body.status).toBe('AWAITING_CONDITIONS');
    expect(acceptRes.body.idempotentReplay).toBe(false);
    expect(acceptRes.body.acceptanceId).toBeDefined();

    const eventsRes = await request(app.getHttpServer())
      .get('/v1/offers/offer-1/events')
      .expect(200);
    expect(eventsRes.body).toHaveLength(1);
    expect(eventsRes.body[0].eventType).toBe('OfferAccepted');

    const outboxRes = await request(app.getHttpServer())
      .get('/v1/offers/offer-1/outbox')
      .expect(200);
    expect(outboxRes.body).toHaveLength(1);
    expect(outboxRes.body[0].topic).toBe('offers.accepted');
  });

  it('is idempotent on same offerId + idempotencyKey', async () => {
    const first = await request(app.getHttpServer())
      .post('/v1/offers/offer-1/accept')
      .send({
        ...basePayload,
        participantId: 'de894a84-69ff-4e55-b89f-c4a57fecf453',
        idempotencyKey: 'idem-replay-1',
      })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/v1/offers/offer-1/accept')
      .send({
        ...basePayload,
        participantId: 'de894a84-69ff-4e55-b89f-c4a57fecf453',
        idempotencyKey: 'idem-replay-1',
      })
      .expect(201);

    expect(first.body.acceptanceId).toBe(second.body.acceptanceId);
    expect(second.body.idempotentReplay).toBe(true);
  });

  it('senior track: concurrent identical requests must reserve funds exactly once', async () => {
    const billingClient = moduleRef.get(BillingClient);
    const reserveSpy = jest.spyOn(billingClient, 'reserveFunds');

    const concurrentPayload = {
      ...basePayload,
      participantId: '6a1f5a1e-8f3a-4d2a-9b8a-1a2b3c4d5e6f',
      idempotencyKey: 'idem-concurrent-1',
    };

    // Same offerId + idempotencyKey, fired in parallel.
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post('/v1/offers/offer-1/accept')
          .send(concurrentPayload),
      ),
    );

    for (const res of responses) {
      expect(res.status).toBe(201);
    }

    const distinctAcceptanceIds = new Set(
      responses.map((r) => r.body.acceptanceId),
    );
    expect(distinctAcceptanceIds.size).toBe(1);
    expect(reserveSpy).toHaveBeenCalledTimes(1);

    reserveSpy.mockRestore();
  });

  it('rejects invalid business rule payloads with 422', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/offers/offer-1/accept')
      .send({
        ...basePayload,
        idempotencyKey: 'idem-422-1',
        hasAcceptedTerms: false,
      })
      .expect(422);

    expect(response.body.message).toBeDefined();
  });

  it('senior track: flaky mode should intermittently fail to expose debugging quality', async () => {
    process.env.FLAKY_MODE = '1';

    const responses = await Promise.all(
      [1, 2, 3, 4].map((n) =>
        request(app.getHttpServer())
          .post('/v1/offers/offer-1/accept')
          .send({
            ...basePayload,
            idempotencyKey: `idem-flaky-${n}`,
          }),
      ),
    );

    // This assertion is intentionally soft: candidate should replace flaky
    // behavior with deterministic failure controls and stronger test checks.
    const statusCodes = responses.map((r) => r.status);
    expect(statusCodes.some((s) => s >= 500 || s === 503)).toBe(true);

    process.env.FLAKY_MODE = '0';
  });
});
