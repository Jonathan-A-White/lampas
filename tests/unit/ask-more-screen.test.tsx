// Settings > Ask for more (src/settings/AskMoreScreen.tsx, mw-5r3p30.726): every request to the maker goes through the tutor talk (the PWA sheet's rule 33), so the
// page has no 'Or fill in a form' section and no form of its own; its one button opens a talk with "I'd like Lampas to have " typed in the composer, not sent.
import '@testing-library/react/dont-cleanup-after-each';
import 'fake-indexeddb/auto';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { LicenceContext } from '../../src/gate/licenceContext';
import { AskMoreScreen, ASK_BEGUN } from '../../src/settings/AskMoreScreen';

afterAll(() => {
  cleanup();
  db.close();
});

beforeEach(async () => {
  cleanup();
  clearBus();
  await db.open();
});

describe('Ask for more', () => {
  it('shows no "Or fill in a form" section and no form: one button, Ask the tutor', () => {
    render(<AskMoreScreen />);
    const main = screen.getByRole('main');
    expect(within(main).queryByRole('heading', { name: 'Or fill in a form' })).toBeNull();
    expect(within(main).queryByRole('form')).toBeNull();
    expect(within(main).queryByRole('textbox')).toBeNull();
    for (const old of ['An approach or programme', 'A study resource', 'A text', 'A translation', 'Let the tutor do it']) {
      expect(within(main).queryByRole('button', { name: old })).toBeNull();
    }
    expect(within(main).getAllByRole('button').map((b) => b.textContent)).toEqual(['Ask the tutor']);
  });

  it('opens a tutor talk with the starting sentence typed in the composer, not sent', async () => {
    render(<AskMoreScreen />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ask the tutor' }));
    const sheet = await screen.findByRole('dialog', { name: 'Ask the tutor: Ask for more' });
    expect(within(sheet).getByRole('textbox', { name: 'Your message' })).toHaveValue(ASK_BEGUN);
    expect(ASK_BEGUN).toBe("I'd like Lampas to have ");
    expect(await db.requests.count()).toBe(0);
  });

  it('with no licence says asking needs one and draws neither the tutor button nor a form', () => {
    const unlicensed = { licence: 'not-licensed' as const, locked: null, publicKeyHex: '', checkAgain: () => {}, siteIssued: false, removed: () => {} };
    render(
      <LicenceContext.Provider value={unlicensed}>
        <AskMoreScreen />
      </LicenceContext.Provider>,
    );
    expect(screen.getByRole('button', { name: 'Needs a licence' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ask the tutor' })).toBeNull();
    expect(screen.queryByRole('form')).toBeNull();
  });

  it('keeps the form helper, the ask-for-more command and the more-forms file out of the screen', () => {
    const source = readFileSync('src/settings/AskMoreScreen.tsx', 'utf8');
    expect(source).not.toMatch(/formHelper|formCommands|askForMoreCommand|AskForBook|<form|<textarea|LimitedInput/);
  });
});
