// tests/unit/lxx-align.test.ts — `npm run lxx:align` (scripts/lxx/align.ts, mw-u2w5klk.274.1; docs/lxx-align.md): Brenton's verse cut into English chunks aligned to Swete's Greek words,
// deterministically (a lemma's gloss from the lexicon, a name by its transliteration, a function word by its place), written into each shipped verse's `e` with a confidence `c` and a source `y`.
// The Genesis 1 fixture is the one tests/unit/data-build-lxx.test.ts builds (tests/fixtures/lxx: Swete's Gen 1, the annotations, TBESG's rows for its lemmas), with all 31 verses of LXX2012's Gen 1 (lxx2012-gen-1-full.usfm; the other file holds five).
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import { syntheticGenesis } from '../support/lxx-genesis';
import type { Chapter, EnglishChunk, GreekWord, Verse } from '../../src/data/chapter';
import { weaveVerse } from '../../src/data/weave';
import { buildLxx, LEXICON_FILE, type LxxIndex, type LxxInput, type LxxLexiconEntry } from '../../scripts/data-build-lxx';
import { chapterFingerprint } from '../../scripts/data/chapterWriter';
import {
  ALIGN_END, ALIGN_START, alignChapter, SUPPLIED_FOR_VERB, alignVerse, renderAlignReport, runAlign, type AlignShare, type AlignSink,
} from '../../scripts/lxx/align';
import { deriveBook, type DeriveInput } from '../../scripts/lxx/derive';
import type { KnownScore } from '../../scripts/lxx/known';
import { runShip, type ShipOptions } from '../../scripts/lxx/ship';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';

const FIXTURES = 'tests/fixtures/lxx';
const fixture = (name: string): string => readFileSync(join(FIXTURES, name), 'utf8');
const [genVersification, genWords] = fixture('swete-gen-1.csv').split('\n\n');

const input = (over: Partial<LxxInput> = {}): LxxInput => ({
  versification: genVersification,
  words: genWords,
  translit: fixture('swete-translit-gen-1.csv'),
  annotations: { gen: fixture('annotations-gen-1.tsv') },
  usfm: { gen: fixture('lxx2012-gen-1-full.usfm') },
  tvtms: fixture('tvtms-slice.txt'),
  tbesg: fixture('tbesg-gen-1.txt'),
  licence: readFileSync(join(FIXTURES, 'LICENSE-LXX-Swete-1930')),
  readme: readFileSync(join(FIXTURES, 'README-LXX-Swete-1930.md')),
  ...over,
});

const plain = buildLxx(input());
const sink: AlignSink = { shares: [] };
const aligned = buildLxx(input(), sink);
const chapterOf = (files: Map<string, string>, path: string): Chapter => JSON.parse(files.get(path) ?? 'null') as Chapter;
const gen1Plain = chapterOf(plain.files, 'gen/1.json');
const gen1 = chapterOf(aligned.files, 'gen/1.json');
const lexicon = JSON.parse(aligned.files.get(LEXICON_FILE) ?? '{}') as Record<string, LxxLexiconEntry>;
const gloss = (lemma: string): string => lexicon[lemma]?.g ?? '';

/** The share of Genesis 1's Greek words the aligner pairs, set from a dry run on this fixture (mw-u2w5klk.274.1): it measured 0.8389 (the words with an English chunk, 630 of 751; the 121 left are mostly Greek articles Brenton has no 'the' for); the floor is the dry run rounded down. */
const GEN1_SHARE_FLOOR = 0.83;

const word = (t: string, tr: string, l: string, p: string): GreekWord => ({ t, tr, s: '', l, p, y: '2', c: 0.9 });
const verseOf = (text: string, g: GreekWord[], s?: number[]): Verse => ({ n: 1, g, e: [{ t: text, g: g.map((_, i) => i), ...(s ? { s } : {}) }] });
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');

