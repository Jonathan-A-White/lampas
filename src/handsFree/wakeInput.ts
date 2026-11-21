// src/handsFree/wakeInput.ts — which microphone 'Hey Lampas' is listened for on (mw-5r3p30.1213). voice-kit/wake's startWake opens the phone's default input
// (audio: true), and with the phone on his car's Bluetooth the default is the car's route, which carries no sound: the wake never heard him.
// Here the wake is given a stream of a LIVE input instead, chosen as Postern's hold chooses (voice-kit/composer chooseInput, the shared chooser):
//  1. the Bluetooth or hands-free input the shared chooser picks (the car's hands-free microphone; never Android's 'Headset earpiece' or 'Speakerphone');
//  2. the default (audio: true, as before), unless its route is known silent or is Android's 'Headset earpiece' or 'Speakerphone' (by its name, or a listed
//     input of the same group or name);
//  3. the other real inputs the phone lists (a wired headset, a USB microphone, the phone's own by another name);
//  4. a default that is Android's own route, then Android's own routes by id: only when nothing above is listed or every one is silent.
// An input that carries no sound for QUIET_MS is marked silent and left for the next; the marks are kept until the phone's list of inputs changes (the car connects
// or goes). When every input is silent the wake listens on the default as before. No sound is (mw-5r3p30.1231, a route need not give exact zeros):
//  - a batch of samples that spans less than LEAST_SPAN from its lowest to its highest: exact zeros, a route's constant offset, or the least wobble of dither;
//  - sound that stops before HEARD_MS in all: a pop as the route connects is not a live microphone;
//  - no samples at all in QUIET_MS (a route that never connects).
// Everything it does goes to the wake log (wakeLog.ts): the inputs listed, each one tried and what it gave, where it settled, and every REPORT_MS what it hears
// there with the wake model's best score; a line also goes to the console ("Hands-free: listening for 'Hey Lampas' on ...").
import { chooseInput, type InputDevice } from 'voice-kit/composer';
import { openMicInput } from '../audio/recorder';
import { startWake as kitStartWake, type RunningWake, type StartWakeResult, type WakeFailure, type WakeOptions } from 'voice-kit/wake';
import { levelsText, logInputs, logSettled, logUnsettled, logWake, Meter, named, reportMs, scoreText, shortHash, startScorer, timeNow, type WakeScorer } from './wakeLog';

/** How long an input may give no sound before it is left for the next. */
export const QUIET_MS = 3000;

/** The least span (lowest sample to highest) of a batch that carries sound: four steps of 16-bit sound, about -78 dBFS. A live microphone's own noise spans more;
 * a route that carries nothing spans less, whether it gives exact zeros, a constant offset or the least wobble of dither. */
const LEAST_SPAN = 4 / 32768;

/** How much sound, in all, makes an input live: more than a pop as a route connects. */
export const HEARD_MS = 250;

/** The default input, opened with audio: true (src/audio/recorder.ts openMicInput, the one place in src/ that opens the microphone). */
const DEFAULT_ID = 'default';

/** The pseudo-inputs the browser adds for 'whatever the system default is' (composer's micInput PSEUDO_IDS). */
const PSEUDO_IDS = new Set([DEFAULT_ID, 'communications']);

/** Android's own routes, the phone's microphone with the earpiece or the loudspeaker (composer's micInput BUILT_IN_LABEL): never chosen over another input. */
const BUILT_IN_LABEL = /earpiece|speaker/i;

/** The inputs that gave only silence, by deviceId ('default' for the default), and the list of inputs they were found among. */
const silentInputs = new Set<string>();
let silentAmong = '';

/** Forgets every silent input (tests; a reload does the same). */
export function forgetWakeInputs(): void {
  silentInputs.clear();
  silentAmong = '';
}

/** The marks hold only for the list they were made among: the car connecting or going changes the list, and every input may be heard again. */
function keepMarksFor(devices: readonly InputDevice[]): void {
  const print = devices
    .map((device) => device.deviceId)
    .sort()
    .join('|');
  if (print === silentAmong) return;
  silentInputs.clear();
  silentAmong = print;
}

