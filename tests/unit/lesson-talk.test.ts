// What the tutor is told when he asks about a lesson (mw-5r3p30.818, docs/ask-tutor.md 'Talk from a lesson'): the idea sheet's Ask the tutor sends the lesson as the
// `screen` of the request, with its id and title, the level he holds on it, the worked example (word, meaning, verse) and its steps (src/tutor/lessonTalk.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NO_CHAPTER } from '../../src/data/chapter';
import { ideaOfAny as ideaOf, ladderFor } from '../../src/data/grammar/ladders';
import { stepsOf, workedFor } from '../../src/data/grammar/teach';
import { MAX_REQUEST_BYTES, buildTalkRequest, fitHistory, scopeRef, type TalkScope } from '../../src/services/talk';
import { fitScreen, MAX_FACTS } from '../../src/tutor/screen';
import { lessonKept, lessonScreen, lessonSuggestions } from '../../src/tutor/lessonTalk';
import { validate, type Schema } from '../support/schema-validate';
import '../support/grinds-in-graph';

const idea = ideaOf('enclitics');
const card = ladderFor('grc').teach.enclitics;
const { worked, inPassage } = workedFor(card, new Set());
const screen = lessonScreen({ idea, card, worked, inPassage, steps: stepsOf(worked, null), respelling: 'moo', level: 'frontier' });
const scopeOf = (s = screen): TalkScope => ({ title: s.name, chapter: NO_CHAPTER, verse: null, screen: s, kept: lessonKept(idea.id) });
const fact = (label: string): string | undefined => screen.facts.find((f) => f.label === label)?.value;

describe('the screen a lesson reports', () => {
  it('names the lesson by its id and title', () => {
    expect(screen.name).toBe('Lesson');
    expect(fact('Lesson')).toBe(idea.title);
    expect(fact('Lesson id')).toBe('enclitics');
  });

  it('gives the word and verse the lesson teaches, and its steps in order', () => {
    expect(fact('Worked example')).toContain('μου');
    expect(fact('Worked example')).toContain('“my”');
    expect(fact('Worked example')).toContain('1 John 2:1');
    expect(fact('Say it')).toBe('moo');
    expect(fact('Steps shown')).toMatch(/^1\. μου has no accent: it is an enclitic\. 2\. It leans on the word before it/);
    expect(fact('Steps shown')).toContain('3. τεκνία μου: “my little children”.');
  });

  it('says what the lesson is and the level he holds on it', () => {
    expect(fact('What it is')).toMatch(/^An enclitic is a small word/);
    expect(fact('Your level')).toBe('Learning');
  });

  it('leaves out a level it has not read yet, and the respelling of a Hebrew lesson', () => {
    const bare = lessonScreen({ idea, card, worked, inPassage, steps: [], level: undefined });
    expect(bare.facts.map((f) => f.label)).not.toContain('Your level');
    expect(bare.facts.map((f) => f.label)).not.toContain('Say it');
    expect(bare.facts.map((f) => f.label)).not.toContain('Steps shown');
  });

  it('says when the word is the verse he is reading', () => {
    const reading = lessonScreen({ idea, card, worked, inPassage: true, steps: [], level: 'solid' });
    expect(reading.facts.find((f) => f.label === 'Worked example')?.value).toContain('the verse he is reading');
  });

  it('survives fitScreen with every fact whole', () => {
    expect(screen.facts.length).toBeLessThanOrEqual(MAX_FACTS);
    expect(fitScreen(screen).facts).toEqual(screen.facts);
  });
});

describe('the request a lesson talk sends', () => {
  it('carries the lesson facts and meets the grind\'s input schema, within the byte cap', () => {
    const request = fitHistory(buildTalkRequest(scopeOf(), 'Why has μου no accent?', [], []));
    expect(request.reference).toBe('Lesson');
    expect(request.screen?.facts).toContainEqual({ label: 'Lesson id', value: 'enclitics' });
    expect(request.screen?.facts.find((f) => f.label === 'Steps shown')?.value).toContain('μου has no accent');
    expect(request.greek).toBeUndefined();
    const schema = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema;
    expect(validate(JSON.parse(JSON.stringify(request)), schema)).toEqual([]);
    expect(new TextEncoder().encode(JSON.stringify(request)).length).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });

  it('stays inside the cap for the longest card of the ladders', () => {
    const request = fitHistory(
      buildTalkRequest(scopeOf(fitScreen(lessonScreen({ idea, card: { ...card, whatItIs: 'w'.repeat(900) }, worked: { ...worked, gloss: 'g'.repeat(300) }, inPassage, steps: ['s'.repeat(500), 's'.repeat(500)], respelling: 'r'.repeat(200), level: 'solid' }))), 'Why?', [{ q: 'a', a: 'b' }], []),
    );
    expect(new TextEncoder().encode(JSON.stringify(request)).length).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });

  it('is kept under a talk of its own for each lesson', () => {
    expect(scopeRef('', 0, scopeOf())).toBe('screen.lesson.enclitics');
    expect(scopeRef('', 0, { ...scopeOf(), kept: lessonKept('accents') })).not.toBe(scopeRef('', 0, scopeOf()));
  });
});

describe('the questions the sheet suggests', () => {
  it('are about the lesson in hand', () => {
    const list = lessonSuggestions(idea.title);
    expect(list).toHaveLength(2);
    expect(list.join(' ')).toContain(idea.title);
  });
});
