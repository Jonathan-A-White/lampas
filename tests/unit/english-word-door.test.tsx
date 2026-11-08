// The floating ? over an English word's sheet (mw-5r3p30.1121; his words, Postern general 2026-11-06: he tapped "Aggai" in Genesis 13 and the sheet had only a Logos link and no ?): the sheet draws the ?, a tap closes the sheet
// and asks the tutor about the word as tapped, and the question says what the lexicons found, or that they found nothing. The sheet is z-35 over the Talk (z-10), so the ? never opens a Talk beneath it.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FloatingTutor } from '../../src/AskTutor';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { LicenceContext, type LicenceDetail, type LicenceState } from '../../src/gate/licenceContext';
import { englishWordQuestion, lexiconFound, type EnglishWordAsk } from '../../src/services/talk';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { WordSheet } from '../../src/WordSheet';
import { stubChapterFetch } from '../support/chapter-fetch';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  setCurrentLicence('licensed');
  db.close();
});

beforeEach(async () => {
  cleanup();
  clearBus();
  stubChapterFetch();
  setCurrentLicence('licensed');
  await db.open();
  await db.settings.clear();
});

const FLOATING = 'Ask the tutor about what is on screen';

/** A phone with the given licence, as LicenceProvider tells the app (and the mill client). */
function Phone({ licence, children }: { licence: LicenceState; children: ReactNode }) {
  setCurrentLicence(licence);
  const value: LicenceDetail = { licence, locked: null, publicKeyHex: '', checkAgain: () => undefined, siteIssued: false, removed: () => undefined };
  return <LicenceContext.Provider value={value}>{children}</LicenceContext.Provider>;
}

describe('what the tutor is told of an English word (englishWordQuestion)', () => {
  const aggai: EnglishWordAsk = { word: 'Aggai', verse: 3, language: 'Greek', paired: [] };

  it('a word with no entry: the word as tapped, its place, the English side, nothing paired and that no entry was found', () => {
    expect(lexiconFound(aggai)).toBe(false);
    const question = englishWordQuestion(aggai, 'Genesis 13:3');
    expect(question).toContain('“Aggai”');
    expect(question).toContain('Genesis 13:3');
    expect(question).toContain('English side');
    expect(question).toContain('No Greek word is paired with it');
    expect(question).toContain('found no entry for it');
  });

  it('a word paired to a Greek word the lexicon has no gloss for names the pair and still says no entry was found', () => {
    const ask: EnglishWordAsk = { ...aggai, paired: [{ form: 'Αγγαι', lemma: 'Αγγαι', parse: 'noun', gloss: '' }] };
    expect(lexiconFound(ask)).toBe(false);
    const question = englishWordQuestion(ask, 'Genesis 13:3');
    expect(question).toContain('paired with the Greek Αγγαι (lemma Αγγαι; noun)');
    expect(question).toContain('found no entry for it');
  });

  it('a word the lexicon knows names the pair and its gloss and says nothing of a missing entry; a chunk is named when the word is part of it', () => {
    const ask: EnglishWordAsk = { word: 'love', chunk: 'we love', verse: 5, language: 'Greek', paired: [{ form: 'ἀγαπῶμεν', lemma: 'ἀγαπάω', parse: 'verb, present active subjunctive 1st plural', gloss: 'to love' }] };
    expect(lexiconFound(ask)).toBe(true);
    const question = englishWordQuestion(ask, '2 John 1:5');
    expect(question).toContain('“love” (in the English “we love”)');
    expect(question).toContain('ἀγαπῶμεν (lemma ἀγαπάω; verb, present active subjunctive 1st plural; gloss “to love”)');
    expect(question).not.toContain('found no entry');
  });

  it('a Hebrew word is named as Hebrew', () => {
    expect(englishWordQuestion({ ...aggai, language: 'Hebrew' }, 'Genesis 13:3')).toContain('No Hebrew word is paired with it');
  });
});

describe('the English word sheet and the English part of the word sheet draw the ?', () => {
  const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
  const verse = chapter.verses.find((v) => v.n === 1)!;
  // at 0 (Just English) the small English sheet opens; at 5 the Greek word sheet, with the English he tapped as its heading
  const DIALS = [
    { dial: '0', sheet: 'English word' },
    { dial: '5', sheet: 'Word' },
  ];

  for (const { dial, sheet } of DIALS) {
    it(`at Greek ${dial}: a tap on the ? closes the sheet and asks about the word he tapped, in its verse`, async () => {
      await db.settings.put({ key: 'greekInterest', value: dial });
      const asked: EnglishWordAsk[] = [];
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(
        <Phone licence="licensed">
          <FloatingTutor />
          <WordSheet chapter={chapter} lookup={{ words: [verse.g[0]], english: 'Aggai', tapped: 'Aggai', fromEnglish: true, verse: 1 }} onClose={onClose} onAskEnglish={(a) => asked.push(a)} />
        </Phone>,
      );
      await screen.findByRole('dialog', { name: sheet });
      await user.click(await screen.findByRole('button', { name: FLOATING }));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(asked).toHaveLength(1);
      expect(asked[0]).toMatchObject({ word: 'Aggai', verse: 1, language: 'Greek' });
      expect(asked[0].paired[0]).toMatchObject({ form: verse.g[0].t, lemma: verse.g[0].l });
    });

    it(`at Greek ${dial}: a chunk paired to no word still has the ? (the lexicons found nothing)`, async () => {
      await db.settings.put({ key: 'greekInterest', value: dial });
      const asked: EnglishWordAsk[] = [];
      const user = userEvent.setup();
      render(
        <Phone licence="licensed">
          <FloatingTutor />
          <WordSheet chapter={chapter} lookup={{ words: [], english: 'Aggai', tapped: 'Aggai', fromEnglish: true, verse: 3 }} onClose={() => undefined} onAskEnglish={(a) => asked.push(a)} />
        </Phone>,
      );
      await screen.findByRole('dialog', { name: sheet });
      await user.click(await screen.findByRole('button', { name: FLOATING }));
      expect(asked).toEqual([{ word: 'Aggai', verse: 3, language: 'Greek', paired: [] }]);
      expect(lexiconFound(asked[0])).toBe(false);
    });

    it(`at Greek ${dial}: with nothing to ask (no way to ask, or no licence) no ? is drawn, for its Talk would stand under the sheet`, async () => {
      await db.settings.put({ key: 'greekInterest', value: dial });
      const { unmount } = render(
        <Phone licence="licensed">
          <FloatingTutor />
          <WordSheet chapter={chapter} lookup={{ words: [verse.g[0]], english: 'Aggai', tapped: 'Aggai', fromEnglish: true, verse: 1 }} onClose={() => undefined} />
        </Phone>,
      );
      await screen.findByRole('dialog', { name: sheet });
      await waitFor(() => expect(document.querySelector('[data-floating-tutor]')).toBeNull());
      unmount();
      render(
        <Phone licence="not-licensed">
          <FloatingTutor />
          <WordSheet chapter={chapter} lookup={{ words: [verse.g[0]], english: 'Aggai', tapped: 'Aggai', fromEnglish: true, verse: 1 }} onClose={() => undefined} onAskEnglish={() => undefined} />
        </Phone>,
      );
      await screen.findByRole('dialog', { name: sheet });
      await new Promise((r) => setTimeout(r, 50));
      expect(document.querySelector('[data-floating-tutor]')).toBeNull();
    });
  }
});
