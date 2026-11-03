// The hand reading of the 300 commonest lemmas (mw-5r3p30.1000): every correction has its reason, is in docs/data.md, stays in the cap, and names a lemma of the 300 commonest.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { FrequencyEntry } from '../../src/data/frequency';
import type { LemmaLexicon } from '../../src/data/lexicon';
import { meaningsOf } from '../../src/data/meanings';
import { MAX_MEANINGS } from '../../scripts/data/drillAnswers';
import { CORRECTIONS } from '../../scripts/data/drill-corrections';

const lexicon = JSON.parse(readFileSync('public/data/lexicon.json', 'utf8')) as LemmaLexicon;
const frequency = JSON.parse(readFileSync('public/data/frequency.json', 'utf8')) as FrequencyEntry[];
const docs = readFileSync('docs/data.md', 'utf8');
const commonest = new Set(frequency.slice(0, 300).map((f) => f.lemma));
const esc = (s: string): string => s.replace(/\|/g, '\\|');

describe('the drill corrections', () => {
  it('are a lemma of the lexicon among the 300 commonest, with a reason and at most three meanings', () => {
    for (const [lemma, c] of Object.entries(CORRECTIONS)) {
      expect(lexicon[lemma], lemma).toBeDefined();
      expect(commonest.has(lemma), `${lemma} is not among the 300 commonest`).toBe(true);
      expect(c.reason.trim().length, lemma).toBeGreaterThan(10);
      expect(meaningsOf(c.answer).length, lemma).toBeLessThanOrEqual(MAX_MEANINGS);
    }
  });

  it('are each a row of docs/data.md with its reason, and the table has no other', () => {
    for (const [lemma, c] of Object.entries(CORRECTIONS)) expect(docs, lemma).toContain(`| ${lemma} | ${esc(lexicon[lemma].g)} | ${esc(c.answer)} | ${esc(c.reason)} |`);
    const section = docs.slice(docs.indexOf('### Hand corrections'), docs.indexOf('## `lemma-forms'));
    const rows = section.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Lemma'));
    expect(rows.length).toBe(Object.keys(CORRECTIONS).length);
  });
});
