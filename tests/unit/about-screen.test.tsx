import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { About } from '../../src/About';
import { db } from '../../src/data/db';
import { keepTuned } from '../../src/data/repositories/tuned';
import { parseAttribution, plainText } from '../../src/attribution';
import { screenContextNow } from '../../src/tutor/screenContext';
import { suggestionsFor } from '../../src/tutor/screen';

afterEach(cleanup);

describe('the About screen and ATTRIBUTION.md', () => {
  it('shows every entry of ATTRIBUTION.md word for word, so the two cannot drift', () => {
    const doc = parseAttribution(readFileSync('ATTRIBUTION.md', 'utf8'));
    render(<About />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(doc.entries.map(plainText));
    expect(screen.getByText(plainText(doc.intro))).toBeVisible();
  });

  it('leaves the credits with the Ask the tutor control, so the tutor can explain what each is for', () => {
    render(<About />);
    const context = screenContextNow();
    expect(context?.name).toBe('About');
    const said = context?.credits?.map((c) => `${c.name}: ${c.use} (${c.licence}) ${c.link}`).join('\n') ?? '';
    for (const name of ['React', 'Dexie', 'WhatsOnChain', 'Gentium Plus', 'Beads', 'TBESG']) expect(said).toContain(name);
    expect(suggestionsFor('About')).toContain('What does each of these do for Lampas?');
  });

  it('points the learner to Biblical Mastery Academy near the top, with a link that opens in a new tab', () => {
    render(<About />);
    const link = document.querySelector<HTMLAnchorElement>('[data-bma-note] a');
    expect(link).not.toBeNull();
    if (!link) return;
    expect(link).toHaveTextContent('Biblical Mastery Academy');
    expect(link).toHaveAttribute('href', 'https://biblicalmastery.academy/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noreferrer');
    const note = link.closest('[data-bma-note]');
    expect(note).not.toBeNull();
    expect(note?.textContent).toContain('Lampas was inspired by Biblical Mastery Academy.');
    expect(note?.textContent).toContain('a warm community of people learning Greek together');
    // above every credit, and not one of the credits' own list items
    const firstCredit = screen.getAllByRole('listitem')[0];
    expect(note?.compareDocumentPosition(firstCredit) ?? 0).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(note?.closest('li')).toBeNull();
  });
});

// mw-t3xu9a.8: the line the nightly tutor-weights run leaves (docs/ask-tutor.md 'How the tutor learns what to carry'): 'Tutor tuned <date>: N changes', and a tap shows the reasons.
describe('Tutor tuned', () => {
  beforeEach(async () => {
    await db.open();
    await db.settings.clear();
  });

  it('shows nothing before any run', async () => {
    render(<About />);
    // the screen has read its other rows by now
    await screen.findByText('Preface');
    expect(screen.queryByText(/Tutor tuned/)).toBeNull();
  });

  it('shows the date and the number of changes after a run, and a tap lists the reasons', async () => {
    await keepTuned({ date: '2026-10-25', at: Date.UTC(2026, 9, 25, 4), changes: 2, reasons: ['rusty-words was asked back 5 times on the Reader', 'progress, twice on Words'], forwarded: 0 });
    render(<About />);
    const line = await screen.findByRole('button', { name: /Tutor tuned 2026-10-25: 2 changes/ });
    expect(line).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('progress, twice on Words')).toBeNull();
    fireEvent.click(line);
    expect(line).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('rusty-words was asked back 5 times on the Reader')).toBeVisible();
    expect(screen.getByText('progress, twice on Words')).toBeVisible();
  });

  it('says one change in the singular and no change as 0 changes', async () => {
    await keepTuned({ date: '2026-10-25', at: 1, changes: 1, reasons: [], forwarded: 0 });
    render(<About />);
    expect(await screen.findByRole('button', { name: /Tutor tuned 2026-10-25: 1 change$/ })).toBeVisible();
    cleanup();
    await keepTuned({ date: '2026-10-26', at: 2, changes: 0, reasons: ['nothing needed to change'], forwarded: 0 });
    render(<About />);
    expect(await screen.findByRole('button', { name: /Tutor tuned 2026-10-26: 0 changes/ })).toBeVisible();
  });
});
