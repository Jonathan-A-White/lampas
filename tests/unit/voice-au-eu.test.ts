// αυ, ευ and ηυ are ONE sound to the Modern Greek reader: a vowel and a v (before a vowel or a voiced consonant) or an f (anywhere else); the respelling writes
// it so ('eev-LEE-ze-to'). His report (mw-5r3p30.647, 2026-10-19): Tap to hear on ηὐλίζετο said 'ee ee', two vowels, and not 'eev', because the voice was
// handed the letters ηυ and read the υ as a vowel of its own. What the voice is handed (the scheme's voiceForm / wordForm) writes the υ of the pair as the
// β or φ it says, so the voice has no vowel to read there. A pair split by a diaeresis (ϋ) or with its first vowel stressed is two vowels, and stays two.
import { readFileSync, readdirSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import type { Chapter } from '../../src/data/chapter';
import { clearBus } from '../../src/events/bus';
import { greekVoiceForm, greekWordSpeech, speakWord, stopSpeaking } from '../../src/speech/greek';
import { startReading, stopReading } from '../../src/speech/readAloud';
import { respellModern, spellingsModern } from '../../src/speech/schemes/modern';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../support/fake-speech';

let synth: FakeSynth;
beforeEach(() => {
  clearBus();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
});
afterEach(() => {
  act(() => stopSpeaking());
  stopReading();
  vi.unstubAllGlobals();
});

const bare = (word: string): string => word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
/** what Tap to hear (a word said alone) hands the Greek voice */
const heard = (word: string): string => {
  act(() => void speakWord(word, 'greek'));
  const said = synth.spoken[synth.spoken.length - 1];
  expect(said.lang).toBe('el-GR');
  act(() => stopSpeaking());
  return said.text.normalize('NFC');
};

describe('Tap to hear says αυ, ευ and ηυ as one sound', () => {
  it.each([
    ['ηὐλίζετο', 'ηβλίζετο!', 'eev-LEE-ze-to'],
    ['ηὔξανεν', 'ήφξανεν!', 'EEF-ksa-nen'],
    ['αὐτός', 'αφτός!', 'af-TOS'],
    ['εὐθύς', 'εφθύς!', 'ef-THEES'],
    ['εὐαγγέλιον', 'εβαγγέλιον!', 'ev-an-GHE-lee-on'],
    ['Παῦλος', 'πάβλος!', 'PAV-los'],
  ])('%s goes to the voice as %s, which says the %s of the respelling', (word, said, respelling) => {
    expect(heard(word)).toBe(said.normalize('NFC'));
    expect(respellModern(word)).toBe(respelling);
  });

  it('keeps two vowels where the scheme reads two: a diaeresis, or the first vowel stressed', () => {
    expect(heard('προϋπάρχω')).toBe('προϋπάρχω!'.normalize('NFC'));
    expect(heard('ἄυλος')).toBe('άυλος!'.normalize('NFC'));
  });

  it('is what a verse read aloud hands the voice too', () => {
    startReading({ chapter: 1, plan: [{ n: 1, runs: [{ text: 'ηὐλίζετο ἐν εὐθύς', language: 'greek' }] }], from: 1, continuous: false });
    synth.finishAll();
    expect(synth.spoken.map((u) => u.text.normalize('NFC')).join(' ')).toBe('ηβλίζετο ἐν εφθύς'.normalize('NFC'));
    expect(greekVoiceForm('Αὐτός')).toBe('Αφτός');
  });
});

/** Every distinct form with αυ, ευ or ηυ (marks or none) in the chapters and the lexicon, lower case. */
function pairForms(): string[] {
  const forms = new Set<string>(Object.keys(JSON.parse(readFileSync('public/data/lexicon.json', 'utf8')) as Record<string, unknown>));
  for (const book of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'ladder')) {
    for (const file of readdirSync(`public/data/${book.name}`)) {
      const chapter = JSON.parse(readFileSync(`public/data/${book.name}/${file}`, 'utf8')) as Chapter;
      for (const verse of chapter.verses) for (const w of verse.g) forms.add(w.t);
    }
  }
  return [...forms].map((w) => w.normalize('NFC').toLowerCase()).filter((w) => /[αεη]υ/u.test(bare(w))).sort();
}

describe('every form in the text and the lexicon with αυ, ευ or ηυ', () => {
  const forms = pairForms();

  it('finds them (ηὐλίζετο, αὐτός, εὐθύς among them)', () => {
    expect(forms).toEqual(expect.arrayContaining(['ηὐλίζετο', 'αὐτός', 'εὐθύς']));
    expect(forms.length).toBeGreaterThan(300);
  });

  it('is handed to the voice with the υ of each pair the scheme reads as one sound written as the β or φ it says, and the rest as it was', () => {
    const wrong = forms.filter((w) => {
      const letters = [...bare(w)].filter((c) => c >= 'α' && c <= 'ω');
      const expected = [...letters];
      for (const u of spellingsModern(w)) {
        const pair = letters.slice(u.from, u.to).join('');
        if (/^[αεη]υ$/u.test(pair) && /[vf]$/u.test(u.sound)) expected[u.to - 1] = u.sound.endsWith('v') ? 'β' : 'φ';
      }
      // the nasal a ντ, μπ or γκ inside a word is given is written twice, once ending the part before the hyphen (voice-form.test.ts)
      const handed = [...bare(greekWordSpeech(w).text).replace(/.-/gu, '')].filter((c) => c >= 'α' && c <= 'ω');
      return handed.join('') !== expected.join('');
    });
    expect(wrong.slice(0, 10)).toEqual([]);
  });
});
