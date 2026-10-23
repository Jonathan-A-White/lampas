// The heart of the word (mw-bsf54t.13): a note written in advance for the commonest New Testament words that earn one, keyed by
// the lexicon's lemma. Each key is a word the app knows and among the 300 commonest; each note is 2 to 4 sentences, under 600
// characters, and every Greek word it names is a lemma of the lexicon or a form the text itself uses (a stem or ending written with a
// hyphen, 'δο-' or '-μι', and a single letter are not words).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WORD_HEART, wordHeart } from '../../src/data/wordHeart';
import type { FrequencyEntry } from '../../src/data/frequency';
import type { LemmaLexicon } from '../../src/data/lexicon';

const DATA = 'public/data';
const lexicon = JSON.parse(readFileSync(`${DATA}/lexicon.json`, 'utf8')) as LemmaLexicon;
const frequency = JSON.parse(readFileSync(`${DATA}/frequency.json`, 'utf8')) as FrequencyEntry[];
const rank = new Map(frequency.map((e, i) => [e.strongs, i + 1]));

/** A Greek word as compared: NFC, lower case, a grave accent read as an acute (the text writes ἰδὼν where a lemma writes ἰδών). */
const greekKey = (word: string): string =>
  word.normalize('NFD').replace(/\u0300/g, '\u0301').normalize('NFC').toLowerCase();

/** Every lemma of the lexicon and every word the text uses, as greekKey has them. */
function knownGreek(): Set<string> {
  const known = new Set(Object.keys(lexicon).flatMap((l) => l.split(/,\s*/)).map(greekKey));
  for (const book of readdirSync(DATA).filter((b) => statSync(`${DATA}/${b}`).isDirectory())) {
    for (const file of readdirSync(`${DATA}/${book}`)) {
      const chapter = JSON.parse(readFileSync(`${DATA}/${book}/${file}`, 'utf8')) as { verses?: { g: { t: string }[] }[] };
      for (const verse of chapter.verses ?? []) for (const w of verse.g) known.add(greekKey(w.t.replace(/[.,;\u00b7]/g, '')));
    }
  }
  return known;
}

/** The note's sentences: each ends with '.', '!' or '?' and the next begins after a space. */
const sentencesOf = (note: string): string[] => note.trim().split(/(?<=[.!?])\s+/);
const GREEK_WORD = /-?[\p{Script=Greek}\u0300-\u036f]+-?/gu;
const isWord = (piece: string): boolean => !piece.startsWith('-') && !piece.endsWith('-') && [...piece.normalize('NFC')].length > 1;

const entries = Object.entries(WORD_HEART);

describe('the heart of the word', () => {
  it('has a note for about a hundred words', () => {
    expect(entries.length).toBeGreaterThanOrEqual(90);
  });

  it.each(entries.map(([lemma]) => lemma))('%s is a lemma the app knows, written as the lexicon writes it', (lemma) => {
    expect(lemma).toBe(lemma.normalize('NFC'));
    expect(Object.hasOwn(lexicon, lemma)).toBe(true);
  });

  it.each(entries.map(([lemma]) => lemma))('%s is among the 300 commonest words of the New Testament', (lemma) => {
    const r = rank.get(lexicon[lemma].s);
    expect(r).toBeDefined();
    expect(r).toBeLessThanOrEqual(300);
  });

  it.each(entries)('the note for %s is 2 to 4 plain sentences under 600 characters', (_lemma, note) => {
    const sentences = sentencesOf(note);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
    expect(sentences.length).toBeLessThanOrEqual(4);
    for (const s of sentences) expect(s).toMatch(/^\S.*[.!?]$/su);
    expect(note.length).toBeLessThan(600);
    expect(note).toBe(note.trim());
    expect(note).not.toMatch(/\s{2}|[*_#`]/);
  });

  it('names no Greek word the lexicon and the text do not have', () => {
    const known = knownGreek();
    const unknown = entries.flatMap(([lemma, note]) =>
      [...note.normalize('NFC').matchAll(GREEK_WORD)].map((m) => m[0]).filter((w) => isWord(w) && !known.has(greekKey(w))).map((w) => `${lemma}: ${w}`),
    );
    expect(unknown).toEqual([]);
  });

  it("keeps θέλω's note from the tutor's answer", () => {
    expect(WORD_HEART['θέλω']).toMatch(/^One thread ties them together: the heart leaning toward something\./);
  });

  it('finds a note by the headword as the word store keeps it, or a BMA lemma line', () => {
    expect(wordHeart('θέλω')).toBe(WORD_HEART['θέλω']);
    expect(wordHeart('ἄνθρωπος, -ου, ὁ')).toBe(WORD_HEART['ἄνθρωπος']);
    expect(wordHeart('ἐκ, ἐξ + gen')).toBe(WORD_HEART['ἐκ']);
  });

  it('finds a note kept under another lemma by the form the word lists carry', () => {
    expect(wordHeart('ὑμεῖς')).toBe(WORD_HEART['σύ']);
    expect(wordHeart('ἡμεῖς')).toBe(WORD_HEART['ἐγώ']);
    expect(wordHeart('οἶδα')).toBe(WORD_HEART['εἴδω']);
    expect(wordHeart('εἶπεν')).toBe(WORD_HEART['λέγω']);
  });

  it('has no note for a word that does not earn one', () => {
    expect(wordHeart('ἡμέρα')).toBeUndefined();
    expect(wordHeart('')).toBeUndefined();
  });
});
