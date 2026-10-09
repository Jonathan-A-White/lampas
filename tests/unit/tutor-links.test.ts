// The tutor's links (mw-5r3p30.75): the answer schema and the app's guard agree on `links`, the grind's instructions say when to add one, and the
// chips a link becomes follow the study resources he switched on (src/resources/tutorLinks.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_LINKS, isTalkAnswer } from '../../src/services/talk';
import { verseLink } from '../../src/resources/logosBible';
import { verseChips, wordChips } from '../../src/resources/tutorLinks';
import type { StudyResources } from '../../src/data/repositories';
import { validate, type Schema } from '../support/schema-validate';

const schema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as Schema;
const instructions = readFileSync('grinds/bible-talk.instructions.md', 'utf8');
const base = { answer: 'Love, mostly.', words: [] };
const word = { kind: 'word', lemma: 'ἀγάπη' };
const verse = { kind: 'verse', reference: 'Romans 8:31' };
const on = (...ids: string[]): StudyResources => ({ on: ids, options: {} });

describe('links in the answer schema and the guard', () => {
  it('are optional, at most three, and a word (a lemma) or a verse (a reference)', () => {
    expect((schema.required as string[]).sort()).toEqual(['answer', 'words']);
    const links = schema.properties?.links;
    expect(links?.maxItems).toBe(MAX_LINKS);
    expect(MAX_LINKS).toBe(3);
    for (const value of [base, { ...base, links: [] }, { ...base, links: [word] }, { ...base, links: [word, verse, word] }]) {
      expect(validate(value, schema), JSON.stringify(value)).toEqual([]);
      expect(isTalkAnswer(value)).toBe(true);
    }
  });

  const bad: [string, unknown][] = [
    ['a link of no kind', { ...base, links: [{ lemma: 'ἀγάπη' }] }],
    ['a link of another kind', { ...base, links: [{ kind: 'url', lemma: 'https://example.com' }] }],
    ['a word link with no lemma', { ...base, links: [{ kind: 'word' }] }],
    ['a word link with an empty lemma', { ...base, links: [{ kind: 'word', lemma: '' }] }],
    ['a verse link with a lemma', { ...base, links: [{ kind: 'verse', lemma: 'ἀγάπη' }] }],
    ['an extra key on a link', { ...base, links: [{ ...word, url: 'https://example.com' }] }],
    ['links that are not a list', { ...base, links: word }],
  ];
  it.each(bad)('refuse %s in both', (_, value) => {
    expect(validate(value, schema)).not.toEqual([]);
    expect(isTalkAnswer(value)).toBe(false);
  });

  it('refuses four links in the schema (the mill), while the app, which keeps three, still takes the answer', () => {
    const four = { ...base, links: [word, word, word, word] };
    expect(validate(four, schema)).not.toEqual([]);
    expect(isTalkAnswer(four)).toBe(true);
  });
});

describe('the grind instructions on links', () => {
  it('say what a link is, when to add one, the limit of three, and that the app shows only the resources he has on', () => {
    expect(instructions).toContain('`links`');
    expect(instructions).toContain('## Links to his study resources');
    expect(instructions).toMatch(/at most (three|3) links/i);
    expect(instructions).toContain('`kind` `word`');
    expect(instructions).toContain('`kind` `verse`');
    expect(instructions).toMatch(/quiz/i);
    expect(instructions).toMatch(/does not show a link to a resource he has not switched on|shows only the links of the resources he has switched on/i);
  });
});

describe('wordChips', () => {
  it('gives the first link of each resource he switched on, named for the lemma', () => {
    const chips = wordChips('ἀγάπη', 'G26', on('strongs', 'logos', 'accordance'));
    expect(chips.map((c) => c.label)).toEqual(['G26 for ἀγάπη', 'Open in Logos: BDAG for ἀγάπη', 'Open in Accordance for ἀγάπη']);
    expect(chips[1].url).toBe('logosres:LLS:46.30.18;hw=%E1%BC%80%CE%B3%CE%AC%CF%80%CE%B7');
    expect(chips[1].tile).toBe('BDAG');
  });

  it('gives nothing for a resource that is off, and nothing at all when none is on', () => {
    expect(wordChips('ἀγάπη', 'G26', on('logos')).map((c) => c.label)).toEqual(['Open in Logos: BDAG for ἀγάπη']);
    expect(wordChips('ἀγάπη', 'G26', on())).toEqual([]);
  });

  it('follows the lexicon he ticked first', () => {
    const chosen: StudyResources = { on: ['logos'], options: { logos: JSON.stringify(['louwnida', 'bdag']) } };
    expect(wordChips('ἀγάπη', 'G26', chosen)[0].label).toBe('Open in Logos: BDAG for ἀγάπη');
    expect(wordChips('ἀγάπη', 'G26', { on: ['logos'], options: { logos: JSON.stringify(['louwnida']) } })[0].label).toBe('Open in Logos: Louw-Nida for ἀγάπη');
  });

  it('gives no Strong\'s chip for a word the lexicon does not have', () => {
    expect(wordChips('ζζζ', undefined, on('strongs', 'accordance')).map((c) => c.label)).toEqual(['Open in Accordance for ζζζ']);
  });
});

describe('verseLink and verseChips', () => {
  it('writes a New Testament verse in Logos as the chapter link does for the Old', () => {
    expect(verseLink('rom', 8, 31, 'LLS:LGCYSTNDRDBBLSB')).toEqual({
      url: 'logosres:lgcystndrdbblsb;ref=Bible.Ro8.31',
      fallback: 'https://ref.ly/logosres/lgcystndrdbblsb?ref=Bible.Ro8.31',
    });
    expect(verseLink('1jn', 1, 9, 'LLS:LGCYSTNDRDBBLSB')?.url).toBe('logosres:lgcystndrdbblsb;ref=Bible.1Jn1.9');
    expect(verseLink('xyz', 1, 1, 'LLS:LGCYSTNDRDBBLSB')).toBeUndefined();
  });

  it('gives Logos\' chip only when Logos is on, in the Bible he chose', () => {
    expect(verseChips({ book: 'rom', chapter: 8, verse: 31 }, 'Romans 8:31', on('strongs', 'accordance'), 'LLS:LGCYSTNDRDBBLSB')).toEqual([]);
    const [chip] = verseChips({ book: 'rom', chapter: 8, verse: 31 }, 'Romans 8:31', on('logos'), 'LLS:1.0.710');
    expect(chip).toMatchObject({ label: 'Open Romans 8:31 in Logos', tile: 'Logos', url: 'logosres:1.0.710;ref=Bible.Ro8.31' });
  });
});
