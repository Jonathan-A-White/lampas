// The rows both languages share (they follow the higher of the two dials: mw-gdcyf98.2) name the original as 'Greek or Hebrew' or 'the original',
// never Greek alone (mw-gdcyf98.26). Rows tied to the Greek dial only (greekKeyboard, handwritingDrills, grammarApproach) are not listed.
import { describe, expect, it } from 'vitest';
import { SETTINGS } from '../../src/settings/registry';
import { ROWS } from '../../src/settings/rows';

const SHARED = [
  'weave',
  'weaveGrammar',
  'weaveOrder',
  'newWordsADay',
  'pickerGrammar',
  'grammarMove',
  'paradigmExtent',
  'goal',
  'readLessons',
  'quizGoal',
  'link.goal',
  'link.words',
  'link.review',
  'link.paradigms',
];

const ALLOWED = /Greek (or|and) Hebrew/g;

/** Every word a shared row draws or tells the tutor: its label, hint, help and the labels of its choices. */
function wordsOf(key: string): string[] {
  const row = ROWS.find((r) => r.key === key);
  if (!row) throw new Error(`no row ${key}`);
  const setting = SETTINGS.find((s) => s.key === key);
  const choices = setting?.allowed.kind === 'choice' ? setting.allowed.values.map((v) => v.label) : [];
  return [row.label, row.hint, row.help ?? '', ...choices];
}

describe('the words of the rows both languages share', () => {
  it('lists only rows the registry has', () => {
    for (const key of SHARED) expect(ROWS.some((r) => r.key === key), key).toBe(true);
  });

  it.each(SHARED)('%s says nothing of Greek alone', (key) => {
    for (const text of wordsOf(key)) {
      expect(text.replace(ALLOWED, ''), `${key}: ${text}`).not.toMatch(/Greek/);
    }
  });

  it('leaves the rows of the Greek dial alone', () => {
    const greek = ROWS.filter((r) => ['greekKeyboard', 'handwritingDrills', 'grammarApproach'].includes(r.key));
    expect(greek.length).toBe(3);
    expect(greek.some((r) => /Greek/.test(`${r.label} ${r.hint} ${r.help ?? ''}`))).toBe(true);
  });
});
