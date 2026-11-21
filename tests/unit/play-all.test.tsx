// tests/unit/play-all.test.tsx — Play all (src/lists/PlayAllBar.tsx, mw-9q8wp1.5): a verse list, and the Share sheet's Bible references, read every reference aloud in order through the
// passage player; an Old Testament one is read in English like the rest; the bar says 'Reading <reference> · k of N' and has Pause/Play and Stop; leaving the screen stops it.
// The engine is the honest fake on a manual clock.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetChapters } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { createVerseList } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { VerseListScreen } from '../../src/lists/VerseListScreen';
import { ShareReferences } from '../../src/share/ShareReferences';
import { getPassagePlayer, stopPassage } from '../../src/speech/passagePlayer';
import { getPlace, listKey, savePlace } from '../../src/speech/passagePlace';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const timeout = ASYNC_WAIT_MS;
let synth: FakeSynth;

beforeEach(async () => {
  clearBus();
  localStorage.clear();
  stubChapterFetch();
  forgetChapters();
  window.history.replaceState(null, '', '/#/lists');
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
});
afterEach(() => {
  cleanup();
  stopPassage();
  stopReading();
  vi.unstubAllGlobals();
});

const englishOfJudges = (chapter: number, verse: number): string =>
  (JSON.parse(readFileSync(`public/data/jdg/${chapter}.json`, 'utf8')) as { verses: { n: number; e: { t: string }[] }[] }).verses
    .find((v) => v.n === verse)!
    .e.map((c) => c.t)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);

const bar = () => screen.findByRole('status', { name: 'Playing the list' });
const reading = (text: string) => waitFor(() => expect(screen.getByRole('status', { name: 'Playing the list' })).toHaveTextContent(text), { timeout });

/** Lets the voice run on until the bar says `text`. */
async function listenUntil(text: string): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (screen.queryByRole('status', { name: 'Playing the list' })?.textContent?.includes(text)) return;
    await vi.waitFor(() => expect(synth.speaking || screen.queryByRole('status', { name: 'Playing the list' })?.textContent?.includes(text)).toBeTruthy(), { timeout });
    if (synth.speaking) act(() => synth.finishAll());
    await act(async () => {
      await Promise.resolve();
    });
  }
  await reading(text);
}

