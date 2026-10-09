// features/steps/ask-approach.steps.tsx — runs features/ask-approach.feature: Settings > Grammar approach > Ask for another approach,
// the sheet that sends a 'feedback' grist (grinds/feedback.json) with pictures to the mill, proven against the fake Postern. The
// canvas is replaced through the image seam (src/images/shrink.ts): jsdom has none.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus, latest } from '../../src/events/bus';
import { imageSeam } from '../../src/images/shrink';
import { MAX_PICTURES } from '../../src/services/feedback';
import { tutorTimings } from '../../src/services/tutor';
import { SettingsScreen } from '../../src/SettingsScreen';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const realSeam = { ...imageSeam };
let fake: FakePostern;
let picture = 0;

afterAll(() => {
  cleanup();
  clearBus();
  Object.assign(imageSeam, realSeam);
  vi.unstubAllGlobals();
  db.close();
});

const APPROACH = 'Teach the cases with colours, one at a time.';
const BUTTON = 'Ask for another approach';
const sheet = () => screen.getByRole('dialog', { name: BUTTON });
const send = () => within(sheet()).getByRole('button', { name: 'Send' });
const textField = () => within(sheet()).getByRole('textbox', { name: 'What approach, and how does it teach?' });
const pictureRows = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-picture]'));

async function openSettings(): Promise<void> {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/settings');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { status: 'sent' } };
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : Promise.resolve(new Response('{}', { status: 404 })),
  );
  // The canvas: every picture is 4000x3000 and comes out as a 120 KB JPEG.
  imageSeam.decode = async () => ({ width: 4000, height: 3000, source: null });
  imageSeam.encode = async () => new Blob([new Uint8Array(120_000).fill(7)], { type: 'image/jpeg' });
  picture = 0;
  await db.open();
  await db.settings.clear();
  render(<SettingsScreen />);
  await screen.findByRole('radiogroup', { name: 'Grammar approach' });
}

async function openSheet(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: BUTTON }));
  await screen.findByRole('dialog', { name: BUTTON });
}

async function addPictures(count: number): Promise<void> {
  const files = Array.from({ length: count }, () => new File([new Uint8Array(2_000_000)], `shot-${++picture}.png`, { type: 'image/png' }));
  await user.upload(within(sheet()).getByLabelText('Add a screenshot or photo'), files);
}

const fillText = (text = APPROACH) => user.type(textField(), text);
const fillName = (name = 'Anna Example') => user.type(within(sheet()).getByRole('textbox', { name: 'Who to credit' }), name);
const fillLink = (link = 'https://example.org/greek') => user.type(within(sheet()).getByRole('textbox', { name: 'Link' }), link);

async function filledIn(): Promise<void> {
  await openSettings();
  await openSheet();
  await fillText();
  await fillName();
}