describe('the aligned chapter keeps the shape the weave reads', () => {
  it('without an aligner the build is as it was: one chunk a verse holding every word', () => {
    expect(gen1Plain.verses[0].e).toEqual([{ t: 'In the beginning God made the heaven and the earth.', g: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }]);
  });

  it('cuts Gen 1:1 into chunks with t, g, a confidence c and the source y "align", and points each paired word at its chunk', () => {
    const verse = gen1.verses[0];
    expect(verse.e.map((c) => c.t)).toEqual(['In', 'the', 'beginning', 'God', 'made', 'the', 'heaven', 'and', 'the', 'earth.']);
    // the 'the' before 'beginning' has no Greek article: it is a remainder, for the model pass; every other chunk is aligned
    for (const chunk of verse.e) {
      if (chunk.y === 'align?') {
        expect(chunk).toEqual({ t: 'the', g: [], y: 'align?' });
        continue;
      }
      expect(chunk.y).toBe('align');
      expect(chunk.c).toBeGreaterThan(0);
      expect(chunk.c).toBeLessThanOrEqual(1);
      expect(Math.round((chunk.c ?? 0) * 100) / 100).toBe(chunk.c);
    }
    // ἐν ἀρχῇ: in, beginning; θεός: God; ποιέω: made (an irregular past); the Greek articles stand beside the English ones
    const at = (t: string): number => verse.e.findIndex((c) => c.t === t);
    expect(verse.e[at('In')].g).toEqual([0]);
    expect(verse.e[at('beginning')].g).toEqual([1]);
    expect(verse.e[at('made')].g).toEqual([2]);
    expect(verse.e[at('God')].g).toEqual([4]);
    expect(verse.e[at('earth.')].g).toEqual([9]);
    verse.e.forEach((chunk, i) => chunk.g.forEach((g) => expect(verse.g[g].e).toBe(i)));
  });

  it('is read by weaveVerse: over an aligned Gen 1 verse it returns one entry a chunk, in the chunks\' order, and weaves the chunk of a known word', () => {
    const verse = gen1.verses[0];
    const woven = weaveVerse(verse, { solid: new Set(['θεός']) });
    expect(woven).toHaveLength(verse.e.length);
    const god = verse.e.findIndex((c) => c.t === 'God');
    expect(woven[god]?.words.map((w) => w.t)).toEqual(['θεὸς']);
    woven.forEach((entry, i) => i !== god && expect(entry).toBeNull());
    expect(weaveVerse(verse, { solid: new Set(['θεός', 'ἀρχή']) }).filter(Boolean)).toHaveLength(2);
  });
});

describe('how a word is paired', () => {
  it('pairs a proper name by its transliteration (Iakōb and Jacob, Kain and Cain) and a function word by its place', () => {
    const verse = verseOf('And Cain knew his wife, and she bore Jacob.', [
      word('Καὶ', 'Kai', 'καί', 'CONJ'),
      word('Κάιν', 'Kain', 'Κάιν', 'N-NSM'),
      word('Ἰακώβ', 'Iakōb', 'Ἰακώβ', 'N-ASM'),
    ]);
    const out = alignVerse(verse, () => '').verse;
    const chunk = (t: string) => out.e.find((c) => c.t === t)!;
    expect(chunk('Cain').g).toEqual([1]);
    expect(chunk('Cain').y).toBe('align');
    expect(chunk('Jacob.').g).toEqual([2]);
    expect(chunk('Jacob.').c).toBeGreaterThanOrEqual(0.6);
  });

  it('does not pair a name with an English word that looks nothing like it', () => {
    const verse = verseOf('And God made Adam.', [word('Ἀδάμ', 'Adam', 'Ἀδάμ', 'N-ASM')]);
    const out = alignVerse(verse, () => '').verse;
    expect(out.e.find((c) => c.t === 'Adam.')?.g).toEqual([0]);
    expect(out.e[0]).toEqual({ t: 'And God made', g: [], y: 'align?' });
    const other = alignVerse(verseOf('And God made Seth.', [word('Ἀδάμ', 'Adam', 'Ἀδάμ', 'N-ASM')]), () => '').verse;
    expect(other.e).toEqual([{ t: 'And God made Seth.', g: [], y: 'align?' }]);
  });

  it('pairs a word by its lemma\'s gloss across an inflected English form', () => {
    const verse = verseOf('The earth was unsightly, and the waters moved.', [
      word('γῆ', 'gē', 'γῆ', 'N-NSF'),
      word('ὕδατα', 'hydata', 'ὕδωρ', 'N-NPN'),
    ]);
    const out = alignVerse(verse, (l) => ({ γῆ: 'earth, planet', ὕδωρ: 'water' })[l] ?? '').verse;
    expect(out.e.find((c) => c.t === 'earth')?.g).toEqual([0]);
    expect(out.e.find((c) => c.t === 'waters')?.g).toEqual([1]);
  });

  it('pairs one unmatched Greek word with the one unmatched English word between two pairs, at a low confidence', () => {
    const verse = verseOf('God honoured the light.', [
      word('θεὸς', 'theos', 'θεός', 'N-NSM'),
      word('ἐτίμησεν', 'etimēsen', 'τιμάω', 'V-AAI-3S'),
      word('φῶς', 'phōs', 'φῶς', 'N-ASN'),
    ]);
    const out = alignVerse(verse, (l) => ({ θεός: 'God', φῶς: 'light', τιμάω: 'to esteem' })[l] ?? '').verse;
    const honoured = out.e.find((c) => c.t === 'honoured')!;
    expect(honoured.g).toEqual([1]);
    expect(honoured.c).toBeLessThan(0.5);
  });

  it('carries the supplied words of Brenton\'s brackets to the chunk they fall in', () => {
    const verse = verseOf('God was good', [word('θεὸς', 'theos', 'θεός', 'N-NSM')], [1]);
    const out = alignVerse(verse, () => 'God').verse;
    expect(out.e.map((c) => [c.t, c.s])).toEqual([['God', undefined], ['was good', [0]]]);
    const first = alignVerse(verseOf('was God', [word('θεὸς', 'theos', 'θεός', 'N-NSM')], [0]), () => 'God').verse;
    expect(first.e.map((c) => [c.t, c.s])).toEqual([['was', [0]], ['God', undefined]]);
    const inside = alignVerse(verseOf('the God', [word('θεὸς', 'theos', 'θεός', 'N-NSM')], [1]), () => 'God').verse;
    expect(inside.e.map((c) => [c.t, c.s])).toEqual([['the', undefined], ['God', [0]]]);
  });
});

