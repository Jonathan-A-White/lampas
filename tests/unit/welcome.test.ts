// The welcome (mw-yrmkdf.3): the first-licensed flag's logic, and the bible-talk grind in welcome mode. The grind's instructions are read by the mill, not by this
// app, so a grep proves each rule is named, as tests/unit/quiz-grind.test.ts does for the quiz.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { NO_CHAPTER } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { saveProfile } from '../../src/data/repositories/profile';
import { getIndex } from '../../src/data/repositories/memory';
import { getNewWordsADay, getReaderView, getWeave } from '../../src/data/repositories';
import { WELCOME_OPENING, WELCOME_REF, getWelcome, isExistingReader, setWelcome, showWelcomeAgain, skipWelcome, startWelcomeIfFirst, welcomeStartFor } from '../../src/data/repositories/welcome';
import { buildTalkRequest, isTalkAnswer, scopeRef } from '../../src/services/talk';
import { validate, type Schema } from '../support/schema-validate';
import { instructionsOf } from '../../scripts/grind-parts';

const text = instructionsOf('bible-talk');
const inputSchema = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema & { properties: Record<string, { enum?: string[] }> };
const answerSchema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as { properties: Record<string, unknown> };

const scope = { title: 'Welcome', chapter: NO_CHAPTER, verse: null, screen: { name: 'Welcome', facts: [] }, welcome: true as const };

beforeEach(async () => {
  window.localStorage.clear();
  await db.open();
  await Promise.all([db.settings.clear(), db.talks.clear()]);
});

describe('the flag logic', () => {
  it('begins for a phone with nothing kept and no flag, and for no other', () => {
    expect(welcomeStartFor(null, false)).toBe('pending');
    expect(welcomeStartFor(null, true)).toBe('done');
    for (const kept of ['pending', 'done', 'skipped'] as const) {
      expect(welcomeStartFor(kept, false)).toBe(kept);
      expect(welcomeStartFor(kept, true)).toBe(kept);
    }
  });

  it('counts a reader as existing when a profile, any setting or any talk is kept', async () => {
    expect(await isExistingReader()).toBe(false);
    await db.settings.put({ key: 'layout', value: 'paragraph' });
    expect(await isExistingReader()).toBe(true);
    await db.settings.clear();
    await saveProfile({ age: '40' });
    expect(await isExistingReader()).toBe(true);
    await db.settings.clear();
    await db.talks.add({ ref: 'rom.8', q: 'Why?', a: 'Because.', words: [], when: 1 });
    expect(await isExistingReader()).toBe(true);
  });

  it('starts the welcome once on a new phone: English defaults written, the flag pending', async () => {
    expect(await startWelcomeIfFirst()).toBe('pending');
    expect(getWelcome()).toBe('pending');
    expect(await getReaderView()).toBe('english');
    expect(await getWeave()).toBe('off');
    expect(await getNewWordsADay()).toBe(0);
    // a second sighting finds the flag and changes nothing
    await db.settings.put({ key: 'layout', value: 'paragraph' });
    expect(await startWelcomeIfFirst()).toBe('pending');
  });

  it('marks a phone with settings already done and writes nothing', async () => {
    await db.settings.put({ key: 'layout', value: 'paragraph' });
    expect(await startWelcomeIfFirst()).toBe('done');
    expect(getWelcome()).toBe('done');
    expect(await getNewWordsADay()).toBe(3);
  });

  it('Skip ends it and writes the index line; showing it again brings it back with no talk kept', async () => {
    await startWelcomeIfFirst();
    await db.talks.add({ ref: WELCOME_REF, q: WELCOME_OPENING, a: 'Hello.', words: [], when: 1 });
    await skipWelcome();
    expect(getWelcome()).toBe('skipped');
    expect((await getIndex()).text).toContain('skipped the welcome');
    await showWelcomeAgain();
    expect(getWelcome()).toBe('pending');
    expect(await db.talks.where('ref').equals(WELCOME_REF).count()).toBe(0);
    await setWelcome(null);
    expect(getWelcome()).toBeNull();
  });
});

describe('the welcome request', () => {
  const request = buildTalkRequest(scope, WELCOME_OPENING, [], []);

  it('is in welcome mode, from the Welcome screen, with no Greek or English text', () => {
    expect(request.mode).toBe('welcome');
    expect(request.reference).toBe('Welcome');
    expect(request.screen).toEqual({ name: 'Welcome', facts: [] });
    expect('greek' in request).toBe(false);
    expect('english' in request).toBe(false);
    expect('greek_words' in request).toBe(false);
    expect(scopeRef('', 0, scope)).toBe(WELCOME_REF);
  });

  it('is valid against the input schema, which takes mode welcome beside quiz', () => {
    expect(inputSchema.properties.mode.enum).toEqual(['quiz', 'welcome']);
    expect(validate(request, inputSchema)).toEqual([]);
  });

  it('takes welcome_done in an answer, and only as true', () => {
    expect(answerSchema.properties.welcome_done).toBeDefined();
    expect(isTalkAnswer({ answer: 'Thank you.', words: [], welcome_done: true })).toBe(true);
    expect(isTalkAnswer({ answer: 'Thank you.', words: [], welcome_done: false })).toBe(false);
  });
});

describe('the welcome instructions', () => {
  const section = (): string => {
    const start = text.indexOf('## The welcome');
    expect(start).toBeGreaterThan(-1);
    const end = text.indexOf('\n## ', start + 1);
    return text.slice(start, end < 0 ? undefined : end).replace(/\s+/g, ' ');
  };

  it('asks at most three questions, one at a time, in plain English, with no Greek', () => {
    const s = section().toLowerCase();
    expect(s).toContain('at most three questions');
    expect(s).toContain('one at a time');
    expect(s).toContain('plain english');
    expect(s).toMatch(/no greek/);
  });

  it('names the three questions: why he is here (read, study or learn the Greek), what he wants, one thing about himself, then a line of thanks', () => {
    const s = section().toLowerCase();
    expect(s).toContain('to read, to study, or to learn the greek');
    expect(s).toContain('what he wants');
    expect(s).toContain('one thing about himself');
    expect(s).toContain('thanks');
  });

  it('writes the answers to the index, to the profile where a field fits, and ends with welcome_done', () => {
    const s = section();
    expect(s).toContain('memory_update');
    expect(s).toContain('profile_update');
    expect(s).toContain('welcome_done');
  });

  it('shows an example answer that the answer schema takes', () => {
    const block = /<!-- welcome-example:start -->\s*```json\s*([\s\S]*?)```\s*<!-- welcome-example:end -->/.exec(text);
    expect(block).not.toBeNull();
    const example: unknown = JSON.parse(block?.[1] ?? '');
    expect(validate(example, answerSchema as unknown as Schema)).toEqual([]);
    expect(isTalkAnswer(example)).toBe(true);
  });

  it('offers the Greek view to one who wants to learn the Greek, and nothing else of the Greek', () => {
    const s = section();
    expect(s).toMatch(/greek_offer/);
    expect(s).toContain('"kind": "view"');
  });
});
