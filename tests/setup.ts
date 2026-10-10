import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
// Not '@testing-library/react': importing it here would register its auto-unmount before
// the step files' dont-cleanup-after-each import can switch that off.
import { configure } from '@testing-library/dom';
import { settle } from '../src/ui/settle';
import { ASYNC_WAIT_MS } from './support/timeouts';

// waitFor/findBy default to 1 s, which a loaded host outruns; ASYNC_WAIT_MS (tests/support/timeouts.ts) is the one wait. vitest's testTimeout (20 s) stays above it.
configure({ asyncUtilTimeout: ASYNC_WAIT_MS });

// The wall clock steps BACK on a dev box (WSL2's time sync moves it back by about 1.8 s every 30 s on the Desktop). A word's answers
// count only from its `since` (recordAnswer), a review from its `lastWhen`, a talk's turns in `when` order: a stamp taken just after
// such a step lands before one taken just before it, and a time-ordered scenario fails at random (quick-test.feature's two rights in
// a row, 2026-10-09). Tests get a Date.now() that never runs backwards: while real time is behind it, each reading is 1 ms after the
// last, as a phone with a steady clock would see it. Only `now` is replaced, on the real Date itself: a test's vi.spyOn(Date, 'now')
// wraps it, vi.useFakeTimers() swaps the whole Date and vi.useRealTimers() puts this one back; `new Date()` (one log line) is left alone.
const nativeNow = Date.now.bind(Date);
let latest = 0;
Date.now = (): number => {
  const real = nativeNow();
  return (latest = real > latest ? real : latest + 1);
};

// A new question card ignores taps for SETTLE_MS (src/ui/settle.ts, mw-hqd5bz.21); a step taps the instant a card is drawn, so the moment is 0 here.
// features/double-tap.feature puts it back.
settle.ms = 0;
