// A Study tile is never empty and never opens an app's or a site's home page (mw-5r3p30.926): a variant word the text never has (βιβλαρίδιον, Revelation 10:2, the NA reading)
// carries no lemma and no Strong's number, and its tiles were an empty STEP tile (strong= with nothing, which STEP opens at Genesis 1) and Logos links with an empty headword.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GreekWord } from '../../src/data/chapter';
import type { StudyResources } from '../../src/data/repositories';
import { LEXICONS, logosStudy, consonants } from '../../src/resources/logos';
import { RESOURCES, type StudyLink, type StudyResource } from '../../src/resources';
import { studyWordOf, verseChips, wordChips } from '../../src/resources/tutorLinks';

const DATA = join(__dirname, '..', '..', 'public', 'data');
const allIds = LEXICONS.map((l) => l.id);
const chosen: StudyResources = { on: RESOURCES.map((r) => r.id), options: { logos: JSON.stringify(allIds) }, pinnedLexicons: ['bdag'] };

interface Unit { alts: { g?: GreekWord[] }[] }
interface ChapterFile { verses: { g: GreekWord[] }[]; variants?: Unit[] }

const chapters = (): ChapterFile[] =>
  readdirSync(DATA, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => readdirSync(join(DATA, d.name)).filter((f) => /^\d+\.json$/.test(f)).map((f) => JSON.parse(readFileSync(join(DATA, d.name, f), 'utf8')) as ChapterFile));

/** every distinct word of the variant readings, and the first words of each verse's chapter's first verse (Greek and Hebrew) as a sample of ordinary ones */
const words = (): GreekWord[] => {
  const seen = new Map<string, GreekWord>();
  const add = (w: GreekWord): void => void seen.set(`${w.t}|${w.l}|${w.s}`, w);
  for (const c of chapters()) {
    for (const u of c.variants ?? []) for (const alt of u.alts) for (const w of alt.g ?? []) add(w);
    for (const w of c.verses[0]?.g.slice(0, 6) ?? []) add(w);
  }
  return [...seen.values()];
};

const problems = (links: readonly StudyLink[], word: GreekWord): string[] => {
  const lemma = word.l || word.t;
  const named = [lemma, consonants(lemma), word.t, word.s.replace(/^[GH]0*/, ''), 'Scroll'].filter((x) => x !== '');
  return links.flatMap((link): string[] => {
    const out: string[] = [];
    if ((link.tile ?? link.label).trim() === '' || link.label.trim() === '') out.push(`empty label: ${JSON.stringify(link)}`);
    for (const url of [link.url, link.fallback ?? '']) {
      if (url === '') continue;
      if (/=(&|#|$)/.test(url) || /[?|]strong=(\||$)/.test(url)) out.push(`empty value in ${url}`);
      const plain = decodeURIComponent(url);
      if (!named.some((n) => plain.includes(n))) out.push(`names nothing of ${word.t}: ${url}`);
    }
    return out;
  });
};

const linksOf = (word: GreekWord, resource: StudyResource): StudyLink[] => {
  const study = studyWordOf(word, { topic: 'scroll' });
  if (resource.id === 'logos') {
    const { links, door } = logosStudy(study, allIds, ['bdag']);
    return [...links, ...(door?.entries.map((e) => e.link) ?? [])];
  }
  return resource.linksFor(study, undefined);
};

describe('the Study tiles of a word', () => {
  it('βιβλαρίδιον of Revelation 10:2 (NA) has no empty tile: no Strong\'s tile, Logos at the word itself', () => {
    const word: GreekWord = { t: 'βιβλαρίδιον', tr: '', s: '', l: '', p: '' };
    const strongs = RESOURCES.find((r) => r.id === 'strongs')!;
    expect(linksOf(word, strongs)).toEqual([]);
    const logos = linksOf(word, RESOURCES.find((r) => r.id === 'logos')!);
    expect(logos.length).toBeGreaterThan(1);
    expect(problems(logos, word)).toEqual([]);
    expect(logos.some((l) => decodeURIComponent(l.url).includes('βιβλαρίδιον'))).toBe(true);
  });

  it("the tutor's chips for that word are whole too", () => {
    const chips = wordChips('', '', chosen);
    expect(chips.filter((c) => c.resource.id === 'strongs')).toEqual([]);
    for (const c of wordChips('βιβλαρίδιον', '', chosen)) expect(problems([c], { t: 'βιβλαρίδιον', tr: '', s: '', l: '', p: '' })).toEqual([]);
  });

  it('no tile of any resource is empty or opens a home page, for every word of the variant readings and a sample of ordinary ones', () => {
    const all = words();
    expect(all.length).toBeGreaterThan(500);
    const bad: string[] = [];
    for (const word of all) for (const resource of RESOURCES) bad.push(...problems(linksOf(word, resource), word).map((p) => `${word.t}: ${p}`));
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it('no chip of a verse is empty or opens a home page', () => {
    const chips = verseChips({ book: 'rev', chapter: 10, verse: 2 }, 'Revelation 10:2', chosen, 'nrsv');
    expect(chips.length).toBeGreaterThan(0);
    for (const c of chips) {
      expect(c.tile.trim()).not.toBe('');
      expect(c.label.trim()).not.toBe('');
      expect(c.url).toMatch(/10|rev|Rev/i);
    }
  });
});
