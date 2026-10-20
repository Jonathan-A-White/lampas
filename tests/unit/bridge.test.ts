// The bridge (mw-1vuvq6.5): when he asks about something he is not ready for, the tutor names up to three ideas it rests on and one to start with, and the
// app takes him to that one. The device works out what is missing (`missing_foundations`) so the model never guesses; the app picks the idea 'Take me there'
// opens from that list, not from the model. features/talk-bridge.feature runs the whole turn against a fake Postern.
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { BRIDGE_MAX, MISSING_FOUNDATIONS_MAX, askedIdeas, liveBridge, missingFoundations, resolveBridge, withBridgeIdeas } from '../../src/data/grammar/bridge';
import { itemsOf, LADDER } from '../../src/data/grammar/ladder';
import type { Level } from '../../src/data/grammar/needs';
import { addAnswer, addTurn, listAnswers, listTurns } from '../../src/data/repositories';
import { buildRequest } from '../../src/services/tutor';
import { buildTalkRequest, isTalkAnswer, type TalkScope } from '../../src/services/talk';
import { offerOfTurn } from '../../src/talk/offers';
import { validate, type Schema } from '../support/schema-validate';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.talks.clear();
});

const talkAnswerSchema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as Schema;
const verseAnswerSchema = JSON.parse(readFileSync('grinds/verse-ask.answer.schema.json', 'utf8')) as Schema;
const talkInputSchema = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema;
const verseInputSchema = JSON.parse(readFileSync('grinds/verse-ask.input.schema.json', 'utf8')) as Schema;

const solid = (ids: readonly string[]): Map<string, Level> => new Map(ids.map((id) => [id, 'solid' as const]));
/** only the alphabet and its 24 letters are solid */
const LETTERS = ['alphabet', ...itemsOf('alphabet').map((i) => i.id)];
/** what genitive rests on that is not the letters, easy first (the noun rests on the breathings and the iota under a letter, the nominative on number: mw-5r3p30.234) */
const PATH = ['diphthongs', 'consonant-pairs', 'syllables', 'breathings', 'accents', 'iota-subscript', 'noun', 'number-singular', 'number-plural', 'case-nominative'];
const withSolid = (count: number): Map<string, Level> => solid([...LETTERS, ...PATH.slice(0, PATH.length - count)]);

const QUESTION = 'Why is this word in the genitive?';
const bridgeOf = (ids: string[], next: string) => ({ answer: 'Briefly: it shows belonging.', words: [], bridge: { missing: ids, next, why: 'Cases come first.' } });

describe('the answer schemas', () => {
  it.each([
    ['bible-talk', talkAnswerSchema],
    ['verse-ask', verseAnswerSchema],
  ])('%s: the bridge ideas are exactly the ladder\'s ids', (_, schema) => {
    const bridge = (schema.properties as Record<string, Schema>).bridge;
    const props = bridge.properties as Record<string, Schema>;
    const ids = LADDER.map((i) => i.id);
    expect(props.missing.items?.enum).toEqual(ids);
    expect(props.next.enum).toEqual(ids);
    expect(props.missing.maxItems).toBe(BRIDGE_MAX);
    expect((schema.required as string[]).includes('bridge')).toBe(false);
  });

  it('withBridgeIdeas writes the ladder\'s ids into a schema and a second run changes nothing', () => {
    const once = withBridgeIdeas(JSON.parse(JSON.stringify(talkAnswerSchema)) as Schema);
    expect(withBridgeIdeas(JSON.parse(JSON.stringify(once)) as Schema)).toEqual(once);
    expect(once).toEqual(talkAnswerSchema);
  });

  it.each([
    ['bible-talk', talkAnswerSchema],
    ['verse-ask', verseAnswerSchema],
  ])('%s: an answer naming an idea the ladder lacks is refused, one naming the ladder\'s is taken', (_, schema) => {
    expect(validate(bridgeOf(['case-genitive', 'noun'], 'noun'), schema)).toEqual([]);
    expect(validate(bridgeOf(['case-genitive', 'made-up-idea'], 'noun'), schema)).not.toEqual([]);
    expect(validate(bridgeOf(['noun'], 'made-up-idea'), schema)).not.toEqual([]);
    expect(validate(bridgeOf(['noun', 'verb', 'tense-aorist', 'mood-participle'], 'noun'), schema)).not.toEqual([]);
    expect(validate(bridgeOf([], 'noun'), schema)).not.toEqual([]);
  });

  it('isTalkAnswer refuses the same', () => {
    expect(isTalkAnswer(bridgeOf(['diphthongs'], 'diphthongs'))).toBe(true);
    expect(isTalkAnswer(bridgeOf(['made-up-idea'], 'noun'))).toBe(false);
    expect(isTalkAnswer(bridgeOf(['noun'], 'made-up-idea'))).toBe(false);
    expect(isTalkAnswer(bridgeOf(['noun', 'verb', 'tense-aorist', 'mood-participle'], 'noun'))).toBe(false);
    expect(isTalkAnswer({ ...bridgeOf(['noun'], 'noun'), bridge: { missing: ['noun'], next: 'noun' } })).toBe(false);
  });
});

