// A row of the Sermons sheet and Lampas's own reader (mw-ecpivg5.2, docs/sermons.md 'The reader'): under 'Open web sermons in' Lampas, read aloud (the default) a text row of a source the sermon index serves the words of
// opens the reader; a row of any other source, a video row, and every row under This browser or Firefox keep their link as before.
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { setSermonSources } from '../../src/sermons';
import { closeSermons } from '../../src/sermons/openSermons';
import { readsAloud } from '../../src/sermons/openWeb';
import { SermonsDoor } from '../../src/sermons/SermonsDoor';
import { SermonsHost } from '../../src/sermons/SermonsSheet';
import { SermonReaderHost } from '../../src/sermons/SermonReader';
import { closeSermonText } from '../../src/sermons/sermonText';
import { setSermonsUrl } from '../../src/services/sermons';
import { openWebSetting } from '../../src/settings/definitions/sermons';
import { setSetting } from '../../src/settings/store';
import { stopReading } from '../../src/speech/readAloud';
import { row, sourceOf } from '../support/sermon-sources';
import { ENGLISH_VOICE, stubSpeech } from '../support/fake-speech';
import { ASYNC_WAIT_MS as timeout } from '../support/timeouts';

const SPURGEON = row('spurgeon-ccel', '311', 'The Beginning, Increase, and End of the Divine Life', ['rom', 5, 8, 8], 'C. H. Spurgeon', '1857-10-04');
const VIDEO = { ...row('spurgeon-ccel', 'v1', 'A Video One', ['rom', 5, 8, 8]), open: { url: 'https://www.youtube.com/watch?v=abcdefghijk' } };
const OTHER = row('henry-sermons', 'h1', 'Henry on Love', ['rom', 5, 8, 8], 'Matthew Henry');

beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  clearBus();
  stubSpeech([ENGLISH_VOICE]);
  setSermonsUrl('https://sermons.test');
  // the service answers the text and nothing else (the sheet's other asks fail, as offline: the bundled rows stand)
  vi.stubGlobal('fetch', (input: RequestInfo | URL) =>
    String(input).includes('/v1/text')
      ? Promise.resolve(new Response(JSON.stringify({ id: '311', title: 'Read Aloud Title', source: 'spurgeon-ccel', url: SPURGEON.open.url, paragraphs: ['First paragraph.', 'Second paragraph.'] }), { status: 200 }))
      : Promise.reject(new Error('offline')),
  );
  setSermonSources([sourceOf('spurgeon-ccel', 'Spurgeon Sermons', { rom: [SPURGEON, VIDEO] }), sourceOf('henry-sermons', 'Henry Sermons', { rom: [OTHER] })]);
});

afterEach(() => {
  cleanup();
  act(() => {
    closeSermonText();
    stopReading();
  });
  closeSermons();
  setSermonSources(undefined);
  setSermonsUrl(undefined);
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('readsAloud', () => {
  it('is for the choice Lampas, read aloud and a row of a served source', () => {
    expect(readsAloud(SPURGEON, 'lampas')).toBe(true);
    expect(readsAloud(SPURGEON, 'browser')).toBe(false);
    expect(readsAloud(SPURGEON, 'firefox')).toBe(false);
    expect(readsAloud(OTHER, 'lampas')).toBe(false);
    expect(readsAloud(VIDEO, 'lampas')).toBe(false);
  });
});

describe('a row of the Sermons sheet', () => {
  const user = userEvent.setup();
  async function openSheet() {
    render(
      <>
        <SermonsDoor place={{ book: 'rom', chapter: 5, from: 8, to: 8 }} />
        <SermonsHost />
        <SermonReaderHost />
      </>,
    );
    await user.click(await screen.findByRole('button', { name: /^Sermons · / }));
    return screen.findByRole('dialog', { name: /^Sermons for / });
  }
  const rowOf = (sheet: HTMLElement, title: RegExp) => within(sheet).getByText(title).closest('a') as HTMLAnchorElement;

  it('opens the reader under the default, and says Read aloud here under the title', async () => {
    const sheet = await openSheet();
    const link = await waitFor(() => rowOf(sheet, /Beginning, Increase/), { timeout });
    expect(link).toHaveAttribute('data-sermon-reads');
    expect(link.querySelector('[data-sermon-meta]')?.textContent).toMatch(/Read aloud here/);
    await user.click(link);
    expect(await screen.findByRole('heading', { name: 'Read Aloud Title' }, { timeout })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Read Aloud Title' })).toBeInTheDocument();
  });

  it('keeps the link of a row of another source, and of a video (the player has it)', async () => {
    const sheet = await openSheet();
    const other = await waitFor(() => rowOf(sheet, /Henry on Love/), { timeout });
    expect(other).not.toHaveAttribute('data-sermon-reads');
    expect(other.getAttribute('target')).toBe('_blank');
    expect(other.querySelector('[data-sermon-meta]')?.textContent).toMatch(/Opens on the web/);
    expect(rowOf(sheet, /A Video One/)).toHaveAttribute('data-sermon-plays');
  });

  it.each(['browser', 'firefox'] as const)('keeps the link under %s', async (choice) => {
    await setSetting(openWebSetting, choice);
    const sheet = await openSheet();
    const link = await waitFor(() => rowOf(sheet, /Beginning, Increase/), { timeout });
    await waitFor(() => expect(link).not.toHaveAttribute('data-sermon-reads'), { timeout });
    expect(link.getAttribute('href')).toBe(SPURGEON.open.url);
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
