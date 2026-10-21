// features/steps/bible-talk/sheet.steps.tsx — runs the @sheet scenarios of features/bible-talk.feature:
// the Talk sheet (opening and closing it, the word sheet over it, a reload, a talk kept per chapter
// and per verse) and the sheet when the backend is slow, down or unlicensed.
// The fake Postern and the page are shared with the other bible-talk step files through ./support, which ends every scenario clean.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { expect } from 'vitest';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../../src/App';
import { db } from '../../../src/data/db';
import { stopReading } from '../../../src/speech/readAloud';
import { type FakePostern, TALK_ANSWER } from '../../../tests/support/fake-postern';
import { seedHisWords } from '../../../tests/support/his-words';
import { QUESTION, answerShowsUnderQuestion, composerIsFree, endScenario, fake, field, open, openTalk, selectVerse28, send, sendButton, sendIsOff, sheet, taps, turns, turnsKept, user } from './support';
import { messageBox } from '../../../tests/support/composer';

const feature = await loadFeature('features/bible-talk.feature');

describeFeature(
  feature,
  ({ Scenario, AfterEachScenario }) => {
    AfterEachScenario(endScenario);
    Scenario('The Greek words of an answer open the word sheet', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      And('he selects verse 28', selectVerse28);
      And('he opens Talk', openTalk);
      And('he sends {string}', (_, question: string) => send(question));
      When('he taps the Greek word {string} in the answer', async (_, word: string) => {
        await turnsKept(1);
        // the explained word under the answer; the same word in the answer's own text is a word to tap to hear (features/talk-pictures.feature)
        const explained = turns()[0].querySelector('[data-talk-words]') as HTMLElement;
        await user.click(within(explained).getByRole('button', { name: word }));
      });
      Then('the word sheet shows {string} with its lemma {string}', async (_, word: string, lemma: string) => {
        const word_sheet = await screen.findByRole('dialog', { name: 'Word' });
        expect(within(word_sheet).getByTestId('sheet-word')).toHaveTextContent(word);
        expect(within(word_sheet).getByTestId('sheet-lemma')).toHaveTextContent(lemma);
      });
      When('he taps Done on the word sheet', async () => {
        await user.click(within(screen.getByRole('dialog', { name: 'Word' })).getByRole('button', { name: 'Done' }));
      });
      Then('the word sheet is gone and the Talk sheet is still open', async () => {
        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull());
        expect(sheet()).toBeInTheDocument();
      });
    });

    Scenario('Back from a word opened in the Talk sheet closes only the word sheet', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      And('he selects verse 28', selectVerse28);
      And('he opens Talk', openTalk);
      And('he sends {string}', (_, question: string) => send(question));
      When('he taps the Greek word {string} in the answer', async (_, word: string) => {
        await turnsKept(1);
        const explained = turns()[0].querySelector('[data-talk-words]') as HTMLElement;
        await user.click(within(explained).getByRole('button', { name: word }));
      });
      And('he goes back from the word sheet', async () => {
        await screen.findByRole('dialog', { name: 'Word' });
        window.history.back();
      });
      Then('the word sheet is gone and the Talk sheet is still open', async () => {
        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull());
        expect(sheet()).toBeInTheDocument();
      });
    });

    Scenario('A conversation is still there after reload', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      And('he selects verse 28', selectVerse28);
      And('he opens Talk', openTalk);
      And('he sends {string}', (_, question: string) => send(question));
      And('the answer number {int} has arrived', (_, n: number) => turnsKept(n));
      When('he reopens Lampas, selects verse 28 and opens Talk', async () => {
        cleanup();
        stopReading();
        fake.calls.length = 0;
        await seedHisWords();
        render(<App />);
        await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
        await selectVerse28();
        await openTalk();
      });
      Then('the answer shows in the sheet under his question', answerShowsUnderQuestion);
      And('the fake Postern was not asked again', () => {
        expect(fake.calls.filter((call) => call.includes('/api/'))).toEqual([]);
      });
    });

    Scenario("A verse's talk and the chapter's talk are kept apart", ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      And('he selects verse 28', selectVerse28);
      And('he opens Talk', openTalk);
      And('he sends {string}', (_, question: string) => send(question));
      And('the answer number {int} has arrived', (_, n: number) => turnsKept(n));
      When('he taps Done on the Talk sheet', () => taps('Done'));
      And('he closes the Verse view of verse 28, so that no verse is selected', async () => {
        await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull());
        await user.click(screen.getByRole('button', { name: '‹ Reader' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Verse 28' })).toHaveAttribute('aria-pressed', 'false'));
      });
      And('he opens Talk again', openTalk);
      Then('the sheet is titled {string}', (_, title: string) => {
        expect(sheet()).toHaveAccessibleName(title);
      });
      // The turns come from a live Dexie query: on a busy store (the first open is still seeding the schedule) they arrive a moment late.
      And('the sheet shows no turns yet', () =>
        waitFor(() => {
          expect(turns()).toHaveLength(0);
          expect(sheet().querySelector('[data-talk-empty]')).not.toBeNull();
        }),
      );
    });

    Scenario('An unreachable backend shows Could not reach with Retry', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that cannot be reached', () =>
        open((f) => {
          f.autoReply = { status: 'answered', answer: TALK_ANSWER };
          f.down = true;
        }),
      );
      And('he selects verse 28', selectVerse28);
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the sheet says {string} with a Retry button', async (_, words: string) => {
        expect(await within(sheet()).findByRole('alert')).toHaveTextContent(words);
        expect(within(sheet()).getByRole('button', { name: 'Retry' })).toBeEnabled();
      });
      And('the sheet shows no answer', () => {
        expect(turns()).toHaveLength(0);
      });
      When('the backend comes back and he taps Retry', async () => {
        fake.down = false;
        await taps('Retry');
      });
      Then('the answer shows in the sheet under his question', answerShowsUnderQuestion);
    });

    Scenario('While the tutor has not answered the sheet says Sending and then Waiting', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that holds its answers', () => open((f) => void (f.autoReply = undefined)));
      And('he selects verse 28', selectVerse28);
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the sheet says Waiting and nothing can be sent until the answer comes', async () => {
        const status = await within(sheet()).findByRole('status');
        await waitFor(() => expect(status).toHaveTextContent(/^Waiting for the tutor… \d+ s$/));
        // the Composer is disabled while the message is out: no attaching, no holding, no Send (its text box stays editable)
        expect(within(sheet()).getByRole('button', { name: 'Attach a picture' })).toBeDisabled();
        expect(sendIsOff()).toBe(true);
        expect(within(sheet()).getByText(QUESTION)).toBeInTheDocument();
      });
      // the question reaches the mill a moment after Send: the fake's answer waits for it
      When('the tutor answers', () => fake.answer({ status: 'answered', answer: TALK_ANSWER }));
      Then('the answer shows in the sheet under his question', answerShowsUnderQuestion);
    });

    Scenario('A scenario that leaves a grist in flight cannot fail the next one', ({ Given, And, When, Then }) => {
      let before: FakePostern;
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that holds its answers', () => open((f) => void (f.autoReply = undefined)));
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
        await waitFor(() => expect(fake.received).toHaveLength(count));
        expect(fake.inFlight).toBe(count);
      });
      // what AfterEachScenario does, here in the middle of the scenario so that the next opening can be checked against it
      When('the scenario ends with the grist still in flight', async () => {
        before = fake;
        await endScenario();
      });
      And('Lampas is opened again on Romans 8 with a talk behind a fake Postern', () => open());
      And('he opens Talk again', openTalk);
      Then('the fake Postern of the scenario before has no grist in flight', () => {
        expect(before).not.toBe(fake);
        expect(before.inFlight).toBe(0);
      });
      And('the fake Postern of this scenario has received no grist', () => {
        expect(fake.received).toHaveLength(0);
        expect(fake.inFlight).toBe(0);
      });
      And('the sheet shows no turns yet', () =>
        waitFor(() => {
          expect(turns()).toHaveLength(0);
          expect(sheet().querySelector('[data-talk-empty]')).not.toBeNull();
        }),
      );
      And('the sheet has no unsent question and its field is free', async () => {
        expect(sheet().querySelector('[data-talk-pending]')).toBeNull();
        await waitFor(composerIsFree);
        expect(await db.talks.count()).toBe(0);
      });
    });

    Scenario('An unlicensed reply shows No licence', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that holds no licence for this phone', () => open((f) => void (f.licensed = false)));
      And('he selects verse 28', selectVerse28);
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the sheet says {string} with a Retry button', async (_, words: string) => {
        expect(await within(sheet()).findByRole('alert')).toHaveTextContent(words);
        expect(within(sheet()).getByRole('button', { name: 'Retry' })).toBeEnabled();
      });
    });

    Scenario('Send cannot be tapped with nothing typed', ({ Given, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      When('he opens Talk', openTalk);
      Then('the Send button is off', () => {
        expect(sendIsOff()).toBe(true);
      });
      When('he types {string}', async (_, text: string) => user.type(await messageBox(user, sheet()), text));
      Then('the Send button is still off', () => {
        expect(sendIsOff()).toBe(true);
      });
      When('he types {string} instead', (_, text: string) => user.clear(field()).then(() => user.type(field(), text)));
      Then('the Send button is on', () => {
        expect(sendButton()).toBeEnabled();
      });
    });

    Scenario('Done closes the sheet and Escape closes it too', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      When('he opens Talk', openTalk);
      And('he taps Done on the Talk sheet', () => taps('Done'));
      Then('the Talk sheet is gone', async () => {
        await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull());
      });
      When('he opens Talk again', openTalk);
      And('he presses Escape', () => user.keyboard('{Escape}'));
      Then('the Talk sheet is gone again', async () => {
        await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull());
      });
    });
  },
  { includeTags: ['sheet'] },
);
