import { Injectable } from '@nestjs/common';

/**
 * Small seam for injecting failures into external integrations.
 *
 * Modes:
 * - FLAKY_MODE=0: no injected failures
 * - FLAKY_MODE=1: non-deterministic flaky mode (intentional senior challenge)
 */
@Injectable()
export class FailureInjectionService {
  shouldFail(key: string): boolean {
    if (process.env.FLAKY_MODE !== '1') return false;

    // Intentional anti-pattern for interview: time-based failure toggles.
    // Candidate should replace with deterministic fault controls.
    if (key === 'billing.reserve' || key === 'outbox.append') {
      return Date.now() % 2 === 0;
    }

    return false;
  }
}
