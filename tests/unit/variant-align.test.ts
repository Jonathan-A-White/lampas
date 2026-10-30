// tests/unit/variant-align.test.ts — the word-by-word pairing of a variant reading's English with its Greek (scripts/data/variantAlign.ts, mw-9ji6ek0.37):
// on a small fixture of Acts 18:18, through finishUnit as the chapter build calls it, and on the committed public/data (every reading, the three chapters read by eye).
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { alignReading, alignStats, englishTokens, layAlign } from '../../scripts/data/variantAlign';
import type { Chapter, GreekWord, VariantUnit, Verse } from '../../src/data/chapter';

const w = (t: string, l: string, s: string, e?: number): GreekWord => ({ t, tr: '', s, l, p: 'X', ...(e === undefined ? {} : { e }) });
const LEX = { G1722: { g: 'in/on/among', d: '' }, G2747: { g: 'Cenchreae', d: '' }, G3588: { g: 'the/this/who', d: '' }, G2776: { g: 'head', d: '' } };

/** Acts 18:18 as the chapter file has it, cut to the unit's words: the MSB pairs ἐν with the supplied 'He had his' and τὴν with 'in' (crossed). */
const V18: Verse = {
  n: 18,
  g: [w('κειράμενος', 'κείρω', 'G2751', 2), w('τὴν', 'ὁ', 'G3588', 3), w('κεφαλὴν', 'κεφαλή', 'G2776', 1), w('ἐν', 'ἐν', 'G1722', 0), w('Κεγχρεαῖς', 'Κεγχρεαί', 'G2747', 4)],
  e: [
    { t: 'He had his', g: [3], s: [2] },
    { t: 'head', g: [2] },
    { t: 'shaved', g: [0] },
    { t: 'in', g: [1] },
    { t: 'Cenchrea', g: [4] },
  ],
};
const NA_G = [w('ἐν', 'ἐν', 'G1722'), w('Κεγχρεαῖς', 'Κεγχρεαί', 'G2747'), w('τὴν', 'ὁ', 'G3588'), w('κεφαλήν', 'κεφαλή', 'G2776')];

describe('the pairing of a reading', () => {
  it('pairs Acts 18:18’s NA reading word by word: in-ἐν, Cenchreae-Κεγχρεαῖς, the-τὴν, head-κεφαλήν', () => {
    expect(englishTokens('in Cenchreae the head')).toEqual(['in', 'Cenchreae', 'the', 'head']);
    expect(alignReading('in Cenchreae the head', NA_G, V18, LEX)).toEqual([0, 1, 2, 3]);
  });

  it('is laid on a chapter’s units by layAlign, which the build calls once the readings’ words are tagged: a list for each reading', () => {
    const unit: VariantUnit = {
      v: 18,
      w: [1, 2, 3, 4],
      base: 'τὴν κεφαλὴν ἐν Κεγχρεαῖς',
      alts: [{ code: 'N', text: 'ἐν Κεγχρεαῖς τὴν κεφαλήν', g: NA_G }],
      english: { source: 'lampas', base: 'the head in Cenchreae', alts: ['in Cenchreae the head'] },
      changesEnglish: false,
      witness: 'na',
    };
    const chapter = { variants: [unit], verses: [V18], lex: LEX };
    expect(layAlign(chapter)).toBe(true);
    expect(unit.english.align).toEqual([[0, 1, 2, 3]]);
    expect(layAlign(chapter)).toBe(false);
  });

  it('leaves a word with no Greek unpaired, and pairs a Greek word with one word or a run of neighbours', () => {
    const [a, b] = [w('ὁ', 'ὁ', 'G3588'), w('οἶκος', 'οἶκος', 'G3624')];
    expect(alignReading('the house of the Lord', [a, b], undefined, { G3588: { g: 'the', d: '' }, G3624: { g: 'house', d: '' } })).toEqual([0, 1, null, null, null]);
  });

  it('pairs the words of one chunk with the one Greek word, side by side (\'went up\' is ἀνέβη)', () => {
    const verse: Verse = { n: 1, g: [w('ἀνέβη', 'ἀναβαίνω', 'G305', 0)], e: [{ t: 'went up', g: [0] }] };
    expect(alignReading('he went up', [w('ἀνέβη', 'ἀναβαίνω', 'G305')], verse, { G305: { g: 'to ascend', d: '' } })).toEqual([null, 0, 0]);
  });

  it('takes a word the verse’s English has for the same form when the gloss says nothing of it, but never a word the translators supplied', () => {
    const verse: Verse = { n: 1, g: [w('Ἰησοῦς', 'Ἰησοῦς', 'G2424', 0), w('ἦν', 'εἰμί', 'G1510', 1)], e: [{ t: 'Joshua', g: [0] }, { t: 'was king', g: [1], s: [0] }] };
    const lex = { G2424: { g: 'Jesus', d: '' }, G1510: { g: 'to be', d: '' } };
    expect(alignReading('Joshua', [w('Ἰησοῦς', 'Ἰησοῦς', 'G2424')], verse, lex)).toEqual([0]);
    expect(alignReading('was', [w('ἦν', 'εἰμί', 'G1510')], verse, { ...lex, G1510: { g: 'exist', d: '' } })).toEqual([null]);
  });

  it('pairs the one word of English and the one Greek word left over only when the lexicon has no gloss for the Greek (a name), never a glossed word', () => {
    expect(alignReading('Prisca', [w('Πρίσκα', 'Πρίσκα', 'G4252')], undefined, {})).toEqual([0]);
    expect(alignReading('he sent back', [w('ἡμᾶς', 'ἐγώ', 'G2248')], undefined, { G2248: { g: 'we/us', d: '' } })).toEqual([null, null, null]);
    expect(alignReading('about', [w('ἐπιστάμενος', 'ἐπίσταμαι', 'G1987')], undefined, {})).toEqual([null]);
  });

  it('draws a gloss of two words as one: away from is ἀπό', () => {
    expect(alignReading('away from', [w('ἀπὸ', 'ἀπό', 'G575')], undefined, { G575: { g: 'away from', d: '' } })).toEqual([0, 0]);
  });

  it('gives [] for a reading with no tagged Greek (it leaves the words out)', () => {
    const unit: VariantUnit = { v: 18, w: [4], base: 'Κεγχρεαῖς', alts: [{ code: 'N', text: '' }], english: { source: 'msb', base: 'Cenchrea', alts: [''] }, changesEnglish: true, witness: 'na' };
    layAlign({ variants: [unit], verses: [V18], lex: LEX });
    expect(unit.english.align).toEqual([[]]);
  });
});

