import { HttpException } from '@nestjs/common';

/**
 * Per-traveller daily counter. In memory on purpose: it resets with the day and
 * on restart, so it is a cost guard, not a quota ledger.
 */
export class DailyLimit {
  private readonly usage = new Map<number, { day: string; count: number }>();

  /** Counts one use. Returns how many are left, or null when unlimited (limit 0). */
  spend(userId: number, limit: number, exhaustedMessage: string): number | null {
    if (limit === 0) return null;
    const day = new Date().toISOString().slice(0, 10);
    const entry = this.usage.get(userId);
    const current = entry && entry.day === day ? entry : { day, count: 0 };
    if (current.count >= limit) throw new HttpException({ error: exhaustedMessage }, 429);
    current.count += 1;
    this.usage.set(userId, current);
    return limit - current.count;
  }

  /** Gives a use back, for work that failed before it cost anything. */
  refund(userId: number): void {
    const entry = this.usage.get(userId);
    if (entry && entry.count > 0) entry.count -= 1;
  }
}
