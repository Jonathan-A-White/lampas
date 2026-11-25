// tests/unit/open-paradigm.test.tsx — the tutor opens a paradigm table when he asks for one (mw-5r3p30.1249, his words of 2026-11-25: 'the tutor would be able to take you to any Paradigm table
// that makes sense to him and you wouldn't have to click the link if you ask'). The command open-paradigm {table} (src/tutor/registry.ts) holds a table of the app's list (PARADIGMS) and the
// answer that names it opens the Paradigms screen at it with no tap: a typed ask once the answer is kept (src/useTalk.ts), a Hands-free ask once the answer has been said (src/handsFree/ask.ts,
// tests/unit/hands-free-ask.test.tsx). A table not in the list is refused and nothing opens; an answer with no such command opens nothing.
import '@testing-library/jest-dom/vitest';
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { PARADIGMS } from '../../src/data/paradigms';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { dropHeldTalk, heldTalk } from '../../src/talkReturn';
import { dropQueuedParadigm, hasQueuedParadigm } from '../../src/tutor/paradigmQueue';
import { lampasRegistry } from '../../src/tutor/registry';
import { stubChapterFetch } from '../support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../support/fake-postern';
import { openTutor } from '../../features/steps/open-tutor';

const registry = lampasRegistry();
const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const ASKED = 'show me the article table';
const OPENS = { answer: 'Here is the article table.', words: [], do: [{ name: 'open-paradigm', args: { table: 'article' } }] };
let fake: FakePostern;

afterAll(async () => {
  cleanup();
  db.close();
});

afterEach(() => {
  cleanup();
  stopReading();
  dropQueuedParadigm();
  dropHeldTalk();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the command open-paradigm', () => {
  beforeEach(() => dropQueuedParadigm());

  it('is a free command that holds a table of the app\'s list, to open once the answer is kept', async () => {
    expect(registry.command('open-paradigm')?.kind).toBe('free');
    const ran = await registry.run('open-paradigm', { table: 'article' });
    expect(ran).toMatchObject({ ok: true, said: 'Opening The article' });
    expect(hasQueuedParadigm()).toBe(true);
  });

  it('takes every table the Paradigms screen has', async () => {
    for (const table of PARADIGMS) {
      dropQueuedParadigm();
      expect((await registry.run('open-paradigm', { table: table.id })).ok, table.id).toBe(true);
    }
  });

  it('refuses a table not in the app\'s list, saying so, and bad args, and holds nothing', async () => {
    const ran = await registry.run('open-paradigm', { table: 'optative' });
    expect(ran.ok).toBe(false);
    expect(ran.ok ? '' : ran.why).toContain('no paradigm table');
    expect((await registry.run('open-paradigm', {})).ok).toBe(false);
    expect((await registry.run('open-paradigm', { table: 7 })).ok).toBe(false);
    expect(hasQueuedParadigm()).toBe(false);
  });
});

/** Opens the app on the Goal screen with a fake Postern behind it that answers `answer`. */
async function openGoal(answer: unknown): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem('lampas.welcome', 'done');
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/goal');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  render(<App />);
}

/** Types `question` in the Talk sheet of the screen and sends it: his last tap. */
async function asks(question: string): Promise<void> {
  const sheet = await openTutor();
  await user.type(within(sheet).getByRole('textbox', { name: 'Your message' }), question);
  await user.click(within(sheet).getByRole('button', { name: 'Send' }));
}

describe('a typed ask for a table', () => {
  it('opens the Paradigms screen at that table with no tap, and holds the talk so Back brings it back', async () => {
    await openGoal(OPENS);
    await asks(ASKED);
    await waitFor(() => expect(window.location.hash).toBe('#/paradigms?t=article'));
    expect(await screen.findByRole('heading', { name: 'The article', level: 1 })).toBeInTheDocument();
    expect(heldTalk()?.hash).toBe('#/goal');
    expect(hasQueuedParadigm()).toBe(false);
    const [turn] = await db.talks.toArray();
    expect(turn.done).toEqual([{ name: 'open-paradigm', kind: 'free', said: 'Opening The article' }]);
  });

  it('opens nothing for a table not in the list, and the turn says it could not', async () => {
    await openGoal({ answer: 'The app has no optative table.', words: [], do: [{ name: 'open-paradigm', args: { table: 'optative' } }] });
    await asks('show me the optative table');
    await waitFor(async () => expect(await db.talks.count()).toBe(1));
    const [turn] = await db.talks.toArray();
    expect(turn.refused?.join(' ')).toMatch(/^Could not open paradigm/);
    expect(window.location.hash).toBe('#/goal');
    expect(hasQueuedParadigm()).toBe(false);
  });

  it('opens nothing when the answer names no command (the tutor never opens a table by itself)', async () => {
    await openGoal({ answer: 'The article table is a good one to learn first.', words: [], links: [{ kind: 'paradigm', table: 'article' }] });
    await asks('what should I learn first?');
    await waitFor(async () => expect(await db.talks.count()).toBe(1));
    expect(await screen.findByRole('button', { name: 'Table: The article' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/goal');
  });
});
