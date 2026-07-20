# DrumWave Interview Challenge (Offers + Billing)

This coding challenge simulates a core DrumWave workflow: accepting an offer, reserving funds with billing, appending an event, and writing an outbox message.

## Timebox

- Main challenge: 60-90 min
- Senior extension: 30-45 min
- Discussion and tradeoffs: 20-30 min

## Candidate Task

Implement and harden `POST /v1/offers/:offerId/accept` in [src/offers.service.ts](src/offers.service.ts).

## Senior Track (for staff/senior candidates)

This track is intentionally closer to DrumWave real-world pain points.

### Senior requirements

1. Make idempotency hold under concurrency, not just sequential replay:
- `test/offers.e2e.spec.ts` (`concurrent identical requests must reserve funds exactly once`) fires 5 simultaneous accepts with the same `idempotencyKey`. It currently fails — diagnose why, then fix it.
- Make it pass without serializing all requests through a single global lock (be ready to discuss the tradeoff of whatever mechanism you choose — a per-key lock/mutex, an upsert-or-fail write, a real DB unique constraint, etc.).

2. Handle failure injection around billing and outbox:
- [src/billing.client.ts](src/billing.client.ts) can inject reserve failures.
- [src/outbox.repository.ts](src/outbox.repository.ts) can inject append failures.
- Build deterministic behavior and explain retry or compensation strategy.

3. Diagnose and deflake intentionally flaky behavior:
- [src/failure-injection.service.ts](src/failure-injection.service.ts) uses time-based failure toggles when `FLAKY_MODE=1`.
- Replace this with deterministic controls (seed/counter/scenario key).
- Tighten tests to remove non-determinism.

### Business requirements

1. Accept only state transition `CREATED -> AWAITING_CONDITIONS`.
2. Validate business rules:
- `hasAcceptedTerms` must be true.
- `hasBankAccount` must be true.
- `currency` must match offer currency (`USD`).
3. Idempotency by `(offerId, idempotencyKey)`:
- First call performs reserve + writes.
- Replay returns same acceptance and does not duplicate side effects.
- This must hold under **concurrent** identical requests, not just sequential replay.
4. On success:
- Reserve funds via billing client.
- Persist acceptance.
- Append aggregate event `OfferAccepted`.
- Append outbox event `offers.accepted`.
5. Expose read endpoints already scaffolded:
- `GET /v1/offers/:offerId/events`
- `GET /v1/offers/:offerId/outbox`

## What to evaluate

- Correctness under retries (idempotency)
- Domain invariants and state machine discipline
- Error semantics (422 vs 404 vs 503)
- Clear separation between controller/service/repository concerns
- Ability to discuss production hardening

## Run locally

```bash
npm install
npm test
npm run start:dev
```

## Bonus extensions (if time remains)

1. Add endpoint `POST /v1/offers/:offerId/conditions-met` to transition `AWAITING_CONDITIONS -> FUNDED`.
2. Simulate outbox publisher and retry strategy.
3. Add structured logs and metrics points.

## Notes about current starter behavior

- Some behaviors are intentionally incomplete for interview purposes.
- The senior track includes one intentionally flaky scenario in [test/offers.e2e.spec.ts](test/offers.e2e.spec.ts).
- Your expectation should be candidate diagnosis plus a deterministic redesign.
