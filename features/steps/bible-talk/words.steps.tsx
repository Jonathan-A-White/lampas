// features/steps/bible-talk/words.steps.tsx — runs the @words scenarios of features/bible-talk.feature:
// the words an answer explains and adds to his list.
// The fake Postern and the page are shared with the other bible-talk step files through ./support, which ends every scenario clean.
import '@testing-library/react/dont-cleanup-after-each';
import { screen, waitFor, within } from '@testing-library/react';
import { expect } from 'vitest';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { db } from '../../../src/data/db';
import { type FakePostern } from '../../../tests/support/fake-postern';
import { endScenario, open, openTalk, send, sheet, turnShows, turns, user } from './support';
import { openSettingsGroup } from '../../../tests/support/settings-pages';

const explaining = (f: FakePostern): void => {
  f.autoReply = {
    status: 'answered',
    answer: {
      answer: 'The flesh, the spirit and God.',
      words: [
        { greek: 'σάρκα', lemma: 'σάρξ', note: 'noun, accusative singular feminine' },
        { greek: 'πνεῦμα', lemma: 'πνεῦμα', note: 'noun, nominative singular neuter' },
        { greek: 'θεοῦ', lemma: 'θεός', note: 'noun, genitive singular masculine' },
      ],
    },
  };
};
const adding = (...lemmas: string[]) => (f: FakePostern): void =>
  void (f.autoReply = { status: 'answered', answer: { answer: 'Adding.', words: [], words_to_add: lemmas } });
const wordRow = (lemma: string): HTMLElement => {
  const row = Array.from(sheet().querySelectorAll<HTMLElement>('[data-talk-words] > div')).find((r) => r.querySelector('dd [lang="el"]')?.textContent === lemma);
  if (!row) throw new Error(`no answer word ${lemma}`);
  return row;
};
const listed = async (lemma: string) => (await db.words.toArray()).filter((w) => w.lemma === lemma);
const lines = () => turns().map((t) => t.textContent ?? '').join('\n');

const feature = await loadFeature('features/bible-talk.feature');

describeFeature(
  feature,
  ({ Scenario, AfterEachScenario }) => {
    AfterEachScenario(endScenario);
    Scenario('Add to my words puts an answer word\'s lemma on his list once, and a word already there says so from the start', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that explains the words σάρκα, πνεῦμα and θεοῦ', () => open(explaining));
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the answer word {string} offers {string}', async (_, lemma: string, label: string) => {
        await waitFor(() => expect(turns()).toHaveLength(1));
        expect(await within(wordRow(lemma)).findByRole('button', { name: label })).toBeEnabled();
      });
      And('the answer word {string} already shows {string}, because it is a seeded word', async (_, lemma: string, label: string) => {
        expect(await within(wordRow(lemma)).findByText(label)).toBeInTheDocument();
        expect(within(wordRow(lemma)).queryByRole('button', { name: 'Add to my words' })).toBeNull();
      });
      When('he taps {string} on the answer word {string}', async (_, label: string, lemma: string) => {
        await user.click(await within(wordRow(lemma)).findByRole('button', { name: label }));
      });
      Then('the answer word {string} shows {string}', async (_, lemma: string, label: string) => {
        await waitFor(() => expect(within(wordRow(lemma)).getByText(label)).toBeInTheDocument());
        expect(within(wordRow(lemma)).queryByRole('button', { name: 'Add to my words' })).toBeNull();
      });
      And('the word {string} is on the list once, as a word he is learning, with the gloss {string}', async (_, lemma: string, gloss: string) => {
        expect(await listed(lemma)).toMatchObject([{ lemma, state: 'learning', lesson: 0, gloss }]);
      });
      And('the answer word {string} still offers {string}', async (_, lemma: string, label: string) => {
        expect(await within(wordRow(lemma)).findByRole('button', { name: label })).toBeEnabled();
      });
    });

    Scenario('A word added from an answer is on the Words screen', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that explains the words σάρκα, πνεῦμα and θεοῦ', () => open(explaining));
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      And('he taps {string} on the answer word {string}', async (_, label: string, lemma: string) => {
        await waitFor(() => expect(turns()).toHaveLength(1));
        await user.click(await within(wordRow(lemma)).findByRole('button', { name: label }));
        await waitFor(() => expect(within(wordRow(lemma)).queryByRole('button', { name: label })).toBeNull());
      });
      And('he taps Done on the Talk sheet', async () => {
        await user.click(within(sheet()).getByRole('button', { name: 'Done' }));
        await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull());
      });
      And('he opens the Words screen', async () => {
        await user.click(await screen.findByRole('button', { name: 'Settings' }));
        await openSettingsGroup(user, 'account');
        await user.click(await screen.findByRole('button', { name: 'Words' }));
        await screen.findByRole('heading', { name: 'Words' });
      });
      Then('the Words screen lists {string} as learning', async (_, lemma: string) => {
        await waitFor(() => expect(document.querySelector(`[data-lemma="${lemma}"]`)?.getAttribute('data-state')).toBe('learning'));
      });
      And('the Words screen does not list {string}', (_, lemma: string) => {
        expect(document.querySelector(`[data-lemma="${lemma}"]`)).toBeNull();
      });
    });

    Scenario('Saying add σάρξ to my words adds it and the answer says so', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the words to add σάρξ', () => open(adding('σάρξ')));
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the answer shows the line {string}', async (_, line: string) => {
        await waitFor(() => expect(lines()).toContain(line));
      });
      And('the word {string} is on the list once, as a word he is learning, with the gloss {string}', async (_, lemma: string, gloss: string) => {
        expect(await listed(lemma)).toMatchObject([{ lemma, state: 'learning', lesson: 0, gloss }]);
      });
      When('he asks again {string}', (_, question: string) => send(question));
      Then('the second answer shows the line {string}', async (_, line: string) => {
        await turnShows(1, line);
      });
      And('the word {string} is still on the list once with the gloss {string}', async (_, lemma: string, gloss: string) => {
        expect(await listed(lemma)).toMatchObject([{ lemma, state: 'learning', lesson: 0, gloss }]);
      });
    });

    Scenario('An answer that asks to add a word already on the list says it was already there', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the words to add θεός and σάρξ', () => open(adding('θεός', 'σάρξ')));
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the answer shows the line {string}', async (_, line: string) => {
        await waitFor(() => expect(lines()).toContain(line));
      });
      And('the answer also shows the line {string}', async (_, line: string) => {
        await waitFor(() => expect(lines()).toContain(line));
      });
      And('the word {string} is on the list once', async (_, lemma: string) => {
        expect(await listed(lemma)).toHaveLength(1);
      });
    });

    Scenario("Saying add for a word outside the chapter adds it with the lexicon's gloss", ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the words to add προσκυνέω', () => open(adding('προσκυνέω')));
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the answer shows the line {string}', async (_, line: string) => {
        await waitFor(() => expect(lines()).toContain(line));
      });
      And('the word {string} is on the list once, as a word he is learning, with the gloss {string}', async (_, lemma: string, gloss: string) => {
        expect(await listed(lemma)).toMatchObject([{ lemma, state: 'learning', lesson: 0, gloss }]);
      });
    });

    Scenario('Saying add for a word the lexicon does not know says so and adds nothing', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the words to add ζζζ', () => open(adding('ζζζ')));
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the answer shows the line {string}', async (_, line: string) => {
        await waitFor(() => expect(lines()).toContain(line));
      });
      And('the word {string} is not on the list', async (_, lemma: string) => {
        expect(await listed(lemma)).toHaveLength(0);
      });
    });
  },
  { includeTags: ['words'] },
);