const chapterOf = (path: string): Chapter | null => (existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Chapter) : null);

describe('the committed chapters', () => {
  it('Acts 18:18’s unit pairs in with ἐν', () => {
    const chapter = chapterOf('public/data/act/18.json');
    const unit = chapter?.variants?.find((u) => u.v === 18 && u.base === 'τὴν κεφαλὴν ἐν Κεγχρεαῖς');
    expect(unit?.english.alts[0]).toBe('in Cenchreae the head');
    expect(unit?.english.align?.[0]).toEqual([0, 1, 2, 3]);
  });

  it('every reading with English and Greek has a pairing of the length of its English, indexes into its own Greek, and a Greek word behind two English words only side by side', () => {
    const bad: string[] = [];
    for (const code of ['rom', 'mat', '1co']) {
      for (let n = 1; n <= 16; n++) {
        const chapter = chapterOf(`public/data/${code}/${n}.json`);
        for (const u of chapter?.variants ?? []) {
          u.alts.forEach((alt, i) => {
            const tokens = englishTokens(u.english.alts[i] ?? '');
            const align = u.english.align?.[i];
            const ref = `${code} ${n}:${u.v} ${alt.text}`;
            if (!align) return void bad.push(`${ref}: no pairing`);
            if (tokens.length === 0 || !alt.g?.length) {
              if (align.length) bad.push(`${ref}: pairing for nothing`);
              return;
            }
            if (align.length !== tokens.length) bad.push(`${ref}: ${align.length} for ${tokens.length} words`);
            // a Greek word may stand behind several English words only side by side
            const seen = new Set<number>();
            align.forEach((x, k) => {
              if (x === null) return;
              if (x < 0 || x >= alt.g!.length || (seen.has(x) && align[k - 1] !== x)) bad.push(`${ref}: bad indexes ${align}`);
              seen.add(x);
            });
          });
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('counts the readings by how completely they are paired', () => {
    const chapter = chapterOf('public/data/act/18.json');
    const stats = alignStats(chapter?.variants ?? []);
    expect(stats.msb.full + stats.msb.partly + stats.msb.none + stats.lampas.full + stats.lampas.partly + stats.lampas.none).toBeGreaterThan(0);
  });
});