const feature = await loadFeature('features/ask-approach.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Ask for another approach at the end of Settings > Grammar approach opens the sheet', ({ Given, Then, When, And }) => {
    Given('Settings is open behind a fake Postern', openSettings);
    Then('Ask for another approach is the last control of the Grammar approach section', () => {
      const section = screen.getByRole('heading', { name: 'Grammar approach', level: 2 }).closest('section') as HTMLElement;
      const controls = Array.from(section.querySelectorAll<HTMLElement>('button, a, input, select, textarea'));
      expect(controls.at(-1)).toHaveTextContent(BUTTON);
    });
    When('he taps Ask for another approach', openSheet);
    Then('the sheet "Ask for another approach" is open with its three fields and Send', () => {
      expect(textField()).toBeInTheDocument();
      expect(within(sheet()).getByLabelText('Add a screenshot or photo')).toHaveAttribute('accept', 'image/*');
      expect(within(sheet()).getByRole('textbox', { name: 'Who to credit' })).toBeInTheDocument();
      expect(within(sheet()).getByRole('textbox', { name: 'Link' })).toBeInTheDocument();
      expect(send()).toBeInTheDocument();
    });
    And('the Send button is disabled', () => {
      expect(send()).toBeDisabled();
    });
  });

  Scenario('Send is disabled until the text and the credit are filled', ({ Given, When, Then }) => {
    Given('the Ask for another approach sheet is open', async () => {
      await openSettings();
      await openSheet();
    });
    When('he types the approach {string}', (_, text: string) => fillText(text));
    Then('the Send button is disabled', () => {
      expect(send()).toBeDisabled();
    });
    When('he types the credit name {string}', (_, name: string) => fillName(name));
    Then('the Send button is enabled', () => {
      expect(send()).toBeEnabled();
    });
  });

  Scenario('Sending with two pictures posts one grist for the lampas app, kind feedback, with two image attachments', ({ Given, And, When, Then }) => {
    Given('the Ask for another approach sheet is open', async () => {
      await openSettings();
      await openSheet();
    });
    And('he adds two pictures', () => addPictures(2));
    And('he types the approach {string}', (_, text: string) => fillText(text));
    And('he types the credit name {string}', (_, name: string) => fillName(name));
    And('he types the credit link {string}', (_, link: string) => fillLink(link));
    When('he taps Send', async () => {
      await waitFor(() => expect(pictureRows()).toHaveLength(2));
      await user.click(send());
    });
    Then('the mill received one grist for the lampas app of the kind feedback', async () => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind: 'feedback', v: '1' });
    });
    And('its input has kind grammar-approach, the text, the credit name and link and the app version', () => {
      expect(fake.received[0].input).toEqual({
        kind: 'grammar-approach',
        text: APPROACH,
        credit: { name: 'Anna Example', url: 'https://example.org/greek' },
        app_version: __APP_VERSION__,
      });
    });
    And('it carries two image attachments, each shrunk and under 300 KB', () => {
      const files = fake.received[0].attachments;
      expect(files).toHaveLength(2);
      for (const file of files) {
        expect(file.mime).toBe('image/jpeg');
        expect(file.name).toMatch(/\.jpg$/);
      }
      expect(fake.blobs).toHaveLength(2);
      for (const blob of fake.blobs) expect(blob.size).toBeLessThan(300 * 1024 + 200);
    });
    And('the bus has heard feedback-sent for grammar-approach', async () => {
      await waitFor(() => expect(latest('feedback-sent')).toEqual({ kind: 'feedback-sent', feedback: 'grammar-approach' }));
    });
  });

  Scenario('The mill\'s forward answer {"status":"sent"} shows Sent: the factory has it, not the could-not-read line', ({ Given, When, Then, And }) => {
    Given('the Ask for another approach sheet is filled in and the mill answers {"status":"sent"}', filledIn);
    When('he taps Send', async () => {
      await user.click(send());
    });
    Then('the sheet shows {string}', async (_, line: string) => {
      expect(await within(sheet()).findByText(line)).toBeInTheDocument();
    });
    And('the sheet does not show {string}', (_, line: string) => {
      expect(within(sheet()).queryByText(new RegExp(line))).toBeNull();
    });
    And('Done closes the sheet', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: BUTTON })).toBeNull());
    });
  });

  Scenario('A mill that is down shows Could not reach the tutor and Retry', ({ Given, When, Then }) => {
    Given('the Ask for another approach sheet is filled in and the mill is down', async () => {
      await filledIn();
      fake.down = true;
    });
    When('he taps Send', async () => {
      await user.click(send());
    });
    Then('the sheet shows {string} and a Retry button', async (_, title: string) => {
      expect(await within(sheet()).findByText(title)).toBeInTheDocument();
      expect(within(sheet()).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
    When('the mill is back and he taps Retry', async () => {
      fake.down = false;
      await user.click(within(sheet()).getByRole('button', { name: 'Retry' }));
    });
    Then('the sheet shows {string}', async (_, line: string) => {
      expect(await within(sheet()).findByText(line)).toBeInTheDocument();
    });
  });

  Scenario('A fifth picture is refused with a line saying four at most', ({ Given, And, When, Then }) => {
    expect(MAX_PICTURES).toBe(4);
    Given('the Ask for another approach sheet is open', async () => {
      await openSettings();
      await openSheet();
    });
    And('he adds four pictures', async () => {
      await addPictures(4);
      await waitFor(() => expect(pictureRows()).toHaveLength(4));
    });
    When('he adds one more picture', () => addPictures(1));
    Then('the sheet says {string}', async (_, line: string) => {
      expect(await within(sheet()).findByText(new RegExp(line))).toBeInTheDocument();
    });
    And('four pictures are listed', () => {
      expect(pictureRows()).toHaveLength(4);
    });
    When('he removes the first picture', async () => {
      await user.click(within(pictureRows()[0]).getByRole('button', { name: /^Remove/ }));
    });
    Then('three pictures are listed', async () => {
      await waitFor(() => expect(pictureRows()).toHaveLength(3));
    });
  });
});

