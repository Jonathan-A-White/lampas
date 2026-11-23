// tests/unit/lxx-held-chapters-320.test.ts — with the Morpheus caches of Exodus, Psalms and Isaiah built (mw-u2w5klk.320), 17 words still held a chapter each: 16 choices the model made
// outside the candidates and did not mark a guess (the join refuses those and leaves the word pending), and Isaiah 10:17's καιομένῳ, which the cache made pending with no choice.
// The 16 are marked guess (0.40, the note 'guess: the model chose outside the candidates'), which the join takes with the lemma the row names; καιομένῳ is the passive participle, dative neuter,
// agreeing with the πυρί before it. The test reads the committed choices files, so it needs no cache.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DIR = 'data/lxx/choices';
const rows = new Map<string, string[]>();
for (const file of readdirSync(DIR).filter((f) => f.endsWith('.tsv'))) {
  for (const line of readFileSync(`${DIR}/${file}`, 'utf8').split('\n').slice(1)) {
    const cells = line.split('\t');
    if (cells.length === 6) rows.set(cells[0], cells);
  }
}

const GUESSES: Array<[string, string, string]> = [
  ['Exo.11:4#11', 'V-PPI-1S', 'εἰσπορεύω'],
  ['Exo.13:4#6', 'V-PPI-2P', 'ἐκπορεύω'],
  ['Exo.14:28#17', 'V-RMP-APM', 'εἰσπορεύω'],
  ['Exo.28:26#20', 'V-PPS-3S', 'εἰσπορεύω'],
  ['Exo.29:2#4', 'V-RNP-APM', 'φυράω'],
  ['Exo.32:22#7', 'V-PNM-2S', 'ὀργίζω'],
  ['Psa.9:18#11', 'V-PNP-NPN', 'ἐπιλανθάνω'],
  ['Psa.26:14#4', 'V-PNM-2S', 'ἀνδρίζω'],
  ['Psa.34:13#8', 'V-INI-1S', 'ἐνδύω'],
  ['Psa.64:7#7', 'V-RMP-NSM', 'περιζώννυμι'],
  ['Psa.102:2#9', 'V-PNM-2S', 'ἐπιλανθάνω'],
  ['Psa.118:46#11', 'V-INI-1S', 'αἰσχύνω'],
  ['Psa.118:80#13', 'V-AOS-1S', 'αἰσχύνω'],
  ['Isa.16:3#1', 'V-PNM-2S', 'βουλεύω'],
  ['Isa.20:3#6', 'V-RMI-3S', 'πορεύω'],
  ['Isa.44:21#19', 'V-PNM-2S', 'ἐπιλανθάνω'],
];

describe('the words that still held a chapter once the Morpheus caches were built', () => {
  it.each(GUESSES)('%s is %s %s, marked a guess at 0.40', (ref, parsing, lemma) => {
    expect(rows.get(ref)?.slice(1)).toEqual([parsing, lemma, 'guess', '0.40', 'guess: the model chose outside the candidates']);
  });

  it('answers Isaiah 10:17 καιομένῳ as the passive participle agreeing with πυρί, a choice among the candidates', () => {
    expect(rows.get('Isa.10:17#8')?.slice(1, 3)).toEqual(['N-ASN', 'πῦρ']);
    expect(rows.get('Isa.10:17#14')?.slice(1)).toEqual(['V-PPP-DSN', 'καίω', '', '0.80', '']);
  });
});
