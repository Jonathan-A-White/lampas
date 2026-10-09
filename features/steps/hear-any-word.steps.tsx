// features/steps/hear-any-word.steps.tsx — runs features/hear-any-word.feature: a long press on a word of prose anywhere says it
// in its own language. Components are drawn on their own beside <HearAnyWord />; speech synthesis is the recording fake of
// tests/support/fake-speech.ts. jsdom has no layout, so the word under the finger is found through a stand-in for
// document.caretPositionFromPoint that answers with the text node and offset of the word the step names; the half second is the app's.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { About } from '../../src/About';
import { clearBus } from '../../src/events/bus';
import { Markdown } from '../../src/markdown/Markdown';
import { stopOnTap } from '../../src/speech/tutorVoice';
import { HoldBar } from '../../src/ui/HoldBar';
import { HearAnyWord } from '../../src/ui/HearAnyWord';
import { ENGLISH_VOICE, type FakeSynth, GREEK_VOICE, HEBREW_VOICE, stubSpeech } from '../../tests/support/fake-speech';

const ANSWER = [
  'In Romans 8:28 the word **ἀγαθόν** means good; the Hebrew מֶלֶךְ and צֶדֶק speak of a king and of righteousness.',
].join('\n');

let synth: FakeSynth;
const clicks = { plain: 0, link: 0, hold: 0 };

function draw(voices: typeof ENGLISH_VOICE[], page: 'answer' | 'about'): void {
  cleanup();
  vi.unstubAllGlobals();
  clearBus();
  synth = stubSpeech(voices);
  clicks.plain = clicks.link = clicks.hold = 0;
  render(
    <>
      <HearAnyWord />
      {page === 'about' ? (
        <About />
      ) : (
        <div>
          <div data-testid="answer" onClick={stopOnTap}>
            <Markdown text={ANSWER} />
          </div>
          <button type="button" onClick={() => (clicks.plain += 1)}>
            Plain button
          </button>
          <a href="#/words" onClick={() => (clicks.link += 1)}>
            A link
          </a>
          <input aria-label="A field" defaultValue="ἀγαθόν field" />
          <HoldBar hold={{ onHold: () => (clicks.hold += 1), onRelease: () => {}, onDrop: () => {} }} name="Hold bar" label="Hold bar" />
        </div>
      )}
    </>,
  );
}

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'caretPositionFromPoint');
});

const user = userEvent.setup();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const HOLD_MS = 650;

/** The text node holding `word` and the offset of its middle; the stand-in caret answers with it. */
function findWord(word: string): { node: Text; offset: number } {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const at = (n.nodeValue ?? '').indexOf(word);
    if (at >= 0 && !n.parentElement?.closest('[aria-hidden="true"]')) return { node: n as Text, offset: at + Math.floor(word.length / 2) };
  }
  throw new Error(`no "${word}" on screen`);
}

function fingerOn(word: string): HTMLElement {
  const { node, offset } = findWord(word);
  Object.defineProperty(document, 'caretPositionFromPoint', { configurable: true, value: () => ({ offsetNode: node, offset }) });
  return node.parentElement as HTMLElement;
}

async function press(el: HTMLElement, ms: number, drag = 0): Promise<void> {
  await user.pointer({ keys: '[MouseLeft>]', target: el, coords: { clientX: 100, clientY: 100 } });
  if (drag) await user.pointer({ target: el, coords: { clientX: 100 + drag, clientY: 100 } });
  await sleep(ms);
  await user.pointer({ keys: '[/MouseLeft]', target: el, coords: { clientX: 100 + drag, clientY: 100 } });
}

