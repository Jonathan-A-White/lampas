// features/steps/hebrew-talk.steps.tsx — runs features/hebrew-talk.feature: the Bible talk on Jonah 1 and Genesis 1 (the copies of the built chapters in tests/fixtures/data) sends a fake Postern's mill the
// verses' Hebrew under `hebrew` with `hebrew_words` and no Greek, from the Hebrew dial's Curious up, and the English alone at Just English; a Hebrew word of the answer's `words` is drawn right to left and
// opens its word sheet (mw-gdcyf98.18). A Greek chapter's talk is as it was.
import '@testing-library/react/dont-cleanup-after-each';
import { screen, waitFor, within } from '@testing-library/react';
import { expect } from 'vitest';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { type Chapter, markSupplied } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { hebrewPointedForm } from '../../src/speech/hebrewPronunciation';
import { TALK_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { endScenario, fake, open, received, send, sheet, user } from './bible-talk/support';

const load = (rel: string) => JSON.parse(readFileSync(rel, 'utf8')) as Chapter;
const jonah = load('tests/fixtures/data/jon/1.json');
const genesis = load('tests/fixtures/data/gen/1.json');
const rom8 = load('public/data/rom/8.json');
const verseOf = (chapter: Chapter, n: number) => {
  const v = chapter.verses.find((x) => x.n === n);
  if (!v) throw new Error(`no verse ${n}`);
  return v;
};
const CANTILLATION = /[֑-֯]/;
const PLACES: Record<string, string> = { 'Jonah 1': '#/?b=jon&c=1', 'Genesis 1': '#/?b=gen&c=1', 'Romans 8': '' };
const LEVELS: Record<string, string> = { Curious: '1', 'Just English': '0' };
const WORD_ANSWER = {
  answer: 'The word here is דָּבָר, "word": דְּבַר־ is its construct form, the word of the LORD.',
  words: [{ greek: 'דְּבַר־', lemma: 'דָּבָר', note: 'noun, masculine singular construct', language: 'he' }],
};

const opened = (place: string, level: string, answer: unknown = TALK_ANSWER) => async (): Promise<void> => {
  await open((f: FakePostern) => void (f.autoReply = { status: 'answered', answer }), false, PLACES[place]);
  await db.settings.put({ key: 'hebrewInterest', value: LEVELS[level] });
};
const input = () => {
  expect(fake.received).toHaveLength(1);
  return received(0).input;
};

const feature = await loadFeature('features/hebrew-talk.feature');

describeFeature(
  feature,
  ({ Scenario, AfterEachScenario }) => {
    AfterEachScenario(endScenario);

    const talkAbout = async (_: unknown, n: number, name: string): Promise<void> => {
      await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
      const view = await screen.findByRole('region', { name: 'Verse view' });
      await user.click(within(view).getByRole('button', { name: 'Ask the tutor', exact: true }));
      await user.click(await within(view).findByRole('button', { name, exact: true }));
      await within(await screen.findByRole('dialog', { name: /^Talk about / })).findByRole('textbox', { name: 'Your message' });
    };
    const sends = (_: unknown, question: string) => send(question);
    const titled = (_: unknown, title: string) => expect(sheet()).toHaveAccessibleName(title);
    const hasGrist = async (_: unknown, reference: string): Promise<void> => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(received(0).grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
      expect(input().reference).toBe(reference);
    };
    const hebrewOf = (chapter: Chapter, ns: number[]) => ns.map((n) => verseOf(chapter, n).g.map((w) => hebrewPointedForm(w.t)).join(' ')).join(' ');
    const dial = (_: unknown, name: string) => {
      const level = Number(LEVELS[name]);
      expect(input().hebrew_interest).toMatchObject({ level, name });
    };

    Scenario('Talk about verse 1 on Jonah 1 sends the Hebrew and its words and no Greek', ({ Given, When, Then, And }) => {
      Given('Lampas is opened on Jonah 1 with the Hebrew dial at Curious and a talk behind a fake Postern', opened('Jonah 1', 'Curious'));
      When('he taps the number of verse {int} and chooses {string}', talkAbout);
      Then('the sheet is titled {string}', titled);
      When('he sends {string}', sends);
      Then('the mill received one bible-talk grist whose input carries the reference {string}, the English of verse 1 and no Greek', async (_, reference: string) => {
        await hasGrist(_, reference);
        expect(input().english).toBe(verseOf(jonah, 1).e.map(markSupplied).join(' '));
        expect(input().verses).toBe('1:1');
        expect('greek' in input()).toBe(false);
        expect('greek_words' in input()).toBe(false);
      });
      And('its input carries the verse in Hebrew, pointed, with no cantillation, under hebrew', () => {
        expect(input().hebrew).toBe(hebrewOf(jonah, [1]));
        expect(String(input().hebrew)).not.toMatch(CANTILLATION);
      });
      And('its input carries the Hebrew word {string} with the lemma {string}, the gloss {string}, its transliteration and its parsing in plain words', (_, form: string, lemma: string, gloss: string) => {
        const words = input().hebrew_words as { form: string; lemma: string; gloss: string; translit: string; parse: string }[];
        expect(words.find((w) => w.form === form)).toMatchObject({ lemma, gloss, translit: 'də·ḇar-', parse: 'Noun - masculine singular construct' });
      });
      And('its input tells the tutor the Hebrew dial is at {string}', dial);
    });

    Scenario("The chapter talk on Genesis 1 sends the first verses' Hebrew and its words", ({ Given, When, And, Then }) => {
      Given('Lampas is opened on Genesis 1 with the Hebrew dial at Curious and a talk behind a fake Postern', opened('Genesis 1', 'Curious'));
      When('he opens Talk from the Talk bar', async () => {
        const bar = await waitFor(() => {
          const found = document.querySelector<HTMLElement>('[data-talk-bar]');
          if (!found) throw new Error('the Talk bar is not drawn yet');
          return found;
        });
        await user.click(await within(bar).findByRole('button', { name: 'Talk' }));
        await within(await screen.findByRole('dialog', { name: 'Talk about Genesis 1' })).findByRole('textbox', { name: 'Your message' });
      });
      And('he sends {string}', sends);
      Then('the mill received one bible-talk grist whose input carries the reference {string} and no Greek', async (_, reference: string) => {
        await hasGrist(_, reference);
        expect('greek' in input()).toBe(false);
        expect('greek_words' in input()).toBe(false);
      });
      And('its input carries the verses {string} in Hebrew, pointed, with Hebrew words', (_, verses: string) => {
        expect(input().verses).toBe(verses);
        expect(input().hebrew).toBe(hebrewOf(genesis, [1, 2, 3]));
        expect(String(input().hebrew)).not.toMatch(CANTILLATION);
        expect((input().hebrew_words as unknown[]).length).toBeGreaterThan(0);
      });
    });

    Scenario("The answer's Hebrew word is drawn right to left and opens its word sheet", ({ Given, When, And, Then }) => {
      Given('Lampas is opened on Jonah 1 with the Hebrew dial at Curious and a talk whose answer explains the Hebrew word {string}', () => opened('Jonah 1', 'Curious', WORD_ANSWER)());
      When('he taps the number of verse {int} and chooses {string}', talkAbout);
      And('he sends {string}', sends);
      Then('the answer lists the Hebrew word {string} with the lemma {string}, right to left in the Hebrew face', async (_, form: string, lemma: string) => {
        const list = await waitFor(() => {
          const found = sheet().querySelector<HTMLElement>('[data-talk-words]');
          if (!found) throw new Error('the answer has not arrived');
          return found;
        });
        const word = within(list).getByRole('button', { name: form });
        expect(word.getAttribute('lang')).toBe('he');
        expect(word.getAttribute('dir')).toBe('rtl');
        expect(word.classList.contains('script-he')).toBe(true);
        const lemmaSpan = [...list.querySelectorAll<HTMLElement>('[lang="he"]')].find((el) => el.textContent === lemma);
        expect(lemmaSpan, lemma).toBeDefined();
        expect(lemmaSpan?.getAttribute('dir')).toBe('rtl');
        expect(lemmaSpan?.classList.contains('script-he')).toBe(true);
      });
      When('he taps the Hebrew word {string} of the answer', async (_, form: string) => {
        await user.click(within(sheet().querySelector<HTMLElement>('[data-talk-words]')!).getByRole('button', { name: form }));
      });
      Then('the word sheet opens on the Hebrew word {string}', async (_, form: string) => {
        const dialog = await screen.findByRole('dialog', { name: 'Word' });
        expect(dialog).toHaveTextContent(form);
      });
    });

    Scenario('A talk on a Greek chapter is as it was', ({ Given, When, And, Then }) => {
      Given('Lampas is opened on Romans 8 with the Hebrew dial at Curious and a talk behind a fake Postern', opened('Romans 8', 'Curious'));
      When('he taps the number of verse {int} and chooses {string}', talkAbout);
      And('he sends {string}', sends);
      Then('the mill received one bible-talk grist whose input carries the Greek of verse 28 with Greek words and no Hebrew', async () => {
        await waitFor(() => expect(fake.received).toHaveLength(1));
        expect(input().greek).toBe(verseOf(rom8, 28).g.map((w) => w.t).join(' '));
        expect((input().greek_words as unknown[]).length).toBeGreaterThan(0);
        expect('hebrew' in input() || 'hebrew_words' in input()).toBe(false);
      });
    });

    Scenario('At Hebrew 0 the talk on Jonah 1 sends the English alone and tells the tutor the dial', ({ Given, When, And, Then }) => {
      Given('Lampas is opened on Jonah 1 with the Hebrew dial at Just English and a talk behind a fake Postern', opened('Jonah 1', 'Just English'));
      When('he taps the number of verse {int} and chooses {string}', talkAbout);
      And('he sends {string}', sends);
      Then('the mill received one bible-talk grist whose input carries the reference {string}, the English of verse 1 and no Greek', async (_, reference: string) => {
        await hasGrist(_, reference);
        expect(input().english).toBe(verseOf(jonah, 1).e.map(markSupplied).join(' '));
        expect('greek' in input()).toBe(false);
      });
      And('its input has no Hebrew and no Hebrew words', () => {
        expect('hebrew' in input() || 'hebrew_words' in input()).toBe(false);
      });
      And('its input tells the tutor the Hebrew dial is at {string}', dial);
    });
  },
);
