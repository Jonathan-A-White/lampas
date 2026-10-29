// The AI needs a licence (mw-8m9dyu.2). Everything sent to the mill goes through the ONE gated client (src/services/mill.ts), which refuses without
// a licence: no grist leaves the phone. A guard reads the sources, so a file that reaches for bsv-kit/grist itself fails here.
import { Utils } from '@bsv/sdk';
import { door } from 'bsv-kit/bsv';
import { grist } from 'bsv-kit/grist';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { GRIST_KINDS, type GristKind } from '../../src/services/gristKinds';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { readTimedPage, requireLicence, sendTimedGrist, timedDoor } from '../../src/services/mill';
import { pullStatuses } from '../../src/services/requestStatus';
import { buildTalkRequest, isTalkAnswer } from '../../src/services/talk';
import { TutorError, askGrind } from '../../src/services/tutor';
import type { Chapter } from '../../src/data/chapter';
import { actionsFor } from '../../src/verse/action';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';
import '../support/grinds-in-graph';

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

describe('the gate refuses a file the kit does not list', () => {
  const send = (files: { bytes: Uint8Array; mime: string; name?: string }[]) => {
    const d = timedDoor(new door.Door({ baseUrl: 'https://postern.allmymind.org/api', key }));
    return failure(sendTimedGrist({ door: d, key, mill: 'm', app: 'lampas', kind: 'tips', v: '1', input: {}, files }));
  };

  it('names every type of GRIST_FILE_TYPES in its refusal, so a type added to the kit is shown', async () => {
    const error = await send([{ bytes: new Uint8Array([1]), mime: 'application/pdf' }]);
    expect(error).toBeInstanceOf(grist.GristInputError);
    const mimes = grist.GRIST_FILE_TYPES.flatMap((t) => t.mimes);
    expect(mimes.length).toBeGreaterThan(6);
    for (const mime of mimes) expect((error as Error).message).toContain(mime);
    expect(postern.calls).toEqual([]);
  });

  it('holds each type to its kit cap (a photo or a text file each, the audio of the grist together)', async () => {
    for (const type of grist.GRIST_FILE_TYPES) {
      const over = new Uint8Array(type.maxBytes + 1);
      const error = await send([{ bytes: over, mime: type.mimes[0] }]);
      expect(error, type.kind).toBeInstanceOf(grist.GristInputError);
      expect((error as Error).message, type.kind).toContain(String(type.maxBytes + 1));
    }
    expect(postern.calls).toEqual([]);
  });

  it('lets a type the kit lists through the shape check (text/csv under its cap goes up)', async () => {
    const error = await send([{ bytes: new Uint8Array([1, 2, 3]), mime: 'text/csv', name: 'a.csv' }]);
    expect(error).not.toBeInstanceOf(grist.GristInputError);
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

// Every kind of grist the app can send (mw-8m9dyu.5). The gate above refuses a send, but a phone with no licence must not be OFFERED one either: a button that
// ends in a red "No licence" is a bug. mw-8m9dyu.2 hid the tutor's entry points and left Read it aloud (the verse-read grist) and the Reading ladder drawn,
// because this guard watched the wire (who imports the client) and not the kinds: nothing made a new or forgotten kind say where it is hidden.
// So each kind the app sends is listed here with the entry points a phone with no licence is not shown, and each of those names must stand in a scenario
// of its feature file; a kind sent but not listed, or listed but not sent, fails.
const KINDS: Record<GristKind, { hidden: string[]; feature: string }> = {
  'bible-talk': { hidden: ['Talk bar', 'Ask the tutor', 'Help with this word'], feature: 'features/ai-needs-licence.feature' },
  'verse-read': { hidden: ['Read it aloud', 'Hold to read bar', 'Reading ladder'], feature: 'features/ai-needs-licence.feature' },
  tips: { hidden: ['Needs a licence'], feature: 'features/licence-page.feature' },
  feedback: { hidden: ['Needs a licence'], feature: 'features/licence-page.feature' },
  'drill-items': { hidden: ['More drill items'], feature: 'features/fetched-drill-items.feature' },
  'find-refs': { hidden: ['Bible references from a picture'], feature: 'features/ai-needs-licence.feature' },
  'audible-position': { hidden: ['Send a screenshot'], feature: 'features/reading-plan-screenshot.feature' },
  'tutor-weights': { hidden: ['Tutor tuned'], feature: 'features/ai-needs-licence.feature' },
  'sentence-diagram': { hidden: ['Diagram'], feature: 'features/ai-needs-licence.feature' },
};

/** The kinds the app's code sends: the first argument of each askGrind call, a literal or a constant (`export const X = '...'`) found in any file. */
const kindsSent = (files: { path: string; text: string }[]): string[] => {
  const constants = new Map(files.flatMap((f) => [...f.text.matchAll(/\bconst\s+([A-Z_]+)\s*=\s*'([a-z-]+)'/g)].map((m) => [m[1], m[2]] as const)));
  const firsts = files.flatMap((f) => [...f.text.matchAll(/\baskGrind(?:<[^>]*>)?\(\s*(?:'([a-z-]+)'|([A-Z_]+))/g)].map((m) => m[1] ?? constants.get(m[2] as string) ?? (m[2] as string)));
  return [...new Set(firsts)].sort();
};

describe('every kind of grist the app can send is hidden from a phone with no licence', () => {
  const files = sources('src').map((path) => ({ path, text: readFileSync(path, 'utf8') }));
  const listed = (Object.keys(KINDS) as GristKind[]).sort();

  it('lists the kind of every grind the mill is given, and every kind the code sends (verse-read included)', () => {
    const grinds = readdirSync('grinds').filter((n) => /^[a-z-]+\.json$/.test(n)).map((n) => n.replace(/\.json$/, '')).sort();
    expect(grinds).toEqual(listed);
    expect(kindsSent(files)).toEqual(listed);
    expect(listed).toContain('verse-read');
  });

  it('is the registry the gated client takes its kinds from (src/services/gristKinds.ts), each kind once', () => {
    expect([...GRIST_KINDS].sort()).toEqual(listed);
    expect(new Set(GRIST_KINDS).size).toBe(GRIST_KINDS.length);
  });

  it('finds a kind that is sent and not listed (planted)', () => {
    expect(kindsSent([{ path: 'src/x.ts', text: "const NEW_KIND = 'new-thing';\nawait askGrind(NEW_KIND, r, is, o);\nawait askGrind('other-thing', r, is, o);\nawait askGrind<Foo>('third', r, is, o);" }])).toEqual(['new-thing', 'other-thing', 'third']);
  });

  it.each(listed)('%s: a send with no licence is refused and nothing leaves the phone', async (kind) => {
    setCurrentLicence('not-licensed');
    const error = await failure(askGrind(kind, { reference: 'Romans 8:28' }, isAnswer, { key }));
    expect((error as TutorError).failure).toBe('no-licence');
    expect(postern.calls).toEqual([]);
  });

  it.each(listed)('%s: the entry points it is hidden from are named in a "no licence" scenario of its feature', (kind) => {
    const { hidden, feature } = KINDS[kind]!;
    const text = readFileSync(feature, 'utf8');
    const scenarios = text.split(/^\s*Scenario:/m).slice(1).filter((s) => /no licence|not licensed|Needs a licence/i.test(s.split('\n')[0] + (s.match(/Given[^\n]*/)?.[0] ?? '')));
    for (const name of hidden) expect(scenarios.some((s) => s.includes(name)), `${kind}: "${name}" in ${feature}`).toBe(true);
  });
});

describe('the Hebrew entries of the AI are hidden from a phone with no licence too (mw-5vvlay.3)', () => {
  const jonah = JSON.parse(readFileSync('public/data/jon/1.json', 'utf8')) as Chapter;
  const verse10 = jonah.verses.find((v) => v.n === 10);

  it('offers an unlicensed phone only Listen on a verse of an hbo chapter, and a licensed one Ask the tutor and Quiz me but not Diagram', () => {
    expect(actionsFor(false, 'hbo').map((a) => a.id)).toEqual(['listen']);
    expect(actionsFor(true, 'hbo').map((a) => a.id)).toEqual(['listen', 'read', 'ask', 'quiz']);
  });

  it('refuses the ask about Jonah 1:10, Hebrew and all, with no licence, and nothing leaves the phone', async () => {
    if (!verse10) throw new Error('no verse 10');
    setCurrentLicence('not-licensed');
    const request = buildTalkRequest({ title: 'Jonah 1', chapter: jonah, verse: verse10 }, 'What does the Hebrew say for fear?', [], [], { hebrewInterest: '1' });
    expect(request.hebrew_words?.length).toBeGreaterThan(0);
    const error = await failure(askGrind('bible-talk', request, isTalkAnswer, { key }));
    expect((error as TutorError).failure).toBe('no-licence');
    expect(postern.calls).toEqual([]);
  });
});
