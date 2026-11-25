// tests/unit/late-traversal.test.ts — the late history traversal of a step file lands before the app's own fallback does (mw-fnvjof.17.325).
// afterSheetEntryGone (src/ui/sheetBack.ts) runs its `then` on the popstate of the sheet's traversal or, at the latest, 400 ms after it was asked. A fake that lands the traversal
// a fixed 150 ms after history.go was CALLED loses that race when a loaded host calls go late (the commit that closes the sheet is slow): the screen the fallback opened is then popped
// back to the Reader by the late traversal, and a step looking for Settings finds the Reader (reading-plan.steps.tsx failed 1 run in 20 under load).
import { afterEach, describe, expect, it } from 'vitest';
import { afterSheetEntryGone } from '../../src/ui/sheetBack';
import { landTraversalsLate } from '../support/late-traversal';

/** Holds the thread for `ms`, as a slow commit does between the tap and the go. */
function busy(ms: number): void {
  const until = performance.now() + ms;
  while (performance.now() < until) { /* a slow commit */ }
}

describe('the late traversal of a step file', () => {
  let restore: (() => void) | undefined;
  afterEach(() => restore?.());

  it('lands before the app gives up waiting for it, though the go was asked late', async () => {
    restore = landTraversalsLate();
    window.history.pushState({ sheet: 1 }, '', window.location.href);
    let by: 'popstate' | 'fallback' | null = null;
    window.addEventListener('popstate', () => (by ??= 'popstate'), { once: true });
    afterSheetEntryGone(() => (by ??= 'fallback'));
    busy(300); // the sheet's close commit is slow: go is asked 300 ms after the fallback timer started
    window.history.go(-1);
    await new Promise<void>((resolve) => window.addEventListener('popstate', () => resolve(), { once: true }));
    // the traversal of the app's `then` listener ran too; wait for whichever the app took
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(by).toBe('popstate');
  });
});
