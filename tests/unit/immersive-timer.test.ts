// tests/unit/immersive-timer.test.ts — the leave-full-screen timer of src/immersive.ts (mw-5r3p30.399): it is set when the Reader unmounts
// and fires LEAVE_DELAY_MS later, which can be after the page it was set in is gone ('document is not defined' as an unhandled error).
import { act, renderHook } from '@testing-library/react';
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

describe('the bars carried to the next chapter (mw-5r3p30.318)', () => {
  function scrollAway(el: HTMLElement): void {
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 5000 });
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: 600 });
    el.scrollTop = 400;
    el.dispatchEvent(new Event('scroll'));
  }

  it('a Reader that replaces one with the bars away starts with them away; a later one starts shown', () => {
    const box = { current: document.createElement('div') };
    const first = renderHook(() => useImmersive(true, box));
    act(() => scrollAway(box.current));
    expect(first.result.current.away).toBe(true);

    // the next chapter: the new Reader is drawn before the old one is torn down
    const next = { current: document.createElement('div') };
    const second = renderHook(() => useImmersive(true, next));
    expect(second.result.current.away).toBe(true);
    first.unmount();
    expect(second.result.current.away).toBe(true);
    second.unmount();

    // no Reader took it over: it is forgotten
    vi.advanceTimersByTime(LEAVE_PAST_MS);
    const later = renderHook(() => useImmersive(true, { current: document.createElement('div') }));
    expect(later.result.current.away).toBe(false);
  });

  it('with the setting Off nothing is carried', () => {
    const box = { current: document.createElement('div') };
    renderHook(() => useImmersive(true, box));
    act(() => scrollAway(box.current));
    const off = renderHook(() => useImmersive(false, { current: document.createElement('div') }));
    expect(off.result.current.away).toBe(false);
  });
});