describe('Play all on a verse list', () => {
  it('reads the references in the list order, an Old Testament one in English too, and the bar says where it is', async () => {
    const list = await createVerseList('Refuge', ['Rom.8.1', 'Isa.30.21', 'Heb.7.24-25'], 1);
    render(<VerseListScreen id={list.id} />);
    expect(screen.queryByRole('status', { name: 'Playing the list' })).toBeNull();
    await userEvent.click(await screen.findByRole('button', { name: 'Play all' }));
    await reading('Reading Romans 8:1 · 1 of 3');
    await vi.waitFor(() => expect(synth.spoken.length).toBeGreaterThan(0), { timeout });
    expect(synth.spoken[0]).toMatchObject({ text: 'Romans 8:1', lang: 'en-US' });

    // the Old Testament reference is read in English like the rest (mw-uqlxea.3), its heading first, and nothing is skipped
    await listenUntil('Reading Isaiah 30:21 · 2 of 3');
    await vi.waitFor(() => expect(synth.spoken.map((s) => s.text)).toContain('Isaiah 30:21'), { timeout });
    const isaiahAt = synth.spoken.findIndex((s) => s.text === 'Isaiah 30:21');
    expect(isaiahAt).toBeGreaterThan(0);
    expect(synth.spoken.every((s) => !s.text.includes('skipping'))).toBe(true);
    await listenUntil('Reading Hebrews 7:24-25 · 3 of 3');
    await vi.waitFor(() => expect(synth.spoken.map((s) => s.text)).toContain('Hebrews 7:24-25'), { timeout });
    expect(synth.spoken[isaiahAt + 1]).toMatchObject({ lang: 'en-US', text: expect.stringContaining('This is the way') });
    expect(synth.spoken.every((s) => s.text !== '' && !s.text.includes('skipping'))).toBe(true);

    // the end of the list takes the bar away
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    act(() => synth.finishAll());
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Playing the list' })).toBeNull(), { timeout });
    expect(screen.getByRole('button', { name: 'Play all' })).toBeInTheDocument();
  });

  it('Pause pauses and the button reads Play, which resumes from the same place; Stop ends it and the bar leaves', async () => {
    const list = await createVerseList('Refuge', ['Rom.8.1', 'Heb.7.24-25'], 1);
    render(<VerseListScreen id={list.id} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Play all' }));
    await reading('Reading Romans 8:1 · 1 of 2');
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });

    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(() => expect(getPassagePlayer().state).toBe('paused'), { timeout });
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
    expect(screen.getByRole('status', { name: 'Playing the list' })).toHaveTextContent('Reading Romans 8:1 · 1 of 2');

    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    await waitFor(() => expect(getPassagePlayer().state).toBe('playing'), { timeout });
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Playing the list' })).toHaveTextContent('Reading Romans 8:1 · 1 of 2');

    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Playing the list' })).toBeNull(), { timeout });
    expect(getPassagePlayer().state).toBe('idle');
    expect(synth.speaking).toBe(false);
    expect(screen.getByRole('button', { name: 'Play all' })).toBeInTheDocument();
  });

  it('stops when he leaves the screen', async () => {
    const list = await createVerseList('Refuge', ['Rom.8.1', 'Heb.7.24-25'], 1);
    const view = render(<VerseListScreen id={list.id} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Play all' }));
    await reading('Reading Romans 8:1 · 1 of 2');
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    view.unmount();
    expect(getPassagePlayer().state).toBe('idle');
    expect(synth.speaking).toBe(false);
  });

  it("a saved range of chapters ('Judges 1-5') and a whole chapter are read whole, not as their first verse (mw-fnvjof.18)", async () => {
    const list = await createVerseList('Judges', ['Judg.1-5', '1Sam.8'], 1);
    render(<VerseListScreen id={list.id} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Play all' }));
    await reading('Reading Judges 1-5 · 1 of 2');
    await listenUntil('Reading 1 Samuel 8 · 2 of 2');
    // the first chapter's first verse and the last chapter's last verse were both read before the second reference began
    const said = synth.spoken.map((s) => s.text.replace(/\s+/g, ' ')).join(' ');
    expect(said).toContain('Judges 1-5');
    expect(said).toContain(englishOfJudges(1, 1));
    expect(said).toContain(englishOfJudges(5, 31));
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
  }, 60_000);

  it('offers no Play all on a list with no references', async () => {
    const list = await createVerseList('Empty', [], 1);
    render(<VerseListScreen id={list.id} />);
    await screen.findByText('This list holds no references yet.');
    expect(screen.queryByRole('button', { name: 'Play all' })).toBeNull();
  });
});

describe('Play all resumes where he stopped (mw-5r3p30.1236)', () => {
  const HEB = { heading: 'Hebrews 7:24-25', verse: 25, label: 'Hebrews 7:25' };

  it('says Play all when no place is kept, and no From the start', async () => {
    const list = await createVerseList('Refuge', ['Rom.8.1', 'Heb.7.24-25'], 1);
    render(<VerseListScreen id={list.id} />);
    expect(await screen.findByRole('button', { name: 'Play all' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'From the start' })).toBeNull();
  });

  it('with a kept place the button reads Resume with where, and starts the rest of the list at that verse', async () => {
    const list = await createVerseList('Refuge', ['Rom.8.1', 'Heb.7.24-25'], 1);
    savePlace(listKey(list.id), HEB);
    render(<VerseListScreen id={list.id} />);
    expect(screen.queryByRole('button', { name: 'Play all' })).toBeNull();
    await userEvent.click(await screen.findByRole('button', { name: 'Resume · Hebrews 7:25' }));
    await reading('Reading Hebrews 7:24-25 · 2 of 2');
    await vi.waitFor(() => expect(synth.spoken.length).toBeGreaterThan(0), { timeout });
    // it goes straight to the verse: neither Romans nor the heading is said first
    expect(synth.spoken[0].text).toContain('able to save');
    expect(synth.spoken.some((s) => s.text.includes('Romans'))).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
  });

  it("'From the start' starts at the first reference and clears the place", async () => {
    const list = await createVerseList('Refuge', ['Rom.8.1', 'Heb.7.24-25'], 1);
    savePlace(listKey(list.id), HEB);
    render(<VerseListScreen id={list.id} />);
    await userEvent.click(await screen.findByRole('button', { name: 'From the start' }));
    await reading('Reading Romans 8:1 · 1 of 2');
    await vi.waitFor(() => expect(synth.spoken.length).toBeGreaterThan(0), { timeout });
    expect(synth.spoken[0].text).toBe('Romans 8:1');
    expect(getPlace(listKey(list.id))?.heading).not.toBe('Hebrews 7:24-25');
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
  });

  it('a place for a reference the list no longer holds is not offered', async () => {
    const list = await createVerseList('Refuge', ['Rom.8.1'], 1);
    savePlace(listKey(list.id), HEB);
    render(<VerseListScreen id={list.id} />);
    expect(await screen.findByRole('button', { name: 'Play all' })).toBeInTheDocument();
  });

  it('play, stop partway by leaving the screen, come back: Resume at the verse where it stopped', async () => {
    const list = await createVerseList('Refuge', ['Rom.8.1', 'Heb.7.24-25'], 1);
    const view = render(<VerseListScreen id={list.id} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Play all' }));
    await listenUntil('Reading Hebrews 7:24-25 · 2 of 2');
    // the heading is said, then verse 24 is being read
    await vi.waitFor(() => expect(getPlace(listKey(list.id))?.heading).toBe('Hebrews 7:24-25'), { timeout });
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    act(() => synth.finish());
    await vi.waitFor(() => expect(getPlace(listKey(list.id))?.verse).toBe(24), { timeout });
    view.unmount();
    expect(getPassagePlayer().state).toBe('idle');
    expect(getPlace(listKey(list.id))).toMatchObject({ heading: 'Hebrews 7:24-25', verse: 24, label: 'Hebrews 7:24' });
    render(<VerseListScreen id={list.id} />);
    expect(await screen.findByRole('button', { name: 'Resume · Hebrews 7:24' })).toBeInTheDocument();
  }, 60_000);

  it('reaching the end of the list clears the place', async () => {
    const list = await createVerseList('Refuge', ['Rom.8.1'], 1);
    render(<VerseListScreen id={list.id} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Play all' }));
    await reading('Reading Romans 8:1 · 1 of 1');
    await vi.waitFor(() => expect(getPlace(listKey(list.id))).not.toBeNull(), { timeout });
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    act(() => synth.finishAll());
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Playing the list' })).toBeNull(), { timeout });
    expect(getPlace(listKey(list.id))).toBeNull();
    expect(screen.getByRole('button', { name: 'Play all' })).toBeInTheDocument();
  });
});

describe("Play all on the Share sheet's Bible references", () => {
  const TEXT = 'See Romans 8:1, then Isaiah 30:21 and Hebrews 7:24-25.';

  it('reads the references in the order showing, the Old Testament in English', async () => {
    render(<ShareReferences text={TEXT} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Play all' }));
    await reading('Reading Romans 8:1 · 1 of 3');
    await listenUntil('Reading Isaiah 30:21 · 2 of 3');
    await vi.waitFor(() => expect(synth.spoken.map((s) => s.text)).toContain('Isaiah 30:21'), { timeout });
    await listenUntil('Reading Hebrews 7:24-25 · 3 of 3');
    expect(synth.spoken.every((s) => !s.text.includes('skipping'))).toBe(true);
    // the Share sheet's Play all says each reference's heading first too
    expect(synth.spoken.map((s) => s.text)).toContain('Romans 8:1');
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Playing the list' })).toBeNull(), { timeout });
  });

  it('follows Bible order when that is what is showing', async () => {
    render(<ShareReferences text="Hebrews 7:24-25, then Romans 8:1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Bible order' }));
    await userEvent.click(screen.getByRole('button', { name: 'Play all' }));
    await reading('Reading Romans 8:1 · 1 of 2');
    await bar();
  });

  it('stops when the sheet goes', async () => {
    const view = render(<ShareReferences text={TEXT} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Play all' }));
    await reading('Reading Romans 8:1 · 1 of 3');
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    view.unmount();
    expect(getPassagePlayer().state).toBe('idle');
  });
});
