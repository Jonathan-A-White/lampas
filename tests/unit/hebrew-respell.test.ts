// The Israeli scheme's respelling (src/speech/schemes/hebrew-israeli.ts, docs/pronunciation.md 'Hebrew'): a pointed Hebrew word in syllables an English reader can say, the
// stressed one in capitals, in the style of the Greek's ('khree-STO'). Twenty words of Genesis 1 and Jonah 1, each held to the fixture it comes from and to the data's own
// transliteration (`tr`), which the respelling is handed as its guide where the data gives one.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { pronunciationsOf } from '../../src/speech/pronunciation';

const load = (path: string): Chapter => JSON.parse(readFileSync(path, 'utf8')) as Chapter;
const genesis1 = load('tests/fixtures/data/gen/1.json');
const jonah1 = load('tests/fixtures/data/jon/1.json');
const israeli = pronunciationsOf('he')[0];

/** [chapter, the word as the data writes it, its respelling]. */
const WORDS: readonly (readonly [Chapter, string, string])[] = [
  [genesis1, 'בְּרֵאשִׁ֖ית', 'be-reh-SHEET'],
  [genesis1, 'בָּרָ֣א', 'ba-RA'],
  [genesis1, 'אֱלֹהִ֑ים', 'e-lo-HEEM'],
  [genesis1, 'הַשָּׁמַ֖יִם', 'ha-sha-MA-yeem'],
  [genesis1, 'הָאָֽרֶץ׃', 'ha-A-rets'],
  [genesis1, 'תֹ֙הוּ֙', 'TO-hoo'],
  [genesis1, 'וָבֹ֔הוּ', 'va-VO-hoo'],
  [genesis1, 'וְחֹ֖שֶׁךְ', 've-KHO-shekh'],
  [genesis1, 'וְר֣וּחַ', 've-ROO-akh'],
  [genesis1, 'מְרַחֶ֖פֶת', 'me-ra-KHEH-fet'],
  [genesis1, 'פְּנֵ֣י', 'pe-NAY'],
  [genesis1, 'הַמָּֽיִם׃', 'ha-MA-yeem'],
  [jonah1, 'נִֽינְוֵ֛ה', 'nee-neh-VEH'],
  [jonah1, 'יוֹנָ֥ה', 'yo-NA'],
  [jonah1, 'אֲמִתַּ֖י', 'a-mee-TAI'],
  [jonah1, 'לֵאמֹֽר׃', 'leh-MOR'],
  [jonah1, 'הָעִ֥יר', 'ha-EER'],
  [jonah1, 'לִבְרֹ֣חַ', 'leev-RO-akh'],
  [jonah1, 'שְׂכָרָ֜הּ', 'se-kha-RAH'],
  [jonah1, 'וַיֹּ֥אמֶר', 'va-YO-mer'],
];

const wordsOf = (chapter: Chapter) => chapter.verses.flatMap((v) => v.g);

describe('the Israeli respelling', () => {
  it('pins twenty words, each of them a word of the fixture', () => {
    expect(WORDS).toHaveLength(20);
    for (const [chapter, text] of WORDS) expect(wordsOf(chapter).some((w) => w.t === text), text).toBe(true);
  });

  it.each(WORDS.map(([chapter, text, spelt]) => [text, spelt, wordsOf(chapter).find((w) => w.t === text)?.tr] as const))('%s is %s', (text, spelt, tr) => {
    expect(israeli.respell(text)).toBe(spelt);
    // the same with the data's transliteration as the guide
    expect(israeli.respell(text, tr)).toBe(spelt);
  });

  it('writes the vowels and the consonants by the rule table', () => {
    const r = (w: string) => israeli.respell(w);
    expect(r('אֶל־')).toBe('el');
    expect(r('כָּל־')).toBe('kol');
    expect(r('לֵ֧ךְ')).toBe('lekh');
    expect(r('בֵּ֥ין')).toBe('bayn');
    expect(r('טוֹב')).toBe('tov');
    expect(r('שָׂרָה')).toBe('sa-RA');
    expect(r('אֵ֥ת')).toBe('et');
    expect(r('סֵפֶר')).toBe('SEH-fer');
  });

  it('writes w as v, a final kaf as kh and a bet or pe by its dagesh', () => {
    expect(israeli.respell('וָו')).toContain('v');
    expect(israeli.respell('אֶרֶךְ')).toMatch(/kh$/);
    expect(israeli.respell('בַּב')).toBe('bav');
    expect(israeli.respell('פַּף')).toBe('paf');
  });

  it('is the data in hand: every pointed word of Genesis 1 and Jonah 1 gets a respelling of lower-case syllables with at most one in capitals', () => {
    for (const chapter of [genesis1, jonah1])
      for (const w of wordsOf(chapter)) {
        const spelt = israeli.respell(w.t, w.tr);
        expect(spelt, w.t).toMatch(/^[a-zA-Z]+(-[a-zA-Z]+)*$/);
        const capitals = spelt.split('-').filter((s) => s !== s.toLowerCase());
        expect(capitals.length, `${w.t} ${spelt}`).toBeLessThanOrEqual(1);
        // a stress mark that is not a hyphen-joined run: the capitals are a whole syllable
        for (const s of capitals) expect(s).toBe(s.toUpperCase());
      }
  });

  it('leaves English and Greek alone', () => {
    expect(israeli.respell('word')).toBe('word');
  });
});
