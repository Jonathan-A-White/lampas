// What the tutor's failure says (mw-5r3p30.340): his phone's connection and the tutor's being down are different things, and the box
// must not blame his phone when the factory's home is off. Every surface (Talk, Ask the tutor, Read it aloud, Quiz me) shows
// TutorError.message through askGrind, so the words are proved here once.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Utils } from '@bsv/sdk';
import { OFFLINE_MESSAGE, TUTOR_OFFLINE_MESSAGE, TutorError, askGrind } from '../../src/services/tutor';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';

const key = Uint8Array.from(Utils.toArray('00'.repeat(31) + '0a', 'hex'));
const isAnswer = (value: unknown): value is { verdict: string } => typeof value === 'object' && value !== null && 'verdict' in value;
const ask = () => askGrind('bible-talk', { reference: 'Colossians 1' }, isAnswer, { key });
const failure = (wait: Promise<unknown>) => wait.then(() => undefined, (error: unknown) => error as TutorError);

let postern: FakePostern;
let online = true;
beforeEach(() => {
  online = true;
  postern = makeFakePostern();
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => postern.fetch(input, init));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('the phone is offline', () => {
  it('says he is offline when the browser says so', async () => {
    online = false;
    postern.down = true;
    const error = await failure(ask());
    expect(error?.failure).toBe('unreachable');
    expect(error?.message).toBe('You are offline. Check your connection and try again.');
    expect(error?.message).toBe(OFFLINE_MESSAGE);
  });

  it('says he is offline when the call fails before any response (a network error)', async () => {
    postern.down = true;
    const error = await failure(ask());
    expect(error?.failure).toBe('unreachable');
    expect(error?.message).toBe(OFFLINE_MESSAGE);
  });
});

describe('the backend answers but the tutor does not', () => {
  it.each([502, 503, 504])('a %i from the backend says the tutor is offline, not his connection', async (status) => {
    postern.gateway = status;
    const error = await failure(ask());
    expect(error?.failure).toBe('unreachable');
    expect(error?.message).toBe('The tutor is offline right now. This is not your connection; try again later.');
    expect(error?.message).toBe(TUTOR_OFFLINE_MESSAGE);
  });
});

describe('one source for the words', () => {
  it('no other file under src writes them: every surface shows TutorError.message', () => {
    const files = readdirSync('src', { recursive: true, encoding: 'utf8' }).filter((f) => /\.tsx?$/.test(f) && f !== join('services', 'tutor.ts'));
    const copies = files.filter((f) => /You are offline\.|The tutor is offline right now|Postern did not answer/.test(readFileSync(join('src', f), 'utf8')));
    expect(copies).toEqual([]);
  });
});
