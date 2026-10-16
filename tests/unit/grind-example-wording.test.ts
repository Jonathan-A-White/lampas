// A scenario's `expect` tests the meaning of a tutor answer, not one wording of it (mw-5r3p30.313): the live smoke failed three scenarios of the
// 0.1.174 grind on good answers (a bridge answer that did not say "quite a bit", a request-sent answer that said "has been sent" and not "not yet"),
// and a bible-talk scenario whose request never made the note to keep plain. Each wording check here must take every faithful phrasing.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkExpect, type ExpectBlock } from '../support/grind-examples';
import { instructionsOf } from '../../scripts/grind-parts';

const example = (path: string): { request: Record<string, unknown>; expect: ExpectBlock } => JSON.parse(readFileSync(`grinds/examples/${path}.json`, 'utf8')) as { request: Record<string, unknown>; expect: ExpectBlock };
const answerChecks = (path: string): ExpectBlock => ({ answer: example(path).expect.answer });

describe('verse-ask/bridge-quite-a-bit tests the meaning', () => {
  const checks = answerChecks('verse-ask/bridge-quite-a-bit');

  it('takes any answer that says the question rests on more he has not met', () => {
    for (const said of [
      'The genitive is the case that says "of". You are missing quite a bit for this; start with Pairs of vowels.',
      'The genitive is the case that says "of". Here it appears three times. This rests on several ideas you have not met yet; the first is Pairs of vowels.',
      'The genitive marks "of". There is a lot more under this that you have not learned yet, so start with Pairs of vowels.',
      'The genitive says "of". This builds on six ideas you have not met, and Pairs of vowels comes first.',
      'The genitive says "of". You do not have the ideas under this yet: begin with Pairs of vowels.',
    ]) expect(checkExpect(checks, { answer: said }), said).toEqual([]);
  });

  it('does not take an answer that says nothing of what he lacks', () => {
    expect(checkExpect(checks, { answer: 'The genitive is the case that says "of". It appears three times in this verse.' })).not.toEqual([]);
  });

  it('keeps the structured fields the bridge is judged by', () => {
    const { expect: block } = example('verse-ask/bridge-quite-a-bit');
    expect(block['bridge.next']).toEqual({ equals: 'diphthongs' });
    expect(block['bridge.missing.3']).toEqual({ present: false });
  });
});

describe('verse-ask/request-sent tests the meaning', () => {
  const checks = answerChecks('verse-ask/request-sent');

  it('takes any answer that says the idea was sent and has no answer yet', () => {
    for (const said of [
      'Your idea, "Add a sepia theme", has been sent to the makers of Lampas. They have not answered yet.',
      'Your idea, "Add a sepia theme", has been sent to the makers of Lampas. They will look at it.',
      'It was sent to the makers. Nothing has come back from them so far.',
      'The makers have your sepia theme idea, sent but not answered yet.',
      'Not answered yet: the makers are still waiting on your idea.',
      'I see "Add a sepia theme" among your requests. It is sent, and there is no answer from the makers.',
    ]) expect(checkExpect(checks, { answer: said }), said).toEqual([]);
  });

  it('does not take an answer that says nothing of the request', () => {
    expect(checkExpect(checks, { answer: 'The verse says all things work together for good.' })).not.toEqual([]);
  });
});

describe('verse-ask/spoken-greek-word takes either case of τεκνία (as bible-talk\'s does, mw-5r3p30.282)', () => {
  const checks = answerChecks('verse-ask/spoken-greek-word');
  it.each(['Τεκνία', 'τεκνία'])('%s', (form) => {
    const said = `I took "Tech N9ne" as τεκνίον, "little child." and "technia" as ${form}, the plural.`;
    expect(checkExpect(checks, { answer: said })).toEqual([]);
  });
  it('still wants both forms named', () => {
    expect(checkExpect(checks, { answer: 'I took "technia" as τεκνία.' })).not.toEqual([]);
    expect(checkExpect(checks, { answer: 'I took "Tech N9ne" as τεκνίον.' })).not.toEqual([]);
  });
});