/** An input as enumerateDevices gives it: the shared chooser's fields and the group, which the default shares with the input it is. */
interface Input extends InputDevice {
  groupId?: string;
}

const builtIn = (device: InputDevice): boolean => BUILT_IN_LABEL.test(device.label);

/** The real inputs the default may be: the same group, or the same name ('Default - <name>' on Chrome). */
function routeOfDefault(entry: Input, real: readonly Input[]): Input[] {
  return real.filter((device) => (!!entry.groupId && device.groupId === entry.groupId) || (device.label !== '' && (entry.label === device.label || entry.label === `Default - ${device.label}`)));
}

/** Whether the default's route is known silent, and whether it is Android's own. */
function defaultRoute(inputs: readonly Input[]): { silent: boolean; builtIn: boolean } {
  const entry = inputs.find((device) => device.deviceId === DEFAULT_ID);
  if (!entry) return { silent: silentInputs.has(DEFAULT_ID), builtIn: false };
  const route = routeOfDefault(
    entry,
    inputs.filter((device) => !PSEUDO_IDS.has(device.deviceId)),
  );
  return {
    silent: silentInputs.has(DEFAULT_ID) || route.some((device) => silentInputs.has(device.deviceId)),
    builtIn: builtIn(entry) || route.some(builtIn),
  };
}

/** The inputs to try for the wake, best first, by deviceId ('default' is the default, audio: true); silent ones are left out. */
export function wakeInputs(devices: readonly Input[]): string[] {
  const inputs = devices.filter((device) => device.kind === 'audioinput');
  keepMarksFor(inputs);
  const real = inputs.filter((device) => !PSEUDO_IDS.has(device.deviceId) && !silentInputs.has(device.deviceId));
  const order: string[] = [];
  const add = (id: string): void => {
    if (!order.includes(id)) order.push(id);
  };
  const bluetooth = chooseInput(real);
  if (bluetooth) add(bluetooth.deviceId);
  const route = defaultRoute(inputs);
  if (!route.silent && !route.builtIn) add(DEFAULT_ID);
  real.filter((device) => !builtIn(device)).forEach((device) => add(device.deviceId));
  if (!route.silent && route.builtIn) add(DEFAULT_ID);
  real.filter(builtIn).forEach((device) => add(device.deviceId));
  return order;
}

async function listInputs(media: MediaDevices): Promise<Input[]> {
  try {
    return (await media.enumerateDevices()).filter((device) => device.kind === 'audioinput');
  } catch {
    return [];
  }
}

const closeStream = (stream: MediaStream): void => stream.getTracks().forEach((track) => track.stop());

const refusedByThePhone = (err: unknown): boolean => {
  const name = typeof err === 'object' && err !== null && 'name' in err ? String((err as { name: unknown }).name) : '';
  return name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError';
};

/** What an input gave while it was watched. */
type Verdict = 'live' | 'silent';

/** Calls `onVerdict` once: 'live' when HEARD_MS of samples have carried sound, 'silent' when `quietMs` of samples have come that carried none first. */
function watchForSilence(quietMs: number, onVerdict: (verdict: Verdict) => void): (samples: Float32Array, inputRate: number) => void {
  let quiet = 0;
  let sound = 0;
  let done = false;
  return (samples, inputRate) => {
    if (done || samples.length === 0) return;
    let low = Infinity;
    let high = -Infinity;
    for (let i = 0; i < samples.length; i++) {
      if (samples[i] < low) low = samples[i];
      if (samples[i] > high) high = samples[i];
    }
    if (high - low >= LEAST_SPAN) {
      sound += samples.length;
      if (sound >= (inputRate * HEARD_MS) / 1000) {
        done = true;
        onVerdict('live');
      }
      return;
    }
    quiet += samples.length;
    if (quiet >= (inputRate * quietMs) / 1000) {
      done = true;
      onVerdict('silent');
    }
  };
}

