// mw-5r3p30.732: two smoke examples missed 1 of 3 on 2026-10-23: work-at-its-place gave a work link with no `place`, and quiz-goal-ask-first asked
// "I'd like to know what you want ..." with no question mark. The instructions read by the mill must state each rule once, plainly, with one short example,
// and stay well under the 100,000-byte ceiling so the next rule has room (97,000 until mw-5r3p30.733 added the `verses` rule: 97,500 now). The model's side is proved by `mw grist eval` once this lands.
// Raised from 97,500 by mw-5r3p30.753 so stories stop trimming rules to fit; 100,000 stays the cost warning.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { instructionParts, instructionsOf } from '../../scripts/grind-parts';

const text = instructionsOf('bible-talk');
const flat = (s: string): string => s.replace(/\s+/g, ' ');
const count = (haystack: string, needle: RegExp): number => (haystack.match(needle) ?? []).length;

describe('the bible-talk instructions after mw-5r3p30.732', () => {
  it('are at most 99,500 bytes', () => {
    const bytes = instructionParts('bible-talk').reduce((sum, { text: t }) => sum + Buffer.byteLength(t, 'utf8'), 0);
    expect(bytes).toBeLessThanOrEqual(99_500);
  });

  it('say once that asking his quiz goal first is a question that ends with a question mark, with one example', () => {
    const goal = flat(text.slice(text.indexOf('### His quiz goal'), text.indexOf('### Pitching the quiz at him')));
    expect(count(goal, /ends? with a question mark/g)).toBe(1);
    expect(count(goal, /not a statement/g)).toBe(1);
    expect(goal).toMatch(/What would you like this quiz to do for you\?/);
  });

  it('say that a `p` link with no place is never sent: no chapter you know, no link (mw-5r3p30.743)', () => {
    const work = flat(text.slice(text.indexOf('### Links to a work he owns'), text.indexOf('### Links to a work he owns') + 4000));
    expect(count(work, /with no `place` is never sent/g)).toBe(1);
    expect(work).toMatch(/if you know no chapter, give no link/);
    expect(work).not.toMatch(/else leave the link out/);
  });

  it('say once that a book with `places` takes a `place` in its link, with one short example', () => {
    const work = flat(text.slice(text.indexOf('### Links to a work he owns'), text.indexOf('### Links to a work he owns') + 4000));
    expect(count(work, /always (?:carries|takes|gives) a `place`/g)).toBe(1);
    expect(count(work, /"kind":\s*"work"[^}]*"place":\s*"3\.24"/g)).toBe(1);
    expect(count(text, /"place":\s*"3\.24"/g)).toBe(1);
  });
});

// mw-5r3p30.755: asked about a verse past the held range, one run in three said where the text stops ("Your text stops at Revelation 2:3") and left the
// range out; the `verses` rule now says to name the whole range, with the words.
describe('the bible-talk `verses` rule after mw-5r3p30.755', () => {
  it('says to name the whole held range in words, not only where it stops', () => {
    const rule = flat(text.slice(text.indexOf('- `verses`:'), text.indexOf('- `greek_words`:')));
    expect(rule).toMatch(/name the whole range \("I hold verses 1 to 3"\), not only where it stops/);
  });

  // mw-5r3p30.853: the smoke of 2026-10-29 08:18Z answered about Smyrna (2:8-11) and never said which verses it holds: the rule was a permission with no place in the answer.
  it('has the FIRST sentence of the answer name the held range, before the answer to a verse outside it', () => {
    const rule = flat(text.slice(text.indexOf('- `verses`:'), text.indexOf('- `greek_words`:')));
    expect(rule).toMatch(/FIRST sentence[^;]*name the whole range \("I hold verses 1 to 3"\)/);
  });
});

// mw-5r3p30.751: two smoke examples missed 1 of 3 on 2026-10-24 for a rule stated once and without its limit: bridge-quite-a-bit taught first and never said how much
// he is missing ("Answer him first, briefly" read as teaching first), works-commentary-at-the-passage linked a second Calvin work (the Institutes) beside the commentary.
describe('two rules said with their limit (mw-5r3p30.751)', () => {
  const section = (from: string, to: string): string => flat(text.slice(text.indexOf(from), text.indexOf(to)));

  it('"When he is not ready" has the FIRST sentence of the answer say how much he is missing, before any teaching, and no line saying to answer first', () => {
    const ready = section('## When he is not ready', '## When he has gone rusty');
    expect(count(ready, /FIRST sentence[^.]*how much he is missing[^.]*before any teaching/g)).toBe(1);
    expect(ready).not.toMatch(/Answer him first/);
  });

  it('"Links to a work he owns" gives the work he names ONE link, never a second work beside it, not another by the same author, and no line allows two', () => {
    const work = section('### Links to a work he owns', '## Words the voice can misread');
    expect(count(work, /ONE link[^.]*never a second work beside it, not another by the same author/g)).toBe(1);
    expect(work).not.toMatch(/unless he asks to compare/);
  });
});

// mw-fu7dqf.14: "Quiz me on John 3:16, the verse I'm memorizing" got startSession live, twice, where the example wanted asks verseText. A quiz is a recall session, so the
// instructions say startSession for a recall request on a verse he memorizes, and asks verseText only for a question about the Greek of the verse he memorizes.
describe('the bible-talk instructions on a verse he memorizes (mw-fu7dqf.14)', () => {
  const own = flat(text.slice(text.indexOf('### In Lampas')));
  const read = (name: string): { request: { question: string }; expect: Record<string, Record<string, unknown>> } =>
    JSON.parse(readFileSync(`grinds/examples/bible-talk/${name}.json`, 'utf8'));

  it('says a recall request on a verse he memorizes is `do` of `startSession`, and a question about the Greek he memorizes in it asks `verseText`', () => {
    expect(count(own, /quiz me on John 3:16[^.]*`startSession`/gi)).toBe(1);
    expect(count(own, /Greek am I memorizing[^.]*asks? `verseText`/gi)).toBe(1);
  });

  it('has verse-text-ask expect startSession, and verse-text-words expect asks.0 verseText, each with the other left out', () => {
    const quiz = read('verse-text-ask');
    expect(quiz.request.question).toMatch(/Quiz me on John 3:16/);
    expect(quiz.expect['do.0.name']).toEqual({ equals: 'startSession' });
    expect(quiz.expect['asks']).toEqual({ present: false });
    const words = read('verse-text-words');
    expect(words.request.question).toMatch(/Greek am I memorizing in John 3:16/);
    expect(words.expect['asks.0']).toEqual({ equals: 'verseText' });
    expect(words.expect['asks.1']).toEqual({ present: false });
    expect(words.expect['do']).toEqual({ present: false });
  });
});
