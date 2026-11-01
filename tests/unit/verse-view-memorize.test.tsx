// tests/unit/verse-view-memorize.test.tsx — the Memorize control in the Verse view (mw-fu7dqf.5): under the actions row for a verse, and for the passage under a heading as its range.
// It needs no licence (there is no key on this phone), and there is no Old Testament view to draw it in.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { setGreekInterest } from '../../src/data/repositories';
import { listMemorized } from '../../src/data/repositories/memorize';
import { memorizeSessionOf } from '../../src/nav/route';
import { clearBus } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../support/chapter-fetch';

beforeEach(async () => {
  clearBus();
  stopReading();
  window.localStorage.clear();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.reviews.clear(), db.recalls.clear(), db.settings.clear(), db.meta.clear()]);
  await setGreekInterest(3);
});
afterEach(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
});

const view = () => screen.findByRole('region', { name: 'Verse view' });

describe('Memorize in the Verse view', () => {
  it('shows for Romans 8:28 with no licence, and a tap memorizes it in English as Rom.8.28', async () => {
    window.history.replaceState(null, '', '/#/?b=rom&c=8&view=english&weave=off&v=28');
    render(<App />);
    const region = await view();
    await userEvent.click(await within(region).findByRole('button', { name: 'Memorize' }));
    await within(region).findByRole('button', { name: 'Memorizing · English' });
    expect((await listMemorized()).map((r) => `${r.lang}:${r.ref}`)).toEqual(['en:Rom.8.28']);
  });

  it('shows for the passage under a heading as its range, one reference', async () => {
    window.history.replaceState(null, '', '/#/?b=rom&c=8&view=english&weave=off&p=12');
    render(<App />);
    const region = await view();
    const control = await within(region).findByRole('button', { name: 'Memorize' });
    const range = control.getAttribute('data-memorize') as string;
    expect(range).toMatch(/^Rom\.8\.12-\d+$/);
    await userEvent.click(control);
    await waitFor(async () => expect((await listMemorized()).map((r) => r.ref)).toEqual([range]));
  });

  it('is the same control as a list row draws: Memorizing · English opens the language sheet', async () => {
    window.history.replaceState(null, '', '/#/?b=rom&c=8&view=english&weave=off&v=28');
    render(<App />);
    const region = await view();
    await userEvent.click(await within(region).findByRole('button', { name: 'Memorize' }));
    await userEvent.click(await within(region).findByRole('button', { name: 'Memorizing · English' }));
    const sheet = await screen.findByRole('dialog', { name: 'Memorize Rom 8:28' });
    expect(within(sheet).getAllByRole('switch')).toHaveLength(3);
  });

  it('shows the verse\'s progress mark under the control once it is memorized, and not before', async () => {
    window.history.replaceState(null, '', '/#/?b=rom&c=8&view=english&weave=off&v=28');
    render(<App />);
    const region = await view();
    const control = await within(region).findByRole('button', { name: 'Memorize' });
    expect(within(region).queryByRole('img', { name: /^Step / })).toBeNull();
    await userEvent.click(control);
    const mark = await within(region).findByRole('img', { name: 'Step 1 of 7 · due today' });
    expect(mark.compareDocumentPosition(await within(region).findByRole('button', { name: 'Memorizing · English' })) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it('offers Rehearse right after Memorize, without leaving the screen, and not before', async () => {
    window.history.replaceState(null, '', '/#/?b=rom&c=8&view=english&weave=off&v=28');
    render(<App />);
    const region = await view();
    const control = await within(region).findByRole('button', { name: 'Memorize' });
    expect(within(region).queryByRole('button', { name: 'Rehearse' })).toBeNull();
    await userEvent.click(control);
    await within(region).findByRole('button', { name: 'Rehearse' });
    expect(within(region).getByRole('button', { name: 'Memorizing · English' })).toBeTruthy();
  });

  it('Rehearse on a memorized passage opens a session on that same reference, and Back returns to the Verse view on it', async () => {
    window.history.replaceState(null, '', '/#/?b=rom&c=8&view=english&weave=off&p=12');
    render(<App />);
    let region = await view();
    const range = (await within(region).findByRole('button', { name: 'Memorize' })).getAttribute('data-memorize') as string;
    await userEvent.click(await within(region).findByRole('button', { name: 'Memorize' }));
    await userEvent.click(await within(region).findByRole('button', { name: 'Rehearse' }));
    await waitFor(() => expect(memorizeSessionOf(window.location.hash)).toEqual({ ref: range, lang: 'en' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Verse view' })).toBeNull());
    window.history.back();
    region = await view();
    expect(window.location.hash).toContain('p=12');
    expect(await within(region).findByRole('button', { name: 'Rehearse' })).toBeTruthy();
  });
});
