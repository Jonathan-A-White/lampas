// mw-5r3p30.1210: a link in a sheet that takes him to a place (leaveSheetsThen, src/ui/sheetBack.ts) leaves one step each way: Back returns to the screen he was on, Forward to the place.
// Pushed above the sheets' own entries, the place was reached by Back over a stale sheet entry and Forward bounced off it. The sweep reads the six users of the old closeAllSheets.
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openHash, openVerseAt } from '../../src/nav/route';
import { leaveSheetsThen, useSheetBack } from '../../src/ui/sheetBack';

const HOME = '/#/?b=exo&c=2';
const hash = (): string => window.location.hash;

function Sheet({ name, onClose, children }: { name: string; onClose: () => void; children?: React.ReactNode }) {
  useSheetBack(onClose);
  return (
    <div role="dialog" aria-label={name}>
      <h2>{name}</h2>
      {children}
    </div>
  );
}

/** A screen with a sheet, or two (the second over the first), whose link leaves for a place by `go`. */
function Screen({ sheets, go }: { sheets: 1 | 2; go: () => void }) {
  const [open, setOpen] = useState<0 | 1 | 2>(sheets);
  return (
    <main>
      {open >= 1 ? (
        <Sheet name="First" onClose={() => setOpen(0)}>
          <button type="button" onClick={() => leaveSheetsThen(go)}>
            Leave
          </button>
        </Sheet>
      ) : null}
      {open >= 2 ? <Sheet name="Second" onClose={() => setOpen(1)} /> : null}
    </main>
  );
}

/** Opens the screen with its sheets, then leaves by the first sheet's link (the link is the one button; the second sheet is over it, so it is clicked through the DOM). */
async function openAndLeave(sheets: 1 | 2, go: () => void): Promise<void> {
  render(<Screen sheets={sheets} go={go} />);
  await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(sheets));
  await waitFor(() => expect(window.history.state?.sheet).toBe(sheets));
  const link = screen.getByRole('button', { name: 'Leave' });
  const user = userEvent.setup();
  await user.click(link);
}

beforeEach(async () => {
  window.history.replaceState(null, '', HOME);
  // the entry beneath the screen: a Back from it would leave the app, so it is a second screen first
  window.history.pushState(null, '', '/#/?b=exo&c=2&v=1');
  window.history.replaceState(null, '', HOME);
});
afterEach(() => cleanup());

describe.each([1, 2] as const)('a link out of %i open sheet(s)', (sheets) => {
  it.each([
    ['a Definition reference', () => openHash('#/?ref=Judg.18.30&as=Jdg.18.30'), '#/?ref=Judg.18.30&as=Jdg.18.30'],
    ['Read it on Try it', () => openVerseAt({ book: 'mat', chapter: 5, verse: 3 }), '#/?b=mat&c=5&v=3&view=verse'],
  ])('%s: Back returns to the screen, Forward to the place', async (_name, go, place) => {
    await openAndLeave(sheets, go);
    await waitFor(() => expect(hash()).not.toBe('#/?b=exo&c=2'));
    const placed = hash();
    expect(placed).toContain(place.split('?')[1]?.split('&')[0]);
    window.history.back();
    await waitFor(() => expect(hash()).toBe('#/?b=exo&c=2'));
    window.history.forward();
    await waitFor(() => expect(hash()).toBe(placed));
  });
});

it('with no sheet open the place is pushed at once', async () => {
  let went = false;
  leaveSheetsThen(() => {
    went = true;
  });
  expect(went).toBe(true);
});

describe('the sweep: every sheet link that leaves the screen goes by leaveSheetsThen', () => {
  const USERS = ['src/Definition.tsx', 'src/TryItSheet.tsx', 'src/reader/VariantSheet.tsx', 'src/reader/VariantKey.tsx', 'src/reader/Rp2026Sheet.tsx', 'src/reader/ReaderMenu.tsx'];
  it.each(USERS)('%s calls leaveSheetsThen and not closeAllSheets', (file) => {
    const text = readFileSync(file, 'utf8');
    expect(text).toMatch(/leaveSheetsThen\(/);
    expect(text).not.toMatch(/closeAllSheets\(/);
  });
});
