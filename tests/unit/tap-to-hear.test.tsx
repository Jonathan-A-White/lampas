import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { TapToHear } from '../../src/TapToHear';
import { BAR_HEIGHT_PX } from '../../src/ui/barClass';

afterEach(cleanup);

test('Tap to hear has the hold bar\'s look: h-24 (96 px), full width, rounded-3xl, a speaker over the label, and is a tap bar, not a hold bar', () => {
  expect(BAR_HEIGHT_PX).toBe(96);
  render(<TapToHear text="λόγος" />);
  const bar = screen.getByTestId('tap-to-hear');
  expect(bar).toHaveAttribute('data-tap-bar');
  expect(bar).not.toHaveClass('bk-composer__bar');
  expect(screen.getByRole('button', { name: 'Tap to hear' })).toBe(bar);
  for (const cls of ['h-24', 'w-full', 'max-w-xl', 'rounded-3xl', 'bg-accent']) expect(bar.className).toContain(cls);
  expect(bar.className).not.toContain('rounded-xl');
  expect(bar.querySelector('svg')).not.toBeNull();
  expect(bar).toHaveTextContent('Tap to hear');
  // the speaker, not the microphone of the talk bar
  expect(bar.querySelector('svg rect')).toBeNull();
});
