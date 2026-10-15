// features/steps/bible-talk/answer.steps.tsx — runs the @answer scenarios of features/bible-talk.feature:
// how an answer shows (Markdown, raw HTML, Greek), is read aloud and is copied, and how his own
// turn shows.
// The fake Postern and the page are shared with the other bible-talk step files through ./support, which ends every scenario clean.
import '@testing-library/react/dont-cleanup-after-each';
import { act, waitFor, within } from '@testing-library/react';
import { expect } from 'vitest';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { db } from '../../../src/data/db';
import { exchangeMarkdown } from '../../../tests/support/exchange';
import { type FakePostern, TALK_ANSWER } from '../../../tests/support/fake-postern';
import { type FakeSynth } from '../../../tests/support/fake-speech';
import { answerShowsUnderQuestion, clipboard, endScenario, fake, open, openTalk, selectVerse28, send, sendAndWait, sheet, spokenAt, synth, turns, turnsKept, user } from './support';

const ORDINALS = ['first', 'second'];
const turn = (ordinal: string): HTMLElement => turns()[ORDINALS.indexOf(ordinal)];
const copyButton = (ordinal: string) => within(turn(ordinal)).getByRole('button', { name: 'Copy this exchange' });
const copyQuestion = (within_: HTMLElement) => within(within_).getByRole('button', { name: 'Copy my question' });
const pending = (): HTMLElement => sheet().querySelector<HTMLElement>('[data-talk-pending]') as HTMLElement;
/** The question still on its way (or failed), drawn a moment after the send. */
const unsentQuestion = async (): Promise<HTMLElement> => {
  await waitFor(() => expect(sheet().querySelector('[data-talk-pending]')).not.toBeNull());
  return pending();
};
const MARKDOWN_ANSWER = [
  "The word you're after is **parsing**, a *grammar* habit with συνεργεῖ.",
  '',
  '- find the verb',
  '- name its tense',
  '',
  '1. read the Greek',
  '2. say the parsing',
  '',
  '## A heading',
].join('\n');
/** The mill's answer when it has put what he said into clean words: punctuation, capitals, no ums (grinds/bible-talk.answer.schema.json `question`). */
const cleaning = (f: FakePostern): void =>
  void (f.autoReply = { status: 'answered', answer: { answer: TALK_ANSWER.answer, words: [], question: 'Why are there italic words? What does it mean for the words to be italic?' } });
const markdownAnswer = (f: FakePostern): void => void (f.autoReply = { status: 'answered', answer: { answer: MARKDOWN_ANSWER, words: [] } });
const htmlAnswer = (f: FakePostern): void =>
  void (f.autoReply = { status: 'answered', answer: { answer: 'Here it is: <img src=x onerror=alert(1)>', words: [] } });
const answerBox = (): HTMLElement => {
  const box = sheet().querySelector<HTMLElement>('[data-talk-a]');
  if (!box) throw new Error('no answer yet');
  return box;
};

const feature = await loadFeature('features/bible-talk.feature');

