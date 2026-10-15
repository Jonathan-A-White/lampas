// tests/unit/immersive-timer.test.ts — the leave-full-screen timer of src/immersive.ts (mw-5r3p30.399): it is set when the Reader unmounts
// and fires LEAVE_DELAY_MS later, which can be after the page it was set in is gone ('document is not defined' as an unhandled error).
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetImmersive, useImmersive } from '../../src/immersive';

const LEAVE_PAST_MS = 1000;

function mountAndLeave(): void {
  const box = { current: document.createElement('div') };
  const view = renderHook(() => useImmersive(true, box));
  view.unmount();
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  resetImmersive();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('the immersive reader leave timer', () => {
  it('leaves a pending timer when the reader unmounts', () => {
    mountAndLeave();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });

  it('throws nothing when it fires after the page is gone', () => {
    mountAndLeave();
    vi.stubGlobal('document', undefined);
    expect(() => vi.advanceTimersByTime(LEAVE_PAST_MS)).not.toThrow();
  });

  it('is cleared by resetImmersive, so nothing is left to fire', () => {
    mountAndLeave();
    resetImmersive();
    expect(vi.getTimerCount()).toBe(0);
  });
});
