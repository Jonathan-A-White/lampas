// tests/unit/memorize-session.test.tsx — the Memorize session (mw-fu7dqf.8, #/memorize/<ref>/<lang>): the verse at the rung its schedule step gives, Hear it, the recall hold, the judgement with its
// misses marked, the recall recorded and 'Due <day>', the self-grade when the phone cannot hear, and Next verse. The engine is voice-kit's honest speech on a manual clock, the recogniser and the
// recorder are tests/support's, the mill the fake Postern; the chapters are the committed ones.
import 'fake-indexeddb/auto';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { hideWords } from 'learn-kit/recall';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { forgetChapters } from '../../src/data/chapter';
import { db, type Review, type Word } from '../../src/data/db';
import { setGreekInterest, setWeave } from '../../src/data/repositories';
import { listMemorized, memorize, recallsOf } from '../../src/data/repositories/memorize';
import { DAY, RARE_STEP } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { MemorizeScreen } from '../../src/memorize/MemorizeScreen';
import type { MemorizeLang } from '../../src/memorize/languages';
import { versesOf } from '../../src/memorize/refs';
import { tokensOf } from '../../src/memorize/target';
import { memorizeSessionOf, openMemorizeSession, routeOf } from '../../src/nav/route';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { screenContextNow } from '../../src/tutor/screenContext';
import { stubChapterFetch } from '../support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../support/fake-recognizer';
import { FakeRecorder, stubRecorder } from '../support/fake-recorder';
import { makeFakePostern, WELL_READ_ANSWER, type FakePostern } from '../support/fake-postern';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';

const REF = 'John.1.16';
const WORDS = ['From', 'His', 'fullness', 'we', 'have', 'all', 'received', 'grace', 'upon', 'grace.'];

/** The mill's answer when one word of the weave needs saying again: 'fullness', the third word of the reading text. */
const SOME_TO_FIX_ANSWER = {
  verdict: 'some-to-fix',
  focus_words: [{ word: 'fullness', index: 2, chunks: ['full', 'ness'], tip: 'Say the ull as in pull.' }],
  note: 'Nearly there: one word to say again.',
};

let synth: FakeSynth;
let postern: FakePostern | undefined;

beforeEach(async () => {
  clearBus();
  forgetTrail();
  stubChapterFetch();
  forgetChapters();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  stubRecognizer();
  stubRecorder();
  FakeRecognizer.noSpeechFor = [];
  postern = undefined;
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, '00'.repeat(31) + '03');
  tutorTimings.pollMs = 10;
  await db.open();
  await Promise.all([db.reviews.clear(), db.recalls.clear(), db.settings.clear(), db.words.clear()]);
  await setGreekInterest(5);
  window.history.replaceState(null, '', '/#/today');
});
afterEach(() => {
  stopReading();
  cleanup();
  vi.unstubAllGlobals();
});

const patch = (lang: MemorizeLang, ref: string, changes: Partial<Review>) => db.reviews.where('[kind+id]').equals(['verse', `${lang}:${ref}`]).modify(changes);

/** The verse is on the schedule at `step` in `lang` and due; the mill is the fake Postern when the test needs it. */
async function seed(lang: MemorizeLang, step: number, ref = REF, lastWhen = 1_700_000_000_000): Promise<void> {
  await memorize(ref, [lang], lastWhen);
  await patch(lang, ref, { step, due: Date.now() - 1000, lastWhen });
}

function withMill(): FakePostern {
  postern = makeFakePostern();
  const chapters = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith('/data/') ? chapters(input) : postern!.fetch(input, init)));
  return postern;
}

async function open(ref: string, lang: MemorizeLang): Promise<void> {
  openMemorizeSession(ref, lang);
  render(<MemorizeScreen />);
  await screen.findByTestId('memorize-verse');
}

const verse = () => screen.getByTestId('memorize-verse');
const blanks = () => verse().querySelectorAll('[data-blank]');
const shownWords = () => [...verse().querySelectorAll('[data-token]:not([data-blank])')].map((t) => t.textContent);

async function sayIt(words: string, lang: 'en' | 'el' = 'en'): Promise<void> {
  fireEvent.pointerDown(await screen.findByRole('button', { name: /Hold to say it/ }), { pointerId: 1, clientX: 10, clientY: 10 });
  await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(0));
  expect(FakeRecognizer.last().lang).toBe(lang === 'en' ? 'en-US' : 'el-GR');
  const recogniser = FakeRecognizer.last();
  recogniser.open();
  recogniser.say([result(words, false)]);
  fireEvent.pointerUp(await screen.findByRole('button', { name: /Release|Say it|Hold to say it|talk/i }), { pointerId: 1, clientX: 10, clientY: 10 });
}