describeFeature(
  feature,
  ({ Scenario, AfterEachScenario }) => {
    AfterEachScenario(endScenario);
    Scenario('The answer shows in the sheet and is read aloud', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern and a phone that speaks English and Greek', () => open(undefined, true));
      And('he selects verse 28', selectVerse28);
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the answer shows in the sheet under his question', answerShowsUnderQuestion);
      And('the answer is read aloud, its Greek word in Greek and the rest in English', async () => {
        const engine = synth as FakeSynth;
        const first = await spokenAt(engine, 0);
        expect(first.lang).toBe('en-US');
        expect(first.text).toBe('In this verse');
        act(() => engine.finish());
        const second = await spokenAt(engine, 1);
        expect(second.lang).toBe('el-GR');
        expect(second.text).toBe('συνεργεῖ');
        act(() => engine.finish());
        const third = await spokenAt(engine, 2);
        expect(third.lang).toBe('en-US');
        expect(third.text).toContain('means "works together"');
      });
      // the answer's own speaker (the speaking bar below the answers has a Stop of its own)
      When('he taps Stop on the answer', () => user.click(within(turns()[0]).getByRole('button', { name: 'Stop reading' })));
      Then('the reading stops and the answer can be heard again', async () => {
        const engine = synth as FakeSynth;
        expect(engine.calls[engine.calls.length - 1]).toBe('cancel');
        expect(engine.speaking).toBe(false);
        await waitFor(() => expect(within(turns()[0]).getByRole('button', { name: 'Read aloud' })).toBeInTheDocument());
      });
    });

    Scenario("The tutor's Markdown shows as bold, italics and lists, with no marks left", ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers in Markdown', () => open(markdownAnswer));
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the answer shows {string} in bold and {string} in italics', async (_, bold: string, italic: string) => {
        await waitFor(() => {
          expect(answerBox().querySelector('strong')?.textContent).toBe(bold);
          expect(answerBox().querySelector('em')?.textContent).toBe(italic);
        });
      });
      And('the answer shows a bulleted list of {int} items and a numbered list of {int} items', (_, bullets: number, numbers: number) =>
        waitFor(() => {
          expect(answerBox().querySelectorAll('ul > li')).toHaveLength(bullets);
          expect(answerBox().querySelectorAll('ol > li')).toHaveLength(numbers);
        }),
      );
      And('the answer shows no stars and no hashes', () => {
        expect(answerBox().textContent).not.toMatch(/[*#]/);
      });
    });

    Scenario('Raw HTML in an answer is shown as text and never rendered', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with raw HTML', () => open(htmlAnswer));
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the answer shows the text {string}', async (_, text: string) => {
        await waitFor(() => expect(answerBox()).toHaveTextContent(text));
      });
      And('the answer holds no image', () => {
        expect(answerBox().querySelector('img')).toBeNull();
      });
    });

    Scenario("Greek in a rendered answer keeps the sheet's type", ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers in Markdown', () => open(markdownAnswer));
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the Greek word {string} in the answer is as large as the rest of the answer', async (_, word: string) => {
        await waitFor(() => expect(answerBox()).toHaveTextContent(word));
        // The Greek sits in the answer's own text: no wrapper that changes its size (a colour class such as text-accent does not), so it has the answer's text-lg.
        const holder = Array.from(answerBox().querySelectorAll('p')).find((p) => p.textContent?.includes(word));
        expect(holder?.closest('[data-answer-text]')?.className).toContain('text-lg');
        const sizes = Array.from(holder?.querySelectorAll('*') ?? []).flatMap((el) => Array.from(el.classList)).filter((c) => /^text-(xs|sm|base|lg|xl|\dxl)$/.test(c));
        expect(sizes).toEqual([]);
      });
    });

    Scenario('An answer in Markdown is read aloud without its marks', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers in Markdown and a phone that speaks English and Greek', () =>
        open(markdownAnswer, true),
      );
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the answer is read aloud with no stars, hashes or list marks', async () => {
        const engine = synth as FakeSynth;
        const spoken: string[] = [];
        // One part ends and the next starts in the same tick (readAloud.ts readRun): when nothing is speaking after an end, the answer is over.
        for (let i = 0; i < 6; i++) {
          spoken.push((await spokenAt(engine, i)).text);
          act(() => engine.finish());
          if (!engine.speaking) break;
        }
        const all = spoken.join(' ');
        expect(all).toContain('parsing');
        expect(all).not.toMatch(/[*#]|^- /m);
      });
    });

    Scenario('His own turn stays plain text', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('his question shows as {string} with its stars', async (_, question: string) => {
        await turnsKept(1);
        const q = sheet().querySelector('[data-talk-q]');
        expect(q?.textContent).toBe(question);
        expect(q?.querySelector('strong')).toBeNull();
      });
    });

    Scenario('What he said is shown back cleaned up, and the raw words stay kept', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern whose answers clean up his question', () => open(cleaning));
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('his turn shows {string}', async (_, shown: string) => {
        await turnsKept(1);
        expect(sheet().querySelector('[data-talk-q]')?.textContent).toBe(shown);
      });
      And('the turn kept on the phone has his raw words {string}', async (_, raw: string) => {
        const kept = await db.talks.toArray();
        expect(kept).toHaveLength(1);
        expect(kept[0].q).toBe(raw);
      });
    });

    Scenario('An answer with no cleaned question shows his raw words', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('his turn shows {string}', async (_, shown: string) => {
        await turnsKept(1);
        expect(sheet().querySelector('[data-talk-q]')?.textContent).toBe(shown);
      });
    });

    Scenario('Copy on a turn puts the exchange on the clipboard as Markdown', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern whose answers clean up his question', () => open(cleaning));
      And('he selects verse 28', selectVerse28);
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => sendAndWait(question));
      And('he taps Copy on the {word} turn', (_, ordinal: string) => user.click(copyButton(ordinal)));
      Then('the clipboard holds the Markdown of {string} asking {string} answered by the talk', (_, reference: string, question: string) => {
        expect(clipboard.copied).toEqual([exchangeMarkdown(reference, question, TALK_ANSWER.answer)]);
      });
      And('the {word} turn says {string}', async (_, ordinal: string, text: string) => {
        await waitFor(() => expect(within(turn(ordinal)).getByRole('status')).toHaveTextContent(text));
      });
    });

    Scenario("A talk about the chapter copies the chapter's link", ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => sendAndWait(question));
      And('he taps Copy on the {word} turn', (_, ordinal: string) => user.click(copyButton(ordinal)));
      Then('the clipboard holds the Markdown of {string} asking {string} answered by the talk', (_, reference: string, question: string) => {
        expect(clipboard.copied).toEqual([exchangeMarkdown(reference, question, TALK_ANSWER.answer)]);
      });
    });

    Scenario('With several turns in the sheet each Copy copies only its own', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
      And('he selects verse 28', selectVerse28);
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => sendAndWait(question));
      And('the talk will answer {string}', (_, answer: string) => {
        fake.autoReply = { status: 'answered', answer: { ...TALK_ANSWER, answer } };
      });
      And('he then sends {string}', (_, question: string) => sendAndWait(question));
      And('he taps Copy on the {word} turn', (_, ordinal: string) => user.click(copyButton(ordinal)));
      Then('the clipboard holds the Markdown of {string} asking {string} answered {string}', (_, reference: string, question: string, answer: string) => {
        expect(clipboard.copied).toEqual([exchangeMarkdown(reference, question, answer)]);
      });
      And('the {word} turn does not say {string}', (_, ordinal: string, text: string) => {
        expect(turn(ordinal)).not.toHaveTextContent(text);
      });
      When('he taps Copy on the {word} turn again', (_, ordinal: string) => user.click(copyButton(ordinal)));
      Then('the clipboard then holds the Markdown of {string} asking {string} answered by the talk', (_, reference: string, question: string) => {
        expect(clipboard.copied.slice(-1)).toEqual([exchangeMarkdown(reference, question, TALK_ANSWER.answer)]);
      });
    });

    Scenario('Under his own turn a Copy puts exactly what he said on the clipboard', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern whose answers clean up his question', () => open(cleaning));
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => sendAndWait(question));
      And('he taps Copy under the {word} question', (_, ordinal: string) => user.click(copyQuestion(turn(ordinal))));
      Then('the clipboard holds {string}', (_, text: string) => {
        expect(clipboard.copied).toEqual([text]);
      });
      And('the {word} question says {string}', async (_, ordinal: string, text: string) => {
        await waitFor(() => expect(within(turn(ordinal)).getByRole('status')).toHaveTextContent(text));
      });
    });

    Scenario('A question that could not be sent has a Copy beside the failure', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that cannot be reached', () =>
        open((f) => {
          f.autoReply = { status: 'answered', answer: TALK_ANSWER };
          f.down = true;
        }),
      );
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      Then('the sheet says {string} with a Retry button', async (_, words: string) => {
        expect(await within(sheet()).findByRole('alert')).toHaveTextContent(words);
        expect(within(sheet()).getByRole('button', { name: 'Retry' })).toBeEnabled();
      });
      When('he taps Copy under the unsent question', async () => user.click(copyQuestion(await unsentQuestion())));
      Then('the clipboard holds {string}', (_, text: string) => {
        expect(clipboard.copied).toEqual([text]);
      });
      And('the unsent question says {string}', async (_, text: string) => {
        await waitFor(() => expect(within(pending()).getByRole('status')).toHaveTextContent(text));
      });
    });

    Scenario('A question the tutor has not answered yet can be copied', ({ Given, And, When, Then }) => {
      Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that holds its answers', () => open((f) => void (f.autoReply = undefined)));
      And('he opens Talk', openTalk);
      When('he sends {string}', (_, question: string) => send(question));
      And('he taps Copy under the unsent question', async () => user.click(copyQuestion(await unsentQuestion())));
      Then('the clipboard holds {string}', (_, text: string) => {
        expect(clipboard.copied).toEqual([text]);
      });
      // the question shows as pending before the request is built and sent: on a loaded host the grist is not at the mill yet, and the fake's answer waits for it
      When('the tutor answers', () => fake.answer({ status: 'answered', answer: TALK_ANSWER }));
      Then('the answer shows in the sheet under his question', answerShowsUnderQuestion);
    });
  },
  { includeTags: ['answer'] },
);
