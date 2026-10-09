// tests/support/manual-clock.ts — the time of a test that moves it by hand: bsv-kit's honest speech and microphone take a clock
// ({ now, setTimeout, clearTimeout }), and under this one nothing happens until the test says how much time has passed.
/** A clock that moves only when the test says; timers run in order of their time, then of their making. */
export class ManualClock {
  private time = 0;
  private serial = 0;
  private timers: { at: number; id: number; fn: () => void }[] = [];
  now = () => this.time;
  setTimeout = (fn: () => void, ms: number): number => {
    const id = ++this.serial;
    this.timers.push({ at: this.time + Math.max(0, ms), id, fn });
    return id;
  };
  clearTimeout = (handle: unknown): void => {
    this.timers = this.timers.filter((t) => t.id !== handle);
  };
  /** Runs the next timer, moving the clock to its time. False when none is waiting. */
  step(): boolean {
    this.timers.sort((a, b) => a.at - b.at || a.id - b.id);
    const next = this.timers.shift();
    if (!next) return false;
    this.time = Math.max(this.time, next.at);
    next.fn();
    return true;
  }
  /** Moves the clock on by `ms`, running every timer that falls due, including those the timers set. */
  advance(ms: number): void {
    const end = this.time + ms;
    for (;;) {
      this.timers.sort((a, b) => a.at - b.at || a.id - b.id);
      const next = this.timers[0];
      if (!next || next.at > end) break;
      this.step();
    }
    this.time = end;
  }
}
