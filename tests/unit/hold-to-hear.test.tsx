import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { HoldToHear } from '../../src/HoldToHear';
import { HOLD_BAR_HEIGHT_PX } from '../../src/ui/HoldBar';

afterEach(cleanup);

test('Hold to hear is the shared hold bar: h-24 (96 px), full width, rounded-3xl, a speaker over the label', () => {
  expect(HOLD_BAR_HEIGHT_PX).toBe(96);
  render(<HoldToHear text="λόγος" />);
  const bar = screen.getByTestId('hold-to-hear');
  expect(bar).toHaveAttribute('data-hold-bar');
  expect(screen.getByRole('button', { name: 'Hold to hear' })).toBe(bar);
  for (const cls of ['h-24', 'w-full', 'max-w-xl', 'rounded-3xl']) expect(bar.className).toContain(cls);
  expect(bar.className).not.toContain('rounded-xl');
  expect(bar.querySelector('svg')).not.toBeNull();
  expect(bar).toHaveTextContent('Hold to hear');
  // the speaker, not the microphone of the talk bar
  expect(bar.querySelector('svg rect')).toBeNull();
});