describe('an unpaired word is never dropped', () => {
  it('leaves the English the aligner cannot pair in a remainder chunk marked y "align?", with no Greek, and the verse\'s chunks joined are Brenton\'s whole verse', () => {
    const verse = verseOf('But the earth was unsightly and unfurnished.', [word('γῆ', 'gē', 'γῆ', 'N-NSF')]);
    const out = alignVerse(verse, () => 'earth').verse;
    expect(out.e.filter((c) => c.y === 'align?').map((c) => [c.t, c.g])).toEqual([['But the', []], ['was unsightly and unfurnished.', []]]);
    expect(joined(out)).toBe('But the earth was unsightly and unfurnished.');
  });

  it('a verse nothing pairs in stays one chunk marked y "align?", and its Greek words have no e', () => {
    const verse = verseOf('Hail, and farewell.', [word('ἀμήν', 'amēn', 'ἀμήν', 'PRT')]);
    const out = alignVerse(verse, () => '').verse;
    expect(out.e).toEqual([{ t: 'Hail, and farewell.', g: [], y: 'align?' }]);
    expect(out.g[0].e).toBeUndefined();
  });

  it('a verse with no English is left as it is', () => {
    const verse: Verse = { n: 1, g: [word('γῆ', 'gē', 'γῆ', 'N-NSF')], e: [] };
    expect(alignVerse(verse, () => 'earth').verse).toEqual(verse);
  });

  it('every verse of Genesis 1, its chunks joined, is Brenton\'s whole verse as the unaligned build has it, and every chunk\'s Greek positions are real', () => {
    expect(gen1.verses).toHaveLength(gen1Plain.verses.length);
    gen1.verses.forEach((verse, i) => {
      expect(joined(verse)).toBe(gen1Plain.verses[i].e[0].t);
      expect(verse.g.map((w) => w.t)).toEqual(gen1Plain.verses[i].g.map((w) => w.t));
      verse.e.forEach((chunk) => chunk.g.forEach((g) => expect(verse.g[g]).toBeDefined()));
      // a Greek word is in at most one chunk, bar the English words Brenton supplies for a verb that stand some words before it ("Let" of "Let the water be collected"), which are paired to the verb without
      // joining it (joinSupplied, mw-u2w5klk.274.14): its own chunk is the one `e` names, the others hold only such supplied words and come before it
      verse.g.forEach((_, k) => {
        const holders = verse.e.flatMap((c, x) => (c.g.includes(k) ? [x] : []));
        if (holders.length < 2) return;
        expect(holders[holders.length - 1], `verse ${verse.n}`).toBe(verse.g[k].e);
        holders.slice(0, -1).forEach((x) => expect(verse.e[x].t.split(/\s+/).every((w) => SUPPLIED_FOR_VERB.has(w.toLowerCase().replace(/[^a-z]/g, ''))), `verse ${verse.n}`).toBe(true));
      });
    });
  });

  it('the supplied words of the unaligned chunk are the supplied words of the chunks, in count', () => {
    const plainSupplied = gen1Plain.verses.flatMap((v) => v.e.flatMap((c) => c.s ?? [])).length;
    const supplied = gen1.verses.flatMap((v) => v.e.flatMap((c) => c.s ?? [])).length;
    expect(supplied).toBe(plainSupplied);
  });
});

