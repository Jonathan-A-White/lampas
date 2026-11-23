// The box whose saved place is being put back says so: data-restoring on it, from the first draw until the restore lets go (src/nav/scrollMemory.ts, mw-fnvjof.17.255),
// so a browser spec waits on the attribute instead of holding real time (tests/support/settled.ts afterRestore).
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetScrolls, restoreScrolls, scrollAddress, useScrollMemory } from '../../src/nav/scrollMemory';

const HASH = '#/?b=rom&c=8';

function Box() {
  const ref = useScrollMemory('reader');
  return (
    <main ref={ref} data-testid="box">
      <div style={{ height: 3000 }} />
    </main>
  );
}

describe('data-restoring on a box that has its saved place put back', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    forgetScrolls();
    localStorage.clear();
    window.history.replaceState(null, '', `/${HASH}`);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    forgetScrolls();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  function keep(top: number) {
    const address = scrollAddress(HASH);
    localStorage.setItem('lampas.scrolls', JSON.stringify({ [address]: { [`${address}#reader`]: top } }));
    restoreScrolls();
  }

  it('is there while the place is put back and gone once the restore lets go', () => {
    keep(600);
    const { getByTestId } = render(<Box />);
    const box = getByTestId('box');
    expect(box.hasAttribute('data-restoring')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(box.hasAttribute('data-restoring')).toBe(false);
  });

  it('is gone when his own hand is on the box', () => {
    keep(600);
    const { getByTestId } = render(<Box />);
    const box = getByTestId('box');
    expect(box.hasAttribute('data-restoring')).toBe(true);
    act(() => {
      box.dispatchEvent(new Event('touchstart'));
    });
    expect(box.hasAttribute('data-restoring')).toBe(false);
  });

  it('is never there on a box with no saved place', () => {
    const { getByTestId } = render(<Box />);
    expect(getByTestId('box').hasAttribute('data-restoring')).toBe(false);
  });
});
