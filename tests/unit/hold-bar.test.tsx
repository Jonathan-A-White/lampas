import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { HOLD_BAR_HEIGHT_PX, HoldBar } from '../../src/ui/HoldBar';

afterEach(cleanup);

const noop = vi.fn();
const hold = { onHold: noop, onRelease: noop, onDrop: noop };

test("the bar is Postern's: TalkLineScreen.tsx h-24 (6 rem = 96 px), full width, rounded-3xl, a mic over the label", () => {
  expect(HOLD_BAR_HEIGHT_PX).toBe(96);
  render(<HoldBar hold={hold} name="Hold to talk" label="Hold to talk" />);
  const bar = screen.getByRole('button', { name: 'Hold to talk' });
  expect(bar).toHaveAttribute('data-hold-bar');
  for (const cls of ['h-24', 'w-full', 'max-w-xl', 'rounded-3xl']) expect(bar.className).toContain(cls);
  expect(bar.querySelector('svg')).not.toBeNull();
  expect(bar).toHaveTextContent('Hold to talk');
});

test('listening turns the bar to the alert colour, and a disabled bar is dimmed and cannot be pressed', () => {
  const { rerender } = render(<HoldBar hold={hold} name="Hold to talk" label="Hold to talk" />);
  const bar = screen.getByRole('button', { name: 'Hold to talk' });
  expect(bar.className).toContain('bg-accent');
  rerender(<HoldBar hold={hold} name="Hold to talk" label="Release to send" listening />);
  expect(bar.className).toContain('bg-bad');
  expect(bar).toHaveAttribute('aria-pressed', 'true');
  rerender(<HoldBar hold={hold} name="Hold to talk" label="Hold to talk" disabled />);
  expect(bar).toBeDisabled();
});
