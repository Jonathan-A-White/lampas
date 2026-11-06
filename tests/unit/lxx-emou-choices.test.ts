// ἐμοῦ in the committed choices (story mw-u2w5klk.284): TAGNT tags the stressed 'κατ᾽ ἐμοῦ' / 'μετ᾽ ἐμοῦ' (Mat 12:30, Luk 11:23) G1473 = S-1SGSN ἐγώ in 73 of 75 rows,
// and the listing offers exactly that candidate (ἐγώ S-1SGSN, support 111), so an early batch's P-1GS guess for the word was wrong. The refs below are every
// P-1GS ἐγώ guess the choices of Psalms batches 1-8 and Genesis held, each read in its verse as ἐμοῦ after a preposition (or ἐμοῦ δὲ, Psa.72:2).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readChoiceDir } from '../../scripts/lxx/choices';

const EMOU_REFS = [
  // Psalms batches 1-8
  'Psa.2:8#3', 'Psa.6:9#3', 'Psa.12:2#15', 'Psa.17:23#15', 'Psa.21:11#17', 'Psa.21:25#16', 'Psa.22:4#15', 'Psa.26:9#7',
  'Psa.30:12#24', 'Psa.31:5#14', 'Psa.34:15#3', 'Psa.34:22#9', 'Psa.37:11#19', 'Psa.37:22#11', 'Psa.38:11#3',
  'Psa.68:13#2', 'Psa.70:12#6', 'Psa.72:2#1', 'Psa.85:17#3', 'Psa.87:9#6', 'Psa.87:15#13', 'Psa.87:19#3',
  // Genesis
  'Gen.3:12#10', 'Gen.28:20#12', 'Gen.29:19#18', 'Gen.29:34#14', 'Gen.50:4#22', 'Gen.50:20#4', 'Gen.50:20#12',
];

describe('the choices for ἐμοῦ', () => {
  const choices = new Map([...readChoiceDir('data/lxx/choices', 'psa-').choices, ...readChoiceDir('data/lxx/choices', 'gen-').choices]);

  it.each(EMOU_REFS)('%s is TAGNT’s own reading, S-1SGSN ἐγώ, not a guess', (ref) => {
    expect(choices.get(ref)).toEqual({ ref, parsing: 'S-1SGSN', lemma: 'ἐγώ', mark: '' });
  });

  it('keeps no P-1GS guess in Psalms batches 1-8 (the listing never offers P-1GS, so every one was a guess)', () => {
    for (let n = 1; n <= 8; n++) {
      const file = `data/lxx/choices/psa-0${n}.tsv`;
      const rows = readFileSync(file, 'utf8').split('\n').filter((l) => l.split('\t')[1] === 'P-1GS');
      expect(rows, file).toEqual([]);
    }
  });
});
