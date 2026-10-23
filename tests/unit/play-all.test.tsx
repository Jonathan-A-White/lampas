// tests/unit/play-all.test.tsx — Play all (src/lists/PlayAllBar.tsx, mw-9q8wp1.5): a verse list, and the Share sheet's Bible references, read every reference aloud in order through the
// passage player; an Old Testament one is announced as skipped and the player goes on; the bar says 'Reading <reference> · k of N' and has Pause/Play and Stop; leaving the screen stops it.
// The engine is the honest fake on a manual clock.
import 'fake-indexeddb/auto';
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
  it('reads the New Testament references in the list order, skips an Old Testament one aloud, and the bar says where it is', async () => {
    const list = await createVerseList('Refuge', ['Rom.8.1', 'Isa.30.21', 'Heb.7.24-25'], 1);
    render(<VerseListScreen id={list.id} />);
    expect(screen.queryByRole('status', { name: 'Playing the list' })).toBeNull();
    await userEvent.click(await screen.findByRole('button', { name: 'Play all' }));
    await reading('Reading Romans 8:1 · 1 of 3');
    await vi.waitFor(() => expect(synth.spoken.length).toBeGreaterThan(0), { timeout });
    expect(synth.spoken[0].lang).toBe('en-US');

    await listenUntil('Reading Isaiah 30:21 · 2 of 3');
    await vi.waitFor(() => expect(synth.spoken.map((s) => s.text)).toContain('Isaiah 30:21: skipping, no Old Testament present'), { timeout });
    const skippedAt = synth.spoken.findIndex((s) => s.text === 'Isaiah 30:21: skipping, no Old Testament present');
    expect(skippedAt).toBeGreaterThan(0);
    expect(synth.spoken.slice(0, skippedAt).every((s) => !s.text.includes('Isaiah'))).toBe(true);

    await listenUntil('Reading Hebrews 7:24-25 · 3 of 3');
    await vi.waitFor(() => expect(synth.spoken.length).toBeGreaterThan(skippedAt + 1), { timeout });
    expect(synth.spoken.slice(skippedAt + 1).every((s) => s.text !== '' && !s.text.includes('skipping'))).toBe(true);

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

  it('offers no Play all on a list with no references', async () => {
    const list = await createVerseList('Empty', [], 1);
    render(<VerseListScreen id={list.id} />);
    await screen.findByText('This list holds no references yet.');
    expect(screen.queryByRole('button', { name: 'Play all' })).toBeNull();
  });
});

describe("Play all on the Share sheet's Bible references", () => {
  const TEXT = 'See Romans 8:1, then Isaiah 30:21 and Hebrews 7:24-25.';

  it('reads the references in the order showing, and says what it skips', async () => {
    render(<ShareReferences text={TEXT} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Play all' }));
    await reading('Reading Romans 8:1 · 1 of 3');
    await listenUntil('Reading Isaiah 30:21 · 2 of 3');
    await vi.waitFor(() => expect(synth.spoken.map((s) => s.text)).toContain('Isaiah 30:21: skipping, no Old Testament present'), { timeout });
    await listenUntil('Reading Hebrews 7:24-25 · 3 of 3');
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
