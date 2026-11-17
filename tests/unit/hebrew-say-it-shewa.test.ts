// mw-fnvjof.17.176: a shewa between two identical letters is said ('הַלְלוּ' is 'ha-leh-LOO', as the Hebrew voice says it), whatever the data's transliteration (`tr`, the guide the
// Word sheet hands the respelling) shows: the data writes 'hal·lū' with no ə, the way a grammar book closes the first syllable, and the guide must not make the shewa silent.
// A shewa between two different letters that the guide marks silent stays silent. Each word below is found in the data at the reference named.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { pronunciationsOf } from '../../src/speech/pronunciation';

const israeli = pronunciationsOf('he')[0];

/** The data's word (its pointing and its `tr`) at a verse of a chapter of the shipped data, as the Word sheet is handed it. */
function dataWord(ref: string, text: string): { t: string; tr: string } {
  const [book, chapter, verse] = ref.split(/[ :]/);
  const data = JSON.parse(readFileSync(`public/data/${book}/${chapter}.json`, 'utf8')) as Chapter;
  const bare = (w: string): string => w.replace(/[\u0591-\u05AF\u05BD\u05BE\u05C0\u05C3]/g, '');
  const found = data.verses.find((v) => v.n === Number(verse))?.g.find((w) => bare(w.t) === bare(text));
  if (!found?.tr) throw new Error(`${text} not found with a tr at ${ref}`);
  return { t: found.t, tr: found.tr };
}

const syllables = (said: string): string[] => said.split('-');

describe('the say-it of a Hebrew word whose shewa stands between two identical letters', () => {
  it('הַלְלוּ is three syllables stressed on the last, though the data writes hal·lū', () => {
    const word = dataWord('psa 117:1', 'הַלְלוּ');
    expect(word.tr).toBe('hal·lū');
    const said = israeli.respell(word.t, word.tr);
    expect(said).toBe('ha-leh-LOO');
    expect(syllables(said)).toHaveLength(3);
    expect(syllables(said)[2]).toBe('LOO');
    expect(israeli.respell(word.t)).toBe(said);
  });

  it('הַלְלוּ־יָהּ keeps that middle syllable', () => {
    const halelu = dataWord('psa 135:3', 'הַלְלוּ־');
    expect(israeli.respell(halelu.t, halelu.tr)).toBe('ha-leh-loo');
    // the last syllable's vowel is not this story's: only the first three syllables are held
    for (const said of [israeli.respell('הַלְלוּ־יָהּ', 'hal·lū-yāh'), israeli.respell('הַלְלוּ־יָהּ')]) {
      expect(syllables(said)).toHaveLength(4);
      expect(syllables(said).slice(0, 3)).toEqual(['ha', 'leh', 'loo']);
    }
    const together = dataWord('psa 106:1', 'הַלְלוּיָהּ');
    expect(syllables(israeli.respell(together.t, together.tr))).toHaveLength(4);
  });

  // [reference, the word, its respelling]: three words of the Hebrew Bible with a shewa under the first of two identical letters
  const SAID: readonly (readonly [string, string, string])[] = [
    ['isa 22:2', 'חַלְלֵי־', 'kha-leh-lay'],
    ['jer 29:7', 'וְהִתְפַּלְלוּ', 've-heet-pa-leh-LOO'],
    ['jer 29:21', 'הִנְנִי', 'hee-neh-NEE'],
  ];
  it.each(SAID)('%s %s has its shewa said', (ref, text, expected) => {
    const word = dataWord(ref, text);
    expect(israeli.respell(word.t, word.tr)).toBe(expected);
    expect(israeli.respell(word.t)).toBe(expected);
  });

  // a shewa that is rightly silent (a closing consonant between two different letters): the guide's reading is kept
  const SILENT: readonly (readonly [string, string, string])[] = [
    ['pro 21:30', 'חָכְמָה', 'khokh-MA'],
    ['ezk 39:7', 'קָדְשִׁי', 'kod-SHEE'],
    ['psa 86:12', 'אוֹדְךָ', 'od-KHA'],
  ];
  it.each(SILENT)('%s %s has its shewa silent', (ref, text, expected) => {
    const word = dataWord(ref, text);
    expect(israeli.respell(word.t, word.tr)).toBe(expected);
  });
});
