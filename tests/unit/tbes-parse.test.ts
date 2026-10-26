// parseTbes (scripts/data/tbes.ts) on a cut of the real lexicons: which of several lines for one Strong's number the number resolves to, and the stem senses a verb's
// definition names. tests/fixtures/data/tbesh_slice.txt holds the Hebrew lines of the Old Testament build's slice; the Greek cut is written out here.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { otLexicon } from '../../scripts/data-build-ot';
import { hebrewStem, parseTbes } from '../../scripts/data/tbes';

const row = (...f: string[]): string => f.join('\t');
const tbesh = otLexicon(readFileSync('tests/fixtures/data/tbesh_slice.txt', 'utf8'));

describe('a Hebrew Strong\'s number with two lines', () => {
  it('resolves H1709 to the common noun, not to the part of a gate\'s name that comes first', () => {
    // H1709G 'Fish (Gate)' stands before H1709H 'fish'; both second columns are a bare '='
    expect(tbesh.get('H1709')?.gloss).toBe('fish');
  });

  it('keeps the first line when it is no name part', () => {
    const lexicon = otLexicon([
      row('H0001', 'H0001A =', 'H0001A', 'אב', 'av', 'H:N-M', 'father', 'father'),
      row('H0001', 'H0001B =', 'H0001B', 'אב', 'av', 'H:N-M', 'Av', 'a name'),
    ].join('\n'));
    expect(lexicon.get('H1')?.gloss).toBe('father');
  });

  it('keeps the first line when the other line is a related sense and not a bare "="', () => {
    // H0430 in the slice: God, then '(LORD)-Elohe', a part of another name
    expect(tbesh.get('H430')?.gloss).toBe('God');
    // H0776: the first line is 'in Hebrew of' the second, and is still the one the number resolves to
    const lexicon = otLexicon([
      row('H0776', 'H0776G = in Hebrew of', 'H0776H', 'ארץ', 'e.rets', 'H:N-F', 'land: country/planet', ': country'),
      row('H0776', 'H0776H =', 'H0776H', 'ארץ', 'e.rets', 'H:N-F', 'land: soil', ': soil'),
    ].join('\n'));
    expect(lexicon.get('H776')?.gloss).toBe('land, country, planet');
  });

  it('keeps a capitalised gloss on a name', () => {
    const lexicon = otLexicon([
      row('H3124', 'H3124G =', 'H3124G', 'יוֹנָה', 'yo.nah', 'N:N-M-P', 'Jonah', 'a prophet'),
      row('H3124', 'H3124H =', 'H3124H', 'יוֹנָה', 'yo.nah', 'H:N-F', 'dove', 'dove'),
    ].join('\n'));
    expect(lexicon.get('H3124')?.gloss).toBe('Jonah');
    expect(lexicon.get('H3124')?.name).toBe(true);
  });
});

describe('a Greek Strong\'s number with two lines', () => {
  const text = [
    row('G0001', 'G0001 =', 'G0001', 'Α', 'a', 'G:N-F', 'Alpha', 'first letter'),
    row('G0001', 'G0001B =', 'G0001B', 'Α', 'a', 'G:N-F', 'first', 'a second line'),
    row('G0002', 'G0002 =', 'G0002', 'ἀγαθός', 'agathos', 'G:A', 'good', 'good'),
  ].join('\n');
  const greek = parseTbes(text, { letter: 'G', gloss: (_lemma, raw) => raw });

  it('resolves to its first line, as before', () => {
    expect(greek.get('G1')?.gloss).toBe('Alpha');
    expect(greek.get('G1')?.definition).toBe('first letter');
    expect(greek.get('G2')?.gloss).toBe('good');
  });

  it('reads no stem senses', () => {
    expect(greek.get('G1')?.stems).toBeUndefined();
  });
});

describe('the stem senses of a Hebrew verb', () => {
  it('H4487 has a Piel sense, "to appoint"', () => {
    expect(tbesh.get('H4487')?.gloss).toBe('to count');
    expect(tbesh.get('H4487')?.stems?.Piel).toBe('to appoint');
  });

  it('takes the first meaning of the sense, from a stem line or from the line under it', () => {
    const lexicon = otLexicon(
      row(
        'H0006',
        'H0006 =',
        'H0006',
        'אבד',
        'a.vad',
        'H:V',
        'to perish',
        '1) perish, vanish<br>1a) (Qal)<br>1a1) perish, die<br>1b) (Piel)<br>1b1) to destroy, kill, cause to perish<br>1c) (Hiphil) to exterminate (a people)<br>1d) (Pual) destroyed (participle)',
      ),
    );
    expect(lexicon.get('H6')?.stems).toEqual({ Piel: 'to destroy', Hiphil: 'to exterminate' });
  });

  it('reads none from a noun', () => {
    expect(tbesh.get('H1709')?.stems).toBeUndefined();
  });

  it('names the stem a Berean parsing code carries, as TBESH spells it', () => {
    expect(hebrewStem('Conj-w | V-Piel-ConsecImperf-3ms')).toBe('Piel');
    expect(hebrewStem('V-Hifil-Perf-3ms')).toBe('Hiphil');
    expect(hebrewStem('V-Nifal-Inf')).toBe('Niphal');
    expect(hebrewStem('V-Hitpael-Imperf-3ms')).toBe('Hithpael');
    expect(hebrewStem('V-Hofal-Perf-3ms')).toBe('Hophal');
    expect(hebrewStem('V-Qal-Perf-3ms')).toBe('Qal');
    expect(hebrewStem('N-ms')).toBeUndefined();
  });
});