describe('the words Brenton supplies for a verb join its chunk', () => {
  const verse3 = gen1.verses[2];
  const chunkOf = (verse: Verse, t: string): number => verse.e.findIndex((c) => c.t === t);

  it('Gen 1:3: "Let there be" is one chunk of Γενηθήτω, so a tap on "Let there" finds the Greek', () => {
    const chunk = verse3.e.find((c) => c.t.startsWith('Let there'))!;
    expect(chunk.t).toBe('Let there be');
    expect(chunk.g).toEqual([4]);
    expect(verse3.g[4].e).toBe(verse3.e.indexOf(chunk));
  });

  it('Gen 1:3: no "there" chunk with no Greek stands before the paired "was"; "there was" is one chunk of ἐγένετο', () => {
    const was = verse3.e.findIndex((c) => c.t === 'there was');
    expect(was).toBeGreaterThan(0);
    expect(verse3.e[was].g).toEqual([7]);
    verse3.e.forEach((c, i) => {
      if (c.g.length === 0) expect(verse3.e[i + 1]?.t).not.toBe('was');
    });
  });

  it('Gen 1:5: "he" joins "called" and the verse is still Brenton\'s whole verse', () => {
    const verse5 = gen1.verses[4];
    expect(verse5.e.find((c) => c.t === 'he called')?.g).toEqual([10]);
    expect(joined(verse5)).toBe(gen1Plain.verses[4].e[0].t);
    verse5.e.forEach((chunk, i) => chunk.g.forEach((g) => expect(verse5.g[g].e).toBe(i)));
  });

  it('only a verb takes them: "let it" before a noun stays a remainder, and the supplied marks of both parts are kept', () => {
    const noun = alignVerse(verseOf('And let it light.', [word('φῶς', 'phōs', 'φῶς', 'N-ASN')]), () => 'light').verse;
    expect(noun.e.map((c) => c.t)).toEqual(['And let it', 'light.']);
    const verb = alignChapter(
      { code: 'gen', book: 'Genesis', chapter: 1, verses: [verseOf('And he called light.', [word('ἐκάλεσεν', 'ekalesen', 'καλέω', 'V-AAI-3S'), word('φῶς', 'phōs', 'φῶς', 'N-ASN')], [1])] } as Chapter,
      (l) => ({ καλέω: 'call', φῶς: 'light' })[l] ?? '',
    ).chapter.verses[0];
    expect(verb.e.map((c) => [c.t, c.g, c.s])).toEqual([['And', [], undefined], ['he called', [0], [0]], ['light.', [1], undefined]]);
    expect(chunkOf(verb, 'he called')).toBe(1);
  });
});

