// A chapter drawn while the settings database has not opened (mw-5r3p30.1042, his "Slow" on Genesis 15, mw-5r3p30.1040): the Reader waited for every saved setting before it drew a verse, so a database
// that never opens (an older Lampas tab holds it) blocked every chapter. Past chapterWait.settingMs the Reader reads the chapter with the defaults; the saved settings, when they come, replace them
// in place; the defaults are never written as his choice.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { forgetChapters } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { setReaderView } from '../../src/data/repositories';
import { useViewSettings } from '../../src/reader/useViewSettings';
import { stubChapterFetch } from '../support/chapter-fetch';

/** An older Lampas tab: the same database, an older version, holding its connection and ignoring the versionchange; the caller closes it. */
async function holdDatabaseAsOlderTab(): Promise<IDBDatabase> {
  await db.delete();
  const old = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open('lampas', 100);
    open.onupgradeneeded = () => open.result.createObjectStore('words', { keyPath: 'lemma' });
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  void db.open().catch(() => undefined);
  return old;
}

beforeEach(() => {
  cleanup();
  stubChapterFetch();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  forgetChapters();
});

describe('a chapter while the settings database has not opened', () => {
  it('draws the New Testament chapter within 3 s with the defaults', async () => {
    window.location.hash = '#/?b=mat&c=7';
    const old = await holdDatabaseAsOlderTab();
    try {
      const started = Date.now();
      render(<App />);
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
      expect(Date.now() - started).toBeLessThan(3000);
      const main = document.querySelector('[data-reader]')!;
      expect(main).toHaveAttribute('data-view', 'english');
      expect(main).toHaveAttribute('data-layout', 'verse');
      expect(main).toHaveAttribute('data-headings', 'on');
    } finally {
      old.close();
    }
  });

  it('draws the Old Testament chapter within 3 s too (Genesis 15, his report)', async () => {
    window.location.hash = '#/?b=gen&c=15';
    const old = await holdDatabaseAsOlderTab();
    try {
      const started = Date.now();
      render(<App />);
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
      expect(Date.now() - started).toBeLessThan(3000);
    } finally {
      old.close();
    }
  });

  it('takes the saved settings when they arrive, in the same box and on the same verse, and has saved none of the defaults', async () => {
    window.location.hash = '#/?b=mat&c=7&v=5';
    const old = await holdDatabaseAsOlderTab();
    let box: Element;
    try {
      render(<App />);
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
      box = document.querySelector('[data-reader]')!;
      expect(box).toHaveAttribute('data-view', 'english');
    } finally {
      old.close();
    }
    // the older tab lets go: the database opens, and he had chosen the Greek view and paragraphs
    await act(async () => {
      await db.open();
    });
    // nothing the defaults showed was saved as his choice
    const keys = (await db.settings.toArray()).map((row) => row.key);
    for (const key of ['readerView', 'readerPlain', 'weaveGrammar', 'layout', 'sectionHeadings', 'readSpan']) expect(keys).not.toContain(key);
    await act(async () => {
      await setReaderView('greek');
      await db.settings.put({ key: 'layout', value: 'paragraph' });
    });
    await waitFor(() => expect(document.querySelector('[data-reader]')).toHaveAttribute('data-view', 'greek'));
    await waitFor(() => expect(document.querySelector('[data-reader]')).toHaveAttribute('data-layout', 'paragraph'));
    // the same box (the Reader was not drawn afresh) and the verse he was on is still the one selected
    expect(document.querySelector('[data-reader]')).toBe(box!);
    expect(document.querySelector('[data-verse="5"]')).not.toBeNull();
  });
});

describe('a verse on a card (ReferenceCard, the Review question) while the settings database has not opened', () => {
  it('is drawn with the defaults within 3 s: the card does not stay on Loading', async () => {
    const old = await holdDatabaseAsOlderTab();
    try {
      const started = Date.now();
      const { result } = renderHook(() => useViewSettings());
      expect(result.current).toBeUndefined();
      await waitFor(() => expect(result.current).toBeDefined());
      expect(Date.now() - started).toBeLessThan(3000);
      expect(result.current).toMatchObject({ view: 'english', weave: 'off' });
    } finally {
      old.close();
    }
  });
});
