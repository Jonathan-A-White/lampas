// The Lampas sheet that reads a text sermon aloud (mw-ecpivg5.2, docs/sermons.md 'The reader'): a row of a source the sermon index serves text for opens it under 'Open web sermons in' Lampas, read aloud (the default); it
// asks GET /v1/text, shows the title and the paragraphs, starts the phone voice at once, marks the paragraph read, has Play / Pause, Back and Forward a paragraph, Restart and Stop, says the time left and keeps his place per
// sermon. The speech engine is voice-kit's honest fake (tests/support/fake-speech.ts); the service is a stubbed fetch (SERMONS_URL is empty in the tests, so nothing reaches a real one).
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearBus } from '../../src/events/bus';
import type { LinkRow } from '../../src/sermons/merge';
import { SermonReaderHost } from '../../src/sermons/SermonReader';
import { closeSermonText, openSermonText, readPlace } from '../../src/sermons/sermonText';
import { setSermonsUrl } from '../../src/services/sermons';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { ASYNC_WAIT_MS as timeout } from '../support/timeouts';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';

const BASE = 'https://sermons.test';
const WEB = 'https://ccel.org/ccel/spurgeon/sermons06.xxiv.html';
const row: LinkRow = { id: '311', source: 'spurgeon-ccel', title: 'The Beginning, Increase, and End of the Divine Life', open: { url: WEB }, opensIn: 'web' };
const PARAGRAPHS = ['Dear friends, we begin.', 'Then the work increases.', 'And at last it ends.'];
const TEXT = { id: '311', title: 'The Beginning, Increase, and End', source: 'spurgeon-ccel', url: WEB, paragraphs: PARAGRAPHS };

let synth: FakeSynth;
let asked: string[];
let opened: string[];

const serve = (body: unknown, status = 200) =>
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    asked.push(String(input));
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
  });

/** Opens the reader on the row, inside act: it draws the sheet and asks the service. */
async function open(): Promise<void> {
  render(<SermonReaderHost />);
  await act(async () => {
    openSermonText(row);
  });
  await screen.findByRole('heading', { name: TEXT.title }, { timeout });
}
const sheet = () => screen.getByRole('dialog', { name: /The Beginning/ });
const marked = () => [...sheet().querySelectorAll('[data-sermon-paragraph]')].findIndex((p) => p.hasAttribute('data-reading'));
const said = () => synth.spoken.map((s) => s.text);
const press = async (name: string) => {
  await act(async () => {
    await userEvent.click(within(sheet()).getByRole('button', { name }));
  });
};

