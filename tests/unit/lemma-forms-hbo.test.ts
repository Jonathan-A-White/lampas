// The lemma-forms index for Hebrew (mw-gdcyf98.16): the Old Testament's words are indexed by the TBESH headword, each form kept byte for byte, one file a headword
// under public/lemma-forms; a second build changes nothing. Over the real chapters in public/data.
// @vitest-environment node
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fileText, lemmaFileName, lemmaForms, readChapters, writeLemmaForms, type LemmaFormEntry } from '../../scripts/build-lemma-forms.mjs';
import type { Chapter } from '../../src/data/chapter';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const BARA = 'בָּרָא';
let chapters: Chapter[];
let index: Map<string, LemmaFormEntry[]>;
const scratch = mkdtempSync(join(tmpdir(), 'lemma-forms-hbo-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }), HOOK_TIMEOUT_MS);
beforeAll(() => {
  chapters = readChapters('public/data');
  index = lemmaForms(chapters.filter((c) => c.lang === 'hbo'));
}, HOOK_TIMEOUT_MS);

const treeHash = (dir: string): string => {
  const hash = createHash('sha256');
  for (const name of readdirSync(dir).sort()) hash.update(name).update(readFileSync(join(dir, name)));
  return hash.digest('hex');
};

describe('the index from a Hebrew headword to its forms', () => {
  it('reads the Old Testament’s chapters too', () => {
    expect(chapters.filter((c) => c.lang === 'hbo')).toHaveLength(929);
    expect(chapters.filter((c) => c.lang !== 'hbo')).toHaveLength(260);
  });

  it('בָּרָא: its forms in Genesis 1, with the table’s codes and the first place of each', () => {
    const forms = index.get(BARA) ?? [];
    const first = forms.find(([form]) => form === 'בָּרָ֣א');
    expect(first).toEqual(['בָּרָ֣א', 'V-Qal-Perf-3ms', expect.any(Number), 'gen', 1, 1]);
    expect(first![2]).toBeGreaterThan(1); // 'created' is said of God more than once in the chapter, and after it
    const gen1 = forms.filter(([, , , book, chapter]) => book === 'gen' && chapter === 1);
    expect(gen1.length).toBeGreaterThanOrEqual(2);
    expect(forms.map(([form]) => form)).toContain('וַיִּבְרָ֨א');
    for (const [, code] of forms) expect(code).toMatch(/^[A-Za-z]/);
  });

  it('keeps every form byte for byte: each is a word of the text exactly as written, points and accents where they were', () => {
    const texts = new Set(chapters.filter((c) => c.lang === 'hbo').flatMap((c) => c.verses.flatMap((v) => v.g.map((w) => w.t))));
    let checked = 0;
    for (const entries of index.values())
      for (const [form] of entries) {
        expect(texts.has(form), form).toBe(true);
        checked += 1;
      }
    expect(checked).toBeGreaterThan(50_000);
  });

  it('indexes by the headword the chapter gives, leaves out a word with none, and keeps the Greek index to the Greek chapters', () => {
    const hebrewWords = chapters.filter((c) => c.lang === 'hbo').flatMap((c) => c.verses.flatMap((v) => v.g));
    expect(hebrewWords.some((w) => w.l === '')).toBe(true);
    expect(index.has('')).toBe(false);
    for (const lemma of index.keys()) expect(lemma).toBe(lemma.normalize('NFC'));
    const all = lemmaForms(chapters);
    expect(all.has(BARA)).toBe(true);
    expect(all.has('ἀγαπάω')).toBe(true);
    expect(all.size).toBe(index.size + lemmaForms(chapters.filter((c) => c.lang !== 'hbo')).size);
  });
});

describe('the file of a Hebrew headword', () => {
  it('is the headword in NFC with .json, pointed as it stands; a path separator is refused', () => {
    expect(lemmaFileName(BARA)).toBe(`${BARA}.json`);
    expect(lemmaFileName('יְרוּשָׁלִַ֫ם, יְרוּשְׁלֵם')).toBe('יְרוּשָׁלִַ֫ם, יְרוּשְׁלֵם.json');
    expect(lemmaFileName('מִן־')).toBe('מִן־.json');
    expect(lemmaFileName('ἀγαπάω')).toBe('ἀγαπάω.json');
    expect(() => lemmaFileName('a/b')).toThrow();
    expect(() => lemmaFileName('..\\b')).toThrow();
  });

  it('holds {"l", "f"}: writeLemmaForms writes one file for each headword, and a second build changes nothing', () => {
    const first = writeLemmaForms('public/data', scratch);
    expect(first.lemmas).toBe(readdirSync(scratch).length);
    const file = JSON.parse(readFileSync(join(scratch, lemmaFileName(BARA)), 'utf8')) as { l: string; f: LemmaFormEntry[] };
    expect(file.l).toBe(BARA);
    expect(file.f.some(([form, code, , book, chapter, verse]) => form === 'בָּרָ֣א' && code === 'V-Qal-Perf-3ms' && book === 'gen' && chapter === 1 && verse === 1)).toBe(true);
    expect(readFileSync(join(scratch, lemmaFileName(BARA)), 'utf8')).toBe(fileText(BARA, index.get(BARA) ?? []));
    const before = treeHash(scratch);
    const second = writeLemmaForms('public/data', scratch);
    expect(second).toEqual(first);
    expect(treeHash(scratch)).toBe(before);
  }, 120_000);
});
