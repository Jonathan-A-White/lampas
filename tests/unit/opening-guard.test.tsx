// tests/unit/opening-guard.test.tsx — the one guard of a view a tap has just opened (useOpeningGuard, src/ui/settle.ts, mw-fnvjof.17.69; used by the Verse view): for
// the moments asked after it mounts a click on a control of the view is dropped, except on the control named to keep (the way back out) and on what is no control;
// after them every click goes through.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { settle, SETTLE_MS, useOpeningGuard } from '../../src/ui/settle';

let now = 0;
beforeEach(() => {
  now += 100_000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  settle.ms = SETTLE_MS;
});
afterEach(() => {
  settle.ms = 0;
  cleanup();
  vi.restoreAllMocks();
});

function View({ onWord, onBack, onText }: { onWord: () => void; onBack: () => void; onText: () => void }) {
  const back = useRef<HTMLButtonElement | null>(null);
  const guard = useOpeningGuard('view', 600 / SETTLE_MS, () => back.current);
  return (
    <section onClickCapture={guard}>
      <button type="button" ref={back} onClick={onBack}>
        Back
      </button>
      <span role="button" tabIndex={0} onClick={onWord}>
        word
      </span>
      <p onClick={onText}>plain text</p>
    </section>
  );
}

function open() {
  const onWord = vi.fn();
  const onBack = vi.fn();
  const onText = vi.fn();
  render(<View onWord={onWord} onBack={onBack} onText={onText} />);
  return { onWord, onBack, onText };
}

describe('useOpeningGuard', () => {
  it('drops a click on a control of the view inside the moments, however late in them', () => {
    const { onWord } = open();
    now += 120;
    fireEvent.click(screen.getByText('word'));
    now += 400; // 520 ms in: later than the app-wide guard's one moment (450 ms), inside the 600 ms asked
    fireEvent.click(screen.getByText('word'));
    expect(onWord).not.toHaveBeenCalled();
  });

  it('lets a click on the control named to keep, and on what is no control, through', () => {
    const { onBack, onText } = open();
    now += 120;
    fireEvent.click(screen.getByText('Back'));
    fireEvent.click(screen.getByText('plain text'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onText).toHaveBeenCalledTimes(1);
  });

  it('lets a click through once the moments have passed (a single tap 600 ms or more after it opens)', () => {
    const { onWord } = open();
    now += 600;
    fireEvent.click(screen.getByText('word'));
    expect(onWord).toHaveBeenCalledTimes(1);
  });
});