/** The track's settings the log tells: its rate and channels, and the browser's processing of it. */
function trackText(track: MediaStreamTrack | undefined, inputRate: number): string {
  const settings = (track?.getSettings?.() ?? {}) as MediaTrackSettings;
  const said = (value: unknown): string => (value === undefined ? '-' : String(value));
  return `track ${said(settings.sampleRate)} Hz, ${said(settings.channelCount)} ch, echoCancellation ${said(settings.echoCancellation)}, noiseSuppression ${said(settings.noiseSuppression)}, autoGainControl ${said(settings.autoGainControl)}; the wake hears it at ${inputRate} Hz`;
}

const errorText = (err: unknown): string => {
  const name = typeof err === 'object' && err !== null && 'name' in err ? String((err as { name: unknown }).name) : '';
  const message = err instanceof Error ? err.message : String(err);
  return name && name !== 'Error' ? `${name}: ${message}` : message;
};

export interface LiveInputOptions {
  /** The silence that leaves an input, in ms (QUIET_MS; a test's shorter one). */
  quietMs?: number;
  /** The startWake to call (voice-kit/wake's). */
  startWake?: (options: WakeOptions) => Promise<StartWakeResult>;
}

/**
 * startWake on a live input: the wake listens on the first input of wakeInputs that opens, and moves on to the next when that one gives no sound. Resolves
 * as startWake does; its stop() ends whichever input it is on. When no input opens it is startWake's own open of the default, so a refused microphone fails as
 * before ('permission-denied'). What it does is written to the wake log (wakeLog.ts).
 */
