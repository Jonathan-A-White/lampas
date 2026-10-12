// src/data/grammar/readingMisses.ts: which sounds (Greek) or words (English) a misread focus word stands for.
import { describe, expect, it } from 'vitest';
import { LADDER } from '../../src/data/grammar/ladder';
import { missUnits } from '../../src/data/grammar/readingMisses';

const word = (text: string, chunks: string[]) => ({ word: text, chunks, tip: 't' });

describe('missUnits', () => {
  it('maps a Greek word onto the diphthongs and consonant pairs in its chunks', () => {
    expect(missUnits('el', [word('οὐρανοῦ', ['οὐ', 'ρα', 'νοῦ'])])).toEqual(['diphthong-ou']);
    expect(missUnits('el', [word('ἄγγελος', ['ἄγ', 'γε', 'λος'])])).toEqual(['pair-gg']);
    expect(missUnits('el', [word('λόγος', ['λό', 'γος'])])).toEqual([]);
    expect(missUnits('el', [word('μπορῶ', ['μπο', 'ρῶ'])])).toEqual(['pair-mp']);
  });

  it('knows a vowel pair that is two sounds', () => {
    expect(missUnits('el', [word('προΐστημι', ['προ', 'ΐ', 'στη', 'μι'])])).toEqual([]);
    expect(missUnits('el', [word('ἀΐδιος', ['ἀΐ', 'δι', 'ος'])])).toEqual([]);
    expect(missUnits('el', [word('ἅμα', ['ἅ', 'μα'])])).toEqual([]);
    expect(missUnits('el', [word('ἅιμα', ['ἅ', 'ι', 'μα'])])).toEqual([]);
    expect(missUnits('el', [word('καί', ['καί'])])).toEqual(['diphthong-ai']);
  });

  it('counts a unit once for each word that holds it, however often the word holds it', () => {
    expect(missUnits('el', [word('οὐρανοῦ', ['οὐ', 'ρα', 'νοῦ']), word('οὐ', ['οὐ'])])).toEqual(['diphthong-ou', 'diphthong-ou']);
  });

  it('names English words in lower case without punctuation', () => {
    expect(missUnits('en', [word('Blessed,', ['bless', 'ed']), word('Zion’s', ['zi', 'ons'])])).toEqual(['blessed', 'zion’s']);
  });

  it('only gives ladder ideas for Greek', () => {
    const ids = new Set(LADDER.map((i) => i.id));
    for (const unit of missUnits('el', [word('εὐαγγέλιον', ['εὐ', 'αγ', 'γε', 'λι', 'ον'])])) expect(ids.has(unit)).toBe(true);
  });
});
