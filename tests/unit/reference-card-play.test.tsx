// tests/unit/reference-card-play.test.tsx — the pop-up a Bible reference opens has Play (mw-9q8wp1.4): it reads the passage aloud through the passage player,
// turns into Pause and Stop, on an Old Testament card as on a New Testament one (a book with no data says 'no Old Testament present', tests/unit/passage-player.test.ts); closing the card stops the reading.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { ReferenceLink } from '../../src/markdown/ReferenceCard';
import { getPassagePlayer, stopPassage } from '../../src/speech/passagePlayer';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../support/chapter-fetch';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const timeout = ASYNC_WAIT_MS;
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';

let synth: FakeSynth;
beforeEach(async () => {
  clearBus();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  await Promise.all(db.tables.map((table) => table.clear()));
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
});
afterEach(() => {
  cleanup();
  stopPassage();
  stopReading();
  vi.unstubAllGlobals();
});

async function openCard(written: string, name: string, heading: string): Promise<HTMLElement> {
  render(<ReferenceLink written={written}>{name}</ReferenceLink>);
  await userEvent.click(screen.getByRole('link', { name }));
  return screen.findByRole('dialog', { name: heading });
}

describe('Play on a New Testament card', () => {
  it('shows Play beside Close and Open', async () => {
    const card = await openCard('Heb 7:2', 'Heb 7:2', 'Hebrews 7:2');
    await waitFor(() => expect(card.querySelector('[data-reference-text]')).not.toBeNull());
    expect(within(card).getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Open' })).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Pause' })).toBeNull();
  });

  it('Play reads the passage and turns into Pause and Stop', async () => {
    const card = await openCard('Heb 7:2', 'Heb 7:2', 'Hebrews 7:2');
    await userEvent.click(within(card).getByRole('button', { name: 'Play' }));
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    // the pop-up's Play says the reference first (mw-9q8wp1.9), then the verse
    expect(synth.spoken[0]).toMatchObject({ text: 'Hebrews 7:2', lang: 'en-US' });
    synth.finish();
    await vi.waitFor(() => expect(synth.spoken.length).toBeGreaterThan(1), { timeout });
    expect(synth.spoken[1].text).toContain('Abraham apportioned');
    expect(getPassagePlayer()).toMatchObject({ state: 'playing', current: { heading: 'Hebrews 7:2' } });
    expect(getPassagePlayer()).toMatchObject({ state: 'playing' });
    expect(within(card).queryByRole('button', { name: 'Play' })).toBeNull();
    expect(within(card).getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  });

  it('Pause turns into Play again to go on; Stop ends it and gives Play back', async () => {
    const card = await openCard('Heb 7:2', 'Heb 7:2', 'Hebrews 7:2');
    await userEvent.click(within(card).getByRole('button', { name: 'Play' }));
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    await userEvent.click(within(card).getByRole('button', { name: 'Pause' }));
    await within(card).findByRole('button', { name: 'Resume' });
    expect(getPassagePlayer().state).toBe('paused');
    await userEvent.click(within(card).getByRole('button', { name: 'Resume' }));
    await within(card).findByRole('button', { name: 'Pause' });
    await userEvent.click(within(card).getByRole('button', { name: 'Stop' }));
    await within(card).findByRole('button', { name: 'Play' });
    expect(getPassagePlayer().state).toBe('idle');
    expect(synth.speaking).toBe(false);
  });

  it('goes back to Play by itself when the passage has been read', async () => {
    const card = await openCard('Heb 7:2', 'Heb 7:2', 'Hebrews 7:2');
    await userEvent.click(within(card).getByRole('button', { name: 'Play' }));
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    synth.finishAll();
    await within(card).findByRole('button', { name: 'Play' });
  });
});

describe('Play on an Old Testament card Lampas holds (mw-5r3p30.840)', () => {
  it('reads the reference, then the verse, and the card has Open', async () => {
    const card = await openCard('Isa 30:21', 'Isa 30:21', 'Isaiah 30:21');
    await userEvent.click(within(card).getByRole('button', { name: 'Play' }));
    await vi.waitFor(() => expect(synth.spoken.length).toBe(1), { timeout });
    expect(synth.spoken[0].text).toBe('Isaiah 30:21');
    synth.finish();
    await vi.waitFor(() => expect(synth.spoken.length).toBeGreaterThan(1), { timeout });
    expect(synth.spoken[1].text).not.toContain('skipping');
    expect(within(card).getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });
});

describe('closing the card', () => {
  it('stops the reading', async () => {
    const card = await openCard('Heb 7:2', 'Heb 7:2', 'Hebrews 7:2');
    await userEvent.click(within(card).getByRole('button', { name: 'Play' }));
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    await userEvent.click(within(card).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getPassagePlayer().state).toBe('idle');
    expect(synth.speaking).toBe(false);
    expect(synth.calls).toContain('cancel');
  });

  it('leaves a reading that is not its own alone', async () => {
    const card = await openCard('Heb 7:2', 'Heb 7:2', 'Hebrews 7:2');
    await userEvent.click(within(card).getByRole('button', { name: 'Close' }));
    expect(getPassagePlayer().state).toBe('idle');
  });
});
