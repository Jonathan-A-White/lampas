// tests/unit/lxx-word-off-unchanged.test.tsx — with Settings > Old Testament in Greek (Septuagint) Off, the word card of Hebrew Genesis 1 (words 0 and 2 of verse 1) and of Romans 8:1 (words 0 and 2), and the Help
// pages other than Words, are what they were before the Septuagint word card took the clean form and Help explained the five layers (mw-u2w5klk.17). tests/fixtures/septuagint-off-cards.json holds each card's text and HTML
// (ids stripped) and each page's words as the code of 0.7.152 drew them; RECORD_PAGES=1 writes it afresh (only ever on code that has not changed those cards or pages).
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { HELP_PAGES } from '../../src/help';
import { WordSheet } from '../../src/WordSheet';

const FILE = 'tests/fixtures/septuagint-off-cards.json';
const RECORD = process.env.RECORD_PAGES === '1';

afterAll(() => {
  cleanup();
  db.close();
});

type Taken = Record<string, { text: string; html: string } | string[]>;

const chapter = (code: string, n: number): Chapter => JSON.parse(readFileSync(`public/data/${code}/${n}.json`, 'utf8')) as Chapter;

/** Waits until the screen has not changed for a moment: the card draws from live queries and a loaded host takes longer than a fixed wait. */
async function stillScreen(): Promise<void> {
  let last = '';
  for (let tries = 0; tries < 100; tries += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const now = document.body.innerHTML;
    if (now === last) return;
    last = now;
  }
}

/** The card of one word as it stands: its text and its HTML, with the ids (and what points at them) taken out. */
async function card(book: Chapter, index: number, hebrew: boolean): Promise<{ text: string; html: string }> {
  cleanup();
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  await db.settings.put({ key: 'hebrewInterest', value: '5' });
  await db.settings.put({ key: 'greekInterest', value: '5' });
  await db.settings.put({ key: 'septuagint', value: 'off' });
  const word = book.verses[0].g[index];
  render(<WordSheet chapter={book} lookup={{ words: [word], fromEnglish: false, verse: 1 }} onClose={() => undefined} />);
  await screen.findByTestId(hebrew ? 'sheet-word' : 'sheet-word');
  await stillScreen();
  const html = document.body.innerHTML.replace(/\s(id|for|aria-labelledby|aria-describedby|aria-controls)="[^"]*"/g, '').replace(/:r[0-9a-z]+:/g, '');
  return { text: (document.body.textContent ?? '').replace(/\s+/g, ' ').trim(), html };
}

describe('with the Septuagint Off the Hebrew and the New Testament word cards and the Help pages are as they were', () => {
  it('draws words 0 and 2 of Genesis 1:1 and of Romans 8:1, and every Help page but Words, exactly as before', async () => {
    const taken: Taken = {};
    for (const [code, n, hebrew] of [['gen', 1, true], ['rom', 8, false]] as const) {
      const book = chapter(code, n);
      for (const index of [0, 2]) taken[`${code} ${n}:1 word ${index}`] = await card(book, index, hebrew);
    }
    for (const page of HELP_PAGES) if (page.id !== 'words') taken[`help ${page.id}`] = [page.title, page.line, ...page.body];
    if (RECORD) {
      writeFileSync(FILE, `${JSON.stringify(taken, null, 1)}\n`);
      return;
    }
    expect(existsSync(FILE), `${FILE} is recorded by RECORD_PAGES=1 on code that has not changed those cards`).toBe(true);
    const before = JSON.parse(readFileSync(FILE, 'utf8')) as Taken;
    expect(Object.keys(taken)).toEqual(Object.keys(before));
    for (const name of Object.keys(before)) expect(taken[name], name).toEqual(before[name]);
  });
});
