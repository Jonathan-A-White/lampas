// The AI needs a licence (mw-8m9dyu.2). Everything sent to the mill goes through the ONE gated client (src/services/mill.ts), which refuses without
// a licence: no grist leaves the phone. A guard reads the sources, so a file that reaches for bsv-kit/grist itself fails here.
import { Utils } from '@bsv/sdk';
import { door } from 'bsv-kit/bsv';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { readTimedPage, requireLicence, sendTimedGrist, timedDoor } from '../../src/services/mill';
import { pullStatuses } from '../../src/services/requestStatus';
import { TutorError, askGrind } from '../../src/services/tutor';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';

const key = Uint8Array.from(Utils.toArray('00'.repeat(31) + '0b', 'hex'));
const isAnswer = (value: unknown): value is { verdict: string } => typeof value === 'object' && value !== null && 'verdict' in value;

let postern: FakePostern;

beforeEach(() => {
  postern = makeFakePostern();
  postern.autoReply = { status: 'answered', answer: { verdict: 'well-read' } };
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => postern.fetch(input, init));
});
afterEach(() => {
  setCurrentLicence('licensed');
  vi.unstubAllGlobals();
});

const failure = (wait: Promise<unknown>) => wait.then(() => undefined, (error: unknown) => error);

describe('the gated mill client', () => {
  it('passes a send when the phone is licensed: the grist goes out and the answer comes back', async () => {
    setCurrentLicence('licensed');
    expect(await askGrind('verse-read', { reference: 'Romans 8:28' }, isAnswer, { key })).toEqual({ verdict: 'well-read' });
    expect(postern.received).toHaveLength(1);
  });

  it.each(['not-licensed', 'checking'] as const)('refuses a send when the licence is %s: "No licence", and not one call leaves the phone', async (state) => {
    setCurrentLicence(state);
    const error = await failure(askGrind('verse-read', { reference: 'Romans 8:28' }, isAnswer, { key }));
    expect(error).toBeInstanceOf(TutorError);
    expect((error as TutorError).failure).toBe('no-licence');
    expect(postern.received).toHaveLength(0);
    expect(postern.calls).toEqual([]);
  });

  it('refuses the raw send and the raw read of an answer with the door\'s own "Licence required"', async () => {
    setCurrentLicence('not-licensed');
    const d = new door.Door({ baseUrl: 'https://postern.allmymind.org/api', key });
    const timed = timedDoor(d);
    const send = await failure(sendTimedGrist({ door: timed, key, mill: 'm', app: 'lampas', kind: 'tips', v: '1', input: {}, files: [] }));
    expect(send).toBeInstanceOf(door.RefusedError);
    expect((send as Error).message).toBe(door.LICENCE_REQUIRED);
    expect(await failure(readTimedPage('abc', { door: timed, key, since: 0, mill: 'm', signal: new AbortController().signal }))).toBeInstanceOf(door.RefusedError);
    expect(() => requireLicence()).toThrow(door.LICENCE_REQUIRED);
    expect(postern.calls).toEqual([]);
  });

  it('refuses the request-status pull too', async () => {
    setCurrentLicence('not-licensed');
    expect(await failure(pullStatuses({ key }))).toBeInstanceOf(door.RefusedError);
    expect(postern.calls).toEqual([]);
  });
});

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });

/** The one file under src/ that may reach for the mill's client library. */
const GATE = 'src/services/mill.ts';
/** import ... from 'bsv-kit/grist', export ... from 'bsv-kit/grist', import('bsv-kit/grist'), require('bsv-kit/grist'); a mention in a comment is not one. */
const REACH = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)['"]bsv-kit\/grist(?:\/[^'"]*)?['"]/m;

/** Which of `files` reach for bsv-kit/grist without being the gate. */
const outsideTheGate = (files: { path: string; text: string }[]): string[] => files.filter((f) => f.path !== GATE && REACH.test(f.text)).map((f) => f.path);

describe('every send to the mill goes through the gate', () => {
  const files = [...sources('src'), ...sources('scripts')].map((path) => ({ path, text: readFileSync(path, 'utf8') }));

  it('is the only file under src/ or scripts/ that imports bsv-kit/grist', () => {
    expect(files.find((f) => f.path === GATE)?.text).toMatch(REACH);
    expect(outsideTheGate(files)).toEqual([]);
  });

  it('fails on a file outside the gate that imports it, in any form (planted)', () => {
    const planted = [
      { path: 'src/services/sneaky.ts', text: "import { grist } from 'bsv-kit/grist';\n" },
      { path: 'src/talk/types.ts', text: "import type { grist } from 'bsv-kit/grist';\n" },
      { path: 'src/a.ts', text: "export { grist } from 'bsv-kit/grist';\n" },
      { path: 'src/b.ts', text: "const g = await import('bsv-kit/grist');\n" },
      { path: 'src/c.ts', text: "import {\n  grist,\n} from \"bsv-kit/grist\";\n" },
    ];
    expect(outsideTheGate([...files, ...planted])).toEqual(planted.map((p) => p.path));
  });

  it('does not mind a comment that names the library', () => {
    expect(outsideTheGate([{ path: 'src/x.ts', text: "// sent as a grist through Postern (bsv-kit/grist)\n" }])).toEqual([]);
  });
});
