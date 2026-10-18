// features/steps/pair-drill.steps.tsx — runs features/pair-drill.feature: 'Which did you hear?', the drill under a Hard sounds lesson's contrast step (src/hardSounds/Contrast.tsx,
// pairDrill.ts). The lesson is the shipped 'Rolling your r'; the Greek voice is the honest fake of tests/support/fake-speech.ts, and a step learns which word was said from what
// the voice was handed, as a listener does. The draw is seeded (pairSeed).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { mulberry32 } from '../../src/data/random';
import { getPairRuns } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { lessonById } from '../../src/hardSounds/lessons';
import { pairSeed, ROUNDS } from '../../src/hardSounds/pairDrill';
import { forgetTrail } from '../../src/nav/lastRoute';
import { chooseAccent, DEFAULT_ACCENT } from '../../src/speech/accents';
import { stopSpeaking } from '../../src/speech/greek';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { asSpoken } from '../../tests/support/spoken-word';

const user = userEvent.setup();
const tappedR = lessonById('tapped-r')!;
const contrast = tappedR.steps.find((s) => s.kind === 'contrast');
if (contrast?.kind !== 'contrast') throw new Error('The tapped r has no contrast step');
const WORDS = contrast.pairs.flat();
const pairOf = (word: string): [string, string] => contrast.pairs.find((p) => p.includes(word))!;

let synth: FakeSynth;

afterAll(() => {
  cleanup();
  stopSpeaking();
  chooseAccent(DEFAULT_ACCENT);
  vi.unstubAllGlobals();
  db.close();
});