export async function startOnLiveInput(options: WakeOptions, live: LiveInputOptions = {}): Promise<StartWakeResult> {
  const start = live.startWake ?? kitStartWake;
  const quietMs = live.quietMs ?? QUIET_MS;
  const media = navigator.mediaDevices;
  const tried = new Set<string>();
  let stopped = false;
  let refused = false;
  let current: RunningWake | null = null;
  /** The name of the input listened on now, for the line of a wake. */
  let currentName = '';

  /** Opens `id` and starts the wake on it; `watch` false listens without the silence check. Null when it would not open or start. */
  const listenOn = async (id: string, name: string, watch: boolean): Promise<RunningWake | WakeFailure | null> => {
    logWake(`trying ${named(name)} (id ${id === DEFAULT_ID ? id : shortHash(id)})${watch ? '' : ', without the silence check'}`);
    let stream: MediaStream;
    try {
      stream = await openMicInput(id);
    } catch (err) {
      logWake(`${named(name)} would not open: ${errorText(err)}`);
      // a refusal is the page's, not one input's: no other input is tried, and startWake's own open of the default says it (permission-denied), or, where the
      // kit's fake stands in for the wake (the e2e specs' honestWake), opens nothing and listens
      if (refusedByThePhone(err)) refused = true;
      return null;
    }
    if (stopped) {
      closeStream(stream);
      return null;
    }
    const track = stream.getAudioTracks()[0];
    const label = track?.label || name;
    let running: RunningWake | null = null;
    let verdict: Verdict | 'stalled' | null = watch ? null : 'live';
    const openedAt = Date.now();
    const trial = new Meter();
    const report = new Meter();
    let reportedAt = openedAt;
    let scorer: WakeScorer | null | undefined;
    let timers: ReturnType<typeof setTimeout>[] = [];
    let settled = false;
    /** Says where it listens, once the input is known live (or is listened on without the check). */
    const settle = (): void => {
      if (settled || stopped || !running || current !== running) return;
      settled = true;
      currentName = label;
      logSettled(`listening for 'Hey Lampas' on ${named(label)} since ${timeNow()}; ${trackText(running.track, running.inputRate)}`);
    };
    /** The input gave no sound: it is marked and left for the next (once it is the one listened on). */
    const leave = (): void => {
      if (stopped || !running || current !== running) return;
      silentInputs.add(id);
      const seconds = ((Date.now() - openedAt) / 1000).toFixed(1);
      const what = verdict === 'stalled' ? `gave no samples in ${seconds} s` : `gave only silence in ${seconds} s: ${levelsText(trial.take())}`;
      logWake(`${named(label)} ${what}; trying the next input`);
      void moveOn(running);
    };
    const judged = (next: Verdict | 'stalled'): void => {
      if (verdict !== null) return;
      verdict = next;
      if (next === 'live') {
        logWake(`${named(label)} hears: ${levelsText(trial.take())}`);
        settle();
      } else leave();
    };
    const silence = watchForSilence(quietMs, judged);
    let samplesSeen = 0;
    const result = await start({
      ...options,
      stream,
      onWake: (wake) => {
        logWake(`heard 'Hey Lampas' on ${named(currentName || label)}${typeof wake?.score === 'number' ? ` (score ${wake.score.toFixed(3)})` : ''}`);
        options.onWake(wake);
      },
      onInput: (samples, inputRate) => {
        options.onInput?.(samples, inputRate);
        samplesSeen += samples.length;
        if (verdict === null) trial.add(samples);
        report.add(samples);
        if (scorer === undefined) scorer = options.model ? startScorer(options.model, inputRate) : null;
        scorer?.push(samples);
        if (watch) silence(samples, inputRate);
      },
    });
    if (!result.ok) {
      closeStream(stream);
      logWake(`the wake would not start on ${named(label)}: ${result.kind}, ${result.message}`);
      return result.kind === 'not-supported' ? result : null;
    }
    const ended = (): void => {
      timers.forEach((timer) => clearTimeout(timer));
      timers = [];
      scorer?.stop();
      if (settled && current === wake) logUnsettled(`stopped listening on ${named(label)}`);
    };
    const wake: RunningWake = {
      ...result,
      stop: () => {
        ended();
        result.stop();
        closeStream(stream);
      },
    };
    if (stopped) {
      wake.stop();
      return null;
    }
    running = wake;
    current = wake;
    // every REPORT_MS: what the input heard, and the model's best score
    const every = reportMs();
    timers.push(
      setInterval(() => {
        const levels = report.take();
        const seconds = ((Date.now() - reportedAt) / 1000).toFixed(1);
        reportedAt = Date.now();
        void (scorer ? scorer.best() : Promise.resolve(null)).then((best) => {
          if (current === wake && !stopped) logWake(`on ${named(label)}, the last ${seconds} s: ${levelsText(levels)}, ${scoreText(best)}`);
        });
      }, every),
    );
    // a route that never connects gives no samples at all: left as one that gives no sound
    if (watch) timers.push(setTimeout(() => samplesSeen === 0 && judged('stalled'), quietMs));
    if (verdict === 'live') settle();
    else if (verdict !== null) queueMicrotask(leave);
    return wake;
  };

  /** The next input that opens, in the order of wakeInputs (read afresh: a silent input has just been marked, or the list has changed). */
  const next = async (): Promise<RunningWake | WakeFailure | null> => {
    for (;;) {
      if (stopped || refused) return null;
      const devices = await listInputs(media);
      logInputs(devices);
      const id = wakeInputs(devices).find((each) => !tried.has(each));
      if (id === undefined) return null;
      tried.add(id);
      const name = devices.find((device) => device.deviceId === id)?.label || (id === DEFAULT_ID ? 'the default microphone' : id);
      const opened = await listenOn(id, name, true);
      if (opened) return opened;
    }
  };

  /** The silent `from` is ended and the next input taken; when none is left, the default without the check, as before. */
  const moveOn = async (from: RunningWake): Promise<void> => {
    from.stop();
    let opened = await next();
    if (!stopped && !(opened && opened.ok)) {
      logWake('no input heard anything; listening on the default microphone');
      opened = await listenOn(DEFAULT_ID, 'the default microphone', false);
    }
    if (!stopped && !(opened && opened.ok)) logWake('the wake word is not listened for: no input would open');
  };

  const first = await next();
  if (first && !first.ok) return first;
  if (!first) {
    logWake('no input would open; the wake opens the default microphone itself');
    return start(options);
  }
  return {
    ...first,
    stop: () => {
      if (stopped) return;
      current?.stop();
      stopped = true;
    },
  };
}
