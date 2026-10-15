// features/steps/bible-talk/settings.steps.tsx — runs the @settings scenarios of features/bible-talk.feature:
// the settings the tutor changes when asked, and the Undo that puts one back.
// The fake Postern and the page are shared with the other bible-talk step files through ./support, which ends every scenario clean.
import '@testing-library/react/dont-cleanup-after-each';
import { waitFor, within } from '@testing-library/react';
import { expect } from 'vitest';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { db } from '../../../src/data/db';
import { getGoal, getPickerGrammar, getSpeechRate, getStudyResources, getTheme } from '../../../src/data/repositories';
import { type FakePostern } from '../../../tests/support/fake-postern';
import { expectLatest } from '../../../tests/support/published';
import { endScenario, open, openTalk, received, send, sheet, taps, turnShows } from './support';

  const changing = (...changes: { key: string; value: unknown }[]) => (f: FakePostern) =>
    void (f.autoReply = { status: 'answered', answer: { answer: 'Done.', words: [], settings_changes: changes } });
  const changeRows = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-talk-change]'));

const feature = await loadFeature('features/bible-talk.feature');

describeFeature(
  feature,
  ({ Scenario, AfterEachScenario }) => {
    AfterEachScenario(endScenario);
    Scenario('Asking for a setting changes it at once and the talk says what changed, with an Undo', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change greekRate 0.8', () =>
        open(changing({ key: 'greekRate', value: 0.8 })),
      );
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the sheet shows {string} with an Undo button', async (_, text: string) => {
        await waitFor(() => expect(changeRows().some((row) => row.textContent?.includes(text))).toBe(true));
        const row = changeRows().find((r) => r.textContent?.includes(text)) as HTMLElement;
        expect(within(row).getByRole('button', { name: 'Undo Greek speed' })).toHaveTextContent('Undo');
      });
      And('the Greek speed is saved as 0.8 and the English speed is still 1', async () => {
        expect(await getSpeechRate('greek')).toBe(0.8);
        expect(await getSpeechRate('english')).toBe(1);
        await expectLatest('rates-changed', (e) => expect(e?.rates).toEqual({ english: 1, greek: 0.8 }));
      });
      And('the grist carried the settings as they stood, the Greek speed at 1', () => {
        expect(received(0).input.settings).toMatchObject({ greekRate: 1, theme: 'phone', textSize: 'normal' });
      });
      When('he taps Undo', () => taps('Undo Greek speed'));
      Then('the sheet shows {string} and no Undo button', async (_, text: string) => {
        await waitFor(() => expect(changeRows().some((row) => row.textContent?.includes(text))).toBe(true));
        expect(within(sheet()).queryByRole('button', { name: /^Undo/ })).toBeNull();
      });
      And('the Greek speed is saved as 1', async () => {
        expect(await getSpeechRate('greek')).toBe(1);
        await expectLatest('rates-changed', (e) => expect(e?.rates.greek).toBe(1));
      });
    });

    Scenario('The tutor sets the goal when asked', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change goal 1 John 1', () =>
        open(changing({ key: 'goal', value: '1 John 1' })),
      );
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the sheet shows {string} with an Undo button', async (_, text: string) => {
        await waitFor(() => expect(changeRows().some((row) => row.textContent?.includes(text))).toBe(true));
        const row = changeRows().find((r) => r.textContent?.includes(text)) as HTMLElement;
        expect(within(row).getByRole('button', { name: 'Undo Goal' })).toHaveTextContent('Undo');
      });
      And('the saved goal is {string}', async (_, text: string) => expect(await getGoal()).toBe(text));
      When('he taps Undo', () => taps('Undo Goal'));
      Then('the saved goal is {string}', async (_, text: string) => {
        await waitFor(async () => expect(await getGoal()).toBe(text));
      });
    });

    Scenario('A change to a setting the app does not have changes nothing and the talk says so', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change fontColour red', () =>
        open(changing({ key: 'fontColour', value: 'red' })),
      );
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the answer shows in the sheet under his question', async () => {
        await turnShows(0, 'Done.');
      });
      And('nothing was changed and the sheet shows no Undo button', async () => {
        expect(await db.settings.count()).toBe(0);
        expect(within(sheet()).queryByRole('button', { name: /^Undo/ })).toBeNull();
        expect(changeRows()).toHaveLength(0);
      });
      And('the sheet says the app has no such setting {string}', (_, key: string) => turnShows(0, `"${key}": the app has no such setting`));
    });

    Scenario('A change with a value the setting does not allow is left out, the allowed change beside it is made', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the changes theme purple and greekRate 0.7', () =>
        open(changing({ key: 'theme', value: 'purple' }, { key: 'greekRate', value: 0.7 })),
      );
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the sheet shows {string} with an Undo button', async (_, text: string) => {
        await waitFor(() => expect(changeRows().some((row) => row.textContent?.includes(text))).toBe(true));
        expect(within(sheet()).getByRole('button', { name: 'Undo Greek speed' })).toBeInTheDocument();
      });
      And('the sheet says the Theme does not allow {string}', (_, value: string) => turnShows(0, `Theme: "${value}" is not a value it allows`));
      And('the saved Theme is still Phone', async () => {
        expect(await getTheme()).toBe('phone');
      });
    });

    Scenario('Yes to the offer changes New words at and the sheet shows Changed with Undo', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change pickerGrammar solid', () =>
        open(changing({ key: 'pickerGrammar', value: 'solid' })),
      );
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the sheet shows {string} with an Undo button', async (_, text: string) => {
        await waitFor(() => expect(changeRows().some((row) => row.textContent?.includes(text))).toBe(true));
        const row = changeRows().find((r) => r.textContent?.includes(text)) as HTMLElement;
        expect(within(row).getByRole('button', { name: 'Undo New words at' })).toHaveTextContent('Undo');
      });
      And('New words at is saved as Solid grammar', async () => expect(await getPickerGrammar()).toBe('solid'));
      When('he taps Undo', () => taps('Undo New words at'));
      Then('New words at is saved as Frontier grammar', async () => {
        await waitFor(async () => expect(await getPickerGrammar()).toBe('frontier'));
      });
    });

    Scenario("The tutor turns a study resource off or on when asked, as the Settings screen's own switch, and Undo puts it back", ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change resource.strongs on', () =>
        open(changing({ key: 'resource.strongs', value: 'on' })),
      );
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the sheet shows {string} with an Undo button', async (_, text: string) => {
        await waitFor(() => expect(changeRows().some((row) => row.textContent?.includes(text))).toBe(true));
        const row = changeRows().find((r) => r.textContent?.includes(text)) as HTMLElement;
        expect(within(row).getByRole('button', { name: "Undo Strong's" })).toHaveTextContent('Undo');
      });
      And("the Strong's resource is switched on", async () => expect((await getStudyResources()).on).toEqual(['strongs']));
      When('he taps Undo', () => taps("Undo Strong's"));
      Then("the Strong's resource is switched off", async () => {
        await waitFor(async () => expect((await getStudyResources()).on).toEqual([]));
      });
    });
  },
  { includeTags: ['settings'] },
);
