// A screen that started a call and was closed before it answered must change nothing when the answer comes (mw-5r3p30.714): useAlive() from
// pwa-kit/alive guards each setState after an await. Each test mounts the screen, holds the awaited call, unmounts, resolves the call with
// `window` gone (settleAfterTeardown, pwa-kit/test-preset: what vitest does at the end of a file) and shows that nothing was raised: a setState
// on a closed screen throws 'window is not defined' there, as an unhandled rejection that fails a green run.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { settleAfterTeardown } from 'pwa-kit/test-preset';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { About, DEVELOPER_TAPS } from '../../src/About';
import { downloadSeam } from '../../src/audio/clip';
import { db } from '../../src/data/db';
import { putNote } from '../../src/data/repositories/memory';
import { setGoal } from '../../src/data/repositories/settings';
import { saveRound } from '../../src/data/roundKeep';
import { Unlock } from '../../src/gate/Unlock';
import { GoalScreen } from '../../src/GoalScreen';
import { MemoryScreen } from '../../src/MemoryScreen';
import { PlacementScreen } from '../../src/PlacementScreen';
import { QuizScreen } from '../../src/QuizScreen';
import { QuizGoalControl } from '../../src/settings/controls/quizGoal';
import { rowOf } from '../../src/settings/rows';
import { LinkActions } from '../../src/ui/LinkActions';
import { stubChapterFetch } from '../support/chapter-fetch';
import { seedHisWords } from '../support/his-words';

/** The calls a test holds: a name in `calls` is answered by what that function returns, instead of by the real call; `seen` names the held calls the screen has made. */
const held = vi.hoisted(() => {
  const calls: Record<string, (() => Promise<unknown>) | undefined> = {};
  const seen = new Set<string>();
  const wrapped =
    <A extends unknown[], R>(name: string, real: (...args: A) => R) =>
    (...args: A): R | Promise<unknown> => {
      const hold = calls[name];
      if (!hold) return real(...args);
      seen.add(name);
      return hold();
    };
  return { calls, seen, wrapped };
});

vi.mock('../../src/data/repositories/memory', async (original) => {
  const actual = await original<typeof import('../../src/data/repositories/memory')>();
  return { ...actual, exportMemory: held.wrapped('exportMemory', actual.exportMemory), putNote: held.wrapped('putNote', actual.putNote), replaceMemory: held.wrapped('replaceMemory', actual.replaceMemory) };
});
vi.mock('../../src/data/repositories', async (original) => {
  const actual = await original<typeof import('../../src/data/repositories')>();
  return {
    ...actual,
    takePronunciationSwitch: held.wrapped('takePronunciationSwitch', actual.takePronunciationSwitch),
    setDeveloper: held.wrapped('setDeveloper', actual.setDeveloper),
    listWords: held.wrapped('listWords', actual.listWords),
    listLevels: held.wrapped('listLevels', actual.listLevels),
    listPassageLessons: held.wrapped('listPassageLessons', actual.listPassageLessons),
  };
});
vi.mock('../../src/data/answerWord', async (original) => {
  const actual = await original<typeof import('../../src/data/answerWord')>();
  return { ...actual, addLemmaToLearn: held.wrapped('addLemmaToLearn', actual.addLemmaToLearn) };
});
vi.mock('../../src/data/chapter', async (original) => {
  const actual = await original<typeof import('../../src/data/chapter')>();
  return { ...actual, loadChapter: held.wrapped('loadChapter', actual.loadChapter) };
});
vi.mock('../../src/review/kinds', async (original) => {
  const actual = await original<typeof import('../../src/review/kinds')>();
  return { ...actual, loadPassage: held.wrapped('loadPassage', actual.loadPassage) };
});
vi.mock('../../src/settings/registry', async (original) => {
  const actual = await original<typeof import('../../src/settings/registry')>();
  return { ...actual, writeSetting: held.wrapped('writeSetting', actual.writeSetting) };
});
vi.mock('../../src/ui/clipboard', async (original) => {
  const actual = await original<typeof import('../../src/ui/clipboard')>();
  return { ...actual, copy: held.wrapped('copy', actual.copy) };
});

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let errors: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  for (const name of Object.keys(held.calls)) delete held.calls[name];
  held.seen.clear();
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.grammarLevels.clear(), db.passageLessons.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const name of ['clipboard', 'share']) Reflect.deleteProperty(navigator, name);
});

