// tests/unit/hands-free-audible.test.ts — 'read John 3 in Audible' (mw-rl10piw.11): src/handsFree/audible.ts opens his audio Bible in Audible at the chapter through the door the
// Listen in Audible tap uses (src/plan/useSendOff.ts openInAudible). The plan's rule holds by voice: for the Reading plan's next chapter the listening session is begun BEFORE the link
// opens, with no sheet; for any other chapter there is none. The page staying in front asks for one touch, for 30 s; Audio Bible Off says so and opens nothing; a chapter with no start
// known opens what the link opens today and names the Audible chapter to pick. The OpenEnv is the fake of src/resources/openApp.ts's own tests.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { startPlan, openSession } from '../../src/data/repositories/readingPlan';
import { TOUCH_TO_OPEN, TURN_ON_AUDIO_BIBLE, TOUCH_WINDOW_MS, audibleSeam, forgetAudible, listenInAudible } from '../../src/handsFree/audible';
import { forgetRead } from '../../src/nav/readerRequest';
import { AUDIO_BIBLES, audibleListen } from '../../src/resources/audioBible';
import type { OpenEnv } from '../../src/resources/openApp';
import { audioBibleSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import { ManualClock } from '../support/manual-clock';
import { ASYNC_WAIT_MS } from '../support/timeouts';

// Chapter 5 of John has no start known in this file: the link falls back to the book (src/resources/audioBible.ts audibleListen)
vi.mock('../../src/resources/audibleStarts.json', async (original) => {
  const real = (await original<{ default: { chapters: Record<string, number> } }>()).default;
  const chapters = { ...real.chapters };
  delete chapters['jhn.5'];
  return { default: { ...real, chapters } };
});

const WORD_OF_PROMISE = AUDIO_BIBLES[0]!;
const timeout = ASYNC_WAIT_MS;

/** The OpenEnv of a test: what it is told to open, and the page going away or the wait running out when the test says so. */
class FakeEnv implements OpenEnv {
  waitMs = 1500;
  opened: { url: string; session: unknown }[] = [];
  private afters = new Set<() => void>();
  private aways = new Set<() => void>();
  after(fn: () => void): () => void {
    this.afters.add(fn);
    return () => void this.afters.delete(fn);
  }
  onAway(fn: () => void): () => void {
    this.aways.add(fn);
    return () => void this.aways.delete(fn);
  }
  open(url: string): void {
    // what the plan held at the moment the link opened
    void openSession().then((s) => this.opened.push({ url, session: s }));
  }
  wait(): void {
    [...this.afters].forEach((fn) => fn());
    this.afters.clear();
  }
  away(): void {
    [...this.aways].forEach((fn) => fn());
  }
  /** The links opened once `count` of them have been (the plan is read before each opens). */
  urls = async (count = 1): Promise<string[]> => {
    await vi.waitFor(() => expect(this.opened.length).toBeGreaterThanOrEqual(count), { timeout });
    return this.opened.map((o) => o.url);
  };
}

let env: FakeEnv;
let clock: ManualClock;
let said: string[];
const say = async (text: string): Promise<void> => {
  said.push(text);
};
const touch = (): void => void document.dispatchEvent(new Event('pointerup', { bubbles: true }));
/** A moment in which nothing is to happen. */
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 20)); // a real-time wait: nothing may happen in this window

beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  forgetRead();
  forgetAudible();
  env = new FakeEnv();
  clock = new ManualClock();
  audibleSeam.env = env;
  audibleSeam.clock = clock;
  said = [];
  window.history.replaceState(null, '', '/');
  await setSetting(audioBibleSetting, WORD_OF_PROMISE.id);
});
afterEach(() => {
  forgetAudible();
  vi.restoreAllMocks();
  delete audibleSeam.env;
  delete audibleSeam.clock;
});
afterAll(() => db.close());

describe('the listening session of the Reading plan, by voice', () => {
  it("is begun before the link opens for the plan's next chapter, and the link is stamped with the time it opens", async () => {
    await startPlan('whole-bible', { code: 'jhn', chapter: 3 });
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    await listenInAudible('jhn', 3, say);
    expect(await env.urls()).toEqual([audibleListen(WORD_OF_PROMISE, 'jhn', 3, 1_700_000_000_000).href]);
    // the session was in the plan when the link opened, begun at the same time
    expect(env.opened[0]?.session).toMatchObject({ code: 'jhn', chapter: 3, startedAt: 1_700_000_000_000 });
    expect(said).toEqual(['John 3, in Audible']);
  });

  it('is not begun for any other chapter, though the plan is on', async () => {
    await startPlan('whole-bible', { code: 'jhn', chapter: 3 });
    await listenInAudible('jhn', 4, say);
    expect(await env.urls()).toHaveLength(1);
    expect(env.opened[0]?.session).toBeUndefined();
    expect(await openSession()).toBeUndefined();
  });

  it('is not begun with no plan', async () => {
    await listenInAudible('jhn', 3, say);
    expect(await env.urls()).toHaveLength(1);
    expect(await openSession()).toBeUndefined();
  });
});

describe('Audio Bible Off', () => {
  it('says to turn it on, opens nothing and leaves the sound and the place as they were', async () => {
    await setSetting(audioBibleSetting, 'off');
    await listenInAudible('jhn', 3, say);
    expect(said).toEqual([TURN_ON_AUDIO_BIBLE]);
    expect(TURN_ON_AUDIO_BIBLE).toBe('Turn on Audio Bible in Settings first');
    await flush();
    expect(env.opened).toEqual([]);
    expect(window.location.hash).toBe('');
  });
});

describe('a browser that wants a touch', () => {
  it('says so once when the page is still in front, and a touch within 30 s opens the link made at the touch', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    await listenInAudible('jhn', 3, say);
    await env.urls();
    env.wait();
    await vi.waitFor(() => expect(said).toEqual(['John 3, in Audible', TOUCH_TO_OPEN]), { timeout });
    expect(TOUCH_TO_OPEN).toBe('Touch the screen once to open Audible');
    clock.advance(10_000);
    vi.spyOn(Date, 'now').mockReturnValue(61_000);
    touch();
    await env.urls(2);
    expect(env.opened.map((o) => o.url)).toEqual([audibleListen(WORD_OF_PROMISE, 'jhn', 3, 1000).href, audibleListen(WORD_OF_PROMISE, 'jhn', 3, 61_000).href]);
    // the one touch is all it takes: another opens nothing
    touch();
    await flush();
    expect(env.opened).toHaveLength(2);
    expect(said).toHaveLength(2);
  });

  it('lets go after 30 s: a later touch opens nothing', async () => {
    await listenInAudible('jhn', 3, say);
    await env.urls();
    env.wait();
    clock.advance(TOUCH_WINDOW_MS);
    touch();
    await flush();
    expect(env.opened).toHaveLength(1);
  });

  it('says nothing more when the page went away', async () => {
    await listenInAudible('jhn', 3, say);
    await env.urls();
    env.away();
    env.wait();
    await flush();
    touch();
    await flush();
    expect(said).toEqual(['John 3, in Audible']);
    expect(env.opened).toHaveLength(1);
  });
});

describe('a chapter with no start known', () => {
  it('opens what the link opens today and names the Audible chapter to pick', async () => {
    await listenInAudible('jhn', 5, say);
    expect(await env.urls()).toEqual([WORD_OF_PROMISE.intentUrl]);
    expect(said).toEqual(['John 5, in Audible', 'Pick John 5 in the Audible chapters']);
  });
});
