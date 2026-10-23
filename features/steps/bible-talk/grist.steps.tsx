// features/steps/bible-talk/grist.steps.tsx — runs the @grist scenarios of features/bible-talk.feature:
// what the talk sends (the reference, the Greek and English, the question, the history, the learner summary,
// the grammar and the resources) and what the grind's instructions ask of the tutor.
// The fake Postern and the page are shared with the other bible-talk step files through ./support, which ends every scenario clean.
import '@testing-library/react/dont-cleanup-after-each';
import { waitFor, within } from '@testing-library/react';
import { expect } from 'vitest';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { type Chapter, markSupplied } from '../../../src/data/chapter';
import { db } from '../../../src/data/db';
import { addTurn, setLevel, setResourceOn, talkRef } from '../../../src/data/repositories';
import { setGoal } from '../../../src/data/repositories/settings';
import { SOLID_WORDS_SENT } from '../../../src/services/solidWords';
import { TALK_ANSWER } from '../../../tests/support/fake-postern';
import { expectKeepsItShort, expectLearnerField, expectLearnerSummary, expectTeachesNewWord, instructionsOf, learnWordToday } from '../../../tests/support/learner';
import { endScenario, fake, history, open, openTalk, received, selectVerse28, send, sheet, turnsKept } from './support';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const revelation2 = JSON.parse(readFileSync('public/data/rev/2.json', 'utf8')) as Chapter;
const verseData = (n: number, from: Chapter = chapter) => {
  const v = from.verses.find((x) => x.n === n);
  if (!v) throw new Error(`no verse ${n}`);
  return v;
};
const greekOf = (ns: number[], from: Chapter = chapter) => ns.map((n) => verseData(n, from).g.map((w) => w.t).join(' ')).join(' ');
const englishOf = (ns: number[], from: Chapter = chapter) => ns.map((n) => verseData(n, from).e.map(markSupplied).join(' ')).join(' ');

const feature = await loadFeature('features/bible-talk.feature');

