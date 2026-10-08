// The grammar ladder (mw-hqd5bz.1): the one list of grammar ideas every other grammar story keys on, and ideasOf(code).
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { ALWAYS_NEEDED, LADDER, TIERS, ideaOf, ideasBelow, ideasOf } from '../../src/data/grammar/ladder';
import { GRAMMAR_TERMS } from '../../src/data/parseCode';

const words = (text: string): number => text.trim().split(/\s+/).length;
const tierOf = (id: string) => ideaOf(id).tier;

describe('the ladder', () => {
  it('is sorted by rung, whole numbers from 1, each idea once', () => {
    expect(LADDER.map((i) => i.rung)).toEqual(LADDER.map((_, n) => n + 1));
    expect(new Set(LADDER.map((i) => i.id)).size).toBe(LADDER.length);
    for (const idea of LADDER) expect(TIERS, idea.id).toContain(idea.tier);
  });

  it('covers every grammar term of parseCode.ts by exactly one idea', () => {
    for (const term of GRAMMAR_TERMS) {
      expect(LADDER.filter((i) => i.terms.includes(term)).map((i) => i.id), term).toHaveLength(1);
    }
    for (const idea of LADDER) for (const term of idea.terms) expect(GRAMMAR_TERMS, `${idea.id}: ${term}`).toContain(term);
  });

  it('has every idea rest only on ideas of a lower rung', () => {
    for (const idea of LADDER) {
      for (const need of idea.needs) expect(ideaOf(need).rung, `${idea.id} needs ${need}`).toBeLessThan(idea.rung);
    }
  });

  it('starts at the alphabet, then the letters, the sounds and the marks', () => {
    expect(LADDER[0].id).toBe('alphabet');
    expect(LADDER[0].tier).toBe('letters');
    const order = LADDER.map((i) => TIERS.indexOf(i.tier));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(ALWAYS_NEEDED).toEqual(['alphabet', 'breathings', 'accents']);
    for (const id of ALWAYS_NEEDED) expect(ideaOf(id)).toBeDefined();
  });

  it('has 24 letter ideas, each with a title, a lower and upper case glyph and a sound, resting on the alphabet', () => {
    const letters = LADDER.filter((i) => i.id.startsWith('letter-'));
    expect(letters).toHaveLength(24);
    for (const l of letters) {
      expect(l.tier).toBe('letters');
      expect(l.title.trim(), l.id).not.toBe('');
      expect(l.glyphs, l.id).toHaveLength(2);
      expect(l.glyphs?.[0], l.id).toBe(l.glyphs?.[0].toLowerCase());
      expect(l.glyphs?.[1], l.id).toBe(l.glyphs?.[1].toUpperCase());
      expect(l.sound?.trim(), l.id).toBeTruthy();
      expect(l.terms).toEqual([]);
      expect(l.needs).toEqual(['alphabet']);
    }
    expect(new Set(letters.map((l) => l.glyphs?.[0])).size).toBe(24);
    expect(ideaOf('letter-alpha').glyphs).toEqual(['α', 'Α']);
    expect(ideaOf('alphabet').tier).toBe('letters');
    expect(LADDER.filter((i) => i.tier === 'letters')).toHaveLength(25);
  });

  it('has a text of under 80 words for every idea', () => {
    for (const idea of LADDER) {
      expect(idea.text.trim(), idea.id).not.toBe('');
      expect(words(idea.text), idea.id).toBeLessThan(80);
      expect(idea.title.trim(), idea.id).not.toBe('');
    }
  });

  it('puts the perfect above the present, the aorist above the present and the pluperfect above the perfect', () => {
    expect(ideaOf('tense-perfect').rung).toBeGreaterThan(ideaOf('tense-present').rung);
    expect(ideaOf('tense-aorist').rung).toBeGreaterThan(ideaOf('tense-present').rung);
    expect(ideaOf('tense-pluperfect').rung).toBeGreaterThan(ideaOf('tense-perfect').rung);
    expect(ideaOf('mood-participle').rung).toBeGreaterThan(ideaOf('mood-indicative').rung);
  });

  it('answers ideaOf and ideasBelow, and throws on an id it does not know', () => {
    expect(ideaOf('case-genitive').title).toBe('The genitive case');
    expect(() => ideaOf('case-ablative')).toThrow(/Unknown grammar idea/);
    expect(() => ideasBelow('case-ablative')).toThrow(/Unknown grammar idea/);
    const below = ideasBelow('tense-pluperfect').map((i) => i.id);
    expect(below).toContain('tense-perfect');
    expect(below).toContain('verb');
    expect(below).toContain('alphabet');
    expect(below).not.toContain('tense-pluperfect');
    expect(ideasBelow('tense-pluperfect').map((i) => i.rung)).toEqual(ideasBelow('tense-pluperfect').map((i) => i.rung).sort((a, b) => a - b));
    expect(ideasBelow('alphabet')).toEqual([]);
  });
});

