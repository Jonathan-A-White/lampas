// features/steps/form-helper.steps.tsx — runs features/form-helper.feature: the Ask for another approach sheet's 'Let the tutor help me fill
// this in' (src/formHelper/). The tutor is a fake Postern whose mill answers each bible-talk grist with the next scripted answer.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { imageSeam } from '../../src/images/shrink';
import { tutorTimings } from '../../src/services/tutor';
import { SettingsScreen } from '../../src/SettingsScreen';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const realSeam = { ...imageSeam };
let fake: FakePostern;
let clicks: ReturnType<typeof vi.spyOn> | undefined;

afterAll(() => {
  cleanup();
  clearBus();
  Object.assign(imageSeam, realSeam);
  clicks?.mockRestore();
  vi.unstubAllGlobals();
  db.close();
});

const START = 'Let the tutor help me fill this in';
const sheet = () => screen.getByRole('dialog', { name: 'Ask for another approach' });
const helper = () => screen.getByRole('region', { name: 'The tutor is helping with this form' });
const field = (label: string) => within(sheet()).getByRole('textbox', { name: label });
const talks = () => fake.received.filter((r) => r.grist.kind === 'bible-talk');
const reply = (answer: string, ask?: string, values: { field: string; value: string }[] = []) => ({
  status: 'answered' as const,
  answer: { answer, words: [], ...(values.length ? { form_values: values } : {}), ...(ask ? { form_ask: ask } : {}) },
});

const Q_APPROACH = 'What approach would you like to suggest, and how does it teach?';
const Q_CREDIT = 'Who made this approach, so we can credit them?';
const Q_PICTURE = 'Do you have a screenshot or a photo of it?';
const Q_LINK = 'Is there a link where it can be found?';
const APPROACH = 'Teach the cases with colours, one case at a time.';

async function openSheet(): Promise<void> {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/settings');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = reply(Q_APPROACH, 'approach');
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : Promise.resolve(new Response('{}', { status: 404 })),
  );
  imageSeam.decode = async () => ({ width: 4000, height: 3000, source: null });
  imageSeam.encode = async () => new Blob([new Uint8Array(120_000).fill(7)], { type: 'image/jpeg' });
  clicks?.mockRestore();
  clicks = vi.spyOn(HTMLInputElement.prototype, 'click');
  await db.open();
  await db.settings.clear();
  render(<SettingsScreen />);
  await user.click(await screen.findByRole('button', { name: 'Ask for another approach' }));
  await screen.findByRole('dialog', { name: 'Ask for another approach' });
}

const startHelp = () => user.click(within(sheet()).getByRole('button', { name: START }));
const tutorAsks = async (question: string) => {
  await waitFor(() => expect(within(helper()).getByText(question)).toBeInTheDocument());
};
async function answer(text: string): Promise<void> {
  await user.type(within(helper()).getByRole('textbox', { name: 'Your answer' }), text);
  await user.click(within(helper()).getByRole('button', { name: 'Reply' }));
}

const feature = await loadFeature('features/form-helper.feature');

const NEXT: Record<string, ReturnType<typeof reply>> = {
  [APPROACH]: reply(Q_CREDIT, 'credit', [{ field: 'approach', value: APPROACH }]),
  'Anna Example': reply(Q_PICTURE, 'pictures', [{ field: 'credit', value: 'Anna Example' }]),
  'example.org/greek': reply('That is everything I need: every required field is filled in. Read it, change anything you like, then tap Send yourself.', undefined, [
    { field: 'link', value: 'example.org/greek' },
  ]),
};

