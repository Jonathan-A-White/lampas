// src/speech/tutorVoice.ts: what is spoken of a reading check's verdict (mw-5r3p30.93).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getReading, stopAnswer, type Run } from '../../src/speech/readAloud';
import { askAnswerId, startAnswerWhenSeen, VERDICT_ID, verdictRuns } from '../../src/speech/tutorVoice';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';
import { dropWaiting, waitingAnswer } from '../../src/speech/tutorWaiting';

describe('verdictRuns', () => {
  it('says the heading, the note and each word with its tip, and nothing of chunks', () => {
    const runs = verdictRuns('Words to fix', 'Nearly there.', [{ word: 'blessed', tip: 'say it as one beat, blest' }]);
    expect(runs.map((r) => r.text)).toEqual(['Words to fix.', 'Nearly there.', 'blessed: say it as one beat, blest.']);
    expect(runs.every((r) => r.language === 'english')).toBe(true);
  });

  it('sends a Greek word to the Greek voice and shows plain quote marks', () => {
    const runs = verdictRuns('Words to fix', 'It sounded like \\"laff\\".', [{ word: 'συνεργεῖ', tip: 'The γ is soft.' }]);
    expect(runs.find((r) => r.text.includes('laff'))?.text).toBe('It sounded like "laff".');
    expect(runs.filter((r) => r.language === 'greek').map((r) => r.text)).toContain('συνεργεῖ');
  });
});

describe('answer ids', () => {
  it('never meet the verdict id or a Talk turn id', () => {
    expect(VERDICT_ID).toBeLessThan(0);
    expect([1, 2, 99].map(askAnswerId).every((id) => id < VERDICT_ID)).toBe(true);
  });
});

describe('startAnswerWhenSeen', () => {
  let synth: FakeSynth;
  beforeEach(() => {
    synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  });
  afterEach(() => {
    dropWaiting();
    stopAnswer();
    vi.restoreAllMocks();
  });
  const runs: Run[] = [{ text: 'Hello.', language: 'english' }];
  const pageIs = (state: DocumentVisibilityState) => vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);

  it('holds the answer for his return while the page is hidden, and starts nothing', () => {
    pageIs('hidden');
    startAnswerWhenSeen(7, runs);
    expect(waitingAnswer()).toEqual({ id: 7, runs });
    expect(getReading().status).toBe('idle');
    expect(synth.spoken).toHaveLength(0);
  });

  it('starts the answer at once while the page is visible', () => {
    pageIs('visible');
    startAnswerWhenSeen(7, runs);
    expect(waitingAnswer()).toBeNull();
    expect(getReading().answer).toBe(7);
    expect(synth.spoken.length).toBeGreaterThan(0);
  });

  it('a newer answer replaces the waiting one and stopAnswer drops it', () => {
    pageIs('hidden');
    startAnswerWhenSeen(7, runs);
    startAnswerWhenSeen(8, runs);
    expect(waitingAnswer()?.id).toBe(8);
    stopAnswer();
    expect(waitingAnswer()).toBeNull();
  });
});
