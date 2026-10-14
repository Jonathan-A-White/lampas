// The tutor's request does not grow with the learner (mw-5r3p30.344): solid_words is a count and the most recent few, verse-ask is fitted
// to MAX_REQUEST_BYTES as the Bible talk is, and a request with thousands of solid words and a very long spoken question still seals.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PrivateKey, Utils } from '@bsv/sdk';
import { grist } from 'bsv-kit/grist';
import { type Chapter } from '../../src/data/chapter';
import { MAX_REQUEST_BYTES, buildTalkRequest, fitHistory } from '../../src/services/talk';
import { buildRequest, fitAsk, type VerseAskRequest } from '../../src/services/tutor';
import { SOLID_WORDS_SENT, solidWordsField } from '../../src/services/solidWords';
import { MILL_PUBLIC_KEY } from '../support/fake-postern';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verse = chapter.verses[27];
const scope = { title: 'Romans 8', chapter, verse };
const bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

// oldest first, as the repository lists them: λεξ0 is the oldest
const solid = (n: number): string[] => Array.from({ length: n }, (_, i) => `λέξις${i}`);
// a spoken question of `n` words, as the phone's recogniser writes one
const spokenQuestion = (n: number): string => Array.from({ length: n }, (_, i) => `word${i % 10}`).join(' ');

/** What the phone's send does with a request: seal it to the mill and write the record (bsv-kit throws a RangeError when it is over the cap). */
function seals(kind: string, input: unknown): boolean {
  const plaintext = { grist: { app: 'lampas', kind, v: '1' }, input, attachments: [] };
  const key = Uint8Array.from(Utils.toArray(PrivateKey.fromRandom().toHex(), 'hex'));
  try {
    grist.recordScriptHex(grist.sealEnvelope(JSON.stringify(plaintext), key, MILL_PUBLIC_KEY, 1_790_000_000));
    return true;
  } catch (err) {
    if (err instanceof RangeError) return false;
    throw err;
  }
}

describe('solidWordsField', () => {
  it('is a count and the most recent words, newest last', () => {
    const field = solidWordsField(solid(5000));
    expect(field.solid_count).toBe(5000);
    expect(field.solid_words).toHaveLength(SOLID_WORDS_SENT);
    expect(SOLID_WORDS_SENT).toBe(50);
    expect(field.solid_words[0]).toBe('λέξις4950');
    expect(field.solid_words[49]).toBe('λέξις4999');
  });

  it('sends all of a short list', () => {
    expect(solidWordsField(['θεός', 'λέγω'])).toEqual({ solid_count: 2, solid_words: ['θεός', 'λέγω'] });
    expect(solidWordsField([])).toEqual({ solid_count: 0, solid_words: [] });
  });
});

describe('the requests carry the bounded field', () => {
  it('buildTalkRequest and buildRequest send the count and at most 50 words', () => {
    const talk = buildTalkRequest(scope, 'Why?', [], solid(5000));
    const ask = buildRequest('Romans 8:28', verse, 'Why?', solid(5000));
    for (const r of [talk, ask]) {
      expect(r.solid_count).toBe(5000);
      expect(r.solid_words).toHaveLength(50);
    }
  });

  it('a talk from About sends no words and no count', () => {
    const about = { title: 'About', chapter, verse: null, screen: { name: 'About', facts: [], credits: [] } };
    const r = buildTalkRequest(about, 'Who made this?', [], solid(5000));
    expect(r.solid_words).toEqual([]);
    expect('solid_count' in r).toBe(false);
  });
});

describe('fitAsk (verse-ask), as fitHistory is for the Bible talk', () => {
  const heavy = (): VerseAskRequest => ({
    ...buildRequest('Romans 8:28', verse, 'Why?', solid(5000)),
    requests: Array.from({ length: 10 }, (_, i) => ({ summary: 's'.repeat(120) + i, status: 'building' as const })),
    memory: { index: 'i'.repeat(1000), notes: Array.from({ length: 10 }, (_, i) => ({ name: `topic:t${i}`, text: 'n'.repeat(900) })) },
  });

  it('leaves a request that fits as it is', () => {
    const r = buildRequest('Romans 8:28', verse, 'Why?', solid(5000));
    expect(bytes(r)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitAsk(r)).toEqual(r);
  });

  it('cuts a request that is over MAX_REQUEST_BYTES down to it, and keeps the question and the verse', () => {
    const r = heavy();
    expect(bytes(r)).toBeGreaterThan(MAX_REQUEST_BYTES);
    const fitted = fitAsk(r);
    expect(bytes(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.question).toBe(r.question);
    expect(fitted.greek).toBe(r.greek);
    expect(fitted.english).toBe(r.english);
    expect(fitted.memory?.index).toBe(r.memory?.index);
  });
});

describe('a request with 5,000 solid words and a 2,000-word spoken question seals', () => {
  it('the Bible talk', () => {
    const request = buildTalkRequest(scope, spokenQuestion(2000), [], solid(5000), {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, true);
    expect(seals('bible-talk', fitHistory(request))).toBe(true);
  });

  it('verse-ask', () => {
    const request = buildRequest('Romans 8:28', verse, spokenQuestion(2000), solid(5000), undefined, undefined, undefined, [], undefined, true);
    expect(seals('verse-ask', fitAsk(request))).toBe(true);
  });
});
