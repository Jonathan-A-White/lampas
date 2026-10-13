// A question he speaks reaches the tutor marked `spoken` (mw-5r3p30.244): the phone's en-US recogniser writes a Greek word as English
// sound-alikes ('Tech N9ne' for τεκνίον), so both tutor grinds are told to match them to the passage's Greek and say which word they took.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import type { Chapter, Verse } from '../../src/data/chapter';
import { buildTalkRequest } from '../../src/services/talk';
import { buildRequest } from '../../src/services/tutor';
import { forgetSpoken, noteSpoken, wasSpoken } from '../../src/speech/spoken';
import { validate, type Schema } from '../support/schema-validate';

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;
const verse = { n: 1, g: [{ t: 'Τεκνία' }], e: [{ t: 'My little children' }] } as unknown as Verse;
const chapter = { verses: [verse] } as unknown as Chapter;
const scope = { title: '1 John 2:1', chapter, verse };

describe('the request says whether the question was spoken', () => {
  it('bible-talk: spoken: true when spoken, no key when typed', () => {
    expect(buildTalkRequest(scope, 'Tech N9ne?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, true).spoken).toBe(true);
    expect('spoken' in buildTalkRequest(scope, 'Why?', [], [])).toBe(false);
  });

  it('verse-ask: spoken: true when spoken, no key when typed', () => {
    expect(buildRequest('1 John 2:1', verse, 'Tech N9ne?', [], undefined, undefined, undefined, [], undefined, true).spoken).toBe(true);
    expect('spoken' in buildRequest('1 John 2:1', verse, 'Why?', [])).toBe(false);
  });

  it.each(['bible-talk', 'verse-ask'])('%s: its input schema takes the field and refuses anything but true', (kind) => {
    const schema = readJson(`grinds/${kind}.input.schema.json`) as Schema;
    const request = kind === 'bible-talk' ? buildTalkRequest(scope, 'Why?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, true) : buildRequest('1 John 2:1', verse, 'Why?', [], undefined, undefined, undefined, [], undefined, true);
    expect(validate(request, schema)).toEqual([]);
    expect(validate({ ...request, spoken: false }, schema)).not.toEqual([]);
  });
});

describe('which words were spoken (src/speech/spoken.ts)', () => {
  it('knows the words the recogniser gave, ignoring spacing, and nothing he typed or changed', () => {
    forgetSpoken();
    expect(wasSpoken('Why?')).toBe(false);
    noteSpoken('  what paradigm  from Tech N9ne ');
    expect(wasSpoken('what paradigm from Tech N9ne')).toBe(true);
    expect(wasSpoken('what paradigm from Tech N9ne to technia')).toBe(false);
    forgetSpoken();
  });
});

describe.each(['bible-talk', 'verse-ask'])('the %s grind tells the tutor about spoken Greek words', (kind) => {
  const text = readFileSync(`grinds/${kind}.instructions.md`, 'utf8');

  it('says a spoken question went through an English recogniser and a Greek word may come as sound-alikes', () => {
    expect(text).toContain('`spoken`');
    expect(text).toContain('English speech recogniser');
    expect(text).toContain('sound-alikes');
  });

  it('says to match them to the passage\'s Greek words and their lemmas and answer about the best match', () => {
    expect(text).toMatch(/Greek words of `greek`.*and their lemmas/s);
    expect(text).toContain('answer about it');
  });

  it('says to name the word it took in one short line, with the example, and not to ask first', () => {
    expect(text).toContain('I took "Tech N9ne" as τεκνίον.');
    expect(text).toContain('Do not ask which he meant first');
  });

  it('keeps a scenario for it, with the request marked spoken', () => {
    const path = `grinds/examples/${kind}/spoken-greek-word.json`;
    expect(existsSync(path)).toBe(true);
    const example = readJson(path) as { request: { spoken?: boolean; question: string; reference: string }; expect: Record<string, unknown> };
    expect(example.request.spoken).toBe(true);
    expect(example.request.reference).toBe('1 John 2:1');
    expect(example.request.question).toBe('what paradigm do I need to know to go from Tech N9ne to technia');
    expect(JSON.stringify(example.expect)).toContain('τεκνίον');
    // the tutor takes the form from the passage data and writes the verse's own Τεκνία (mw-5r3p30.246), so either case is right (verse-ask's example is not part of that fix)
    const answer = (example.expect as { answer: { contains: string; matches: string } }).answer;
    expect(answer.contains).toBe('τεκνίον');
    for (const right of kind === 'bible-talk' ? ['Τεκνία', 'τεκνία'] : ['τεκνία']) expect(new RegExp(answer.matches).test(`I took "technia" as ${right}.`), right).toBe(true);
    expect(readdirSync(`grinds/examples/${kind}`)).toContain('spoken-greek-word.json');
  });

  it('keeps the 1 John 2:1 Greek of its scenario as the chapter file has it', () => {
    const { request } = readJson(`grinds/examples/${kind}/spoken-greek-word.json`) as { request: { greek: string } };
    const chapterFile = readJson('public/data/1jn/2.json') as unknown as Chapter;
    const first = chapterFile.verses.find((v) => v.n === 1);
    expect(request.greek).toBe(first?.g.map((w) => w.t).join(' '));
  });
});