describe('the address', () => {
  it('names the session by reference and language', () => {
    expect(memorizeSessionOf('#/memorize/Rom.8.28/en')).toEqual({ ref: 'Rom.8.28', lang: 'en' });
    expect(memorizeSessionOf('#/memorize/Rom.8.28-29/weave')).toEqual({ ref: 'Rom.8.28-29', lang: 'weave' });
    expect(memorizeSessionOf('#/memorize/Rom.8.28/french')).toBeUndefined();
    expect(memorizeSessionOf('#/memorize')).toBeUndefined();
    expect(routeOf('#/memorize')).toBe('memorize');
    expect(routeOf('#/memorize/Rom.8.28/el')).toBe('memorize');
  });
});

describe('the rung its schedule step gives', () => {
  it('a new verse shows every word and says Read and say', async () => {
    await seed('en', 0);
    await open(REF, 'en');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('John 1:16');
    expect(screen.getByText(/Read and say/)).toBeTruthy();
    expect(screen.getByText(/step 1 of 7/)).toBeTruthy();
    expect(blanks()).toHaveLength(0);
    expect(shownWords()).toEqual(WORDS);
  });

  it('a verse at step 2 shows half the words as blanks, the ones hideWords picks, and says Half the words gone', async () => {
    await seed('en', 2);
    await open(REF, 'en');
    expect(screen.getByText(/Half the words gone/)).toBeTruthy();
    const hidden = hideWords(WORDS.length, 0.5, 1_700_000_000_000);
    expect(blanks()).toHaveLength(5);
    expect([...verse().querySelectorAll('[data-token]')].flatMap((t, i) => (t.hasAttribute('data-blank') ? [i] : []))).toEqual([...hidden].sort((a, b) => a - b));
    expect(shownWords()).toEqual(WORDS.filter((_, i) => !hidden.has(i)));
  });

  it('at step 4 every word is gone and its first letter is left', async () => {
    await seed('en', 4);
    await open(REF, 'en');
    expect(screen.getByText(/All the words gone/)).toBeTruthy();
    expect(blanks()).toHaveLength(WORDS.length);
    expect([...verse().querySelectorAll('[data-token]')].map((t) => t.textContent!.trim()[0])).toEqual(WORDS.map((w) => w[0]));
  });

  it('at the 90-day check only the reference is shown', async () => {
    await seed('en', RARE_STEP);
    await open(REF, 'en');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('John 1:16');
    expect(screen.getByText(/From nothing/)).toBeTruthy();
    expect(verse().querySelectorAll('[data-token]')).toHaveLength(0);
    expect(verse().textContent).toBe('');
  });
});

