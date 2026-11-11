// The Sermons door counts the service's rows too (mw-qtu3zvz.63): 2 Peter 3 has two Brookfield First rows in the online index that the bundle predates, and the door must be drawn for them.
// The service is a fake fetch; the bundled sources have nothing for the chapter.
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetServiceSources, setSermonSources } from '../../src/sermons';
import { setKnownSermonSources } from '../../src/sermons/known';
import { talkSermonsFor } from '../../src/sermons/forTutor';
import { closeSermons } from '../../src/sermons/openSermons';
import { SermonsDoor } from '../../src/sermons/SermonsDoor';
import { SermonsHost } from '../../src/sermons/SermonsSheet';
import { setSermonsUrl } from '../../src/services/sermons';
import { db } from '../../src/data/db';
import { sourceOf, row } from '../support/sermon-sources';
import { forgetTestSermons } from '../support/test-sermons';

const BASE = 'https://sermons.test';
let asked: string[];

const brookfield = (id: string, title: string, date: string, url: string) => ({
  source: 'brookfield',
  id,
  title,
  preacher: 'Brookfield First',
  date,
  url,
  alt_url: null,
  kind: 'video',
  ref: '2Pet.3.1-2Pet.3.18',
  role: 'text',
  width: 18,
});
const ROWS = [
  brookfield('day', 'The Day of the Lord', '2026-11-01', 'https://www.youtube.com/watch?v=day'),
  brookfield('mocking', 'God’s Word in a Mocking World', '2026-10-25', 'https://www.youtube.com/watch?v=mocking'),
];

/** The fake service: answers the two rows for 2Pet.3, nothing for the sources list. */
function serve(behaviour: 'answer' | 'down' | 'slow' = 'answer') {
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    asked.push(url);
    if (behaviour === 'down') return Promise.reject(new TypeError('Failed to fetch'));
    if (behaviour === 'slow') return new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
    const body = url.startsWith(`${BASE}/v1/sources`) ? { rows: [] } : { ref: '2Pet.3', total: 2, rows: ROWS };
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  });
}
const sermonAsks = () => asked.filter((url) => url.startsWith(`${BASE}/v1/sermons`));

// a real-time wait: a window in which nothing must happen (no door, no further ask)
const settle = (ms = 50) => act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

beforeEach(async () => {
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear()]);
  asked = [];
  setSermonsUrl(BASE);
  forgetServiceSources();
  setKnownSermonSources([]);
  // the bundle has a Brookfield source whose file predates the rows: nothing for 2 Peter
  setSermonSources([sourceOf('brookfield', 'Brookfield First’s sermons', { jud: [row('brookfield', 'old', 'An old one', ['jud', 1, 1, 3])] })]);
});
afterEach(() => {
  cleanup();
  closeSermons();
  forgetTestSermons();
  setSermonsUrl(undefined);
  forgetServiceSources();
  setKnownSermonSources([]);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('the Sermons door where only the online index has the sermons', () => {
  it('shows Sermons · 2 for 2 Peter 3 and the sheet lists both rows under the chapter', async () => {
    serve();
    const user = userEvent.setup();
    render(
      <>
        <SermonsDoor place={{ book: '2pe', chapter: 3 }} quiet />
        <SermonsHost />
      </>,
    );
    await user.click(await screen.findByRole('button', { name: 'Sermons · 2' }));
    const sheet = await screen.findByRole('dialog', { name: 'Sermons for 2 Peter 3' });
    await within(sheet).findByText('The Day of the Lord');
    const titles = [...sheet.querySelectorAll('a[data-sermon-row] [data-sermon-title]')].map((t) => t.textContent);
    expect(titles.sort()).toEqual(['God’s Word in a Mocking World', 'The Day of the Lord']);
    expect(within(sheet).getByRole('heading', { level: 3, name: 'In this chapter' })).toBeInTheDocument();
  });

  it('draws no door and no error where the service is down', async () => {
    serve('down');
    render(<SermonsDoor place={{ book: '2pe', chapter: 3, from: 1, to: 1 }} quiet />);
    await settle();
    expect(screen.queryByRole('button', { name: /^Sermons/ })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('draws no door where the service does not answer in its 2 seconds', async () => {
    serve('slow');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<SermonsDoor place={{ book: '2pe', chapter: 3, from: 1, to: 1 }} quiet />);
    await act(() => vi.advanceTimersByTimeAsync(2500));
    expect(screen.queryByRole('button', { name: /^Sermons/ })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('counts a row in both the bundle and the service once', async () => {
    setSermonSources([sourceOf('brookfield', 'Brookfield First’s sermons', { '2pe': [row('brookfield', 'day', 'The Day of the Lord', ['2pe', 3, 1, 18])] })]);
    serve();
    render(<SermonsDoor place={{ book: '2pe', chapter: 3, from: 1, to: 1 }} quiet />);
    expect(await screen.findByRole('button', { name: 'Sermons · 2' })).toBeInTheDocument();
  });

  it('asks the service once for the chapter however many of its verses are moved between', async () => {
    serve();
    const { rerender } = render(<SermonsDoor place={{ book: '2pe', chapter: 3, from: 1, to: 1 }} quiet />);
    expect(await screen.findByRole('button', { name: 'Sermons · 2' })).toBeInTheDocument();
    for (const verse of [2, 3, 4]) {
      rerender(<SermonsDoor place={{ book: '2pe', chapter: 3, from: verse, to: verse }} quiet />);
      expect(await screen.findByRole('button', { name: 'Sermons · 2' })).toBeInTheDocument();
      await settle();
    }
    expect(sermonAsks()).toHaveLength(1);
  });
});

describe('the tutor’s sermon list where only the online index has the sermons', () => {
  it('lists the service’s rows, and the bundled ones alone where the service is down', async () => {
    serve();
    const told = await talkSermonsFor({ book: '2pe', chapter: 3 });
    expect(told?.rows.map((r) => r.title).sort()).toEqual(['God’s Word in a Mocking World', 'The Day of the Lord']);
    forgetServiceSources();
    serve('down');
    expect(await talkSermonsFor({ book: '2pe', chapter: 3 })).toBeUndefined();
  });
});