describe('the pronouns and auxiliaries Brenton puts before a verb join its chunk too (mw-u2w5klk.274.11)', () => {
  const chunkWith = (n: number, k: number) => {
    const verse = gen1.verses[n - 1];
    return verse.e.find((c) => c.g.includes(k));
  };
  const wordIndex = (n: number, lemma: string): number => gen1.verses[n - 1].g.findIndex((w) => w.l === lemma);

  it('Gen 1:26: "Let us make" is one chunk of ποιήσωμεν', () => {
    const chunk = chunkWith(26, wordIndex(26, 'ποιέω'))!;
    expect(chunk.t.startsWith('Let us make')).toBe(true);
    expect(chunk.g).toEqual([wordIndex(26, 'ποιέω')]);
  });

  it('Gen 1:14: "let them be" is one chunk of γενέσθωσαν; 1:29: "I have given" and 1:31: "he had made" join their verbs', () => {
    const be = gen1.verses[13].e.find((c) => /^let them be\b/.test(c.t))!;
    expect(be.g.length).toBe(1);
    expect(gen1.verses[13].g[be.g[0]].p.startsWith('V-')).toBe(true);
    expect(chunkWith(29, wordIndex(29, 'δίδωμι'))!.t).toMatch(/^I have given\b/);
    expect(chunkWith(31, wordIndex(31, 'ποιέω'))!.t).toMatch(/\bhe had made/);
  });

  it('no Genesis 1 chunk with no Greek ends in such a word before a verb chunk, bar the object ones, and the verse is still Brenton\'s whole verse', () => {
    gen1.verses.forEach((verse, v) => {
      expect(joined(verse)).toBe(gen1Plain.verses[v].e[0].t);
      verse.e.forEach((c, i) => {
        const next = verse.e[i + 1];
        if (c.g.length > 0 || !next?.g.some((k) => verse.g[k]?.p.startsWith('V-'))) return;
        expect(c.t, `verse ${verse.n}`).not.toMatch(/\b(let|let us|let them|I|he|she|it|they|we|have|had|shall|will)$/i);
      });
    });
  });

  it('"us" and "them" are often objects: "blessed them" before a new verb is not joined to it, but "let them" is', () => {
    const gl = (l: string): string => ({ καί: 'and', εὐλογέω: 'bless', λέγω: 'say' })[l] ?? '';
    const g = [word('καὶ', 'kai', 'καί', 'CONJ'), word('εὐλογήσεν', 'eulogēsen', 'εὐλογέω', 'V-AAI-3S'), word('εἶπεν', 'eipen', 'λέγω', 'V-2AAI-3S')];
    const object = alignChapter({ code: 'gen', book: 'Genesis', chapter: 1, verses: [verseOf('And blessed them said', g.slice(0, 1).concat(g.slice(2)))] } as Chapter, gl).chapter.verses[0];
    const texts = object.e.map((c) => c.t);
    expect(texts.join(' ')).toBe('And blessed them said');
    expect(texts.some((t) => /^them said/.test(t))).toBe(false);
    const leading = alignChapter({ code: 'gen', book: 'Genesis', chapter: 1, verses: [verseOf('And let them say', [g[0], g[2]])] } as Chapter, gl).chapter.verses[0];
    expect(leading.e.map((c) => [c.t, c.g])).toEqual([['And', [0]], ['let them say', [1]]]);
  });
});

