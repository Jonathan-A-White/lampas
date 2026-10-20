// mw-5r3p30.643: Ask the tutor on a verse sends the verse's Greek words with the app's respelling, syllables and stress (as the Bible talk's greek_words does,
// from the one builder, src/services/greekWords.ts), so a typed "how do I say σβέννυτε?" is never left to the tutor to cut and stress.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { greekSyllables, stressedSyllable } from '../../src/speech/greekSyllables';
import { DEFAULT_PRONUNCIATION, pronunciationOf } from '../../src/speech/pronunciation';
import { MAX_REQUEST_BYTES } from '../../src/services/requestBudget';
import { buildTalkRequest } from '../../src/services/talk';
import { buildRequest, fitAsk } from '../../src/services/tutor';

const thess = JSON.parse(readFileSync('public/data/1th/5.json', 'utf8')) as Chapter;
const size = (r: unknown) => new TextEncoder().encode(JSON.stringify(r)).length;
const verseOf = (n: number) => {
  const verse = thess.verses.find((v) => v.n === n);
  if (!verse) throw new Error(`no verse ${n}`);
  return verse;
};
const ask = (n: number, question: string, solid: string[] = []) => buildRequest(`1 Thessalonians 5:${n}`, verseOf(n), question, solid, undefined, undefined, undefined, [], undefined, false, DEFAULT_PRONUNCIATION, undefined, undefined, undefined, thess);

describe('verse-ask greek_words', () => {
  it('hands the tutor σβέννυτε\'s syllables, stress and respelling when he types "how do I say σβέννυτε?"', () => {
    const r = ask(19, 'how do I say σβέννυτε?');
    expect(r.greek_words?.find((w) => w.form === 'σβέννυτε')).toEqual({
      form: 'σβέννυτε',
      lemma: 'σβέννυμι',
      gloss: expect.any(String),
      parse: 'verb, present active imperative, 2nd person plural',
      respelling: 'ZVE-nee-te',
      syllables: ['σβέν', 'νυ', 'τε'],
      stress: 0,
    });
  });

  it('is the very list the Bible talk sends for the same verse and question', () => {
    const question = 'how do I say σβέννυτε?';
    const talk = buildTalkRequest({ title: '1 Thessalonians 5', chapter: thess, verse: verseOf(19) }, question, [], []);
    expect(ask(19, question).greek_words).toEqual(talk.greek_words);
  });

  it('stays within the grist even for a pasted-in question and a full solid list', () => {
    const request = fitAsk(ask(19, 'how do I say σβέννυτε? '.repeat(150), Array.from({ length: 5000 }, (_, i) => `λέξις${i}`)));
    expect(size(request)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(request.greek_words?.find((w) => w.form === 'σβέννυτε')?.syllables).toEqual(['σβέν', 'νυ', 'τε']);
  });

  it('keeps a word the question names when a long passage\'s list stops before it', () => {
    const last = thess.verses[thess.verses.length - 1];
    const passage = { ...last, g: thess.verses.flatMap((v) => v.g) };
    const word = passage.g[passage.g.length - 2].t;
    const request = buildRequest('1 Thessalonians 5', passage, `how do I say ${word}?`, [], undefined, undefined, undefined, [], undefined, false, DEFAULT_PRONUNCIATION, undefined, undefined, undefined, thess);
    expect(request.greek_words?.find((w) => w.form === word)?.syllables).toEqual(greekSyllables(word));
    expect(size(fitAsk(request))).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
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
    const r = buildRequest('1 Thessalonians 5:19', verseOf(19), 'how do I say σβέννυτε?', []);
    expect(r.greek_words?.find((w) => w.form === 'σβέννυτε')).toMatchObject({ lemma: 'σβέννυμι', gloss: '', parse: '', syllables: ['σβέν', 'νυ', 'τε'], stress: 0 });
  });
});
