// tests/unit/verse-view-diagram.test.tsx — a diagram is of one verse (mw-5r3p30.895): the Verse view of a passage or a range of verses has no Diagram action, the view of one verse keeps it
// and its pane opens. A phone left on Diagram by a verse opens a passage on Listen (the kept action is not changed).
import 'fake-indexeddb/auto';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setGreekInterest, setReaderView } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { tutorTimings } from '../../src/services/tutor';
import { actionsFor, getVerseAction, setVerseAction } from '../../src/verse/action';
import { stubChapterFetch } from '../support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN } from '../support/fake-postern';

const PHONE_KEY = '00'.repeat(31) + '02';

beforeEach(async () => {
  cleanup();
  clearBus();
  forgetTrail();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.localStorage.setItem('lampas.welcome', 'done');
  tutorTimings.pollMs = 20;
  const fake = makeFakePostern();
  fake.replyFor = () => undefined;
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.diagrams.clear()]);
  await setGreekInterest(3);
  await setReaderView('english');
  setVerseAction('listen');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const open = async (hash: string): Promise<HTMLElement> => {
  window.history.replaceState(null, '', hash);
  render(<App />);
  return screen.findByRole('region', { name: 'Verse view' });
};
const labels = (region: HTMLElement): string[] => within(region.querySelector<HTMLElement>('[role="group"][aria-label="Actions"]')!).getAllByRole('button').map((b) => b.textContent ?? '');

describe('the Diagram action is of one verse', () => {
  it('is not in the row of a passage, Revelation 10:1-11', async () => {
    const region = await open('/#/?ref=Rev.10.1-11');
    expect(region.getAttribute('data-verse-view')).toBe('1-11');
    expect(labels(region)).toEqual(expect.arrayContaining(['Listen', 'Ask the tutor', 'Quiz me']));
    expect(within(region).queryByRole('button', { name: 'Diagram' })).toBeNull();
  });

  it('is not in the row of a range of two verses either', async () => {
    const region = await open('/#/?ref=Rev.10.1-2');
    expect(within(region).queryByRole('button', { name: 'Diagram' })).toBeNull();
  });

  it('opens a passage on Listen, not on the Diagram a verse left chosen, and draws no pane', async () => {
    setVerseAction('diagram');
    const region = await open('/#/?ref=Rev.10.1-11');
    expect(within(region).getByRole('button', { name: 'Listen' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(region).queryByRole('region', { name: 'Diagram' })).toBeNull();
    expect(getVerseAction()).toBe('diagram');
  });

  it('is in the row of one verse, Revelation 10:1, and its pane opens', async () => {
    const region = await open('/#/?ref=Rev.10.1');
    expect(region.getAttribute('data-verse-view')).toBe('1');
    await userEvent.click(within(region).getByRole('button', { name: 'Diagram' }));
    expect(await within(region).findByRole('region', { name: 'Diagram' })).toBeInTheDocument();
  });

  it('leaves actionsFor as it was for one verse and drops only Diagram for many', () => {
    expect(actionsFor(true, 'grc', true, true).map((a) => a.id)).toEqual(['listen', 'read', 'ask', 'quiz', 'diagram']);
    expect(actionsFor(true, 'grc', true, false).map((a) => a.id)).toEqual(['listen', 'read', 'ask', 'quiz']);
    expect(actionsFor(true, 'hbo', false, false).map((a) => a.id)).toEqual(['listen', 'read', 'ask']);
  });
});