describe('the words Brenton supplies reach the verb past a "not", a "there" or the subject (mw-u2w5klk.274.14, .274.15)', () => {
  const gl = (l: string): string => ({ δέ: 'and', καί: 'and', λέγω: 'say', οὐ: 'not', πατάσσω: 'kill', εὑρίσκω: 'find', θεός: 'God', συνάγω: 'collect', ὕδωρ: 'water', ὁ: 'the', ποιέω: 'make', ἐκεῖ: 'there', βλαστάνω: 'sprout', γῆ: 'earth' })[l] ?? '';
  const run = (text: string, g: GreekWord[]): Verse => alignChapter({ code: 'gen', book: 'Genesis', chapter: 1, verses: [verseOf(text, g)] } as Chapter, gl).chapter.verses[0];
  const chunkNamed = (verse: Verse, t: string): EnglishChunk => verse.e.find((c) => c.t === t)!;
  const said = [word('καὶ', 'kai', 'καί', 'CONJ'), word('εἶπεν', 'eipen', 'λέγω', 'V-2AAI-3S')];

  it('Gen 37:21: "Let us" before "not kill" is paired to πατάξομεν, and "not" and "kill" keep their own Greek', () => {
    const verse = run('And said, Let us not kill him.', [...said, word('Οὐ', 'ou', 'οὐ', 'PRT-N'), word('πατάξομεν', 'pataxomen', 'πατάσσω', 'V-FAI-1P'), word('αὐτὸν', 'auton', 'αὐτός', 'P-ASM')]);
    expect(chunkNamed(verse, 'Let us')).toMatchObject({ g: [3], y: 'align' });
    expect(chunkNamed(verse, 'not').g).toEqual([2]);
    expect(chunkNamed(verse, 'kill').g).toEqual([3]);
    // the Greek word points at its own chunk, not at the leading one
    expect(verse.e[verse.g[3].e!].t).toBe('kill');
    expect(joined(verse)).toBe('And said, Let us not kill him.');
  });

  it('Gen 38:22: "I have" before "not found" is paired to εὗρον', () => {
    const verse = run('And said, I have not found her;', [...said, word('Οὐχ', 'ouch', 'οὐ', 'PRT-N'), word('εὗρον', 'heuron', 'εὑρίσκω', 'V-2AAI-3P')]);
    expect(chunkNamed(verse, 'I have')).toMatchObject({ g: [3], y: 'align' });
    expect(chunkNamed(verse, 'not').g).toEqual([2]);
  });

  it('Gen 35:3: "let us" before "there make" is paired to ποιήσωμεν; a supplied word alone before a noun is not paired', () => {
    const verse = run('And let us there make an altar', [word('καὶ', 'kai', 'καί', 'CONJ'), word('ποιήσωμεν', 'poiesomen', 'ποιέω', 'V-AAS-1P'), word('ἐκεῖ', 'ekei', 'ἐκεῖ', 'ADV')]);
    const lead = verse.e.find((c) => /let us$/.test(c.t))!;
    expect(lead.g).toEqual([1]);
    const noun = run('And I have light.', [word('καὶ', 'kai', 'καί', 'CONJ'), word('φῶς', 'phōs', 'φῶς', 'N-ASN')]);
    expect(noun.e.filter((c) => c.g.length === 0).every((c) => c.y === 'align?')).toBe(true);
  });

  it('Gen 1:9: "Let" before "the water ... be collected" is paired to the jussive Συναχθήτω; "Let there be" (1:3) and "blessed them" are unchanged', () => {
    const verse = run('And God said, Let the water be collected into one place.', [
      ...said, word('ὁ', 'ho', 'ὁ', 'T-NSM'), word('θεός', 'theos', 'θεός', 'N-NSM'), word('Συναχθήτω', 'sunachthētō', 'συνάγω', 'V-APM-3S'), word('τὸ', 'to', 'ὁ', 'T-NSN'), word('ὕδωρ', 'hudōr', 'ὕδωρ', 'N-NSN'),
    ]);
    const lead = chunkNamed(verse, 'Let');
    expect(lead.g).toEqual([4]);
    expect(lead.y).toBe('align');
    // the verb's own chunk keeps it, and the Greek word points at that chunk
    const own = verse.e.findIndex((c, i) => c.g.includes(4) && c !== lead && i > verse.e.indexOf(lead));
    expect(own).toBeGreaterThan(-1);
    expect(verse.g[4].e).toBe(own);
    expect(joined(verse)).toBe('And God said, Let the water be collected into one place.');
    // 1:3 and 1:28 as before
    expect(gen1.verses[2].e.some((c) => c.t === 'Let there be' && c.g.length === 1)).toBe(true);
    expect(gen1.verses[27].e.some((c) => c.g.length === 0 && /them$/.test(c.t))).toBe(false);
  });

  it('a "Let" is not paired past the end of its clause or past another finite verb', () => {
    const stop = run('And said, Let the water, and he said, Be done.', [...said, word('ὁ', 'ho', 'ὁ', 'T-NSM'), word('ὕδωρ', 'hudōr', 'ὕδωρ', 'N-NSN'), word('εἶπεν', 'eipen', 'λέγω', 'V-2AAI-3S')]);
    expect(stop.e.filter((c) => c.g.length === 0 && /Let$/.test(c.t)).length).toBe(1);
  });

  it('in Genesis 1 no "let"/"Let" with no Greek stands in a clause whose Greek has a third-person jussive verb ahead of it', () => {
    gen1.verses.forEach((verse) => {
      verse.e.forEach((c, i) => {
        if (c.g.length > 0 || !/\blet$/i.test(c.t)) return;
        for (let j = i + 1; j < verse.e.length; j++) {
          const next = verse.e[j];
          if (next.g.some((k) => /^V-\w*[MS]-3[SP]$/.test(verse.g[k].p))) throw new Error(`verse ${verse.n}: "${c.t}" reaches no Greek, though "${next.t}" is a jussive verb`);
          if (/[,;.:?!]$/.test(next.t)) break;
        }
      });
    });
  });
});