describe('what the asked topic is', () => {
  it('is found by the grammar words of his question', () => {
    expect(askedIdeas(QUESTION).map((i) => i.id)).toEqual(['case-genitive']);
    expect(askedIdeas('what is an aorist participle?').map((i) => i.id)).toEqual(['tense-aorist', 'mood-participle']);
    expect(askedIdeas('How do the diphthongs sound?').map((i) => i.id)).toEqual(['diphthongs']);
    expect(askedIdeas('What does this verse mean?')).toEqual([]);
  });

  it('is also found by the grammar term of the help he asked for', () => {
    expect(askedIdeas('Tell me more.', 'dative').map((i) => i.id)).toEqual(['case-dative']);
  });
});

describe('missing_foundations: the device works out what the topic rests on that he lacks', () => {
  it('with only the letters solid, the genitive lacks ten ideas, the lowest first and the next step the first', () => {
    const hint = missingFoundations(QUESTION, withSolid(PATH.length));
    expect(hint?.topic).toBe('The genitive case');
    expect(hint?.total).toBe(PATH.length);
    expect(hint?.ideas.map((i) => i.id)).toEqual(PATH.slice(0, MISSING_FOUNDATIONS_MAX));
    expect(hint?.ideas[0]).toMatchObject({ id: 'diphthongs', title: 'Pairs of vowels' });
    // only the ideas the genitive itself names are marked direct: the nominative, the last of the path, once few enough are missing to name it
    expect(hint?.ideas.filter((i) => i.direct)).toEqual([]);
    expect(missingFoundations(QUESTION, withSolid(6))?.ideas.filter((i) => i.direct).map((i) => i.id)).toEqual(['case-nominative']);
  });

  it.each([
    [1, ['case-nominative']],
    [3, ['number-singular', 'number-plural', 'case-nominative']],
    [6, PATH.slice(-6)],
  ])('with %i missing, the next foundation is the lowest unmet need of the path', (count, expected) => {
    const hint = missingFoundations(QUESTION, withSolid(count));
    expect(hint?.total).toBe(count);
    expect(hint?.ideas.map((i) => i.id)).toEqual(expected);
  });

  it('counts a frontier idea as met and a missing level as not yet; a letter is never named, its alphabet is', () => {
    const levels = solid(['syllables', 'consonant-pairs']);
    levels.set('diphthongs', 'frontier');
    const ids = missingFoundations(QUESTION, levels)?.ideas.map((i) => i.id);
    expect(ids?.[0]).toBe('alphabet');
    expect(ids).not.toContain('diphthongs');
    expect(ids?.some((id) => id.startsWith('letter-'))).toBe(false);
  });

  it('names at most MISSING_FOUNDATIONS_MAX ideas but counts them all', () => {
    const hint = missingFoundations('What is the participle?', new Map());
    expect(hint?.ideas.length).toBe(MISSING_FOUNDATIONS_MAX);
    expect(hint?.total).toBeGreaterThan(MISSING_FOUNDATIONS_MAX);
  });

  it('is nothing when the question names no topic, or he lacks nothing under it', () => {
    expect(missingFoundations('What does this verse mean?', new Map())).toBeUndefined();
    expect(missingFoundations(QUESTION, withSolid(0))).toBeUndefined();
  });
});

describe('what Take me there opens', () => {
  const hintOf = (count: number) => missingFoundations(QUESTION, withSolid(count));

  it('lists one idea for 1 missing, three for 3, and exactly three for 6, saying there is more; and opens the lowest unmet need each time', () => {
    for (const [count, shown, many] of [
      [1, 1, false],
      [3, 3, false],
      [6, 3, true],
    ] as const) {
      const hint = hintOf(count);
      // the model lists the most direct ones first and may name more than it should
      const ids = [...(hint?.ideas ?? [])].reverse().map((i) => i.id);
      const bridge = resolveBridge({ missing: ids.slice(0, 3), next: ids[0], why: 'It comes first.' }, hint);
      expect(bridge?.ideas).toHaveLength(shown);
      expect(bridge?.many).toBe(many);
      expect(bridge?.next).toBe(hint?.ideas[0].id);
    }
  });

  it('takes the lowest unmet need from the device, not from the model, and drops ideas the device did not list', () => {
    const hint = hintOf(6);
    const bridge = resolveBridge({ missing: ['case-nominative', 'verb', 'noun'], next: 'noun', why: 'x' }, hint);
    expect(bridge?.next).toBe('accents');
    expect(bridge?.ideas).toEqual(['case-nominative', 'noun']);
  });

  it('falls back to the first three of the device\'s list when the model named none the device listed', () => {
    const bridge = resolveBridge({ missing: ['verb'], next: 'verb', why: 'x' }, hintOf(6));
    expect(bridge?.ideas).toEqual(['accents', 'iota-subscript', 'noun']);
  });

  it('is nothing without the device\'s list: the model does not guess', () => {
    expect(resolveBridge({ missing: ['noun'], next: 'noun', why: 'x' }, undefined)).toBeUndefined();
  });
});

