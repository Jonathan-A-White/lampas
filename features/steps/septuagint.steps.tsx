// features/steps/septuagint.steps.tsx — runs features/septuagint.feature: the Reader reads an Old Testament book in the Septuagint (mw-u2w5klk.11). The chapters are the fixtures in
// tests/fixtures/data-lxx (Genesis 1 and Greek Psalm 22, built by scripts/data-build-lxx.ts); Genesis 1 in the Hebrew is tests/fixtures/data/gen/1.json; Isaiah is not in the Septuagint's index.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { loadChapter, type Chapter } from '../../src/data/chapter';
import { alignChapter } from '../../scripts/lxx/align';
import { LADDER } from '../../src/data/grammar/ladder';
import { buildTapForm } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';
import { setResourceOn } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { asSpoken } from '../../tests/support/lone-word';
import { GRAMMAR_HELP_ANSWER, makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';

const GENESIS_GREEK_DIAGRAM = (JSON.parse(readFileSync('tests/fixtures/diagrams/gen-1-1-septuagint.json', 'utf8')) as { diagram: unknown }).diagram;
const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern | undefined;
let synth: FakeSynth | undefined;

afterAll(async () => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  await usageWritesSettled();
  db.close();
});

const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** What else a scenario's phone has: the Strong's study resource on, a Greek voice, a tutor behind a fake Postern (a licensed phone). */
interface Extras {
  strongs?: boolean;
  speech?: boolean;
  tutor?: boolean;
  /** the tutor answers the sentence-diagram grind with Genesis 1:1 drawn from Swete's Greek (tests/fixtures/diagrams/gen-1-1-septuagint.json) */
  diagram?: boolean;
  /** open the app at this hash route instead of the chapter, and seed the schedule row of a memorized verse first: its id, step */
  memorize?: { id: string; step: number };
  /** the Septuagint's Genesis 1 is the one `lxx:ship` writes, its English cut into chunks aligned to the Greek words (scripts/lxx/align.ts), where the fixture holds one chunk a verse */
  aligned?: boolean;
  /** lemmas he has solid */
  solid?: string[];
  /** a tutor behind the fake Postern that explains these words (a TalkAnswer's `words`) in answer to whatever is asked */
  explains?: { greek: string; lemma: string; note: string }[];
  /** every word of Genesis 1 with this lemma is a guess (y 'g'), so the chapter has the lemma only as guessed words */
  guessed?: string;
}