describe('bible-talk/memory-update-wished makes the note plain, and the grind says when the entries are required', () => {
  const { request } = example('bible-talk/memory-update-wished');
  const instructions = instructionsOf('bible-talk');

  it('the question asks for the mix-up to be kept', () => {
    expect(String(request.question)).toMatch(/remember|keep a note|make a note|note (of|that|down)/i);
    expect(String(request.question)).toContain('ἀγαπάω');
    expect(String(request.question)).toContain('ἀγάπη');
  });

  it('the instructions require memory_update when he says what trips him or asks for a note, and wished_notes for a word asked about with no note sent', () => {
    const memory = instructions.slice(instructions.indexOf('## His memory'), instructions.indexOf('## Offering the Greek'));
    expect(memory).toMatch(/memory_update[^.]*\b(required|must|always)\b|\b(required|must|always)\b[^.]*memory_update/i);
    expect(memory).toMatch(/wished_notes[^.]*\b(required|must|always)\b|\b(required|must|always)\b[^.]*wished_notes/i);
    expect(memory).toContain('I keep mixing up');
  });
});

// mw-5r3p30.424: the smoke of 2026-10-15 20:15Z failed bible-talk/rusty-offer on a right answer that never said "rusty" (the ids were
// exact). The behaviour is that the answer names the items the request listed as rusty, in any words; the offer's ids stay exact.
describe('bible-talk/rusty-offer tests the meaning (mw-5r3p30.424)', () => {
  const checks = answerChecks('bible-talk/rusty-offer');

  it('takes the answer the mill gave, and any other that names both rusty items', () => {
    for (const said of [
      'Start with a short round on what slipped: λόγος and the genitive case. They were solid before; a few minutes will bring them back. Tap Move back to Frontier and practise.',
      "You're rusty on λόγος and the genitive case: they were solid before. Tap Move back to Frontier and practise.",
      'The genitive case has not come up for three weeks, and λόγος slipped twice this week. A short practice of both is on offer.',
      'Λόγος and the Genitive case have slipped a little since your break. Want to practise them?',
    ]) expect(checkExpect(checks, { answer: said }), said).toEqual([]);
  });

  it('does not take an answer that names only one of them, or neither', () => {
    for (const said of [
      "You're rusty on λόγος. Tap Move back to Frontier and practise.",
      "You're rusty on the genitive case. Tap Move back to Frontier and practise.",
      "You're a bit rusty. Let's read Romans 8:28 together.",
    ]) expect(checkExpect(checks, { answer: said }), said).not.toEqual([]);
  });

  it('keeps the offer\'s ids exact', () => {
    const { expect: block } = example('bible-talk/rusty-offer');
    expect(block['rusty_offer.items.0.id']).toEqual({ equals: 'λόγος' });
    expect(block['rusty_offer.items.1.id']).toEqual({ equals: 'case-genitive' });
  });
});

// The sweep of mw-5r3p30.424: each scenario below checked its answer for one English word or phrase a faithful answer may say otherwise.
describe('bible-talk/bridge-quite-a-bit tests the meaning, as verse-ask\'s does (mw-5r3p30.424)', () => {
  const checks = answerChecks('bible-talk/bridge-quite-a-bit');

  it('takes any answer that says the question rests on more he has not met', () => {
    for (const said of [
      'Briefly: the genitive says "of". You are missing quite a bit for this: the top three are the nominative case, the noun and accents. Start with Pairs of vowels.',
      'Briefly: the genitive says "of". This rests on several ideas you have not met yet; start with Pairs of vowels.',
      'The genitive marks "of". There is a lot under this you have not learned yet, so begin with Pairs of vowels.',
    ]) expect(checkExpect(checks, { answer: said }), said).toEqual([]);
  });

  it('does not take an answer that says nothing of what he lacks', () => {
    expect(checkExpect(checks, { answer: 'The genitive is the case that says "of". It appears three times in this verse.' })).not.toEqual([]);
  });
});

