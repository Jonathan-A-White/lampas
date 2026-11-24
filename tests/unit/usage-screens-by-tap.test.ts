// mw-6ww.175.79: the usage log counted a screen on hashchange and popstate only, and the app's own moves (history.pushState, then notify) fire neither,
// so a screen he opened by tapping was never counted. Every function of src/nav/route.ts that moves the address must reach the log.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearBus } from '../../src/events/bus';
import { routeModule as route } from '../support/routes';

const counted: string[] = [];
vi.mock('../../src/data/repositories', async (original) => ({
  ...(await original<typeof import('../../src/data/repositories')>()),
  recordUsage: vi.fn(async (name: string) => {
    counted.push(name);
  }),
}));

import { startUsageLog, usageWritesSettled } from '../../src/tips/usageLog';

/** Each exported function of route.ts that calls history.pushState or replaceState, with arguments that make it move the address from '#/settings'. */
const MOVES: Record<string, () => void> = {
  navigate: () => route.navigate('words'),
  openIpaCourse: () => route.openIpaCourse('he'),
  openHelpPage: () => route.openHelpPage('licence'),
  openLibrary: () => route.openLibrary({ kind: 'lexicon' }),
  openVariantLesson: () => route.openVariantLesson(2),
  openMemorizeSession: () => route.openMemorizeSession('Rom.8.28', 'en'),
  openVerseList: () => route.openVerseList(3),
  openRequests: () => route.openRequests('about'),
  openLicence: () => route.openLicence('reader'),
  openReader: () => route.openReader({ book: 'jhn', chapter: 3, verse: 16 }),
  replaceReader: () => route.replaceReader({ book: 'jhn', chapter: 3 }),
  openHash: () => route.openHash('#/goal'),
  openVerse: () => route.openVerse(5),
  openVerseAt: () => route.openVerseAt({ book: 'jhn', chapter: 3, verse: 16 }),
  openPassage: () => route.openPassage(4),
  openVerseRange: () => route.openVerseRange({ book: 'jhn', chapter: 3, from: 1, to: 3 }),
  openPlacement: () => route.openPlacement('goal'),
  openSoundLesson: () => route.openSoundLesson('theta'),
  openParadigm: () => route.openParadigm({ table: 'article' } as Parameters<typeof route.openParadigm>[0]),
  replaceHash: () => route.replaceHash('#/review'),
};

/** The names of route.ts's exported functions whose body calls pushState or replaceState. */
function movers(): string[] {
  const source = readFileSync('src/nav/route.ts', 'utf8');
  const names: string[] = [];
  for (const part of source.split(/\n(?=export function )/).slice(1)) {
    const name = /^export function (\w+)/.exec(part)?.[1];
    const body = part.split(/\n\}\n/)[0];
    if (name && /\.(pushState|replaceState)\(/.test(body)) names.push(name);
  }
  return names;
}

beforeEach(() => {
  window.history.replaceState(null, '', '/#/settings');
  counted.length = 0;
});
afterEach(() => clearBus());

describe('a move of the app\'s own reaches the usage log', () => {
  it('lists every function of route.ts that writes the address', () => {
    expect(movers().sort()).toEqual(Object.keys(MOVES).sort());
  });

  for (const [name, move] of Object.entries(MOVES)) {
    it(`${name} tells watchAddress's listeners`, () => {
      const told = vi.fn();
      const off = route.watchAddress(told);
      move();
      off();
      expect(told).toHaveBeenCalled();
    });

    it(`${name} is counted as the screen it opened`, async () => {
      const stop = startUsageLog();
      move();
      const now = route.routeOf(window.location.hash);
      await stop();
      await usageWritesSettled();
      if (now !== 'settings') expect(counted).toContain(`screen:${now}`);
      expect(counted.filter((c) => c.startsWith('screen:')).length).toBe(now === 'settings' ? 1 : 2);
    });
  }
});
