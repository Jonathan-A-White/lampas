// A verb whose aorist cannot be guessed carries it in its gloss (mw-bsf54t.12): 'to come/go (aorist ἦλθον)', like the BMA list's λέγω.
// src/data/irregular-aorists.ts is the list and withAoristNote; the data build (scripts/data-build.ts) and the seed build run it where a gloss
// comes in. The sweep reads public/data (the lexicon, every chapter's lex and its words) so each aorist is confirmed by the app's own text.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import type { LemmaLexicon } from '../../src/data/lexicon';
import { IRREGULAR_AORISTS, withAoristNote } from '../../src/data/irregular-aorists';
import { SEED_WORDS } from '../../src/data/seed-words';

const DATA = 'public/data';
const nfc = (s: string) => s.normalize('NFC');
const lexicon = JSON.parse(readFileSync(`${DATA}/lexicon.json`, 'utf8')) as LemmaLexicon;

function chapters(): Chapter[] {
  const found: Chapter[] = [];
  for (const book of readdirSync(DATA).filter((b) => statSync(`${DATA}/${b}`).isDirectory() && b !== 'ladder')) {
    for (const file of readdirSync(`${DATA}/${book}`)) {
      const json: unknown = JSON.parse(readFileSync(`${DATA}/${book}/${file}`, 'utf8'));
      if (typeof json === 'object' && json !== null && 'verses' in json) found.push(json as Chapter);
    }
  }
  return found;
}

/** The asked-for list: lemma as the text spells it (ἀποθνήσκω: the data's lemma is η, not ῃ) and the aorist the note carries. */
const ASKED: ReadonlyArray<readonly [string, string]> = [
  ['ἔρχομαι', 'ἦλθον'], ['ὁράω', 'εἶδον'], ['ἐσθίω', 'ἔφαγον'], ['φέρω', 'ἤνεγκα'], ['ἔχω', 'ἔσχον'], ['λαμβάνω', 'ἔλαβον'],
  ['γινώσκω', 'ἔγνων'], ['πίνω', 'ἔπιον'], ['πίπτω', 'ἔπεσον'], ['βάλλω', 'ἔβαλον'], ['ἀποθνήσκω', 'ἀπέθανον'], ['πάσχω', 'ἔπαθον'],
  ['τρέχω', 'ἔδραμον'], ['αἱρέω', 'εἷλον'], ['λέγω', 'εἶπον'],
];

describe('withAoristNote', () => {
  it('ends the gloss of a listed verb with (aorist X)', () => {
    expect(withAoristNote('ἔρχομαι', 'to come/go')).toBe('to come/go (aorist ἦλθον)');
    expect(withAoristNote('ἔρχομαι'.normalize('NFD'), 'to come/go')).toBe('to come/go (aorist ἦλθον)');
  });

  it('leaves the gloss of a regular verb as it is', () => {
    expect(withAoristNote('λύω', 'to loose')).toBe('to loose');
    expect(withAoristNote('πιστεύω', 'to trust (in)')).toBe('to trust (in)');
  });

  it('does not add a note the gloss already has', () => {
    expect(withAoristNote('λέγω', 'to say, speak (aorist εἶπον)')).toBe('to say, speak (aorist εἶπον)');
  });
});

describe('the verbs that carry their aorist', () => {
  it.each(ASKED)('%s: the gloss in the lexicon and in every chapter ends with (aorist %s)', (lemma, aorist) => {
    const entry = lexicon[lemma];
    expect(entry, `${lemma} is in the lexicon`).toBeDefined();
    expect(entry.g.endsWith(`(aorist ${aorist})`)).toBe(true);
    let seen = 0;
    for (const chapter of chapters()) {
      const lex = chapter.lex[entry.s];
      if (!lex) continue;
      seen++;
      expect(lex.g.endsWith(`(aorist ${aorist})`), `${chapter.book} ${chapter.chapter} ${entry.s}`).toBe(true);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('keeps the seed list\'s λέγω as it is', () => {
    expect(SEED_WORDS.find((w) => w.lemma === 'λέγω')?.gloss).toBe('to say, speak (aorist εἶπον)');
  });

  it('is the list, and the list has no lemma twice', () => {
    const lemmas = IRREGULAR_AORISTS.map((v) => nfc(v.lemma));
    expect(new Set(lemmas).size).toBe(lemmas.length);
    for (const [lemma, aorist] of ASKED) {
      expect(IRREGULAR_AORISTS.find((v) => nfc(v.lemma) === nfc(lemma))?.aorist, lemma).toBe(aorist);
    }
  });

  it('is on no regular verb: λύω and πιστεύω have none, and every note in the lexicon is a listed verb\'s', () => {
    for (const lemma of ['λύω', 'πιστεύω']) expect(lexicon[lemma].g).not.toContain('aorist');
    const listed = new Set(IRREGULAR_AORISTS.map((v) => nfc(v.lemma)));
    const noted = Object.entries(lexicon).filter(([, e]) => e.g.includes('(aorist')).map(([lemma]) => lemma);
    expect(noted.length).toBeGreaterThan(14);
    expect(noted.filter((lemma) => !listed.has(lemma))).toEqual([]);
    for (const lemma of listed) expect(lexicon[lemma], `${lemma} is in the lexicon`).toBeDefined();
  });
});

describe('each aorist is confirmed by the app\'s own New Testament morphology', () => {
  /** every aorist indicative form (RP codes V-AAI, V-2AAI, V-2ADI, V-AMI ...) of each lemma, as the text spells it */
  function aoristForms(): Map<string, Set<string>> {
    const forms = new Map<string, Set<string>>();
    for (const chapter of chapters()) {
      for (const verse of chapter.verses) {
        for (const word of verse.g) {
          if (!/^V-2?A[ADMP]I-/.test(word.p)) continue;
          const bare = nfc(word.t.replace(/[^\p{L}]/gu, '')).toLowerCase();
          const lemma = nfc(word.l);
          if (!forms.has(lemma)) forms.set(lemma, new Set());
          forms.get(lemma)!.add(bare);
        }
      }
    }
    return forms;
  }

  it.each(IRREGULAR_AORISTS.map((v) => [v.lemma, v] as const))('%s: its aorist is a form of the text', (_lemma, verb) => {
    const forms = aoristForms();
    const seen = forms.get(nfc(verb.formsLemma ?? verb.lemma));
    expect(seen, `${verb.formsLemma ?? verb.lemma} has aorist forms in the text`).toBeDefined();
    expect(seen!.has(nfc(verb.evidence ?? verb.aorist).toLowerCase()), `${verb.evidence ?? verb.aorist}`).toBe(true);
  });
});