describe('the request and the turn', () => {
  const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
  const scope: TalkScope = { title: 'Romans 8', chapter, verse: chapter.verses[10] };
  const hint = missingFoundations(QUESTION, withSolid(6));

  it('the Bible talk carries missing_foundations when the device found some, and its input schema allows it', () => {
    const request = buildTalkRequest(scope, QUESTION, [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, undefined, hint);
    expect(request.missing_foundations).toEqual(hint);
    expect(validate(request, talkInputSchema)).toEqual([]);
    expect('missing_foundations' in buildTalkRequest(scope, QUESTION, [], [])).toBe(false);
    expect(validate({ ...request, missing_foundations: { ...hint, total: 'many' } }, talkInputSchema)).not.toEqual([]);
  });

  it('a verse question carries it too', () => {
    const verse = chapter.verses[10];
    const request = buildRequest('Romans 8:11', verse, QUESTION, [], undefined, undefined, undefined, [], undefined, false, undefined, undefined, hint);
    expect(request.missing_foundations).toEqual(hint);
    expect(validate(request, verseInputSchema)).toEqual([]);
  });

  it('a turn keeps the bridge and offers Take me there until he chooses', async () => {
    const bridge = { ideas: ['diphthongs', 'consonant-pairs', 'syllables'], next: 'diphthongs', why: 'Cases rest on these.', many: true };
    await addTurn('rom.8.11', QUESTION, 'Briefly: it shows belonging.', [], Date.now(), { changes: [], refused: [], bridge });
    const turn = (await listTurns('rom.8.11'))[0];
    expect(turn.bridge).toEqual(bridge);
    expect(offerOfTurn(turn)).toEqual({ kind: 'bridge', text: 'Take me there: Pairs of vowels' });
    expect(offerOfTurn({ ...turn, bridgeChoice: 'taken' })).toBeUndefined();
    expect(offerOfTurn({ ...turn, bridgeChoice: 'declined' })).toBeUndefined();
  });

  it('liveBridge drops the ideas he has taken up since and moves the button on (mw-1vuvq6.11)', () => {
    const bridge = { ideas: ['diphthongs', 'consonant-pairs', 'syllables'], next: 'diphthongs', why: 'Cases rest on these.', many: false };
    const turn = { id: 1, ref: 'rom.8.11', q: QUESTION, a: 'a', words: [], at: 0, bridge } as unknown as Parameters<typeof offerOfTurn>[0];
    expect(liveBridge(bridge, new Map())).toBe(bridge);
    expect(liveBridge(bridge, new Map<string, Level>([['diphthongs', 'frontier']]))).toEqual({ ...bridge, ideas: ['consonant-pairs', 'syllables'], next: 'consonant-pairs' });
    expect(liveBridge(bridge, new Map<string, Level>([['diphthongs', 'solid'], ['syllables', 'frontier']]))?.ideas).toEqual(['consonant-pairs']);
    expect(liveBridge(bridge, new Map<string, Level>(bridge.ideas.map((id): [string, Level] => [id, 'solid'])))).toBeUndefined();
    expect(offerOfTurn(turn, new Map<string, Level>([['diphthongs', 'frontier']]))).toEqual({ kind: 'bridge', text: 'Take me there: Pairs of consonants' });
    expect(offerOfTurn(turn, new Map<string, Level>(bridge.ideas.map((id): [string, Level] => [id, 'frontier'])))).toBeUndefined();
  });

  it('a verse answer keeps the bridge for its card', async () => {
    await db.answers.clear();
    const bridge = { ideas: ['case-nominative'], next: 'case-nominative', why: 'It is the only thing missing.', many: false };
    await addAnswer('1jn.1.1', QUESTION, 'Briefly: it shows belonging.', [], Date.now(), undefined, undefined, bridge);
    expect((await listAnswers('1jn.1.1'))[0].bridge).toEqual(bridge);
  });
});
