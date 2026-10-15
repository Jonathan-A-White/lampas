// The sound rules of each scheme (Pronunciation.soundRules, mw-i7xe0n.7): every word a side names is in the text Lampas holds and stands on that side, its
// misreading differs from its respelling, and Modern Greek names the rules the respeller decides (χ, γ, σ, αυ, ευ, ηυ, μπ, ντ, γκ, γχ), each on a ladder idea.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { ideaOf } from '../../src/data/grammar/ladder';
import { PRONUNCIATIONS, pronunciationOf, soundRulesOf } from '../../src/speech/pronunciation';

const nfc = (s: string): string => s.normalize('NFC');
const ROOT = 'public/data';
const TEXT = new Set(
  readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'ladder')
    .flatMap((d) => readdirSync(`${ROOT}/${d.name}`).map((f) => JSON.parse(readFileSync(`${ROOT}/${d.name}/${f}`, 'utf8')) as Chapter))
    .flatMap((c) => c.verses.flatMap((v) => v.g.map((g) => nfc(g.t)))),
);

describe.each(PRONUNCIATIONS.map((p) => [p.id, p] as const))('the sound rules of %s', (_id, scheme) => {
  it.each(soundRulesOf(scheme).flatMap((r) => r.sides.flatMap((s) => s.words.map((w) => [r.ideaId, s.id, w] as const))))('%s %s: %s', (ideaId, sideId, word) => {
    const rule = soundRulesOf(scheme).find((r) => r.ideaId === ideaId)!;
    expect(TEXT.has(nfc(word)), `${word} is in the text`).toBe(true);
    expect(rule.sideOf(word)).toBe(sideId);
    expect(rule.misread(word)).not.toBe(scheme.respell(word));
  });

  it('names each rule on a ladder idea, once, with two sides and a line for each', () => {
    const rules = soundRulesOf(scheme);
    expect(new Set(rules.map((r) => r.ideaId)).size).toBe(rules.length);
    for (const rule of rules) {
      expect(() => ideaOf(rule.ideaId)).not.toThrow();
      expect(rule.sides).toHaveLength(2);
      for (const side of rule.sides) expect(side.line.length, `${rule.ideaId} ${side.id}`).toBeGreaterThan(10);
    }
  });
});

describe('Modern Greek', () => {
  const modern = pronunciationOf('modern');
  it('has a rule for χ, γ, σ, αυ, ευ, ηυ, μπ, ντ, γκ and γχ, and none for γγ or γξ, which never change', () => {
    expect(soundRulesOf(modern).map((r) => r.ideaId).sort()).toEqual(
      ['letter-chi', 'letter-gamma', 'letter-sigma', 'diphthong-au', 'diphthong-eu', 'diphthong-eeu', 'pair-mp', 'pair-nt', 'pair-gk', 'pair-gch'].sort(),
    );
  });

  it('has words on both sides of every rule but μπ, ντ and γκ, which no word of the text begins with', () => {
    for (const rule of soundRulesOf(modern)) {
      const empty = rule.sides.filter((s) => s.words.length === 0).map((s) => s.id);
      expect(empty, rule.ideaId).toEqual(['pair-mp', 'pair-nt', 'pair-gk'].includes(rule.ideaId) ? ['start'] : []);
    }
  });

  it('reads no rule in a word that has none, and a word with χ on both sides on neither', () => {
    const chi = soundRulesOf(modern).find((r) => r.ideaId === 'letter-chi')!;
    expect(chi.sideOf('λόγος')).toBeNull();
    expect(chi.sideOf('χαρίσματα')).toBe('hard');
    expect(chi.sideOf('χαρᾷ χεῖρες')).toBeNull();
  });

  it('respells every word as before: the rules only write down what the respeller decides', () => {
    expect(modern.respell('χαίρετε')).toBe('HYE-re-te');
    expect(modern.respell('Πάντοτε')).toBe('PAN-do-te');
    expect(modern.respell('κόσμος')).toBe('KOZ-mos');
    expect(modern.respell('ἄγγελος')).toBe('AN-ge-los');
  });
});