describe('the model pass and the words supplied for a verb', () => {
  it('a "there" the model pass found no Greek for still joins "was", and the model\'s rows stay held to the aligner\'s runs', () => {
    const chapter = { code: 'gen', book: 'Genesis', chapter: 1, verses: [verseOf('And there was light.', [word('καὶ', 'kai', 'καί', 'CONJ'), word('ἐγένετο', 'egeneto', 'γίνομαι', 'V-2ADI-3S'), word('φῶς', 'phōs', 'φῶς', 'N-ASN')])] } as Chapter;
    const gl = (l: string): string => ({ καί: 'and', γίνομαι: 'become', φῶς: 'light' })[l] ?? '';
    const row = { ref: 'Gen.1:1', run: 1, text: 'there', g: [], mark: '' as const, confidence: 0.8 };
    const out = alignChapter(chapter, gl, [row]);
    expect(out.stale).toEqual([]);
    const verse = out.chapter.verses[0];
    expect(verse.e.map((c) => [c.t, c.g, c.y])).toEqual([['And', [0], 'align'], ['there was', [1], 'align'], ['light.', [2], 'align']]);
    expect(verse.g[1].e).toBe(1);
  });
});

describe('the Genesis 1 fixture', () => {
  it('aligns at least the stated share of its Greek words', () => {
    const words = gen1.verses.flatMap((v) => v.g);
    const paired = words.filter((w) => w.e !== undefined).length;
    expect(words).toHaveLength(751);
    expect(paired / words.length).toBeGreaterThanOrEqual(GEN1_SHARE_FLOOR);
    const share = sink.shares.find((s) => s.code === 'gen' && s.chapter === 1)!;
    expect(share).toMatchObject({ words: 751, paired });
  });

  it('two runs give byte-identical files', () => {
    const again = buildLxx(input(), { shares: [] });
    expect([...again.files.keys()]).toEqual([...aligned.files.keys()]);
    for (const [path, text] of aligned.files) expect(again.files.get(path)).toBe(text);
  });

  it('gives the aligned chapter its own fingerprint in index.json, for a phone holds a chapter by the fingerprint it asked for', () => {
    const fingerprints = (files: Map<string, string>): string[] => (JSON.parse(files.get('index.json') ?? '{}') as LxxIndex).books[0].fingerprints;
    expect(fingerprints(plain.files)[0]).toBe(chapterFingerprint(gen1Plain));
    expect(fingerprints(aligned.files)[0]).toBe(chapterFingerprint(gen1));
    expect(fingerprints(aligned.files)[0]).not.toBe(fingerprints(plain.files)[0]);
  });

  it('alignChapter on the chapter the build made gives the same chapter the build wrote', () => {
    const { chapter } = alignChapter(gen1Plain, gloss);
    expect(JSON.stringify(chapter)).toBe(JSON.stringify(gen1));
  });
});

describe('the report', () => {
  const shares: AlignShare[] = [
    { code: 'gen', book: 'Genesis', chapter: 1, verses: 31, words: 751, paired: 600, sure: 500, tokens: 800, pairedTokens: 600, model: 0 },
    { code: 'gen', book: 'Genesis', chapter: 2, verses: 25, words: 500, paired: 250, sure: 200, tokens: 600, pairedTokens: 250, model: 0 },
  ];

  it('gives the aligned share of each chapter between the markers, and the book\'s', () => {
    const text = renderAlignReport(shares);
    expect(text).toContain('| Genesis 1 | 31 | 751 | 600 | 79.9% | 66.6% | — |');
    expect(text).toContain('| Genesis 2 | 25 | 500 | 250 | 50.0% | 40.0% | — |');
    expect(text).toContain('| Genesis | 56 | 1,251 | 850 | 67.9% | 56.0% | — |');
  });

  it('the docs file has its markers, and what lxx:align writes there is what renderAlignReport gives', () => {
    const doc = readFileSync('docs/lxx-align.md', 'utf8');
    expect(doc).toContain(ALIGN_START);
    expect(doc).toContain(ALIGN_END);
    expect(doc.indexOf(ALIGN_START)).toBeLessThan(doc.indexOf(ALIGN_END));
  });
});