beforeEach(() => {
  localStorage.clear();
  clearBus();
  asked = [];
  opened = [];
  synth = stubSpeech([ENGLISH_VOICE]);
  setSermonsUrl(BASE);
  vi.stubGlobal('open', (url: string) => {
    opened.push(url);
    return null;
  });
  serve(TEXT);
});
afterEach(() => {
  cleanup();
  act(() => {
    closeSermonText();
    stopReading();
  });
  setSermonsUrl(undefined);
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('opening a sermon', () => {
  it('asks the sermon index for its text, shows the title and each paragraph and starts reading the first at once', async () => {
    await open();
    expect(asked).toHaveLength(1);
    expect(asked[0]).toBe(`${BASE}/v1/text?id=311&source=spurgeon-ccel`);
    for (const p of PARAGRAPHS) expect(within(sheet()).getByText(p)).toBeInTheDocument();
    expect(said()[0]).toBe(PARAGRAPHS[0]);
    expect(marked()).toBe(0);
    expect(within(sheet()).getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('says the time left, about N min, from the paragraph being read', async () => {
    await open();
    expect(within(sheet()).getByText(/^(about \d+ min|less than a minute) left$/)).toBeInTheDocument();
  });
});

describe('the controls', () => {
  it('Forward reads the next paragraph and marks it; Back goes to the one before', async () => {
    await open();
    await press('Forward a paragraph');
    expect(marked()).toBe(1);
    expect(said().at(-1)).toBe(PARAGRAPHS[1]);
    await press('Back a paragraph');
    expect(marked()).toBe(0);
    expect(said().at(-1)).toBe(PARAGRAPHS[0]);
  });

  it('Back at the first paragraph stays at it', async () => {
    await open();
    await press('Back a paragraph');
    expect(marked()).toBe(0);
  });

  it('Pause holds the voice and Play goes on', async () => {
    await open();
    await press('Pause');
    expect(within(sheet()).getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(getReading().status).toBe('paused');
    await press('Play');
    expect(within(sheet()).getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(getReading().status).toBe('reading');
  });

  it('Stop ends the reading and keeps the place; Play reads again from it', async () => {
    await open();
    await press('Forward a paragraph');
    await press('Stop');
    expect(synth.speaking).toBe(false);
    expect(within(sheet()).getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(marked()).toBe(1);
    await press('Play');
    expect(said().at(-1)).toBe(PARAGRAPHS[1]);
  });

  it('Restart goes to the top and forgets the place', async () => {
    await open();
    await press('Forward a paragraph');
    await press('Forward a paragraph');
    await press('Restart');
    expect(marked()).toBe(0);
    expect(said().at(-1)).toBe(PARAGRAPHS[0]);
    expect(readPlace('spurgeon-ccel', '311', PARAGRAPHS.length)).toBe(0);
  });

  it('Close stops the voice and takes the sheet away', async () => {
    await open();
    await press('Close');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(synth.speaking).toBe(false);
  });
});

describe('his place', () => {
  it('is kept per sermon, and reopening resumes at that paragraph', async () => {
    await open();
    await press('Forward a paragraph');
    await press('Forward a paragraph');
    expect(readPlace('spurgeon-ccel', '311', PARAGRAPHS.length)).toBe(2);
    await press('Close');
    synth.calls.length = 0;
    await act(async () => {
      openSermonText(row);
    });
    await screen.findByRole('heading', { name: TEXT.title }, { timeout });
    expect(marked()).toBe(2);
    expect(said().at(-1)).toBe(PARAGRAPHS[2]);
  });

  it('is forgotten when the sermon is read to its end: the next time starts at the top', async () => {
    await open();
    await act(async () => synth.finishAll());
    expect(within(sheet()).getByText('finished')).toBeInTheDocument();
    expect(readPlace('spurgeon-ccel', '311', PARAGRAPHS.length)).toBe(0);
    await press('Play');
    expect(marked()).toBe(0);
    expect(said().at(-1)).toBe(PARAGRAPHS[0]);
  });
});

describe('a browser that wants a tap first', () => {
  it('gets one big Play button, and its tap starts the reading', async () => {
    const speak = synth.honest.synth.speak.bind(synth.honest.synth);
    let refuse = true;
    synth.honest.synth.speak = (utterance: Parameters<typeof speak>[0]) => {
      if (!refuse) return speak(utterance);
      setTimeout(() => (utterance.onerror as ((event: unknown) => void) | null)?.({ type: 'error', error: 'not-allowed' }), 0);
    };
    await open();
    const play = await within(sheet()).findByRole('button', { name: 'Play' }, { timeout });
    await vi.waitFor(() => expect(play).toHaveAttribute('data-sermon-refused'), { timeout });
    refuse = false;
    await act(async () => {
      await userEvent.click(play);
    });
    expect(within(sheet()).getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(said().at(-1)).toBe(PARAGRAPHS[0]);
  });
});

describe('when the text cannot be had', () => {
  it('opens the sermon on the web and says so once', async () => {
    serve({ error: 'no_text' }, 404);
    render(<SermonReaderHost />);
    await act(async () => {
      openSermonText(row);
    });
    expect(await screen.findAllByText(/so it opens on the web/i, {}, { timeout })).toHaveLength(1);
    expect(opened).toEqual([WEB]);
    expect(synth.spoken).toHaveLength(0);
    // a link in the notice for a phone that blocks a window opened by itself
    expect(within(sheet()).getByRole('link', { name: 'Open on the web' })).toHaveAttribute('href', WEB);
  });

  it('is the same when the service is not known', async () => {
    setSermonsUrl('');
    render(<SermonReaderHost />);
    await act(async () => {
      openSermonText(row);
    });
    expect(await screen.findAllByText(/so it opens on the web/i, {}, { timeout })).toHaveLength(1);
    expect(opened).toEqual([WEB]);
  });
});