describe('bible-talk/bridge-one-missing takes the nominative named at the start of a sentence (mw-5r3p30.424)', () => {
  const checks = answerChecks('bible-talk/bridge-one-missing');
  it.each(['Nominative case comes first: it names the subject.', 'Start with the nominative case: it names the subject.'])('%s', (said) => {
    expect(checkExpect(checks, { answer: said })).toEqual([]);
  });
  it('still wants it named', () => {
    expect(checkExpect(checks, { answer: 'Start with the case that names the subject.' })).not.toEqual([]);
  });
});

describe.each(['bible-talk', 'verse-ask'])('%s request scenarios test the status, not one word for it (mw-5r3p30.424)', (kind) => {
  it('request-building takes any answer that says it is being made now', () => {
    const checks = answerChecks(`${kind}/request-building`);
    for (const said of [
      'Your sepia theme is being built now.',
      'The makers are working on your sepia theme now.',
      'Your sepia theme is in progress.',
      'Work on your sepia theme is under way.',
    ]) expect(checkExpect(checks, { answer: said }), said).toEqual([]);
    expect(checkExpect(checks, { answer: 'The makers have your idea.' })).not.toEqual([]);
  });

  it('request-filed takes any answer that says the makers have it down to do', () => {
    const checks = answerChecks(`${kind}/request-filed`);
    for (const said of [
      'The makers filed your sepia theme.',
      'Your sepia theme is on the makers\' list.',
      'The makers have queued your sepia theme; it is not built.',
      'The makers have it logged as something to do.',
      'They have noted it for later.',
    ]) expect(checkExpect(checks, { answer: said }), said).toEqual([]);
    expect(checkExpect(checks, { answer: 'Thank you for your idea.' })).not.toEqual([]);
  });

  it('request-adopted-as-setting takes the setting named in any case', () => {
    const checks = answerChecks(`${kind}/request-adopted-as-setting`);
    for (const said of [
      'Your idea is now the Theme setting.',
      'You can now choose a dark theme.',
      'It became a setting: you can pick Dark.',
    ]) expect(checkExpect(checks, { answer: said }), said).toEqual([]);
    expect(checkExpect(checks, { answer: 'The makers did your idea.' })).not.toEqual([]);
  });
});

describe('bible-talk/screen-goal takes any of the bar\'s three labels (mw-5r3p30.424)', () => {
  const checks = answerChecks('bible-talk/screen-goal');
  it.each(['Green is solid: words you know well.', 'The middle colour is the frontier, what you are learning now.', 'Grey is not yet: words you have not met.'])('%s', (said) => {
    expect(checkExpect(checks, { answer: said })).toEqual([]);
  });
  it('does not take an answer that names none of them', () => {
    expect(checkExpect(checks, { answer: 'The bar shows your progress toward Romans 8.' })).not.toEqual([]);
  });
});

describe('bible-talk/sound-it-out-svennyte takes the stress said any way (mw-5r3p30.424)', () => {
  const checks = answerChecks('bible-talk/sound-it-out-svennyte');
  it.each([
    'σβέννυτε has three syllables: σβέν, νυ, τε. The first is stressed.',
    'σβέννυτε has three syllables: σβέν, νυ, τε. The stress falls on σβέν.',
    'σβέννυτε has three syllables: σβέν, νυ, τε; the accent is on σβέν, SVE-nee-te.',
  ])('%s', (said) => {
    expect(checkExpect(checks, { answer: said })).toEqual([]);
  });
  it('still wants the stress said', () => {
    expect(checkExpect(checks, { answer: 'σβέννυτε has three syllables: σβέν, νυ, τε.' })).not.toEqual([]);
  });
});
