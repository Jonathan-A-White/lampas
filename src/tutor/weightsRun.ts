// src/tutor/weightsRun.ts — the nightly tutor-weights run (mw-t3xu9a.8, docs/ask-tutor.md 'How the tutor learns what to carry'). The Governor's words (Talk fd8f425f turn 6): once a night the app 'sends the stats ... to the
// Grist ... this is how you should adjust your weights ... if nothing's changed in the app then it doesn't have to ask anything'; the run is batch, so it may 'take an extra turn that the back end then can ask for exactly what it needs'.
// On the first launch after 03:00 local, at most once a day, and only when the kit's WeightsReport says something changed since the last run (an ask-back, a miss or an applied list newer than it), this reads the report through the
// tutor client on the screen 'nightly', sends it with the facts and the catalogue to the tutor-weights grind (grinds/tutor-weights.json), answers its `asks` once from the registry, forwards the misses worth a story to the factory,
// applies the answer's per-screen lists with applyWeights (from 'grist') and keeps the run (src/data/repositories/tuned.ts) for About's line 'Tutor tuned <date>: N changes'. Every dependency can be replaced, for a test with a fake clock and a fake grist.
import type { Registry, TutorClient, TutorRequest, WeightsReport } from 'voice-kit/talks';
import { DEVICE_KEY_STORAGE_KEY } from '../config';
import { localDate } from '../data/daily/dailyStore';
import { getTuned, keepTuned, type Tuned } from '../data/repositories/tuned';
import { getDeviceKeyBytes } from '../services/deviceKey';
import { forwardMisses, MAX_MISSES, type MissWorthAStory } from '../services/feedback';
import { currentLicence } from '../services/licenceNow';
import { clipText } from '../services/requestBudget';
import { askGrind } from '../services/tutor';
import { bibleTalkRegistry, NIGHTLY_SCREEN, nightlyClient } from './registry';

/** The hour of the local day after which the night's run may go: the first launch at or after 03:00. */
export const NIGHT_HOUR = 3;

/** The kind of the grind (grinds/tutor-weights.json). */
export const WEIGHTS_KIND = 'tutor-weights';

/** The most the request may weigh, as JSON in UTF-8: the grist's payload is capped at 20 KiB sealed, and a request at 9,000 seals to about 12 KiB (src/services/requestBudget.ts), so 14,000 leaves the envelope room. */
export const WEIGHTS_MAX_BYTES = 14_000;

/** The limits of the input schema's report: screens and misses. */
const MAX_SCREENS = 40;
const MAX_REPORT_MISSES = 40;

/** What the grind is sent: the report, and the facts and catalogue the client adds (and `asked` in the follow-up). */
export type WeightsRequest = TutorRequest<{ report: WeightsReport; app_version: string }>;

/** One miss the answer names: the screen and `name` are the report's own, so the app can count it. */
export interface WeightsMiss {
  title: string;
  why: string;
  screen: string;
  name: string;
}