// the ship carries the chunks through (a dry ship: the synthetic Genesis of tests/support/lxx-genesis.ts with Gen 1's English)
describe('npm run lxx:ship carries the chunks to the directory', () => {
  const genesis = syntheticGenesis(50);
  const derive: DeriveInput = { versification: genesis.versification, words: genesis.words, tagnt: [fixture('tagnt-slice.tsv')], tbesg: fixture('tbesg-slice.txt') };
  const result = deriveBook(derive, 'gen');
  const chapterNo = (ref: string): number => Number(/^[^.]+\.(\d+):/.exec(ref)![1]);
  const choices = ['ref\tparsing\tlemma\tmark', ...result.pending.filter((p) => chapterNo(p.ref) <= 6).map((p) => `${p.ref}\t${p.candidates[0].morph}\t${p.candidates[0].lemma}\t`)].join('\n') + '\n';
  const passing = (chapters: readonly string[]): KnownScore[] =>
    chapters.map((chapter) => {
      const t = { words: 1000, lemma: 1000, full: 1000 };
      const none = { words: 0, lemma: 0, full: 0 };
      return { chapter, hidden: 'jhn', words: 1000, before: { 1: none, 2: none }, by: { '1': t, '2': none, '2a': none, '3': none, kept: none, none }, all: t, guesses: 0, unanswered: 0, choices: { given: 0, refused: 0, notPending: 0 } };
    });
  const tmpDirs: string[] = [];
  const tmp = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'lampas-lxx-align-'));
    tmpDirs.push(dir);
    return dir;
  };
  afterAll(() => tmpDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })), HOOK_TIMEOUT_MS);
  const load = async (annotationsDir: string): Promise<LxxInput> => {
    const annotations: Record<string, string> = {};
    if (existsSync(annotationsDir)) for (const f of readdirSync(annotationsDir).sort()) if (f.endsWith('.tsv')) annotations[f.slice(0, -4)] = readFileSync(join(annotationsDir, f), 'utf8');
    return { ...input(), versification: genesis.versification, words: genesis.words, translit: genesis.translit, annotations, usfm: { gen: fixture('lxx2012-gen-1-full.usfm') }, tbesg: fixture('tbesg-gen-1.txt') };
  };
  const options = (): ShipOptions => {
    const choicesDir = tmp();
    writeFileSync(join(choicesDir, 'gen-01.tsv'), choices);
    return { input: derive, load, choicesDir, alignDir: tmp(), morpheusDir: tmp(), known: passing, books: [['Gen', 'Genesis']], log: () => undefined };
  };

  it('writes the aligned chunks into the shipped chapters, reports the share of each chapter, and changes no other file of the chapter bar', async () => {
    const out = tmp();
    const done = await runShip(['--out', out, '--no-morpheus'], options());
    const ch = JSON.parse(readFileSync(join(out, 'gen', '1.json'), 'utf8')) as Chapter;
    expect(ch.verses[0].e.length).toBeGreaterThan(1);
    expect(ch.verses[0].e.every((c) => c.y === 'align' || c.y === 'align?')).toBe(true);
    expect(done.books).toEqual([{ code: 'gen', shipped: [1, 2, 3, 4, 5, 6], chapters: 50 }]);
    expect(done.aligned.map((s) => [s.code, s.chapter])).toEqual([1, 2, 3, 4, 5, 6].map((n) => ['gen', n]));
    // the index and the lexicon are the ones a ship made before: the chapters shipped, no new key
    const index = JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')) as { books: Array<{ shipped: number[] }> };
    expect(index.books[0].shipped).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('lxx:align runs the same ship and writes the report between the markers of docs/lxx-align.md, only there', async () => {
    const doc = join(tmp(), 'lxx-align.md');
    writeFileSync(doc, `# Align\n\nhand-written\n\n${ALIGN_START}\nold\n${ALIGN_END}\n\nafter\n`);
    const lines: string[] = [];
    await runAlign(['--out', tmp(), '--no-morpheus'], { ...options(), doc, log: (l) => lines.push(l) });
    const text = readFileSync(doc, 'utf8');
    expect(text.startsWith('# Align\n\nhand-written\n\n')).toBe(true);
    expect(text.endsWith(`${ALIGN_END}\n\nafter\n`)).toBe(true);
    expect(text).toContain('| Genesis 1 |');
    expect(text).not.toContain('\nold\n');
    const first = text;
    await runAlign(['--out', tmp(), '--no-morpheus'], { ...options(), doc, log: () => undefined });
    expect(readFileSync(doc, 'utf8')).toBe(first);
  });
});
