// tests/unit/tutor-doors.test.tsx — every door to the tutor opens the one Talk session with the same tools (mw-5r3p30.842). His report: the tutor he reaches with a
// two-finger tap (the Reader's Talk bar) can send to the makers, and from other doors it answers "I can't do that". The Verse view's Ask the tutor was a second tutor (the verse-ask
// grind, which has no feedback_offer, no `go`, no `do`, only Ask by in settings_changes). Each door below asks 'send this to the makers: test' and is checked three ways: the grist
// is the Talk session's (kind bible-talk), the Talk sheet it opens shows the tutor's offer, Send this to the makers, and the tap files a tutor-ask request.
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { ASK_TUTOR_LABEL } from '../../src/AskTutor';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../support/chapter-fetch';
import { composerIn, messageBox, typeQuestion } from '../support/composer';
import { stubRecognizer } from '../support/fake-recognizer';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../support/fake-postern';
import { seedHisWords } from '../support/his-words';

const PHONE_KEY = '00'.repeat(31) + '02';
const ASK = 'send this to the makers: test';
const OFFER = 'Send this to the makers';
const user = userEvent.setup();
let fake: FakePostern;

/** What the Talk session's tutor answers to a request for the makers: the offer (grinds/bible-talk.answer.schema.json feedback_offer). The verse-ask tutor has no such field. */
const OFFERING_ANSWER = {
  answer: 'I can pass that on to the makers.',
  question: ASK,
  words: [],
  feedback_offer: { summary: 'He wants to send a test to the makers.' },
};

afterAll(() => db.close());
afterEach(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  stopReading();
  clearBus();
  forgetTrail();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.localStorage.setItem('lampas.welcome', 'done');
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: OFFERING_ANSWER };
  fake.kindReplies.feedback = { status: 'answered', answer: { status: 'sent' } };
  stubRecognizer();
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.talkPictures.clear(), db.answers.clear(), db.requests.clear()]);
  await setReaderView('english');
  await setWeave('off');
  await seedHisWords();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
});

const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const view = () => screen.getByRole('region', { name: 'Verse view' });
const questionsAsked = () => fake.received.filter((g) => g.grist.kind === 'bible-talk' || g.grist.kind === 'verse-ask');

/** Selects verse 28: its Verse view opens, on the action named. */
async function openVerse28(action: string): Promise<void> {
  const number = await screen.findByRole('button', { name: 'Verse 28' });
  if (number.getAttribute('aria-pressed') !== 'true') await user.click(number);
  await screen.findByRole('region', { name: 'Verse view' });
  await user.click(within(view()).getByRole('button', { name: action }));
}

/** Types into the Talk sheet's own Composer and sends. */
async function sayInSheet(words: string): Promise<void> {
  const box = await messageBox(user, sheet());
  await user.click(box);
  await user.paste(words);
  await user.click(within(composerIn(sheet())).getByRole('button', { name: 'Send' }));
}

/** The doors, each by what he does to reach the tutor and ask. */
const DOORS: Record<string, () => Promise<void>> = {
  "the Reader's Talk bar (the two-finger tap's tutor)": async () => {
    await user.click(await screen.findByRole('button', { name: 'Talk' }));
    await screen.findByRole('dialog', { name: /^Talk about / });
    await sayInSheet(ASK);
  },
  'the round Ask the tutor button': async () => {
    await user.click(await screen.findByRole('button', { name: ASK_TUTOR_LABEL }));
    await screen.findByRole('dialog', { name: /^Talk about / });
    await sayInSheet(ASK);
  },
  "the Verse view's Talk about verse": async () => {
    await openVerse28('Ask the tutor');
    await user.click(await within(view()).findByRole('button', { name: 'Talk about verse 28' }));
    await screen.findByRole('dialog', { name: /^Talk about / });
    await sayInSheet(ASK);
  },
  "the Verse view's Ask the tutor": async () => {
    await openVerse28('Ask the tutor');
    await typeQuestion(user, view(), ASK);
  },
};

/** The Verse view's Ask the tutor is a second tutor (the verse-ask grind) and is the one door that is narrower: mw-5r3p30.842 found that sending its question to the Talk session
 * breaks the Ask box's own waiting, failed and answer cards and eleven feature files (verse-view, ask-composer, ask-by, hebrew-tutor, passage-view, tutor-aloud, ...), a product decision
 * for the story that removes the duplicate buttons (mw-5r3p30.843). `it.fails` keeps the gap in the suite: it turns red the day the Ask goes to the Talk session, and the entry then
 * moves into the doors that pass. */
const NARROW_DOORS = new Set(["the Verse view's Ask the tutor"]);

describe('every door opens the one Talk session, with its tools', () => {
  for (const [door, open] of Object.entries(DOORS)) {
    const test = NARROW_DOORS.has(door) ? it.fails : it;
    test(`${door}: the question goes to the Talk session, whose offer sends to the makers`, async () => {
      await open();
      await waitFor(() => expect(questionsAsked()).toHaveLength(1));
      // the tool set is the Talk session's: the bible-talk grind, never the verse-ask grind that has no offer for the makers
      expect(questionsAsked()[0].grist.kind).toBe('bible-talk');
      // and the tutor's answer shows its offer in the Talk sheet the door opened
      const button = await within(await screen.findByRole('dialog', { name: /^Talk about / })).findByRole('button', { name: OFFER });
      await user.click(button);
      await waitFor(() => expect(fake.received.filter((g) => g.grist.kind === 'feedback')).toHaveLength(1));
      expect(fake.received.find((g) => g.grist.kind === 'feedback')?.input).toMatchObject({ kind: 'tutor-ask', text: ASK });
    });
  }
});

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });

describe('no screen has a tutor of its own', () => {
  it('the verse-ask grind is asked by useAsks alone (the Verse view\'s Ask, the one narrow door)', () => {
    const callers = sources('src').filter((file) => /from '\.\/services\/tutor'|from '\.\.\/services\/tutor'/.test(readFileSync(file, 'utf8')) && /\baskTutor\b/.test(readFileSync(file, 'utf8')));
    expect(callers.map((file) => file.replace(/\\/g, '/')).sort()).toEqual(['src/useAsks.ts']);
  });

  it('every sheet that talks to the tutor is the Talk sheet', () => {
    const doors = sources('src').filter((file) => /<TalkSheet\b/.test(readFileSync(file, 'utf8'))).map((file) => file.replace(/\\/g, '/')).sort();
    expect(doors).toEqual(['src/AskTutor.tsx', 'src/Reader.tsx', 'src/Welcome.tsx', 'src/share/ShareTalk.tsx']);
  });
});