describe('ideasOf: the ideas a token with an RP code needs', () => {
  it('gives a first-person plural perfect active indicative its verb ideas and nothing from the nouns tier', () => {
    const ids = ideasOf('V-2RAI-1P-ATT');
    for (const id of ['verb', 'tense-perfect', 'voice-active', 'mood-indicative', 'person-1st', 'number-plural']) expect(ids).toContain(id);
    expect(ids.filter((id) => tierOf(id) === 'nouns')).toEqual([]);
  });

  it('gives a genitive singular feminine noun its noun, case, number and gender', () => {
    const ids = ideasOf('N-GSF');
    for (const id of ['noun', 'case-genitive', 'number-singular', 'gender-feminine']) expect(ids).toContain(id);
    expect(ids.filter((id) => tierOf(id) === 'verbs')).toEqual([]);
  });

  it('gives a preposition the preposition idea alone', () => {
    expect(ideasOf('PREP')).toEqual(['preposition']);
  });

  it('gives a participle its mood, tense and voice with its case, number and gender', () => {
    const ids = ideasOf('V-PAP-DPM');
    for (const id of ['verb', 'tense-present', 'voice-active', 'mood-participle', 'case-dative', 'number-plural', 'gender-masculine']) expect(ids).toContain(id);
  });

  it('gives a pronoun the pronoun idea and its kind', () => {
    const ids = ideasOf('P-1AS');
    for (const id of ['pronoun', 'pronoun-personal', 'case-accusative', 'person-1st', 'number-singular']) expect(ids).toContain(id);
    expect(ideasOf('S-1SGSM')).toContain('pronoun-possessive');
  });

  it('gives a suffix its own idea', () => {
    expect(ideasOf('ADV-C')).toEqual(expect.arrayContaining(['adverb', 'comparative']));
    expect(ideasOf('PRT-N')).toEqual(expect.arrayContaining(['particle', 'negative']));
  });

  it('is sorted by rung, never lists the letters, breathings or accents, and is the same twice', () => {
    const ids = ideasOf('V-AAP-GSM');
    expect(ids.map((id) => ideaOf(id).rung)).toEqual(ids.map((id) => ideaOf(id).rung).sort((a, b) => a - b));
    for (const id of ALWAYS_NEEDED) expect(ids).not.toContain(id);
    expect(tierOf(ids[0])).not.toBe('letters');
    expect(ideasOf('V-AAP-GSM')).toEqual(ids);
  });

  it('throws on a code it does not know', () => {
    expect(() => ideasOf('Z-XXX')).toThrow(/Unknown parsing code/);
    expect(() => ideasOf('')).toThrow();
  });

  it('finds a non-empty idea set, of known ideas, for every parse code of all 260 chapters', () => {
    const codes = new Set<string>();
    let files = 0;
    for (const book of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory())) {
      for (const file of readdirSync(`public/data/${book.name}`)) {
        files += 1;
        const chapter = JSON.parse(readFileSync(`public/data/${book.name}/${file}`, 'utf8')) as Chapter;
        for (const code of Object.keys(chapter.parse)) codes.add(code);
      }
    }
    expect(files).toBe(260);
    expect(codes.size).toBeGreaterThan(300);
    for (const code of codes) {
      const ids = ideasOf(code);
      expect(ids.length, code).toBeGreaterThan(0);
      for (const id of ids) expect(ideaOf(id), `${code}: ${id}`).toBeDefined();
    }
  });
});

describe('docs/grammar.md', () => {
  it('lists every idea of the ladder and says it is provisional', () => {
    const doc = readFileSync('docs/grammar.md', 'utf8');
    expect(doc).toMatch(/PROVISIONAL/);
    for (const idea of LADDER) expect(doc, idea.id).toContain(`\`${idea.id}\``);
  });
});