/** Closes the screen, then lets `answer` settle with `window` gone: a screen that guards its setState raises nothing and logs nothing. */
async function closeThenAnswer(answer: () => void): Promise<void> {
  cleanup();
  const raised = await settleAfterTeardown(answer);
  expect(raised).toEqual([]);
  expect(errors).not.toHaveBeenCalled();
}

/**
 * Holds each call in `answers` (it is answered, later, with the value given), runs `start` to make the screen make them, waits until it has, then
 * closes the screen and answers them all at once.
 */
async function closedBeforeAnswer(answers: Record<string, unknown>, start: () => void): Promise<void> {
  const gate = deferred<void>();
  for (const [name, value] of Object.entries(answers)) held.calls[name] = () => gate.promise.then(() => value);
  await act(async () => {
    start();
  });
  await waitFor(() => expect([...held.seen].sort()).toEqual(Object.keys(answers).sort()));
  await closeThenAnswer(() => gate.resolve());
}

/** The file input of Memory with a file whose text is read from `text`. */
function pickFile(input: HTMLElement, text: () => Promise<string>): void {
  Object.defineProperty(input, 'files', { value: [{ text }], configurable: true });
  fireEvent.change(input);
}

describe('Memory', () => {
  it('Export: the saved line is not set on a closed screen', async () => {
    vi.spyOn(downloadSeam, 'save').mockImplementation(() => {});
    render(<MemoryScreen />);
    const button = await screen.findByRole('button', { name: 'Export' });
    await closedBeforeAnswer({ exportMemory: '{}' }, () => fireEvent.click(button));
  });

  it('Import: the file read is not shown on a closed screen', async () => {
    render(<MemoryScreen />);
    const input = await screen.findByLabelText('Memory file');
    const read = deferred<string>();
    await act(async () => pickFile(input, () => read.promise));
    await closeThenAnswer(() => read.resolve('{}'));
  });

  it('Replace my memory: the done line is not set on a closed screen', async () => {
    const { exportMemory } = await vi.importActual<typeof import('../../src/data/repositories/memory')>('../../src/data/repositories/memory');
    const kept = await exportMemory();
    render(<MemoryScreen />);
    const input = await screen.findByLabelText('Memory file');
    await act(async () => pickFile(input, () => Promise.resolve(kept)));
    const replace = await screen.findByRole('button', { name: 'Replace my memory' });
    await closedBeforeAnswer({ replaceMemory: undefined }, () => fireEvent.click(replace));
  });

  it('a note saved: the note does not go back to viewing on a closed screen', async () => {
    await putNote('topic:kept', 'one', 'me');
    render(<MemoryScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit: topic:kept' }));
    const save = await screen.findByRole('button', { name: 'Save' });
    await closedBeforeAnswer({ putNote: 'saved' }, () => fireEvent.click(save));
  });
});

describe('the Goal screen', () => {
  it('the one-time switch note is not set on a closed screen', async () => {
    await closedBeforeAnswer({ takePronunciationSwitch: { from: 'modern', to: 'erasmian' } }, () => {
      render(<GoalScreen />);
    });
  });

  it('Add to my words: the word added is not set on a closed screen', async () => {
    await seedHisWords();
    await setGoal('1 John 1');
    render(<GoalScreen />);
    const next = await screen.findAllByTestId('next-word');
    await closedBeforeAnswer({ addLemmaToLearn: { result: 'added' } }, () => fireEvent.click(next[0]!));
  });
});

describe('the Placement screen', () => {
  it('Start from the letters: the end card is not drawn on a closed screen', async () => {
    render(<PlacementScreen />);
    const letters = await screen.findByRole('button', { name: 'Start from the letters' });
    await closedBeforeAnswer({ listLevels: new Map(), listPassageLessons: [] }, () => fireEvent.click(letters));
  });

  it('Start: the first question is not asked on a closed screen', async () => {
    render(<PlacementScreen />);
    const start = await screen.findByRole('button', { name: 'Start' });
    await closedBeforeAnswer({ loadPassage: [] }, () => fireEvent.click(start));
  });
});

describe('the Quick test', () => {
  it('New round: the round drawn is not set on a closed screen', async () => {
    saveRound({ questions: [{ lemma: 'λόγος', prompt: 'λόγος', gloss: 'word', options: ['word', 'one', 'two', 'three'] }], index: 0, picked: null, missed: [], answers: [] });
    render(<QuizScreen />);
    const another = await screen.findByRole('button', { name: 'New round' });
    await closedBeforeAnswer({ listWords: [], loadChapter: null }, () => fireEvent.click(another));
  });
});

describe('About', () => {
  it('seven taps on the version: Developer mode found is not set on a closed screen', async () => {
    render(<About />);
    const version = screen.getByTestId('build-version');
    await closedBeforeAnswer({ setDeveloper: undefined }, () => {
      for (let i = 0; i < DEVELOPER_TAPS; i += 1) fireEvent.click(version);
    });
  });
});

describe('Settings > Quiz goal', () => {
  const row = rowOf('quizGoal')!;

  it('Save: the draft is not set on a closed screen', async () => {
    const user = userEvent.setup();
    render(<QuizGoalControl row={row} />);
    await user.type(await screen.findByRole('textbox', { name: 'Quiz goal' }), 'to read John');
    const save = screen.getByRole('button', { name: 'Save' });
    await closedBeforeAnswer({ writeSetting: undefined }, () => fireEvent.click(save));
  });

  it('Clear: the draft is not set on a closed screen', async () => {
    await db.settings.put({ key: 'quizGoal', value: 'to read John' });
    render(<QuizGoalControl row={row} />);
    const clear = await screen.findByRole('button', { name: 'Clear' });
    await waitFor(() => expect(clear).toBeEnabled());
    await closedBeforeAnswer({ writeSetting: undefined }, () => fireEvent.click(clear));
  });
});

describe('Copy link and Share', () => {
  const link = <LinkActions url="https://lampas.allmymind.org/#/john/1" title="John 1" />;

  it('Copy link: the link copied line is not set on a closed screen', async () => {
    render(link);
    await closedBeforeAnswer({ copy: true }, () => fireEvent.click(screen.getByRole('button', { name: 'Copy link' })));
  });

  it('Copy link: a refused clipboard does not show the link by hand on a closed screen', async () => {
    render(link);
    await closedBeforeAnswer({ copy: false }, () => fireEvent.click(screen.getByRole('button', { name: 'Copy link' })));
  });

  it('Share: a failed share does not show the link by hand on a closed screen', async () => {
    const shared = deferred<void>();
    Object.defineProperty(navigator, 'share', { value: () => shared.promise, configurable: true });
    render(link);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Share' })));
    await closeThenAnswer(() => shared.reject(new Error('could not share')));
  });
});

describe('Unlock', () => {
  const key = '00'.repeat(31) + '02';
  const unlock = <Unlock locked={{ kind: 'none' }} publicKeyHex={key} onCheckAgain={() => {}} banner={false} />;

  it('Copy: Copied is not set on a closed screen', async () => {
    const written = deferred<void>();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => written.promise }, configurable: true });
    render(unlock);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy' })));
    await closeThenAnswer(() => written.resolve());
  });

  it('Copy: Copied is not taken back on a closed screen', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true });
    render(unlock);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy' })));
    expect(screen.getByRole('button', { name: 'Copied' })).toBeVisible();
    await closeThenAnswer(() => void vi.advanceTimersByTime(2500));
  });
});
