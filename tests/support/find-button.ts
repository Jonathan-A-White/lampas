// tests/support/find-button.ts — finds a button on a heavy screen by its label or text (mw-5r3p30.86). The Reader draws ~900
// elements; findByRole('button', { name }) works out the accessible name of every button, which reads the computed style of
// each element under it (~840 reads, 2.5 s of CPU in jsdom at load 27) and again on every change of the page, so a loaded
// host outruns the 5 s wait although the button was there at once. This reads the label, else the text, of each button and
// no style. Use it on the Reader; the visibility check stays with the caller (toBeVisible).
import { waitFor } from '@testing-library/react';

const labelOf = (button: Element): string => (button.getAttribute('aria-label') ?? button.textContent ?? '').replace(/\s+/g, ' ').trim();

const matches = (name: string | RegExp, label: string): boolean => (typeof name === 'string' ? label === name : name.test(label));

export function queryButton(name: string | RegExp): HTMLElement | null {
  const found = [...document.querySelectorAll<HTMLElement>('button, [role="button"]')].filter((b) => matches(name, labelOf(b)));
  if (found.length > 1) throw new Error(`${found.length} buttons are named ${String(name)}`);
  return found[0] ?? null;
}

export async function findButton(name: string | RegExp): Promise<HTMLElement> {
  return waitFor(() => {
    const button = queryButton(name);
    if (!button) throw new Error(`no button named ${String(name)}`);
    return button;
  });
}
