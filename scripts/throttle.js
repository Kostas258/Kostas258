/**
 * Adaptive pacing based on what the service is actually returning.
 *
 * The failure this prevents: socialcal was queried at a fixed 20 s for hours,
 * degraded, and ended up answering 56 of its last 60 requests with an
 * indeterminate result. Every one of those was a wasted request that also kept
 * the service under load. Nothing in the code noticed — it was spotted by
 * reading the logs by hand, long after the fact.
 *
 * So the runner watches its own recent hit rate and slows down on its own. It
 * only ever *reacts*: it starts at the cadence measured as safe and treats that
 * as a floor, because speeding up past a measured value is precisely the
 * mistake that got this session rate-limited three times.
 */

class Throttle {
  /**
   * @param min        never go faster than this (the measured-safe cadence)
   * @param max        never go slower than this; past it, pausing is better
   * @param start      opening cadence, normally === min
   * @param windowSize how many recent outcomes to judge on
   * @param badRate    fraction of misses that triggers a slowdown
   * @param up/down    multipliers applied to the delay
   */
  constructor({ min, max, start = min, windowSize = 12, badRate = 0.5, up = 1.6, down = 0.85 } = {}) {
    this.min = min;
    this.max = max;
    this.delay = Math.max(min, start);
    this.windowSize = windowSize;
    this.badRate = badRate;
    this.up = up;
    this.down = down;
    this.recent = [];
    this.changes = [];
  }

  /** @param ok true when the request produced a usable verdict. */
  record(ok) {
    this.recent.push(!!ok);
    if (this.recent.length < this.windowSize) return null;

    const misses = this.recent.filter(x => !x).length / this.recent.length;
    const before = this.delay;

    if (misses >= this.badRate) {
      this.delay = Math.min(this.max, Math.round(this.delay * this.up));
    } else if (misses <= 0.15) {
      // Ease back toward the floor only when the service is clearly healthy,
      // and never below it.
      this.delay = Math.max(this.min, Math.round(this.delay * this.down));
    }

    this.recent = []; // judge the next window on fresh evidence, not a rolling tail
    if (this.delay === before) return null;

    const note = {
      at: new Date().toISOString(),
      from: before,
      to: this.delay,
      missRate: +misses.toFixed(2),
    };
    this.changes.push(note);
    return note;
  }

  /** True once slowing down has stopped helping: the service needs a real rest. */
  exhausted() {
    return this.delay >= this.max;
  }

  summary() {
    return `cadence ${Math.round(this.delay / 1000)}s` +
      (this.changes.length ? ` après ${this.changes.length} ajustement(s)` : '');
  }
}

module.exports = { Throttle };