/** What the grind answers (grinds/tutor-weights.answer.schema.json). */
export interface WeightsAnswer {
  lists: Record<string, string[]>;
  reasons: string[];
  misses_worth_a_story?: WeightsMiss[];
  asks?: string[];
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;
const isTexts = (value: unknown, items: number, max: number): value is string[] => Array.isArray(value) && value.length <= items && value.every((v) => isText(v, max));

/** The app's own check of an answer, run before it is believed: the answer schema's shape, no field it does not know. */
export function isWeightsAnswer(value: unknown): value is WeightsAnswer {
  if (!isObject(value)) return false;
  if (Object.keys(value).some((k) => !['lists', 'reasons', 'misses_worth_a_story', 'asks'].includes(k))) return false;
  if (!isObject(value.lists) || !Object.values(value.lists).every((names) => isTexts(names, 8, 80))) return false;
  if (!isTexts(value.reasons, 10, 300)) return false;
  if (value.asks !== undefined && !isTexts(value.asks, 8, 80)) return false;
  if (value.misses_worth_a_story === undefined) return true;
  return (
    Array.isArray(value.misses_worth_a_story) &&
    value.misses_worth_a_story.length <= MAX_MISSES &&
    value.misses_worth_a_story.every((m) => isObject(m) && isText(m.title, 120) && isText(m.why, 400) && isText(m.screen, 80) && isText(m.name, 200) && Object.keys(m).length === 4)
  );
}

/** What a night did. Anything but `tuned` leaves everything as it was. */
export type Night =
  /** before 03:00 local */
  | 'too-early'
  /** a run is already kept for today (or a later day) */
  | 'done-today'
  /** the report says nothing changed since the last run: the grist is not asked */
  | 'unchanged'
  /** offline, no key or no licence */
  | 'not-ready'
  /** the grist, the forward or the report failed: nothing was applied or kept, so the next launch tries again */
  | 'failed'
  | { tuned: Tuned };

export interface NightDeps {
  /** The clock: the time now, local. */
  now?: () => Date;
  /** The client the report and the request are read through, and the lists applied with: the nightly one. */
  client?: Pick<TutorClient<never>, 'weightsReport' | 'applyWeights' | 'buildRequest' | 'upFront'>;
  /** The registry the asked-for facts are read from, and the lists' names are checked against. */
  registry?: Registry;
  /** Whether the phone can ask now (online, a key, a licence): the phone's own check unless given. */
  ready?: () => boolean;
  /** Sends one request to the grind and returns its answer, which it has checked. Throws when it cannot. */
  ask?: (request: WeightsRequest) => Promise<WeightsAnswer>;
  /** Forwards misses to the factory. Throws when it cannot. */
  forward?: (misses: MissWorthAStory[]) => Promise<void>;
}

/** The phone's key, or undefined when it holds none yet (asking never makes one). */
function keyIfAny(): Uint8Array | undefined {
  if (!window.localStorage.getItem(DEVICE_KEY_STORAGE_KEY)) return undefined;
  try {
    return getDeviceKeyBytes();
  } catch {
    return undefined;
  }
}

/** Online, with the phone's key and a licence. */
const phoneCanAsk = (): boolean => navigator.onLine !== false && keyIfAny() !== undefined && currentLicence() === 'licensed';

const askTheGrind = (request: WeightsRequest): Promise<WeightsAnswer> => {
  const key = keyIfAny();
  if (!key) return Promise.reject(new Error('this phone holds no key'));
  return askGrind(WEIGHTS_KIND, request, isWeightsAnswer, { key, untimed: true });
};

const jsonBytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

/** The report as plain data (a rate with nothing to rate has no `before`, not an undefined one), within the schema's limits, and without the screen 'nightly': building this very request notes a turn there, and it is no screen of his. */
function plainReport(report: WeightsReport): WeightsReport {
  const plain = JSON.parse(JSON.stringify(report)) as WeightsReport;
  delete plain.screens[NIGHTLY_SCREEN];
  plain.misses = plain.misses.slice(0, MAX_REPORT_MISSES);
  return plain;
}

/** The report without its quietest screens (the fewest ask-backs counted) while it is over the schema's screens or `fits` says the request is still too big. */
function fitReport(report: WeightsReport, fits: (report: WeightsReport) => boolean): WeightsReport {
  const fitted: WeightsReport = { ...report, screens: { ...report.screens } };
  const weight = (screen: string): number => Object.values(fitted.screens[screen].counts).reduce((sum, n) => sum + n, 0);
  let names = Object.keys(fitted.screens);
  while (names.length > 1 && (names.length > MAX_SCREENS || !fits(fitted))) {
    const [least] = [...names].sort((a, b) => weight(a) - weight(b));
    delete fitted.screens[least];
    names = names.filter((n) => n !== least);
  }
  return fitted;
}

/** Reads each fact `names` asks for from the registry, by name; a name that is no fact, or a read that fails, is answered as unavailable. Never throws, and records nothing: the night's own reads are not counts of his. */
async function readAsked(registry: Registry, names: readonly string[]): Promise<Record<string, unknown>> {
  const asked: Record<string, unknown> = {};
  for (const name of [...new Set(names)]) {
    const read = await registry.read(name).catch((error: unknown) => ({ ok: false as const, why: error instanceof Error ? error.message : 'the read failed' }));
    asked[name] = read.ok ? read.value : { unavailable: read.why };
  }
  return asked;
}

/** The facts that were read, cut while the request is over `max`: the biggest value first, as text clipped a tenth at a time, and given up as unavailable once it is short. */
function clipAsked(request: WeightsRequest, max: number): WeightsRequest {
  const asked = { ...request.asked };
  const made = (): WeightsRequest => ({ ...request, asked });
  while (jsonBytes(made()) > max) {
    const biggest = Object.keys(asked).sort((a, b) => jsonBytes(asked[b]) - jsonBytes(asked[a]))[0];
    if (biggest === undefined) break;
    const text = typeof asked[biggest] === 'string' ? (asked[biggest] as string) : JSON.stringify(asked[biggest]);
    if (text.length <= 200) {
      if (jsonBytes(asked[biggest]) <= jsonBytes(TOO_BIG)) break;
      asked[biggest] = TOO_BIG;
    } else asked[biggest] = clipText(text);
  }
  return made();
}

const TOO_BIG = { unavailable: 'too big to send' };

/** The misses of the answer that the report holds, each with the count the report has for it; one the report does not hold has nothing to count and is dropped. */
export function missesOf(answer: WeightsAnswer, report: WeightsReport): MissWorthAStory[] {
  const out: MissWorthAStory[] = [];
  for (const named of answer.misses_worth_a_story ?? []) {
    const held = report.misses.find((m) => m.screen === named.screen && m.name === named.name);
    if (held && !out.some((m) => m.screen === named.screen && m.title === named.title)) out.push({ title: named.title, why: named.why, screen: named.screen, count: held.count });
  }
  return out.slice(0, MAX_MISSES);
}

const sameNames = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((name) => b.includes(name));

/**
 * One night. Reads the last run; before 03:00 local, or with a run kept for today, does nothing. Otherwise reads the report since the last run and, if it says something changed and the phone can ask, sends it (one extra turn
 * at most, for the facts the answer asks for), forwards the misses worth a story, applies the lists that change a screen's up-front list and keeps the run. A failure of the grist or of the forward changes and keeps nothing, so the
 * next launch tries the same report again. Never throws.
 */
export async function tuneTheWeights(deps: NightDeps = {}): Promise<Night> {
  try {
    const now = (deps.now ?? (() => new Date()))();
    if (now.getHours() < NIGHT_HOUR) return 'too-early';
    const today = localDate(now);
    const last = await getTuned();
    if (last && last.date >= today) return 'done-today';
    const client = deps.client ?? nightlyClient();
    const registry = deps.registry ?? bibleTalkRegistry();
    const report = await client.weightsReport(last?.at ?? 0);
    if (!report.changed) return 'unchanged';
    if (!(deps.ready ?? phoneCanAsk)()) return 'not-ready';

    const ask = deps.ask ?? askTheGrind;
    const forward = deps.forward ?? ((misses: MissWorthAStory[]) => forwardMisses(misses));
    const make = (shown: WeightsReport): Promise<WeightsRequest> => client.buildRequest(0, { report: shown, app_version: __APP_VERSION__ });
    // the report gives up its quietest screens while the request, with the facts and the catalogue the client adds, is over the cap
    const plain = plainReport(report);
    let request = await make(plain);
    if (jsonBytes(request) > WEIGHTS_MAX_BYTES || Object.keys(plain.screens).length > MAX_SCREENS) {
      const base = request;
      request = await make(fitReport(plain, (shown) => jsonBytes({ ...base, report: shown }) <= WEIGHTS_MAX_BYTES));
    }

    let answer = await ask(request);
    if (answer.asks && answer.asks.length > 0) {
      // the extra turn: the facts it asked for, as read; whatever the second answer asks for again is not read
      const asked = await readAsked(registry, answer.asks.slice(0, 8));
      answer = await ask(clipAsked({ ...request, asked }, WEIGHTS_MAX_BYTES));
    }

    const misses = missesOf(answer, report);
    if (misses.length > 0) await forward(misses);

    // a list that is the one read now is no change and writes no record; a screen the report does not have is left alone
    const core = new Set(registry.facts.filter((f) => f.core).map((f) => f.name));
    const lists: Record<string, string[]> = {};
    for (const [screen, wanted] of Object.entries(answer.lists)) {
      if (screen === NIGHTLY_SCREEN || !Object.prototype.hasOwnProperty.call(report.screens, screen)) continue;
      const names = [...new Set(wanted)].filter((name) => registry.fact(name) !== undefined && !core.has(name));
      const current = (await client.upFront(screen)).filter((name) => !core.has(name));
      if (!sameNames(names, current)) lists[screen] = wanted;
    }
    const applied = await client.applyWeights(lists, 'grist', report.at);

    const run: Tuned = { date: today, at: report.at, changes: applied.length, reasons: answer.reasons, forwarded: misses.length };
    await keepTuned(run);
    return { tuned: run };
  } catch (error) {
    console.warn('the nightly tutor-weights run failed', error);
    return 'failed';
  }
}

let started = false;

/** The launch's one try (src/tutor/NightlyTuning.tsx): at most one a page life, whatever it did. */
export function startNightlyTuning(deps: NightDeps = {}): Promise<Night | undefined> {
  if (started) return Promise.resolve(undefined);
  started = true;
  return tuneTheWeights(deps);
}

/** For a test: lets the next launch try again. */
export function forgetNightlyStart(): void {
  started = false;
}
