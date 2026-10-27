// A tutor answer is spoken with each original-language word in its own voice (mw-gdcyf98.27): Greek in the Greek voice, Hebrew in the Hebrew voice at the Hebrew
// speed, the English around them in the English voice, in order. One cut (src/speech/languageRuns.ts) serves both, from a table of languages, not a copy.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SCRIPTS, type TutorScript } from '../../src/script/scripts';
import { answerRuns } from '../../src/speech/answerRuns';
import { setSpeechRate } from '../../src/speech/greek';
import { languageRuns } from '../../src/speech/languageRuns';
import { pageRuns } from '../../src/speech/pageRuns';
import { getReading, startAnswer, stopAnswer } from '../../src/speech/readAloud';
import { verdictRuns } from '../../src/speech/tutorVoice';
import { ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';

describe('answerRuns with an original-language word, Greek and Hebrew alike', () => {
  const cases = [
    { language: 'hebrew' as const, word: 'רוּחַ', answer: 'The "breeze of the day" is from רוּחַ, which means spirit or wind.' },
    { language: 'greek' as const, word: 'πνεῦμα', answer: 'The "breeze of the day" is from πνεῦμα, which means spirit or wind.' },
  ];

  it.each(cases)('cuts a $language word out as a run of its own language, in order with the English around it', ({ language, word, answer }) => {
    expect(answerRuns(answer)).toEqual([
      { text: 'The "breeze of the day" is from', language: 'english' },
      { text: word, language },
      { text: ', which means spirit or wind.', language: 'english' },
    ]);
  });

  it('keeps a phrase of Hebrew words one run, and a Greek and a Hebrew word apart, in order', () => {
    expect(answerRuns('Compare בְּרֵאשִׁית בָּרָא with ἐν ἀρχῇ here.')).toEqual([
      { text: 'Compare', language: 'english' },
      { text: 'בְּרֵאשִׁית בָּרָא', language: 'hebrew' },
      { text: 'with', language: 'english' },
      { text: 'ἐν ἀρχῇ', language: 'greek' },
      { text: 'here.', language: 'english' },
    ]);
  });

  it('gives a reading check verdict the same cut', () => {
    expect(verdictRuns('Words to fix', 'Nearly there.', [{ word: 'רוּחַ', tip: 'The ח is a throaty kh.' }]).filter((r) => r.language === 'hebrew').map((r) => r.text)).toEqual([
      'רוּחַ',
      'ח',
    ]);
  });

  it('gives a capitalised respelling of a Hebrew word in the answer the Hebrew word, never the English voice', () => {
    const runs = answerRuns('רוּחַ is said roo-AKH, with the stress on the first part.');
    expect(runs.filter((r) => r.language === 'english').every((r) => !/roo/i.test(r.text))).toBe(true);
    expect(runs.filter((r) => r.language === 'hebrew').map((r) => r.text)).toEqual(['רוּחַ', 'רוּחַ']);
  });

  it('is the cut a page of prose makes', () => {
    const text = 'The Hebrew רוּחַ and the Greek πνεῦμα both mean spirit.';
    expect(answerRuns(text)).toEqual(pageRuns(text));
  });
});

describe('languageRuns is a table, not a branch per language', () => {
  let added: TutorScript | null = null;
  afterEach(() => {
    if (added) (SCRIPTS as TutorScript[]).splice(SCRIPTS.indexOf(added), 1);
    added = null;
  });

  it('speaks a third language added to the scripts table as a run of its own, with no new branch', () => {
    added = {
      id: 'am' as 'he',
      label: 'Amharic',
      settingKey: 'amharicDepth',
      settingLabel: 'Amharic in the tutor',
      dir: 'ltr',
      className: 'script-am',
      letters: '\\u1200-\\u137F',
      examples: { transliteration: 'selam', both: 'ሰላም selam', full: 'ሰላም' },
      speaks: 'amharic' as 'hebrew',
    };
    (SCRIPTS as TutorScript[]).push(added);
    expect(languageRuns('Peace is ሰላም in that tongue, and רוּחַ is spirit.')).toEqual([
      { text: 'Peace is', language: 'english' },
      { text: 'ሰላም', language: 'amharic' },
      { text: 'in that tongue, and', language: 'english' },
      { text: 'רוּחַ', language: 'hebrew' },
      { text: 'is spirit.', language: 'english' },
    ]);
  });
});

describe('a tutor answer spoken through the one engine', () => {
  let synth: FakeSynth;
  beforeEach(() => {
    synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE]);
    setSpeechRate('english', 1);
    setSpeechRate('greek', 1.2);
    setSpeechRate('hebrew', 0.7);
  });
  afterEach(() => {
    stopAnswer();
    setSpeechRate('greek', 1);
    setSpeechRate('hebrew', 1);
  });

  const spokenIn = (answer: string) => {
    startAnswer(5, answerRuns(answer));
    expect(getReading().answer).toBe(5);
    synth.finishAll();
    return synth.spoken;
  };

  it('says a Hebrew word in the Hebrew voice at the Hebrew speed, in order with the English around it', () => {
    const spoken = spokenIn('The "breeze of the day" is from רוּחַ, which means spirit.');
    const hebrew = spoken.filter((s) => s.lang === 'he-IL');
    expect(hebrew).toHaveLength(1);
    expect(hebrew[0].rate).toBe(0.7);
    expect(hebrew[0].text).toMatch(/\p{Script=Hebrew}/u);
    expect(spoken.map((s) => s.lang)).toEqual(['en-US', 'he-IL', 'en-US']);
    expect(spoken.filter((s) => s.lang === 'en-US').every((s) => !/\p{Script=Hebrew}/u.test(s.text))).toBe(true);
  });

  it('says a Greek word the same way, in the Greek voice at the Greek speed', () => {
    const spoken = spokenIn('The "breeze of the day" is from πνεῦμα, which means spirit.');
    const greek = spoken.filter((s) => s.lang === 'el-GR');
    expect(greek).toHaveLength(1);
    expect(greek[0].rate).toBe(1.2);
    expect(spoken.map((s) => s.lang)).toEqual(['en-US', 'el-GR', 'en-US']);
  });
});