describe('Hear it', () => {
  const said = () => synth.spoken.map((s) => s.text.replace(/\s+/g, ' ').trim());

  it('reads the English in English', async () => {
    await seed('en', 0);
    await open(REF, 'en');
    fireEvent.click(screen.getByRole('button', { name: 'Hear it' }));
    await waitFor(() => expect(synth.speaking).toBe(true));
    synth.finishAll();
    expect(said().join(' ')).toBe(WORDS.join(' '));
    expect(synth.spoken.every((s) => s.lang === 'en-US')).toBe(true);
  });

  it('reads the Greek in Greek', async () => {
    await seed('el', 0);
    await open(REF, 'el');
    fireEvent.click(screen.getByRole('button', { name: 'Hear it' }));
    await waitFor(() => expect(synth.speaking).toBe(true));
    synth.finishAll();
    expect(synth.spoken.length).toBeGreaterThan(0);
    expect(synth.spoken.every((s) => s.lang === 'el-GR')).toBe(true);
  });

  it('reads the Weave in its own languages, the woven Greek words in Greek and the English in English', async () => {
    await setWeave('solid');
    await db.words.put({ lemma: 'χάρις', lemmas: ['χάρις'], gloss: 'grace', lesson: 0, state: 'solid', since: 1 } as unknown as Word);
    await seed('weave', 0);
    await open(REF, 'weave');
    const greek = [...verse().querySelectorAll('[data-token][lang="el"]')].map((t) => t.textContent);
    expect(greek.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Hear it' }));
    await waitFor(() => expect(synth.speaking).toBe(true));
    synth.finishAll();
    expect(new Set(synth.spoken.map((s) => s.lang))).toEqual(new Set(['en-US', 'el-GR']));
    const aloud = synth.spoken.map((s) => s.text.replace(/\s+/g, ' ').trim()).join(' ');
    for (const word of greek) expect(aloud).toContain(word!);
    expect(synth.spoken.filter((s) => s.lang === 'el-GR').map((s) => s.text).join(' ')).toContain(greek[0]!);
  });
});

describe('a said recall', () => {
  it('judges a whole verse Got it, records it as said with its asked tokens and says Due tomorrow', async () => {
    await seed('en', 0);
    await open(REF, 'en');
    await sayIt(WORDS.join(' '));
    expect((await screen.findByTestId('judgement')).textContent).toBe('Got it: 10 of 10 words');
    expect(screen.getByTestId('due').textContent).toBe('Due tomorrow');
    const [recall] = await recallsOf(REF, 'en');
    expect(recall).toMatchObject({ ref: REF, lang: 'en', how: 'said', score: 1, rung: 0, missed: [] });
    expect(recall.asked.map((a) => a.token)).toEqual(WORDS);
    expect(recall.asked.every((a) => a.lang === 'en')).toBe(true);
    const [row] = await listMemorized();
    expect(row.step).toBe(0);
  });

  it('marks three missed words of ten, records 0.7 and the step dropped, and still says Due tomorrow', async () => {
    await seed('en', 3);
    await patch('en', REF, { rights: 1 });
    await open(REF, 'en');
    await sayIt('From His we have received grace grace');
    expect((await screen.findByTestId('judgement')).textContent).toBe('Not yet: 3 words missed');
    const marked = [...verse().querySelectorAll('[data-missed]')].map((t) => t.textContent);
    expect(marked).toEqual(['fullness', 'all', 'upon']);
    // the words he missed are shown again, whatever the rung hid
    expect(blanks()).toHaveLength(0);
    expect(screen.getByTestId('due').textContent).toBe('Due tomorrow');
    const [recall] = await recallsOf(REF, 'en');
    expect(recall.score).toBeCloseTo(0.7);
    expect(recall.missed).toEqual(['fullness', 'all', 'upon']);
    expect(recall.rung).toBe(3);
    const [row] = await listMemorized();
    expect(row.step).toBe(1);
  });

  it('moves the step as the schedule says after two passes', async () => {
    await seed('en', 0);
    await open(REF, 'en');
    await sayIt(WORDS.join(' '));
    await screen.findByTestId('judgement');
    cleanup();
    await patch('en', REF, { due: Date.now() - 1000 });
    await open(REF, 'en');
    await sayIt(WORDS.join(' '));
    await screen.findByTestId('judgement');
    expect((await listMemorized())[0].step).toBe(1);
    expect(screen.getByTestId('due').textContent).toBe('Due Sunday'.replace('Sunday', new Date(Date.now() + 3 * DAY).toLocaleDateString('en-US', { weekday: 'long' })));
  });

  it('is reported to the tutor: the reference, the language, the rung and the last score', async () => {
    await seed('en', 1);
    await open(REF, 'en');
    expect(screenContextNow()?.name).toBe('Memorize');
    await sayIt(WORDS.join(' '));
    await screen.findByTestId('judgement');
    await waitFor(() => expect(screenContextNow()?.facts.find((f) => f.label === 'Last score')?.value).toBe('10 of 10 words'));
    const facts = Object.fromEntries(screenContextNow()!.facts.map((f) => [f.label, f.value]));
    expect(facts).toMatchObject({ Verse: 'John 1:16', Language: 'English', Rung: 'A quarter of the words gone' });
  });
});

describe('a phone that cannot hear', () => {
  it('Greek: says so and lets him grade himself; I had it is kept as self with a score of 1', async () => {
    FakeRecognizer.noSpeechFor = ['el-GR', 'el'];
    await seed('el', 0);
    await open(REF, 'el');
    fireEvent.pointerDown(await screen.findByRole('button', { name: /Hold to say it/ }), { pointerId: 1, clientX: 10, clientY: 10 });
    await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(0));
    FakeRecognizer.answerChecks();
    expect((await screen.findByTestId('note')).textContent).toBe('This phone cannot hear Greek. Say it, then grade yourself.');
    expect(screen.getByRole('button', { name: 'Not yet' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'I had it' }));
    expect((await screen.findByTestId('judgement')).textContent).toBe('Got it');
    const [recall] = await recallsOf(REF, 'el');
    expect(recall).toMatchObject({ how: 'self', score: 1, lang: 'el' });
    expect(screen.getByTestId('due').textContent).toBe('Due tomorrow');
  });

  it('English offline: the same, and Not yet is kept as self with a score of 0', async () => {
    await seed('en', 0);
    await open(REF, 'en');
    fireEvent.pointerDown(await screen.findByRole('button', { name: /Hold to say it/ }), { pointerId: 1, clientX: 10, clientY: 10 });
    await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(0));
    act(() => FakeRecognizer.last().open());
    await act(async () => FakeRecognizer.last().onerror?.({ error: 'network' }));
    fireEvent.pointerUp(await screen.findByRole('button', { name: /Release|Say it|Hold to say it|talk/i }), { pointerId: 1, clientX: 10, clientY: 10 });
    expect((await screen.findByTestId('note')).textContent).toMatch(/Say it, then grade yourself/);
    fireEvent.click(screen.getByRole('button', { name: 'Not yet' }));
    expect((await screen.findByTestId('judgement')).textContent).toBe('Not yet');
    expect(await recallsOf(REF, 'en')).toMatchObject([{ how: 'self', score: 0 }]);
  });
});

