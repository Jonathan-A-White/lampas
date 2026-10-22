// The Off | On | Pin control (src/ui/ThreeStep.tsx): a radiogroup named by what it sets, one radio checked, a tap chooses.
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { settle, SETTLE_MS } from '../../src/ui/settle';
import { ThreeStep } from '../../src/ui/ThreeStep';

const was = settle.ms;
afterEach(() => {
  cleanup();
  settle.ms = was;
});

const OPTIONS = [['off', 'Off'], ['on', 'On'], ['pinned', 'Pin']] as const;

describe('ThreeStep', () => {
  it('is a radiogroup with the current step checked and no other', () => {
    render(<ThreeStep name="BDAG" current="on" options={OPTIONS} onChoose={() => undefined} />);
    const radios = within(screen.getByRole('radiogroup', { name: 'BDAG' })).getAllByRole('radio');
    expect(radios.map((r) => [r.textContent, r.getAttribute('aria-checked')])).toEqual([['Off', 'false'], ['On', 'true'], ['Pin', 'false']]);
  });

  it('hands the value of the step he taps, and a double tap chooses once', async () => {
    settle.ms = SETTLE_MS;
    const choose = vi.fn();
    render(<ThreeStep name="BDAG" current="off" options={OPTIONS} onChoose={choose} />);
    await userEvent.dblClick(screen.getByRole('radio', { name: 'Pin' }));
    expect(choose).toHaveBeenCalledTimes(1);
    expect(choose).toHaveBeenCalledWith('pinned');
  });
});