async function answers(text: string): Promise<void> {
  const sent = talks().length;
  fake.autoReply = NEXT[text];
  await answer(text);
  await waitFor(() => expect(talks()).toHaveLength(sent + 1));
}
const asks = async (_: unknown, question: string) => tutorAsks(question);
const holds = async (_: unknown, label: string, value: string) => {
  await waitFor(() => expect(field(label)).toHaveValue(value));
};
const picker = () => within(sheet()).getByLabelText('Add a screenshot or photo');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The tutor takes him through the Ask for another approach form, one question at a time', ({ Given, Then, When, And }) => {
    Given('the Ask for another approach sheet is open behind a fake Postern', openSheet);
    Then('the sheet offers "Let the tutor help me fill this in" at its top', () => {
      const button = within(sheet()).getByRole('button', { name: START });
      expect(button.compareDocumentPosition(field('What approach, and how does it teach?')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    When('he taps "Let the tutor help me fill this in"', startHelp);
    Then('the tutor asks one question: {string}', asks);
    And('the mill received one bible-talk grist whose form lists the four fields with their labels, hints and required flags', () => {
      expect(talks()).toHaveLength(1);
      const form = talks()[0].input.form as { name: string; fields: { name: string; label: string; hint?: string; required: boolean; kind: string; value: string }[] };
      expect(form.name).toBe('Ask for another approach');
      expect(form.fields.map((f) => [f.name, f.label, f.required, f.value])).toEqual([
        ['approach', 'What approach, and how does it teach?', true, ''],
        ['pictures', 'Add a screenshot or photo', false, ''],
        ['credit', 'Who to credit', true, ''],
        ['link', 'Link', false, ''],
      ]);
      expect(form.fields[2].hint).toBe('Required: whoever made the approach or the pictures.');
    });
    When('he answers {string}', (_, text: string) => answers(text));
    Then('the field {string} holds {string}', holds);
    And('the tutor then asks one question: {string}', asks);
    When('he then answers {string}', (_, text: string) => answers(text));
    Then('the field {string} now holds {string}', holds);
    And('the tutor next asks one question: {string}', asks);
    And('a button {string} is offered', (_, name: string) => {
      expect(within(helper()).getByRole('button', { name })).toBeInTheDocument();
    });
    When('he presses {string}', async (_, name: string) => {
      fake.autoReply = reply(Q_LINK, 'link');
      await user.click(within(helper()).getByRole('button', { name }));
    });
    Then("the form's own picker opens", () => {
      expect(clicks?.mock.contexts).toContain(picker());
    });
    When('he picks a photo', async () => {
      await user.upload(picker(), new File([new Uint8Array(2_000_000)], 'shot.png', { type: 'image/png' }));
    });
    Then('one picture is listed in the form', async () => {
      await waitFor(() => expect(sheet().querySelectorAll('[data-picture]')).toHaveLength(1));
    });
    And('the tutor lastly asks one question: {string}', asks);
    When('he finally answers {string}', (_, text: string) => answers(text));
    Then('the field {string} also holds {string}', holds);
    And('the tutor says everything required is filled in', async () => {
      await waitFor(() => expect(within(helper()).getByText(/Everything required is filled in/)).toBeInTheDocument());
    });
    And('the Send button is enabled', () => {
      expect(within(sheet()).getByRole('button', { name: 'Send' })).toBeEnabled();
    });
    And('the form was not sent', () => {
      expect(fake.received.filter((r) => r.grist.kind === 'feedback')).toHaveLength(0);
    });
  });

  Scenario('A field the form does not have is not filled, and he can stop the help at any time', ({ Given, And, When, Then }) => {
    Given('the Ask for another approach sheet is open behind a fake Postern', openSheet);
    And('the tutor will answer with a value for a field the form does not have', () => {
      fake.autoReply = reply(Q_APPROACH, 'approach', [{ field: 'send', value: 'now' }]);
    });
    When('he taps "Let the tutor help me fill this in"', startHelp);
    Then('the form is unchanged', async () => {
      await tutorAsks(Q_APPROACH);
      for (const label of ['What approach, and how does it teach?', 'Who to credit', 'Link']) expect(field(label)).toHaveValue('');
      expect(within(sheet()).getByRole('button', { name: 'Send' })).toBeDisabled();
    });
    When('he stops the help', () => user.click(within(helper()).getByRole('button', { name: 'Stop helping' })));
    Then('the button "Let the tutor help me fill this in" is offered again', () => {
      expect(within(sheet()).getByRole('button', { name: START })).toBeInTheDocument();
    });
  });

  Scenario("The tutor asks one question even when the model keeps talking after it", ({ Given, And, When, Then }) => {
    Given('the Ask for another approach sheet is open behind a fake Postern', openSheet);
    And('the tutor will ask a question and then add more sentences', () => {
      fake.autoReply = reply(`${Q_CREDIT} If it's the Greek Colour Method, I can note that down for you.`, 'credit');
    });
    When('he taps "Let the tutor help me fill this in"', startHelp);
    Then('the tutor asks one question: {string}', asks);
    And("the tutor's extra sentences are not shown", () => {
      expect(within(helper()).queryByText(/Greek Colour Method/)).not.toBeInTheDocument();
    });
  });
});