describe('a Weave recall goes to the mill', () => {
  async function recordWeave(): Promise<void> {
    fireEvent.pointerDown(await screen.findByRole('button', { name: /Hold to say it/ }), { pointerId: 1, clientX: 10, clientY: 10 });
    await waitFor(() => expect(FakeRecorder.instances.length).toBeGreaterThan(0));
    fireEvent.pointerUp(await screen.findByRole('button', { name: /Hold to say it|Release/ }), { pointerId: 1, clientX: 10, clientY: 10 });
  }

  it('a well-read answer is Got it, kept as checked by the mill', async () => {
    const mill = withMill();
    await seed('weave', 0);
    await open(REF, 'weave');
    await recordWeave();
    await waitFor(() => expect(mill.received).toHaveLength(1));
    await mill.answer({ status: 'answered', answer: WELL_READ_ANSWER });
    expect((await screen.findByTestId('judgement')).textContent).toMatch(/^Got it/);
    expect(await recallsOf(REF, 'weave')).toMatchObject([{ how: 'mill', score: 1 }]);
  });

  it('a some-to-fix answer marks its focus words', async () => {
    const mill = withMill();
    await seed('weave', 0);
    await open(REF, 'weave');
    await recordWeave();
    await waitFor(() => expect(mill.received).toHaveLength(1));
    await mill.answer({ status: 'answered', answer: SOME_TO_FIX_ANSWER });
    await screen.findByTestId('judgement');
    expect(verse().querySelectorAll('[data-missed]').length).toBeGreaterThan(0);
    const [recall] = await recallsOf(REF, 'weave');
    expect(recall.how).toBe('mill');
    expect(recall.missed.length).toBeGreaterThan(0);
  });

  it('a mill out of reach lets him grade himself', async () => {
    await seed('weave', 0);
    await open(REF, 'weave');
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      if (String(input).startsWith('/data/')) return new Response('{}', { status: 404 });
      throw new TypeError('offline');
    });
    await recordWeave();
    expect((await screen.findByTestId('note', {}, { timeout: 10_000 })).textContent).toMatch(/grade yourself/);
    expect(screen.getByRole('button', { name: 'I had it' })).toBeTruthy();
  });
});

describe('Next verse', () => {
  it('opens the next due verse in place of this session, and Done goes back to where he came from when none is due', async () => {
    await seed('en', 0);
    await seed('en', 0, 'Rom.8.28', 1_700_000_000_000 + 5);
    await open(REF, 'en');
    const before = window.history.length;
    await sayIt(WORDS.join(' '));
    await screen.findByTestId('judgement');
    fireEvent.click(screen.getByRole('button', { name: 'Next verse' }));
    await waitFor(() => expect(memorizeSessionOf(window.location.hash)).toEqual({ ref: 'Rom.8.28', lang: 'en' }));
    expect(window.history.length).toBe(before);
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Romans 8:28'));
    const rom = await versesOf('Rom.8.28');
    if (!rom || rom.ot) throw new Error('no text');
    await sayIt(tokensOf(rom.verses[0], 'en').map((t) => t.text).join(' '));
    await screen.findByTestId('judgement');
    expect(screen.queryByRole('button', { name: 'Next verse' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(window.location.hash).toBe('#/today'));
  });
});

describe('a verse that cannot be learned', () => {
  it('an Old Testament reference says there is no text', async () => {
    window.history.replaceState(null, '', '/#/memorize/Ps.62.1-2/en');
    render(<MemorizeScreen />);
    expect(await screen.findByText('No Old Testament text in Lampas yet')).toBeTruthy();
  });

  it('with nothing due, the home of Memorize says Nothing due', async () => {
    window.history.replaceState(null, '', '/#/memorize');
    render(<MemorizeScreen />);
    expect(await screen.findByText('Nothing due')).toBeTruthy();
    const header = within(screen.getByRole('banner'));
    expect(header.getByRole('heading', { level: 1 }).textContent).toBe('Memorize');
  });

  it('with a verse due, the home of Memorize opens its session', async () => {
    await seed('en', 0);
    window.history.replaceState(null, '', '/#/memorize');
    render(<MemorizeScreen />);
    await screen.findByTestId('memorize-verse');
    expect(memorizeSessionOf(window.location.hash)).toEqual({ ref: REF, lang: 'en' });
  });
});
