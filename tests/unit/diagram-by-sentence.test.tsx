// tests/unit/diagram-by-sentence.test.tsx — Diagram by sentence (mw-5r3p30.897) through the whole app with a fake mill: Diagram on Ephesians 1:5 draws the sentence 1:3-14 and names it, a verse of two
// sentences (John 2:4) draws two diagrams stacked, and each is asked for and kept under its own reference. The mill answers a flat tree of whatever words it is sent (tests/support/flat-diagram.ts).
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setGreekInterest, setReaderView } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { tutorTimings } from '../../src/services/tutor';
import { setVerseAction } from '../../src/verse/action';
import { stubChapterFetch } from '../support/chapter-fetch';
import { flatDiagram } from '../support/flat-diagram';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../support/fake-postern';

const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;

beforeEach(async () => {
  cleanup();
  clearBus();
  forgetTrail();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.localStorage.setItem('lampas.welcome', 'done');
  window.localStorage.setItem('lampas.diagram-lesson.invite', 'dismissed');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.replyFor = (input, kind) => (kind === 'sentence-diagram' ? { status: 'answered', answer: flatDiagram(input) } : undefined);
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.diagrams.clear()]);
  await setGreekInterest(5);
  await db.settings.put({ key: 'hebrewInterest', value: '3' });
  await setReaderView('greek');
  setVerseAction('diagram');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const open = async (hash: string): Promise<HTMLElement> => {
  window.history.replaceState(null, '', hash);
  render(<App />);
  const view = await screen.findByRole('region', { name: 'Verse view' });
  return within(view).findByRole('region', { name: 'Diagram' });
};
const asked = (): { ref: string; lang: string; words: { i: number; verse?: number }[] }[] =>
  fake.received.filter((r) => r.grist.kind === 'sentence-diagram').map((r) => r.input as { ref: string; lang: string; words: { i: number; verse?: number }[] });

describe('Diagram draws the sentence', () => {
  it('Diagram on Ephesians 1:5 draws 1:3-14 as one, named by its range, asked for once under that range', async () => {
    const pane = await open('/#/?b=eph&c=1&v=5');
    expect(await within(pane).findByText('Ephesians 1:3-14, one sentence')).toBeInTheDocument();
    expect(await within(pane).findByRole('img', { name: 'Sentence diagram of Ephesians 1:3-14, one sentence, Greek' })).toBeInTheDocument();
    expect(within(pane).getAllByRole('img')).toHaveLength(1);
    const [only, ...rest] = asked();
    expect(rest).toEqual([]);
    expect(only.ref).toBe('Ephesians 1:3-14');
    expect(only.lang).toBe('greek');
    expect(new Set(only.words.map((w) => w.verse).filter((v) => v !== undefined))).toEqual(new Set([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]));
    expect((await db.diagrams.toArray()).map((d) => d.ref)).toEqual(['Ephesians 1:3-14']);
  });

  it('the same sentence from another of its verses is the one kept diagram, no second ask', async () => {
    let pane = await open('/#/?b=eph&c=1&v=5');
    await within(pane).findByRole('img');
    cleanup();
    pane = await open('/#/?b=eph&c=1&v=11');
    expect(await within(pane).findByText('Ephesians 1:3-14, one sentence')).toBeInTheDocument();
    await within(pane).findByRole('img');
    expect(asked()).toHaveLength(1);
  });

  it('a verse of one sentence has no caption and draws as it always did, John 11:35', async () => {
    const pane = await open('/#/?b=jhn&c=11&v=35');
    expect(await within(pane).findByRole('img', { name: 'Sentence diagram of John 11:35, Greek' })).toBeInTheDocument();
    expect(pane.querySelector('[data-diagram-caption]')).toBeNull();
    expect(asked().map((a) => a.ref)).toEqual(['John 11:35']);
  });

  it('a verse of two sentences, John 2:4, draws two diagrams stacked, each named, each asked for', async () => {
    const pane = await open('/#/?b=jhn&c=2&v=4');
    expect(await within(pane).findByText('John 2:4, one sentence (1 of 2 in verse 4)')).toBeInTheDocument();
    expect(within(pane).getByText('John 2:4, one sentence (2 of 2 in verse 4)')).toBeInTheDocument();
    await waitFor(() => expect(within(pane).getAllByRole('img')).toHaveLength(2));
    expect(asked()).toHaveLength(2);
    expect(new Set(asked().map((a) => a.ref)).size).toBe(2);
    expect(asked().reduce((sum, a) => sum + a.words.length, 0)).toBe(14);
    // one invitation to the lesson and Redraw per diagram: the first only carries the invitation
    expect(within(pane).getAllByRole('button', { name: 'Redraw' })).toHaveLength(2);
  });

  it('Genesis 1:1 is one Hebrew sentence', async () => {
    window.history.replaceState(null, '', '/#/?b=gen&c=1');
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Verse 1' }));
    const pane = await within(await screen.findByRole('region', { name: 'Verse view' })).findByRole('region', { name: 'Diagram' });
    expect(await within(pane).findByRole('img', { name: 'Sentence diagram of Genesis 1:1, Hebrew' })).toBeInTheDocument();
    expect(asked().map((a) => [a.ref, a.lang])).toEqual([['Genesis 1:1', 'hebrew']]);
  });
});
