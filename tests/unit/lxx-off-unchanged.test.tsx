// tests/unit/lxx-off-unchanged.test.tsx — with Settings > Old Testament in Greek (Septuagint) Off, the Hebrew Genesis 1 and Romans 8:1 pages of Memorize, Diagram, the Quick test and Review are what they were before
// the study tools followed the chapter's language (mw-u2w5klk.15, the Septuagint epic's R5). tests/fixtures/septuagint-off-pages.json holds each page's text and HTML (ids stripped) as the code of 0.7.136 drew them;
// RECORD_PAGES=1 writes it afresh (only ever on code that has not changed those pages). The two Diagram pages were re-recorded in batch 426: the Reader header now draws a Menu button where the Settings gear stood (mw-5r3p30.1111).
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { mulberry32 } from '../../src/data/quiz';
import { setReaderView } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { tutorTimings } from '../../src/services/tutor';
import { setVerseAction } from '../../src/verse/action';
import { stubChapterFetch } from '../support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../support/fake-postern';
import { seedHisWords } from '../support/his-words';

const FILE = 'tests/fixtures/septuagint-off-pages.json';
const RECORD = process.env.RECORD_PAGES === '1';
const PHONE_KEY = '00'.repeat(31) + '02';
const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const user = userEvent.setup();
const pages: Record<string, { text: string; html: string }> = {};
let fake: FakePostern;

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
});
afterAll(() => {
  vi.useRealTimers();
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

/** A page as it stands: its text and its HTML, with the ids (and what points at them) taken out, as React's useId makes a new one each render. */
const take = (name: string): void => {
  const html = document.body.innerHTML.replace(/\s(id|for|aria-labelledby|aria-describedby|aria-controls)="[^"]*"/g, '').replace(/:r[0-9a-z]+:/g, '');
  pages[name] = { text: (document.body.textContent ?? '').replace(/\s+/g, ' ').trim(), html };
};

/** Waits until the screen has not changed for a moment: the pages draw from live queries and a loaded host takes longer than a fixed wait. */
async function stillScreen(): Promise<void> {
  let last = '';
  for (let tries = 0; tries < 100; tries += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const now = document.body.innerHTML;
    if (now === last) return;
    last = now;
  }
}

async function open(address: string, hebrewDial: string): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.localStorage.setItem('lampas.welcome', 'done');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.replyFor = () => undefined;
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(7));
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  await seedHisWords(NOW);
  await db.settings.put({ key: 'hebrewInterest', value: hebrewDial });
  await db.settings.put({ key: 'septuagint', value: 'off' });
  await setReaderView('greek');
  setVerseAction('listen');
  window.history.replaceState(null, '', address);
  render(<App />);
}

/** The two chapters the pages are taken of: the Hebrew one and the New Testament one. */
const PLACES = [['gen', 'gen', 1, 'Gen.1.1', 'he'], ['rom', 'rom', 8, 'Rom.8.1', 'el']] as const;
const EVERY_PAGE = PLACES.flatMap(([place, , , ref, lang]) => [`memorize ${ref} ${lang}`, `memorize ${ref} en`, `diagram ${ref}`, `test with ${place} open`, `review with ${place} open`]);

/** The pages of one screen are what the recording holds (or, with RECORD_PAGES=1, are written into it once every screen has been taken). */
function expectAsRecorded(names: string[]): void {
  if (RECORD) return;
  expect(existsSync(FILE), `${FILE} is recorded by RECORD_PAGES=1 on code that has not changed those pages`).toBe(true);
  const before = JSON.parse(readFileSync(FILE, 'utf8')) as typeof pages;
  for (const name of names) {
    expect(pages[name], `${name}: taken`).toBeDefined();
    expect(before[name], `${name}: recorded`).toBeDefined();
    expect(pages[name].text, `${name}: text`).toBe(before[name].text);
    expect(pages[name].html, `${name}: html`).toBe(before[name].html);
  }
}

/** The Quick test or Review with this chapter open. */
async function openRoute(route: 'test' | 'review', book: string, chapter: number, place: string): Promise<void> {
  await open(`/#/?b=${book}&c=${chapter}`, '5');
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  window.history.replaceState(null, '', `/#/${route}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  await (route === 'test' ? screen.findByText(/Quick test/) : screen.findByText(/Review/));
  // the Parsing drill link names the chapter once the study language is read (a live query): the page is taken after it
  if (route === 'test') await screen.findByRole('button', { name: `Parsing drill: ${book === 'gen' ? 'Genesis 1' : 'Romans 8'}` });
  await stillScreen();
  take(`${route} with ${place} open`);
}

describe('with the Septuagint Off the Hebrew and the New Testament pages are as they were', () => {
  it('draws Memorize of Genesis 1:1 and Romans 8:1 in their own language and in English exactly as before', async () => {
    const names: string[] = [];
    for (const [, , , ref, lang] of PLACES) {
      for (const memorizeLang of [lang, 'en']) {
        await open(`/#/memorize/${ref}/${memorizeLang}`, '5');
        await screen.findByTestId('memorize-verse');
        await waitFor(() => expect(document.querySelectorAll('[data-token]').length).toBeGreaterThan(2));
        take(`memorize ${ref} ${memorizeLang}`);
        names.push(`memorize ${ref} ${memorizeLang}`);
      }
    }
    expectAsRecorded(names);
  });

  it('draws the Diagram pane of Genesis 1:1 and Romans 8:1 exactly as before', async () => {
    const names: string[] = [];
    for (const [, book, chapter, ref] of PLACES) {
      // the Verse view of verse 1 with the tutor answering nothing yet (the pane's own state is what is drawn)
      await open(`/#/?b=${book}&c=${chapter}`, '5');
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
      await user.click(await screen.findByRole('button', { name: 'Verse 1' }));
      const view = await screen.findByRole('region', { name: 'Verse view' });
      await user.click(within(view).getByRole('button', { name: 'Diagram' }));
      await within(view).findByRole('region', { name: 'Diagram' });
      take(`diagram ${ref}`);
      names.push(`diagram ${ref}`);
    }
    expectAsRecorded(names);
  });

  it('draws the Quick test with Genesis 1 and with Romans 8 open exactly as before', async () => {
    const names: string[] = [];
    for (const [place, book, chapter] of PLACES) {
      await openRoute('test', book, chapter, place);
      names.push(`test with ${place} open`);
    }
    expectAsRecorded(names);
  });

  it('draws Review with Genesis 1 and with Romans 8 open exactly as before', async () => {
    const names: string[] = [];
    for (const [place, book, chapter] of PLACES) {
      await openRoute('review', book, chapter, place);
      names.push(`review with ${place} open`);
    }
    expectAsRecorded(names);
  });

  it('holds a recording of just these pages', () => {
    if (RECORD) {
      // each screen's it() ran first in this file's order: the recording is the pages they took, in the order of EVERY_PAGE
      writeFileSync(FILE, `${JSON.stringify(Object.fromEntries(EVERY_PAGE.map((name) => [name, pages[name]])), null, 1)}\n`);
      return;
    }
    expect(Object.keys(JSON.parse(readFileSync(FILE, 'utf8')) as typeof pages).sort()).toEqual([...EVERY_PAGE].sort());
  });
});