const feature = await loadFeature('features/hear-any-word.feature');
const ALL = [GREEK_VOICE, HEBREW_VOICE, ENGLISH_VOICE];
const spokenIn = (text: string, language: string) => {
  const tag = { greek: 'el-GR', hebrew: 'he-IL', english: 'en-US' }[language];
  expect(synth.spoken.map((u) => [u.text, u.lang])).toEqual([[text, tag]]);
};

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  const answer = ({ Given }: { Given: (t: string, f: () => void) => void }, voices = ALL, text = 'a tutor answer is on screen on a phone with Greek, Hebrew and English voices') =>
    Given(text, () => draw(voices, 'answer'));

  Scenario('A long press on a Greek word of a tutor answer says it in Greek', (s) => {
    answer(s);
    s.When('he long presses the word {string} of the answer', (_, word: string) => press(fingerOn(word), HOLD_MS));
    s.Then('the phone is told to speak {string} in {string}', (_, text: string, language: string) => spokenIn(text, language));
    s.And('the word is marked while it speaks', () => {
      // jsdom has no Custom Highlight API: the mark is a no-op there, and its proof is the Playwright spec
      expect(document.querySelector('[role="status"]')).toBeNull();
    });
    s.And('no text is selected', () => expect(window.getSelection()?.toString() ?? '').toBe(''));
  });

  Scenario('A long press on a Hebrew word of a tutor answer says it in Hebrew and does not open the guide', (s) => {
    answer(s);
    s.When('he long presses the word {string} of the answer', (_, word: string) => press(fingerOn(word), HOLD_MS));
    s.Then('the phone is told to speak {string} in {string}', (_, text: string, language: string) => spokenIn(text, language));
    s.And('no pronunciation guide is open', () => expect(screen.queryByRole('dialog')).toBeNull());
  });

  Scenario('A short tap on a Hebrew word of a tutor answer still opens the guide', (s) => {
    answer(s);
    s.When('he taps the word {string} of the answer', async (_, word: string) => {
      await user.click(fingerOn(word));
    });
    s.Then('the pronunciation guide is open', () => expect(screen.getByRole('dialog')).toBeTruthy());
  });

  Scenario('A long press on an English word of a tutor answer says it in English', (s) => {
    answer(s);
    s.When('he long presses the word {string} of the answer', (_, word: string) => press(fingerOn(word), HOLD_MS));
    s.Then('the phone is told to speak {string} in {string}', (_, text: string, language: string) => spokenIn(text, language));
  });

  Scenario('A long press on a word of the About page says it in English', ({ Given, When, Then }) => {
    Given('the About page is on screen on a phone with Greek, Hebrew and English voices', () => draw(ALL, 'about'));
    When('he long presses the word {string} of the page', (_, word: string) => press(fingerOn(word), HOLD_MS));
    Then('the phone is told to speak {string} in {string}', (_, text: string, language: string) => spokenIn(text, language));
  });

  Scenario("The click that ends a long press does not reach the answer's own tap, which would stop the speech", (s) => {
    answer(s);
    s.When('he long presses the word {string} of the answer', (_, word: string) => press(fingerOn(word), HOLD_MS));
    s.Then('the phone is told to speak {string} in {string}', (_, text: string, language: string) => spokenIn(text, language));
    s.And('the speech was not cancelled after it began', () => {
      expect(synth.calls[synth.calls.length - 1]).toMatch(/^speak /);
    });
  });

  Scenario('A press shorter than half a second says nothing', (s) => {
    answer(s);
    s.When('he presses the word {string} of the answer for {int} ms', (_, word: string, ms: number) => press(fingerOn(word), ms));
    s.Then('nothing is spoken', () => expect(synth.spoken).toHaveLength(0));
  });

  Scenario('A press that moves more than 10 px says nothing', (s) => {
    answer(s);
    s.When('he presses the word {string} of the answer and drags {int} px before the half second is up', (_, word: string, px: number) =>
      press(fingerOn(word), HOLD_MS, px),
    );
    s.Then('nothing is spoken', () => expect(synth.spoken).toHaveLength(0));
  });

  Scenario('A long press on a number or a mark says nothing', (s) => {
    answer(s);
    s.When('he long presses the word {string} of the answer', (_, word: string) => press(fingerOn(word), HOLD_MS));
    s.Then('nothing is spoken', () => expect(synth.spoken).toHaveLength(0));
  });

  Scenario('A long press on a Greek word with no Greek voice on the phone says so instead of speaking', ({ Given, When, Then, And }) => {
    Given('a tutor answer is on screen on a phone with only an English voice', () => draw([ENGLISH_VOICE], 'answer'));
    When('he long presses the word {string} of the answer', (_, word: string) => press(fingerOn(word), HOLD_MS));
    Then('nothing is spoken', () => expect(synth.spoken).toHaveLength(0));
    And('the notice {string} is shown', (_, text: string) => expect(screen.getByRole('status').textContent).toContain(text));
  });

  ScenarioOutline('A long press on a control with a press of its own is left to it', ({ Given, When, Then }, row: { control: string }) => {
    Given('a tutor answer is on screen on a phone with Greek, Hebrew and English voices', () => draw(ALL, 'answer'));
    When('he long presses the <control> beside the answer', async () => {
      const el =
        row.control === 'button'
          ? screen.getByRole('button', { name: 'Plain button' })
          : row.control === 'link'
            ? screen.getByRole('link', { name: 'A link' })
            : row.control === 'field'
              ? screen.getByLabelText('A field')
              : screen.getByRole('button', { name: 'Hold bar' });
      // a caret that points into the control's own text: were it asked, it would find a word
      const node = (el.firstChild?.nodeType === 3 ? el.firstChild : document.createTextNode('ἀγαθόν')) as Text;
      Object.defineProperty(document, 'caretPositionFromPoint', { configurable: true, value: () => ({ offsetNode: node, offset: 1 }) });
      await press(el, HOLD_MS);
    });
    Then('nothing is spoken', () => expect(synth.spoken).toHaveLength(0));
  });
});