/** Opens the app on the contrast step of the lesson `title`, every store emptied and the draw seeded. */
async function open(title: string): Promise<void> {
  expect(title).toBe(tappedR.title);
  cleanup();
  stopSpeaking();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  stubChapterFetch();
  localStorage.clear();
  pairSeed.next = mulberry32(11);
  chooseAccent(DEFAULT_ACCENT);
  window.history.replaceState(null, '', `/#/sounds?l=${tappedR.id}&s=${tappedR.steps.findIndex((s) => s.kind === 'contrast')}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  render(<App />);
  await screen.findByTestId('sound-lesson');
}

const lesson = () => screen.findByTestId('sound-lesson');
const press = async (name: string | RegExp): Promise<void> => user.click(within(await lesson()).getByRole('button', { name }));

/** The Greek words the voice has been handed, in order. */
const heardWords = (): string[] => synth.spoken.flatMap((s) => WORDS.filter((w) => asSpoken(w) === s.text));

/** The word the voice said for the round on screen: the last word it was handed. */
async function wordSaid(): Promise<string> {
  await waitFor(() => expect(heardWords().length).toBeGreaterThan(0));
  return heardWords()[heardWords().length - 1];
}

/** Taps the word `chosen` on the round on screen. */
const choose = async (chosen: string): Promise<void> => user.click(within(await screen.findByTestId('pair-round')).getByRole('button', { name: `Choose ${chosen}` }));

/** Moves to the next round and waits for the voice to say its word. */
async function nextRound(): Promise<void> {
  const before = synth.spoken.length;
  await press(/^(Next round|See my score)$/);
  if (!screen.queryByTestId('pair-score')) await waitFor(() => expect(synth.spoken.length).toBeGreaterThan(before));
}

const feature = await loadFeature('features/pair-drill.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Ten rounds, a miss comes back side by side, and the score shows', ({ Given, When, Then, And }) => {
    let said = '';
    Given('Lampas is opened on the {string} step of the lesson {string}', async (_, heading: string, title: string) => {
      await open(title);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(heading);
    });
    When('he taps {string}', async (_, name: string) => press(name));
    Then('the drill shows {string} and the Greek voice says one word of a pair', async (_, count: string) => {
      expect(await screen.findByTestId('pair-count')).toHaveTextContent(count);
      said = await wordSaid();
      expect(WORDS).toContain(said);
      expect(synth.spoken[synth.spoken.length - 1].lang).toBe('el-GR');
      // both words of its pair are the choices, and the pair is not shown side by side yet
      const round = within(screen.getByTestId('pair-round'));
      for (const word of pairOf(said)) expect(round.getByRole('button', { name: `Choose ${word}` })).toBeInTheDocument();
      expect(screen.queryByTestId('pair-replay')).toBeNull();
    });
    When('he taps the word that was said', async () => choose(said));
    Then('the drill says {string} and does not show the pair side by side', async (_, verdict: string) => {
      expect(within(await screen.findByTestId('pair-round')).getByRole('status')).toHaveTextContent(new RegExp(`^${verdict}$`));
      expect(screen.queryByTestId('pair-replay')).toBeNull();
    });
    When('he goes to the next round', nextRound);
    And('he taps the other word of the pair', async () => {
      said = await wordSaid();
      await choose(pairOf(said).find((w) => w !== said)!);
    });
    Then('the drill says {string} and shows the pair side by side, both words to hear', async (_, verdict: string) => {
      const round = within(await screen.findByTestId('pair-round'));
      expect(round.getByRole('status')).toHaveTextContent(verdict);
      const replay = within(round.getByTestId('pair-replay'));
      for (const word of pairOf(said)) expect(replay.getByRole('button', { name: `Hear ${word}` })).toBeInTheDocument();
    });
    And('the Greek voice says both words of the pair', async () => {
      const [a, b] = pairOf(said);
      await waitFor(() => {
        const heard = heardWords();
        expect(heard.slice(-2).sort()).toEqual([a, b].sort());
      });
    });
    When('he answers the remaining rounds, all right', async () => {
      for (;;) {
        await nextRound();
        if (screen.queryByTestId('pair-score')) return;
        await choose(await wordSaid());
      }
    });
    Then('the drill shows the score {string}', async (_, score: string) => {
      expect(await screen.findByTestId('pair-score')).toHaveTextContent(score);
    });
    And('it shows the missed pair side by side to hear', async () => {
      const replays = within(await screen.findByTestId('pair-score')).getAllByTestId('pair-replay');
      expect(replays).toHaveLength(1);
      const words = Array.from(replays[0].querySelectorAll('[data-word]')).map((w) => w.getAttribute('data-word'));
      expect(words.sort()).toEqual([...pairOf(said)].sort());
      for (const word of words) expect(within(replays[0]).getByRole('button', { name: `Hear ${word}` })).toBeInTheDocument();
    });
  });

  Scenario('A perfect run has nothing to replay, and the run is kept on the device', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the {string} step of the lesson {string}', async (_, _heading: string, title: string) => open(title));
    When('he taps {string}', async (_, name: string) => press(name));
    And('he answers all ten rounds right', async () => {
      for (let round = 1; round <= ROUNDS; round++) {
        expect(await screen.findByTestId('pair-count')).toHaveTextContent(`Round ${round} of ${ROUNDS}`);
        await choose(await wordSaid());
        await nextRound();
      }
    });
    Then('the drill shows the score {string}', async (_, score: string) => {
      expect(await screen.findByTestId('pair-score')).toHaveTextContent(score);
    });
    And('it shows no missed pair', () => {
      expect(screen.queryByTestId('pair-replay')).toBeNull();
    });
    And('the run is kept on the device: the lesson {string} with a score of {int} of {int}', async (_, id: string, score: number, total: number) => {
      await waitFor(async () => expect((await getPairRuns(id)).map((r) => [r.score, r.total])).toEqual([[score, total]]));
    });
  });

  Scenario('Again draws ten new rounds', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the {string} step of the lesson {string}', async (_, _heading: string, title: string) => open(title));
    When('he taps {string}', async (_, name: string) => press(name));
    And('he answers all ten rounds right', async () => {
      for (let round = 1; round <= ROUNDS; round++) {
        await choose(await wordSaid());
        await nextRound();
      }
    });
    And('he chooses {string} on the score', async (_, name: string) => press(name));
    Then('the drill shows {string} and the Greek voice says one word of a pair', async (_, count: string) => {
      expect(await screen.findByTestId('pair-count')).toHaveTextContent(count);
      expect(screen.queryByTestId('pair-score')).toBeNull();
    });
  });
});
