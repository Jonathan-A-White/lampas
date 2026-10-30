// A chapter that hangs on 'Loading Matthew 7…' with no way out (mw-5r3p30.846, his screenshot 2026-10-28): the chapter fetch never answers, or the
// database's open is blocked by an older Lampas tab so the settings the Reader waits for never load. After 8 s the Reader says it is still
// loading and offers Try again; a blocked upgrade says why.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { forgetChapters } from '../../src/data/chapter';
import { chapterWait } from '../../src/data/chapterWait';
import { db } from '../../src/data/db';
import { stubChapterFetch } from '../support/chapter-fetch';

// 8 s and 30 s on a phone (src/reader/chapterWait.ts); the test shortens them rather than fake the clock the library's waits run on
const STILL_MS = 150;
const GIVE_UP_MS = 2500;

/** The chapter fetch hangs (a half-written cache entry, a worker that never answers); everything else is answered. */
function hangOn(chapterPath: RegExp): void {
  const answer = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (!chapterPath.test(String(input))) return answer(input, init);
      return new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
    }),
  );
}

beforeEach(async () => {
  cleanup();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.location.hash = '#/?b=mat&c=7';
  chapterWait.stillMs = STILL_MS;
  chapterWait.giveUpMs = GIVE_UP_MS;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  forgetChapters();
  chapterWait.stillMs = 8000;
  chapterWait.giveUpMs = 30000;
});

describe('a chapter that does not load', () => {
  it('says it is still loading after 8 s, and Try again asks for the chapter afresh', async () => {
    hangOn(/\/data\/mat\/7\.json/);
    render(<App />);
    expect(await screen.findByText('Loading Matthew 7…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(await screen.findByText('Still loading Matthew 7')).toBeInTheDocument();
    // the hung request is dropped, so Try again does not wait on it: this time the chapter comes
    stubChapterFetch();
    await act(async () => {
      screen.getByRole('button', { name: 'Try again' }).click();
    });
    await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    expect(screen.queryByText('Still loading Matthew 7')).toBeNull();
  });

  it('gives up on a fetch that never answers (30 s) and shows the failure with Try again', async () => {
    hangOn(/\/data\/mat\/7\.json/);
    render(<App />);
    await screen.findByText('Loading Matthew 7…');
    expect(await screen.findByRole('alert')).toHaveTextContent('Matthew 7 could not be fetched.');
  });
});

describe('a blocked upgrade', () => {
  it('says Lampas is open in another tab', async () => {
    await db.delete();
    // an older Lampas tab: the same database, an older version, holding its connection and ignoring the versionchange
    const old = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('lampas', 100);
      open.onupgradeneeded = () => open.result.createObjectStore('words', { keyPath: 'lemma' });
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      void db.open().catch(() => undefined);
      render(<App />);
      expect(await screen.findByText('Lampas is open in another tab: close it')).toBeInTheDocument();
    } finally {
      old.close();
    }
  });
});

describe('the other Loading states', () => {
  it('the picker says it is still loading the chapter list after 8 s and Try again asks the index afresh', async () => {
    const { ChapterPicker } = await import('../../src/ChapterPicker');
    const answer = globalThis.fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
        String(input) === '/data/index.json' ? new Promise<Response>(() => undefined) : answer(input, init),
      ),
    );
    window.location.hash = '#/';
    render(<ChapterPicker current={{ book: 'rom', chapter: 8, title: 'Romans 8' }} onClose={() => undefined} />);
    await screen.findByRole('button', { name: /Matthew/ }).then((b) => b.click());
    expect(await screen.findByText('Loading chapters…')).toBeInTheDocument();
    expect(await screen.findByText('Still loading the list of chapters.')).toBeInTheDocument();
    stubChapterFetch();
    await act(async () => {
      screen.getByRole('button', { name: 'Try again' }).click();
    });
    expect(await screen.findByRole('button', { name: 'Chapter 28' })).toBeInTheDocument();
  });
});
