// tests/unit/memorize-heard-word.test.tsx — tap a word marked wrong on a Memorize result and see what the app heard in its place (mw-5r3p30.1201): the judge keeps,
// for each missed token, the words said where it stood ('Heard: an', or 'Heard nothing here'); the session shows them in a small box under the word, dismissed by a tap elsewhere.
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetChapters } from '../../src/data/chapter';
import { db, type Review } from '../../src/data/db';
import { setGreekInterest } from '../../src/data/repositories';
import { memorize } from '../../src/data/repositories/memorize';
import { clearBus } from '../../src/events/bus';
import { HiddenVerse } from '../../src/memorize/HiddenVerse';
import { judgeReading, judgeSaid, judgeTyped } from '../../src/memorize/judge';
import { MemorizeScreen } from '../../src/memorize/MemorizeScreen';
import type { Token } from '../../src/memorize/target';
import { forgetTrail } from '../../src/nav/lastRoute';
import { openMemorizeSession } from '../support/routes';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../support/fake-recognizer';
import { stubRecorder } from '../support/fake-recorder';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../support/fake-speech';

const REF = 'John.1.16';
const VERSE = 'From His fullness we have all received grace upon grace.';

const tokens = (text: string, lang: Token['lang'] = 'en'): Token[] => text.split(' ').map((w, i): Token => ({ text: w, lang, chunk: i }));
// "And" said as "an" and "has" left out
const TARGET = tokens('God is faithful and has promised grace');
const SAID = 'God is faithful an promised grace';

describe('the alignment the judge keeps', () => {
  it('a spoken answer that says "an" for "And" and leaves "has" out marks both, and gives "an" for And and nothing for has', () => {
    const j = judgeSaid(TARGET, SAID);
    expect(j.misses).toEqual([3, 4]);
    expect(j.heardAt?.[3]).toEqual(['an']);
    expect(j.heardAt?.[4]).toEqual([]);
  });

  it('a typed answer gets the same', () => {
    const j = judgeTyped(TARGET, SAID);
    expect(j.misses).toEqual([3, 4]);
    expect(j.heardAt?.[3]).toEqual(['an']);
    expect(j.heardAt?.[4]).toEqual([]);
  });

  it('keeps the word as it was said, with its accents, not the folded one', () => {
    const greek = tokens('ἐν ἀρχῇ ἦν ὁ λόγος', 'el');
    const j = judgeSaid(greek, 'ἐν ἀρχῇ ἦν ὁ λόγοι');
    expect(j.misses).toEqual([4]);
    expect(j.heardAt?.[4]).toEqual(['λόγοι']);
  });

  it('a word said where nothing was missed is in no place; a missed word at the end with nothing after it hears nothing', () => {
    const j = judgeSaid(tokens('one two three'), 'one two extra');
    expect(j.misses).toEqual([2]);
    expect(j.heardAt?.[2]).toEqual(['extra']);
    const none = judgeSaid(tokens('one two three'), 'one two');
    expect(none.heardAt?.[2]).toEqual([]);
  });

  it('extra words in a gap go to the last missed token there; each earlier one gets one word in order', () => {
    const j = judgeSaid(tokens('a b c d'), 'a x y z d');
    expect(j.misses).toEqual([1, 2]);
    expect(j.heardAt?.[1]).toEqual(['x']);
    expect(j.heardAt?.[2]).toEqual(['y', 'z']);
  });

  it('the Weave read has no heard words: no entry for a missed token', () => {
    const j = judgeReading(tokens('a b c'), { verdict: 'incomplete', focus_words: [], note: 'x' });
    expect(j.misses).toEqual([0, 1, 2]);
    expect(j.heardAt).toBeUndefined();
  });
});

describe('HiddenVerse', () => {
  afterEach(cleanup);

  it('a missed token with no alignment kept shows "Heard nothing here" when tapped, without error', () => {
    render(<HiddenVerse tokens={TARGET} hidden={new Set()} firstLetters={false} missed={new Set([3])} />);
    fireEvent.click(document.querySelector('[data-token="3"]')!);
    expect(screen.getByTestId('heard').textContent).toBe('Heard nothing here');
  });
});

describe('the session', () => {
  beforeEach(async () => {
    clearBus();
    forgetTrail();
    stubChapterFetch();
    forgetChapters();
    stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
    stubRecognizer();
    stubRecorder();
    FakeRecognizer.noSpeechFor = [];
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

  async function sayJudged(words: string): Promise<void> {
    await memorize(REF, ['en'], 1_700_000_000_000);
    await db.reviews.where('[kind+id]').equals(['verse', `en:${REF}`]).modify({ step: 0, due: Date.now() - 1000, lastWhen: 1_700_000_000_000 } satisfies Partial<Review>);
    openMemorizeSession(REF, 'en');
    render(<MemorizeScreen />);
    await screen.findByTestId('memorize-verse');
    fireEvent.pointerDown(await screen.findByRole('button', { name: /Hold to say it/ }), { pointerId: 1, clientX: 10, clientY: 10 });
    await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(0));
    const recogniser = FakeRecognizer.last();
    recogniser.open();
    recogniser.say([result(words, false)]);
    fireEvent.pointerUp(await screen.findByRole('button', { name: /Release|Say it|Hold to say it|talk/i }), { pointerId: 1, clientX: 10, clientY: 10 });
    await screen.findByTestId('judgement');
  }

  const word = (i: number) => document.querySelector(`[data-token="${i}"]`)!;
  const popover = () => screen.queryByTestId('heard');

  it('tapping a marked word shows what was heard in its place, a left-out word "Heard nothing here", a tap elsewhere dismisses, an unmarked word does nothing', async () => {
    // "From His fullness we have all received grace upon grace." said as "From His fullness we an received grace grace": "all" is said as "an", "upon" left out
    await sayJudged('From His fullness we have an received grace grace');
    expect([...document.querySelectorAll('[data-missed]')].map((t) => t.textContent)).toEqual(['all', 'upon']);
    expect(popover()).toBeNull();
    fireEvent.click(word(5));
    expect(popover()!.textContent).toBe('Heard: an');
    fireEvent.click(word(8));
    expect(popover()!.textContent).toBe('Heard nothing here');
    fireEvent.click(word(2)); // not marked: nothing opens, and what was open goes
    expect(popover()).toBeNull();
    fireEvent.click(word(5));
    expect(popover()!.textContent).toBe('Heard: an');
    fireEvent.pointerDown(screen.getByTestId('judgement'));
    expect(popover()).toBeNull();
    fireEvent.click(word(5));
    fireEvent.click(word(5));
    expect(popover()).toBeNull();
  });

  it('a word that was not marked does nothing when tapped', async () => {
    await sayJudged(VERSE.replace('all ', ''));
    fireEvent.click(word(0));
    expect(popover()).toBeNull();
  });
});
