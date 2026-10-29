// mw-5r3p30.643, kept for the Bible talk when the verse ask was retired (mw-5r3p30.850): the talk sends the text's Greek words with the app's respelling, syllables and stress
// (src/services/greekWords.ts), so a typed "how do I say σβέννυτε?" is never left to the tutor to cut and stress.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { NO_CHAPTER, type Chapter } from '../../src/data/chapter';
import { greekSyllables, stressedSyllable } from '../../src/speech/greekSyllables';
import { DEFAULT_PRONUNCIATION, pronunciationOf } from '../../src/speech/pronunciation';
import { MAX_REQUEST_BYTES } from '../../src/services/requestBudget';
import { buildTalkRequest, fitHistory } from '../../src/services/talk';

const thess = JSON.parse(readFileSync('public/data/1th/5.json', 'utf8')) as Chapter;
const size = (r: unknown) => new TextEncoder().encode(JSON.stringify(r)).length;
const verseOf = (n: number) => {
  const verse = thess.verses.find((v) => v.n === n);
  if (!verse) throw new Error(`no verse ${n}`);
  return verse;
};
const scopeOf = (verse: ReturnType<typeof verseOf>) => ({ title: '1 Thessalonians 5', chapter: thess, verse });
const ask = (n: number, question: string, solid: string[] = []) => buildTalkRequest(scopeOf(verseOf(n)), question, [], solid);

describe('the Bible talk\'s greek_words', () => {
  it('stays within the grist even for a pasted-in question and a full solid list', () => {
    const request = fitHistory(ask(19, 'how do I say σβέννυτε? '.repeat(150), Array.from({ length: 5000 }, (_, i) => `λέξις${i}`)));
    expect(size(request)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(request.greek_words?.find((w) => w.form === 'σβέννυτε')?.syllables).toEqual(['σβέν', 'νυ', 'τε']);
  });

  // the sweep: every word form of every verse of 1 Thessalonians 5 reaches the tutor with the app's own syllables, stress and respelling. The list is
  // capped (GREEK_WORDS_BYTES) and a long verse (23) stops part-way, so a form left off is asked for by name, which always keeps it.
  it('lists every word form of every verse with the app\'s syllables, stress and respelling', () => {
    const pron = pronunciationOf(DEFAULT_PRONUNCIATION);
    let checked = 0;
    let named = 0;
    for (const verse of thess.verses) {
      const listed = new Map((ask(verse.n, 'how do I say this?').greek_words ?? []).map((w) => [w.form, w]));
      for (const form of new Set(verse.g.map((w) => w.t))) {
        let w = listed.get(form);
        if (!w) {
          w = ask(verse.n, `how do I say ${form}?`).greek_words?.find((x) => x.form === form);
          named += 1;
        }
        expect(w, `verse ${verse.n}: ${form}`).toBeDefined();
        const syllables = greekSyllables(form);
        const stress = stressedSyllable(syllables);
        expect(w?.syllables, form).toEqual(syllables);
        expect(w?.respelling, form).toBe(pron.respell(form));
        if (stress >= 0) expect(w?.stress, form).toBe(stress);
        else expect(w && 'stress' in w, form).toBe(false);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(150);
    // only the tail of the one verse too long for the cap is left to be asked for by name
    expect(named).toBeLessThan(3);
  });

  it('sends the words with no chapter data too: syllables and stress, and no gloss or parse', () => {
    const r = buildTalkRequest({ title: '1 Thessalonians 5', chapter: NO_CHAPTER, verse: verseOf(19) }, 'how do I say σβέννυτε?', [], []);
    expect(r.greek_words?.find((w) => w.form === 'σβέννυτε')).toMatchObject({ lemma: 'σβέννυμι', gloss: '', parse: '', syllables: ['σβέν', 'νυ', 'τε'], stress: 0 });
  });
});