describeFeature(
  feature,
  ({ Scenario, AfterEachScenario }) => {
    AfterEachScenario(endScenario);
    Scenario("A question about 8:28 sends a bible-talk grist with the verse's Greek and English, the question, the solid words and the earlier turns", ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      And('he selects verse 28', selectVerse28);
      And('he opens Talk', openTalk);
      Then('the sheet is titled {string}', (_, title: string) => {
        expect(sheet()).toHaveAccessibleName(title);
        expect(within(sheet()).getByRole('heading', { name: title })).toBeInTheDocument();
      });
      When('he sends {string}', (_, question: string) => send(question));
      And('the answer number {int} has arrived', (_, n: number) => turnsKept(n));
      And('he sends {string}', (_, question: string) => send(question));
      Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
        await waitFor(() => expect(fake.received).toHaveLength(count));
        for (const got of fake.received) expect(got.grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
      });
      And('the first grist is not marked as spoken', () => {
        expect(received(0).input).not.toHaveProperty('spoken');
      });
      And('the first grist carries no earlier turns', () => {
        expect(history(0)).toEqual([]);
      });
      And('the second grist carries the reference {string} and the Greek and the English of verse 28', (_, reference: string) => {
        const { input } = received(1);
        expect(input.reference).toBe(reference);
        expect(input.greek).toBe(greekOf([28]));
        expect(input.english).toBe(englishOf([28]));
      });
      And('the second grist carries the question {string}', (_, question: string) => {
        expect(received(1).input.question).toBe(question);
      });
      And('the second grist carries his solid words, and not the words he is still learning', async () => {
        const solid = (await db.words.where('state').equals('solid').toArray()).map((w) => w.lemma);
        const learning = (await db.words.where('state').equals('learning').toArray()).map((w) => w.lemma);
        expect(solid.length).toBeGreaterThan(0);
        expect(learning.length).toBeGreaterThan(0);
        const sent = received(1).input.solid_words as string[];
        expect(sent).toHaveLength(Math.min(solid.length, SOLID_WORDS_SENT));
        for (const lemma of sent) expect(solid).toContain(lemma);
        expect(received(1).input.solid_count).toBe(solid.length);
        for (const word of learning) expect(sent).not.toContain(word);
      });
      And('the second grist carries the first question and its answer as the earlier turn', () => {
        expect(history(1)).toEqual([{ q: 'Why does Paul say all things?', a: TALK_ANSWER.answer }]);
      });
    });

    Scenario('With no verse selected the talk is about the chapter, with its first three verses', ({ Given, When, Then, And }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      When('he opens Talk', openTalk);
      Then('the sheet is titled {string}', (_, title: string) => {
        expect(sheet()).toHaveAccessibleName(title);
      });
      When('he sends {string}', (_, question: string) => send(question));
      Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
        await waitFor(() => expect(fake.received).toHaveLength(count));
        expect(received(0).grist).toMatchObject({ app: 'lampas', kind: 'bible-talk' });
      });
      And('the first grist carries the reference {string} and the Greek and the English of verses 1 to 3', (_, reference: string) => {
        const { input } = received(0);
        expect(input.reference).toBe(reference);
        expect(input.greek).toBe(greekOf([1, 2, 3]));
        expect(input.english).toBe(englishOf([1, 2, 3]));
      });
      And('the first grist carries the question {string}', (_, question: string) => {
        expect(received(0).input.question).toBe(question);
      });
      And('the first grist says it holds the verses {string}', (_, verses: string) => {
        expect(received(0).input.verses).toBe(verses);
      });
    });

    Scenario('A talk about Revelation 2 whose last answer linked 2:9 sends 2:9 in its next request', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Revelation 2 with a talk behind a fake Postern whose answer links Revelation 2:9', () =>
        open((f) => void (f.autoReply = { status: 'answered', answer: { ...TALK_ANSWER, links: [{ kind: 'verse', reference: 'Revelation 2:9' }] } }), false, '#/?b=rev&c=2'),
      );
      When('he opens Talk', openTalk);
      Then('the sheet is titled {string}', (_, title: string) => {
        expect(sheet()).toHaveAccessibleName(title);
      });
      When('he sends {string}', (_, question: string) => send(question));
      And('the answer number {int} has arrived', (_, n: number) => turnsKept(n));
      And('he sends {string}', (_, question: string) => send(question));
      Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
        await waitFor(() => expect(fake.received).toHaveLength(count));
      });
      And('the first grist carries the reference {string} and the Greek and the English of verses 1 to 3 of Revelation 2', (_, reference: string) => {
        const { input } = received(0);
        expect(input.reference).toBe(reference);
        expect(input.greek).toBe(greekOf([1, 2, 3], revelation2));
        expect(input.english).toBe(englishOf([1, 2, 3], revelation2));
      });
      And('the second grist carries the reference {string} and the Greek and the English of verses 8 to 10 of Revelation 2', (_, reference: string) => {
        const { input } = received(1);
        expect(input.reference).toBe(reference);
        expect(input.greek).toBe(greekOf([8, 9, 10], revelation2));
        expect(input.english).toBe(englishOf([8, 9, 10], revelation2));
      });
      And('the second grist says it holds the verses {string}', (_, verses: string) => {
        expect(received(1).input.verses).toBe(verses);
      });
    });

    Scenario('The eleventh turn sends only the last 10 as history', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      And('ten turns were already kept for verse 28', async () => {
        for (let i = 1; i <= 10; i++) await addTurn(talkRef('rom', 8, 28), `Question ${i}`, `Answer ${i}`, [], 1_000 + i);
      });
      And('he selects verse 28', selectVerse28);
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      And('the answer number {int} has arrived', (_, n: number) => turnsKept(n));
      And('he sends {string}', (_, question: string) => send(question));
      Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
        await waitFor(() => expect(fake.received).toHaveLength(count));
      });
      And('the first grist carries {int} earlier turns, from {string} to {string}', (_, count: number, first: string, last: string) => {
        const sent = history(0);
        expect(sent).toHaveLength(count);
        expect(sent[0]).toEqual({ q: first, a: 'Answer 1' });
        expect(sent[count - 1].q).toBe(last);
      });
      And('the second grist carries {int} earlier turns, from {string} to {string}', (_, count: number, first: string, last: string) => {
        const sent = history(1);
        expect(sent).toHaveLength(count);
        expect(sent[0]).toEqual({ q: first, a: 'Answer 2' });
        expect(sent[count - 1].q).toBe(last);
        expect(sent.map((t) => t.q)).not.toContain('Question 1');
      });
    });

    Scenario('A question in the talk sends the learner summary', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      And('he is learning the word {string} which he added today', (_, lemma: string) => learnWordToday(lemma));
      And('he selects verse 28', selectVerse28);
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
        await waitFor(() => expect(fake.received).toHaveLength(count));
        expect(received(0).grist).toMatchObject({ app: 'lampas', kind: 'bible-talk' });
      });
      And('its input carries a learner summary that names his solid words as a count, {string} among the words he is learning and as new today, and what is due now', (_, lemma: string) =>
        expectLearnerSummary(received(0).input, lemma),
      );
    });

    Scenario("The Bible talk's instructions ask it to teach a new word in his terms", ({ Given, Then, And }) => {
      let text = '';
      Given("the bible-talk grind's instructions", () => {
        text = instructionsOf('bible-talk');
      });
      Then('they describe the learner field', () => void expectLearnerField(text));
      And('they ask for a new word to be taught with its gloss, a memorable hook and one easy example from the chapter', () => void expectTeachesNewWord(text));
      And('they say to leave out what he already knows and to keep the answer short for a phone', () => void expectKeepsItShort(text));
    });

    Scenario("Asking about ἀρχῆς sends learner_grammar with the goal Read 1 John 1:1", ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      And('his goal is {string} and he has the genitive case on the frontier', async (_, goal: string) => {
        await setGoal(goal);
        await setLevel('case-genitive', 'frontier', 'sheet');
      });
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
        await waitFor(() => expect(fake.received).toHaveLength(count));
        expect(received(0).grist).toMatchObject({ app: 'lampas', kind: 'bible-talk' });
      });
      And(
        'its input carries learner_grammar with the goal {string}, {string} among the frontier ideas and no more than 12 titles a list',
        (_, goal: string, title: string) => {
          const field = received(0).input.learner_grammar as { goal: string; ideas: Record<string, string[]>; suggested_move: string; approach: { name: string } };
          expect(field.goal).toBe(goal);
          expect(field.ideas.frontier).toContain(title);
          for (const titles of Object.values(field.ideas)) expect(titles.length).toBeLessThanOrEqual(12);
          expect(field.suggested_move).toBe('none');
          expect(field.approach.name).toBe('Lampas ladder');
          expect(new TextEncoder().encode(JSON.stringify(field)).length).toBeLessThanOrEqual(900);
        },
      );
    });

    Scenario("The tutor's instructions tell it to teach at his level and to offer the move", ({ Given, Then, And }) => {
      let text = '';
      Given("the bible-talk grind's instructions", () => {
        text = instructionsOf('bible-talk');
      });
      Then('they describe the learner_grammar field', () => {
        expect(text).toContain('`learner_grammar`');
        for (const part of ['`goal`', '`words`', '`ideas`', '`placed`', '`suggested_move`', '`picker_level`', '`approach`']) expect(text).toContain(part);
      });
      And('they pitch frontier ideas with a form from the goal and name a not-yet idea only with its plain meaning', () => {
        expect(text).toMatch(/`frontier` idea is one he is learning now: explain it, and show it with a form from the goal passage/);
        expect(text).toMatch(/`not_yet` idea is one he has not met: name it only with its plain meaning in the same sentence/);
        expect(text).toContain('A `solid` idea needs no explaining');
        expect(text).toContain('never quiz him unasked');
      });
      And('they offer the move with one question when suggested_move is up or down and Move it is Ask, and put pickerGrammar in settings_changes on a yes', () => {
        expect(text).toContain('When `suggested_move` is `up` or `down` and `settings.grammarMove` is "ask", end your answer with ONE question');
        expect(text).toContain('`{"key": "pickerGrammar", "value": "frontier"}`');
        expect(text).toContain('`{"key": "pickerGrammar", "value": "solid"}`');
        expect(text).toContain('`settings_changes`');
      });
      And('they name the approach and its next lesson when he asks what to learn next', () => {
        expect(text).toContain('`approach.next_lesson`');
        expect(text).toContain('asks what to learn next');
      });
    });

    Scenario('A question in the talk tells the tutor only the study resources he has on', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      And('the Logos study resource is switched on', () => setResourceOn('logos', true));
      And('he selects verse 28', selectVerse28);
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
        await waitFor(() => expect(fake.received).toHaveLength(count));
        expect(received(0).grist).toMatchObject({ app: 'lampas', kind: 'bible-talk' });
      });
      And('its input lists the resource Logos and no other', () => {
        expect(received(0).input.resources).toEqual([{ id: 'logos', name: 'Logos', words: true, verses: true }]);
      });
    });
  },
  { includeTags: ['grist'] },
);