/** Opens the app on a chapter (the address names it) with the Septuagint set as given and these settings saved. */
async function openOn(title: string, septuagint: 'on' | 'off', settings: Record<string, string> = {}, extras: Extras = {}): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('data-theme');
  synth = extras.speech ? stubSpeech([GREEK_VOICE, ENGLISH_VOICE]) : undefined;
  fake = undefined;
  stubChapterFetch();
  if (extras.tutor) {
    localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
    tutorTimings.pollMs = 20;
    const postern = makeFakePostern();
    postern.autoReply = { status: 'answered', answer: extras.explains ? { answer: 'These are the words.', words: extras.explains } : GRAMMAR_HELP_ANSWER };
    if (extras.diagram) postern.replyFor = (_input, kind) => (kind === 'sentence-diagram' ? { status: 'answered', answer: GENESIS_GREEK_DIAGRAM } : undefined);
    fake = postern;
    const chapterFetch = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? postern.fetch(input, init) : chapterFetch(input, init)));
  }
  if (extras.aligned) {
    const chapterFetch = globalThis.fetch;
    const lexicon = JSON.parse(readFileSync('tests/fixtures/data-lxx/lexicon-grc-lxx.json', 'utf8')) as Record<string, { g?: string }>;
    const gen1 = alignChapter(JSON.parse(readFileSync('tests/fixtures/data-lxx/gen/1.json', 'utf8')) as Chapter, (lemma) => lexicon[lemma]?.g ?? '').chapter;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
      String(input).startsWith('/data-lxx/gen/1.json') ? Promise.resolve(new Response(JSON.stringify(gen1), { status: 200, headers: { 'Content-Type': 'application/json' } })) : chapterFetch(input, init),
    );
  }
  if (extras.guessed) {
    const chapterFetch = globalThis.fetch;
    const lemma = extras.guessed;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await chapterFetch(input, init);
      if (!String(input).startsWith('/data-lxx/gen/1.json')) return response;
      const gen1 = (await response.json()) as Chapter;
      const guess = { ...gen1, verses: gen1.verses.map((v) => ({ ...v, g: v.g.map((w) => (w.l === lemma ? { ...w, y: 'g', c: 0.4 } : w)) })) };
      return new Response(JSON.stringify(guess), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
  }
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  // the Hebrew view of a chapter needs the Hebrew dial (mw-gdcyf98.3): these scenarios are of a phone with Hebrew All in, and the Greek dial unplaced (All in)
  await db.settings.put({ key: 'hebrewInterest', value: '5' });
  await db.settings.put({ key: 'septuagint', value: septuagint });
  for (const [key, value] of Object.entries(settings)) await db.settings.put({ key, value });
  if (extras.strongs) await setResourceOn('strongs', true);
  if (extras.diagram) window.localStorage.setItem('lampas.welcome', 'done');
  if (extras.memorize) {
    await db.reviews.put({ kind: 'verse', id: extras.memorize.id, step: extras.memorize.step, due: Date.now() - 1000, lastWhen: Date.now() - 86_400_000, lapses: 0, rights: 0 });
    window.history.replaceState(null, '', `/#/memorize/${extras.memorize.id.replace(/^[a-z]+:/, '')}/${extras.memorize.id.split(':')[0]}`);
  }
  for (const lemma of extras.solid ?? []) await db.words.put({ lemma, lang: 'grc', lemmas: [lemma], gloss: lemma, lesson: 0, source: 'frontier', state: 'solid', since: Date.now() });
  render(<App />);
  if (!extras.memorize) await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const switchEl = (): HTMLElement => screen.getByRole('group', { name: 'Language' });

const feature = await loadFeature('features/septuagint.feature');

describeFeature(feature, ({ Scenario }) => {
  const noEnglishUnder = (): void => {
    expect(verseEl(1).querySelector('[data-lxx-english]')).toBeNull();
    expect(squash(verseEl(1).textContent)).not.toContain('In the beginning God made');
  };
  const switchOffers = async (_: unknown, a: string, b: string): Promise<void> => {
    await waitFor(() => expect(within(switchEl()).getAllByRole('button').map((x) => x.textContent)).toEqual([a, b]));
  };
  const subtitleReads = async (_: unknown, text: string): Promise<void> => {
    await waitFor(() => expect(squash(document.querySelector('[data-reader-subtitle]')?.textContent)).toBe(text));
  };
  const noSubtitle = (): void => {
    expect(document.querySelector('[data-reader-subtitle]')).toBeNull();
  };
  const titleReads = async (_: unknown, text: string): Promise<void> => {
    await waitFor(() => expect(squash(screen.getByRole('heading', { level: 1 }).textContent)).toBe(text));
  };

  Scenario('With the setting off Genesis 1 is the Hebrew', ({ Given, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint off', () => openOn('Genesis 1', 'off'));
    Then('the language switch offers {string} and {string}', switchOffers);
    And('no header subtitle is shown', noSubtitle);
  });

  Scenario("With the setting on Genesis 1 in the Greek view is Swete's Greek alone", ({ Given, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on and the saved view {string}', (_: unknown, view: string) => openOn('Genesis 1', 'on', { readerView: view }));
    Then('the language switch offers {string} and {string}', switchOffers);
    And('verse 1 begins with the Greek {string}', async (_: unknown, word: string) => {
      await waitFor(() => expect(squash(verseEl(1).querySelector('[data-word="0"]')?.textContent)).toBe(word));
    });
    And('no English is under verse 1', noEnglishUnder);
    And('the header subtitle reads {string}', subtitleReads);
    And('the title reads {string}', titleReads);
  });

  Scenario('A tap on the header line opens the sheet of whose texts these are', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on and the saved view {string}', (_: unknown, view: string) => openOn('Genesis 1', 'on', { readerView: view }));
    When('the header subtitle is tapped', async () => {
      await user.click(await waitFor(() => document.querySelector('[data-reader-subtitle]') as HTMLElement));
    });
    Then("the sheet {string} shows the Greek, the English, the words' lemma and parsing, and the versification", async (_: unknown, title: string) => {
      const sheet = await screen.findByRole('dialog', { name: title });
      expect([...sheet.querySelectorAll('[data-lxx-source]')].map((s) => s.getAttribute('data-lxx-source'))).toEqual(['Greek', 'English', "The words' lemma and parsing", 'Versification']);
      expect(within(sheet).getByRole('link', { name: 'docs/lxx-derivation.md' })).toHaveAttribute('href', 'https://github.com/Jonathan-A-White/lampas/blob/main/docs/lxx-derivation.md');
    });
    And('Done closes the sheet', async () => {
      await user.click(screen.getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Whose texts these are' })).toBeNull());
    });
  });

  Scenario("In the English view the verse is Brenton's English", ({ Given, Then }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on and the saved view {string}', (_: unknown, view: string) => openOn('Genesis 1', 'on', { readerView: view }));
    Then('verse 1 reads {string}', async (_: unknown, text: string) => {
      await waitFor(() => expect(squash(verseEl(1).querySelector('[data-text]')?.textContent)).toBe(text));
    });
  });

  Scenario('Psalms 23 is Greek Psalm 22 and its first verse says both numbers', ({ Given, Then, And }) => {
    Given('Lampas is opened on Psalms 23 with the Septuagint on and the saved view {string}', (_: unknown, view: string) => openOn('Psalms 23', 'on', { readerView: view }));
    Then('the title reads {string}', titleReads);
    And('the number of the first verse reads {string}', (_: unknown, text: string) => {
      expect(squash(verseEl(1).querySelector('[data-verse-number]')?.textContent)).toBe(text);
    });
    And('the header subtitle reads {string}', subtitleReads);
  });

  Scenario('A book whose Septuagint is not shipped stays Hebrew and says so', ({ Given, Then, And }) => {
    Given('Lampas is opened on Isaiah 1 with the Septuagint on and the saved view {string}', (_: unknown, view: string) => openOn('Isaiah 1', 'on', { readerView: view }));
    Then('the language switch offers {string} and {string}', switchOffers);
    And('the note reads {string}', async (_: unknown, text: string) => {
      await waitFor(() => expect(squash(document.querySelector('[data-septuagint-not-ready]')?.textContent)).toBe(text));
    });
    And('no header subtitle is shown', noSubtitle);
  });

  const switchOffers3 = async (_: unknown, a: string, b: string, c: string): Promise<void> => {
    await waitFor(() => expect(within(switchEl()).getAllByRole('button').map((x) => x.textContent)).toEqual([a, b, c]));
  };
  const chosenIs = (name: string) => async (): Promise<void> => {
    await waitFor(() => expect(within(switchEl()).getByRole('button', { name }).getAttribute('aria-pressed')).toBe('true'));
  };
  const noTip = (): void => {
    expect(document.querySelector('[data-hint-card="septuagint-weave"]')).toBeNull();
  };
  const versesBegin = async (_: unknown, word: string): Promise<void> => {
    await waitFor(() => expect(squash(verseEl(1).querySelector('[data-word="0"]')?.textContent)).toBe(word));
  };
  const versesRead = async (_: unknown, text: string): Promise<void> => {
    await waitFor(() => expect(squash(verseEl(1).querySelector('[data-text]')?.textContent)).toBe(text));
  };

  Scenario('With the Weave on the switch has a Weave position that draws the Greek alone and says why once', ({ Given, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on and the Weave {string}', (_: unknown, weave: string) => openOn('Genesis 1', 'on', { weave }));
    Then('the language switch offers {string}, {string} and {string}', switchOffers3);
    And('the Weave position is chosen', chosenIs('Weave'));
    And('verse 1 begins with the Greek {string}', versesBegin);
    And('no English is under verse 1', noEnglishUnder);
    And('the tip reads {string}', async (_: unknown, text: string) => {
      await waitFor(() => expect(squash(document.querySelector('[data-hint-card="septuagint-weave"]')?.textContent)).toContain(text));
    });
  });

  Scenario("With the Weave on the English position is Brenton's prose and the tip is not shown", ({ Given, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on, the Weave {string} and plain English under it', (_: unknown, weave: string) =>
      openOn('Genesis 1', 'on', { weave, readerPlain: weave }),
    );
    Then('the language switch offers {string}, {string} and {string}', switchOffers3);
    And('the English position is chosen', chosenIs('English'));
    And('verse 1 reads {string}', versesRead);
    And('no tip is shown', noTip);
  });

  Scenario('With the Weave on the Greek position is the Greek alone and the tip is not shown', ({ Given, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on, the Weave {string} and the saved view {string}', (_: unknown, weave: string, view: string) =>
      openOn('Genesis 1', 'on', { weave, readerView: view }),
    );
    Then('the Greek position is chosen', chosenIs('Greek'));
    And('verse 1 begins with the Greek {string}', versesBegin);
    And('no English is under verse 1', noEnglishUnder);
    And('no tip is shown', noTip);
  });

  // the Weave on a chapter whose verses carry aligned chunks (mw-u2w5klk.274.3): woven as the New Testament is, with no tip
  Scenario('With aligned chunks the Weave position weaves his solid lemmas in Greek and the tip is not shown', ({ Given, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on, aligned English and the Weave {string} with the lemma {string} solid', (_: unknown, weave: string, lemma: string) =>
      openOn('Genesis 1', 'on', { weave }, { aligned: true, solid: [lemma] }),
    );
    Then('the language switch offers {string}, {string} and {string}', switchOffers3);
    And('the Weave position is chosen', chosenIs('Weave'));
    And('verse 1 shows the Greek {string} woven into its English', async (_: unknown, word: string) => {
      await waitFor(() => expect(squash(verseEl(1).querySelector('[data-woven]')?.textContent)).toBe(word));
      expect(squash(verseEl(1).textContent)).toContain('In the beginning');
    });
    And('no tip is shown', noTip);
  });

  Scenario('With aligned chunks and plain English under the Weave the verse is Brenton\'s prose', ({ Given, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on, aligned English, the Weave {string} with the lemma {string} solid and plain English under it', (_: unknown, weave: string, lemma: string) =>
      openOn('Genesis 1', 'on', { weave, readerPlain: weave }, { aligned: true, solid: [lemma] }),
    );
    Then('the English position is chosen', chosenIs('English'));
    And('verse 1 has no Greek woven into its English', () => {
      expect(verseEl(1).querySelector('[data-woven]')).toBeNull();
    });
    And('no tip is shown', noTip);
  });

  // ---- the word card of a Septuagint word (mw-u2w5klk.12)
  const sheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Word' });
  const taps = async (_: unknown, text: string, verse: number): Promise<void> => {
    await user.click(within(verseEl(verse)).getByRole('button', { name: new RegExp(`^${text}`) }));
    await screen.findByRole('dialog', { name: 'Word' });
  };
  const shows = (testId: string) => async (_: unknown, text: string): Promise<void> => {
    await waitFor(() => expect(squash(within(sheet()).getByTestId(testId).textContent)).toBe(text));
  };
  const cardHas = (_: unknown, name: string): void => {
    expect(within(sheet()).getByRole('button', { name })).toBeInTheDocument();
  };
  const cardLacks = (_: unknown, name: string): void => {
    expect(within(sheet()).queryByRole('button', { name })).toBeNull();
  };
  const cardReads = (_: unknown, text: string): void => {
    expect(squash(within(sheet()).getByRole('group', { name: 'How Lampas read this word' }).querySelector('[data-reading-line]')?.textContent)).toBe(text);
  };
  const tapsOnCard = async (_: unknown, name: string): Promise<void> => {
    await user.click(within(sheet()).getByRole('button', { name }));
  };

  Scenario('A tap on ἐποίησεν opens its card from the lemma lexicon, with no Strong\'s row and no empty Study tile', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on and the saved view {string} and the Strong\'s resource on', (_: unknown, view: string) => openOn('Genesis 1', 'on', { readerView: view }, { strongs: true }));
    When('he taps the word {string} in verse {int}', taps);
    Then('the card shows the Lemma {string}', shows('sheet-lemma'));
    And('the card shows the Parsing {string}', shows('sheet-parse'));
    And('the card shows the Meaning {string}', shows('sheet-gloss'));
    And('the card has {string}', cardHas);
    And('the card has no Strong\'s row and no Study tile without a link', () => {
      expect(within(sheet()).queryByTestId('sheet-strongs')).toBeNull();
      expect(within(sheet()).queryByText(/^Strong's$/)).toBeNull();
      const study = within(sheet()).queryByRole('group', { name: 'Study', exact: true });
      for (const tile of study ? within(study).queryAllByRole('link') : []) {
        expect(squash(tile.textContent), 'a Study tile with no words').not.toBe('');
        expect(tile.getAttribute('href') ?? '', 'a Study tile with no address').not.toBe('');
      }
      // the Strong's resource has nothing to link for a word with no number, so it draws no tile at all
      expect(study).toBeNull();
    });
    And('the card reads {string}', cardReads);
  });

  Scenario('Hear it on a Septuagint word says the Greek word', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on and the saved view {string} on a phone with a Greek voice', (_: unknown, view: string) => openOn('Genesis 1', 'on', { readerView: view }, { speech: true }));
    When('he taps the word {string} in verse {int}', taps);
    And('he taps {string} on the card', tapsOnCard);
    Then('the phone is told to speak {string} in Greek', async (_: unknown, text: string) => {
      await waitFor(() => expect(synth?.spoken.length).toBeGreaterThan(0));
      const last = synth!.spoken[synth!.spoken.length - 1];
      expect(last.text).toBe(asSpoken(text));
      expect(last.lang).toMatch(/^el/);
    });
  });

  Scenario('A guessed word is drawn with a mark, its card says it is a guess and cannot be added to his words', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on and the saved view {string}', (_: unknown, view: string) => openOn('Genesis 1', 'on', { readerView: view }));
    Then('the word {string} in verse {int} is drawn with the mark {string}', async (_: unknown, text: string, verse: number, label: string) => {
      await waitFor(() => expect(within(verseEl(verse)).getByRole('button', { name: new RegExp(`^${text}`) }).querySelector(`[role="img"][aria-label="${label}"]`)).not.toBeNull());
    });
    And('the word {string} in verse {int} is drawn without it', (_: unknown, text: string, verse: number) => {
      expect(within(verseEl(verse)).getByRole('button', { name: new RegExp(`^${text}`) }).querySelector('[role="img"]')).toBeNull();
    });
    When('he taps the word {string} in verse {int}', taps);
    Then('the card begins {string}', async (_: unknown, text: string) => {
      const first = within(sheet()).getByTestId('sheet-guess');
      expect(first.parentElement?.firstElementChild).toBe(first);
      expect(squash(first?.textContent)).toBe(text);
    });
    And('the card reads {string}', cardReads);
    And('the card has {string}', cardHas);
    And('the card has no {string}', cardLacks);
  });

  // Swete's lacuna brackets (mw-u2w5klk.280)
  const greekOf = (n: number): string => squash(verseEl(n).querySelector('[data-text]')?.textContent);
  Scenario("Swete's lacuna brackets are not drawn in the Greek view, and a word under one opens its card", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on and the saved view {string}', (_: unknown, view: string) => openOn('Genesis 1', 'on', { readerView: view }));
    Then('verse {int} shows no square bracket', (_: unknown, n: number) => {
      expect(verseEl(n).textContent).not.toMatch(/[[\]]/);
    });
    And('verse {int} reads in Greek {string}', (_: unknown, n: number, text: string) => {
      expect(greekOf(n)).toBe(text);
    });
    When('he taps the word {string} in verse {int}', taps);
    Then('the card shows the Lemma {string}', shows('sheet-lemma'));
  });

  Scenario('With Show manuscript gaps on the Greek view prints the brackets as Swete did', ({ Given, When, Then }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on, the saved view {string} and Show manuscript gaps {string}', (_: unknown, view: string, gaps: string) => openOn('Genesis 1', 'on', { readerView: view, septuagintGaps: gaps }));
    Then('verse {int} reads in Greek {string}', (_: unknown, n: number, text: string) => {
      expect(greekOf(n)).toBe(text);
    });
    When('he taps the word {string} in verse {int}', taps);
    Then('the card shows the Lemma {string}', shows('sheet-lemma'));
  });

  Scenario('Report this reading asks the tutor about the word in its verse', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on and the saved view {string} and a tutor behind a fake Postern', (_: unknown, view: string) => openOn('Genesis 1', 'on', { readerView: view }, { tutor: true }));
    When('he taps the word {string} in verse {int}', taps);
    And('he taps {string} on the card', tapsOnCard);
    Then('the Talk sheet opens on Genesis 1:14 with the question {string}', async (_: unknown, question: string) => {
      const talk = await screen.findByRole('dialog', { name: 'Talk about Genesis 1:14' });
      await waitFor(() => expect(squash(talk.querySelector('[data-talk-q]')?.textContent)).toBe(question));
    });
    And('the mill received one bible-talk grist about the word as for any word question', async () => {
      await waitFor(() => expect(fake?.received).toHaveLength(1));
      const got = fake!.received[0];
      expect(got.grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
      expect(got.input.focus).toMatchObject({ form: 'Γενηθήτωσαν', lemma: 'γίνομαι', parse: 'verb, aorist passive imperative, 3rd person plural', kind: 'word' });
      expect(got.input.reference).toBe('Genesis 1:14');
    });
    And('the tutor\'s answer shows under the question', async () => {
      const talk = screen.getByRole('dialog', { name: 'Talk about Genesis 1:14' });
      await waitFor(() => expect(talk.querySelectorAll('[data-turn]')).toHaveLength(1));
      expect(talk.querySelector('[data-turn]')).toHaveTextContent(GRAMMAR_HELP_ANSWER.answer);
    });
  });

  // R4's 'never quizzed' (mw-5r3p30.963): the grammar questions Review and Drill it build over a passage, here over the chapter as the app loads it with the Septuagint on
  Scenario('A grammar question over the Septuagint chapter never asks for a guessed word', ({ Given, Then, And }) => {
    let rights: string[] = [];
    Given("Lampas is opened on Genesis 1 with the Septuagint on and the saved view {string} and the chapter's grammar questions built for every idea", async (_: unknown, view: string) => {
      await openOn('Genesis 1', 'on', { readerView: view });
      const chapter: Chapter = await loadChapter('gen', 1);
      rights = [];
      for (const idea of LADDER) {
        for (let seed = 1; seed <= 20; seed += 1) {
          const q = buildTapForm(idea, [chapter], mulberry32(seed));
          if (q) rights.push(q.right);
        }
      }
    });
    Then('no question has {string}, {string} or {string} as its right answer', (_: unknown, a: string, b: string, c: string) => {
      for (const guess of [a, b, c]) expect(rights, guess).not.toContain(guess);
    });
    And('a read word of Genesis 1 is the right answer of some question', () => {
      expect(rights.length).toBeGreaterThan(0);
      expect(rights).toContain('ἐποίησεν');
    });
  });

  // R5 (mw-u2w5klk.15): Memorize and the Diagram follow the chapter's language
  Scenario('With the setting on Memorize learns Genesis 1:1 in the Greek', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on and Genesis 1:1 memorized in Greek at step {int}', (_: unknown, step: number) =>
      openOn('Genesis 1', 'on', { greekInterest: '5' }, { memorize: { id: 'el:Gen.1.1', step } }),
    );
    When('he opens its Memorize session', async () => {
      await screen.findByTestId('memorize-verse');
    });
    Then('the session says {string}', async (_: unknown, text: string) => {
      await waitFor(() => expect(squash(document.body.textContent)).toContain(text));
    });
    And('the verse is drawn left to right in Greek with {int} of its {int} words blank', async (_: unknown, blank: number, all: number) => {
      const verse = screen.getByTestId('memorize-verse');
      await waitFor(() => expect(verse.querySelectorAll('[data-token]')).toHaveLength(all));
      expect(verse).not.toHaveAttribute('dir', 'rtl');
      expect(verse.querySelectorAll('[data-blank]')).toHaveLength(blank);
      const shown = [...verse.querySelectorAll('[data-token]:not([data-blank])')].map((t) => t.getAttribute('lang'));
      expect(shown.every((lang) => lang === 'el'), 'the words shown are Greek').toBe(true);
    });
  });

  Scenario("With the setting on the Diagram of Genesis 1:1 is drawn from Swete's Greek", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on and a tutor that draws Genesis 1:1', () => openOn('Genesis 1', 'on', { readerView: 'greek', greekInterest: '5' }, { tutor: true, diagram: true }));
    When('he opens the Verse view of verse 1 and taps Diagram', async () => {
      await user.click(await screen.findByRole('button', { name: 'Verse 1', exact: true }));
      const view = await screen.findByRole('region', { name: 'Verse view' });
      await user.click(within(view).getByRole('button', { name: 'Diagram', exact: true }));
    });
    Then('the pane draws the Greek diagram of Genesis 1:1', async () => {
      const pane = within(await screen.findByRole('region', { name: 'Verse view' })).getByRole('region', { name: 'Diagram' });
      expect(await within(pane).findByRole('img', { name: 'Sentence diagram of Genesis 1:1, Greek' })).toBeInTheDocument();
    });
    And('the tutor was asked once, in Greek, for the {int} words of the verse beginning {string}', (_: unknown, count: number, start: string) => {
      const asked = fake!.received.filter((r) => r.grist.kind === 'sentence-diagram');
      expect(asked).toHaveLength(1);
      expect(asked[0].input.lang).toBe('greek');
      expect(asked[0].input.ref).toBe('Genesis 1:1');
      const words = asked[0].input.words as { text: string }[];
      expect(words).toHaveLength(count);
      expect(words.map((w) => w.text).join(' ')).toMatch(new RegExp(`^${start}`));
    });
  });

  // R6 (mw-u2w5klk.16): Add to my words under a tutor's explained word
  const talkSheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Talk about Genesis 1:14' });
  const answerWord = (lemma: string): HTMLElement => {
    const row = Array.from(talkSheet().querySelectorAll<HTMLElement>('[data-talk-words] > div')).find((r) => r.querySelector('dd [lang="el"]')?.textContent === lemma);
    if (!row) throw new Error(`no answer word ${lemma}`);
    return row;
  };
  const EXPLAINED = [
    { greek: 'Γενηθήτωσαν', lemma: 'γίνομαι', note: 'verb, aorist passive imperative, 3rd person plural' },
    { greek: 'κάρπιμον', lemma: 'κάρπιμος', note: 'adjective, accusative singular neuter' },
  ];
  Scenario('Add to my words on a guess-only lemma says why it did nothing, and on a read lemma that only the Septuagint has it adds it', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on, every γίνομαι read only as a guess and a tutor that explains the words Γενηθήτωσαν and κάρπιμον', () =>
      openOn('Genesis 1', 'on', { readerView: 'greek' }, { tutor: true, explains: EXPLAINED, guessed: 'γίνομαι' }),
    );
    When('he taps the word {string} in verse {int}', taps);
    And('he taps {string} on the card', tapsOnCard);
    And('the tutor has explained the words', async () => {
      await waitFor(() => {
        answerWord('γίνομαι');
        answerWord('κάρπιμος');
      });
    });
    And('he taps {string} on the answer word {string}', async (_: unknown, label: string, lemma: string) => {
      await user.click(await within(answerWord(lemma)).findByRole('button', { name: label }));
    });
    Then('the answer word {string} says {string}', async (_: unknown, lemma: string, text: string) => {
      await waitFor(() => expect(squash(within(answerWord(lemma)).getByRole('status').textContent)).toBe(text));
    });
    And('the answer word {string} still offers {string}', async (_: unknown, lemma: string, label: string) => {
      expect(within(answerWord(lemma)).getByRole('button', { name: label })).toBeEnabled();
    });
    And('the word {string} is not on his list', async (_: unknown, lemma: string) => {
      expect((await db.words.toArray()).filter((w) => w.lemma === lemma)).toEqual([]);
    });
    When('he adds the answer word {string} to his words', async (_: unknown, lemma: string) => {
      await user.click(await within(answerWord(lemma)).findByRole('button', { name: 'Add to my words' }));
    });
    Then('the answer word {string} shows {string}', async (_: unknown, lemma: string, label: string) => {
      await waitFor(() => expect(within(answerWord(lemma)).getByRole('button', { name: label })).toBeDisabled());
    });
    And('the word {string} is on his list once, with the gloss {string}', async (_: unknown, lemma: string, gloss: string) => {
      expect((await db.words.toArray()).filter((w) => w.lemma === lemma)).toMatchObject([{ lemma, gloss, state: 'learning' }]);
    });
  });
});
