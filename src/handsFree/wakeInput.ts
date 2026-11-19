// src/handsFree/wakeInput.ts — which microphone 'Hey Lampas' is listened for on (mw-5r3p30.1213). voice-kit/wake's startWake opens the phone's default input
// (getUserMedia with audio: true), and with the phone on his car's Bluetooth the default is the car's route, which carries no sound: the wake never heard him.
// Here the wake is given a stream of a LIVE input instead, chosen as Postern's hold chooses (voice-kit/composer chooseInput, the shared chooser):
//  1. the Bluetooth or hands-free input the shared chooser picks (the car's hands-free microphone; never Android's 'Headset earpiece' or 'Speakerphone');
//  2. the default (audio: true, as before), unless its route is known silent or is Android's 'Headset earpiece' or 'Speakerphone' (by its name, or a listed
//     input of the same group or name);
//  3. the other real inputs the phone lists (a wired headset, a USB microphone, the phone's own by another name);
//  4. a default that is Android's own route, then Android's own routes by id: only when nothing above is listed or every one is silent.
// An input whose samples are all silence (not one sample past the least step of 16-bit sound, which a live microphone's own noise always passes) for QUIET_MS
// is marked silent and left for the next; the marks are kept until the phone's list of inputs changes (the car connects or goes). When every input is silent
// the wake listens on the default as before. A log line names the input it listens on: "Hands-free: listening for 'Hey Lampas' on <name>".
import { chooseInput, type InputDevice } from 'voice-kit/composer';
import { startWake as kitStartWake, type RunningWake, type StartWakeResult, type WakeFailure, type WakeOptions } from 'voice-kit/wake';

/** How long an input may give only silence before it is left for the next. A car's route that carries no sound gives exact zeros from the start. */
export const QUIET_MS = 3000;

/** The least sound a 16-bit sample can carry: a live microphone's own noise passes it, a route that carries no sound never does. */
const LEAST_SOUND = 1 / 32768;

/** The default input, opened with audio: true. */
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

/** Calls `onSilent` once when QUIET_MS of samples have come and not one carried sound; any sound ends the watch. */
function watchForSilence(quietMs: number, onSilent: () => void): (samples: Float32Array, inputRate: number) => void {
  let heard = 0;
  let done = false;
  return (samples, inputRate) => {
    if (done) return;
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i]) >= LEAST_SOUND) {
        done = true;
        return;
      }
    }
    heard += samples.length;
    if (heard >= (inputRate * quietMs) / 1000) {
      done = true;
      onSilent();
    }
  };
}

const log = (line: string): void => console.info(`Hands-free: ${line}`);

export interface LiveInputOptions {
  /** The silence that leaves an input, in ms (QUIET_MS; a test's shorter one). */
  quietMs?: number;
  /** The startWake to call (voice-kit/wake's). */
  startWake?: (options: WakeOptions) => Promise<StartWakeResult>;
}

/**
 * startWake on a live input: the wake listens on the first input of wakeInputs that opens, and moves on to the next when that one gives only silence. Resolves
 * as startWake does; its stop() ends whichever input it is on. When no input opens it is startWake's own open of the default, so a refused microphone fails as
 * before ('permission-denied').
 */
export async function startOnLiveInput(options: WakeOptions, live: LiveInputOptions = {}): Promise<StartWakeResult> {
  const start = live.startWake ?? kitStartWake;
  const quietMs = live.quietMs ?? QUIET_MS;
  const media = navigator.mediaDevices;
  const tried = new Set<string>();
  let stopped = false;
  let current: RunningWake | null = null;

  /** Opens `id` and starts the wake on it; `watch` false listens without the silence check. Null when it would not open or start. */
  const listenOn = async (id: string, name: string, watch: boolean): Promise<RunningWake | WakeFailure | null> => {
    let stream: MediaStream;
    try {
      stream = await media.getUserMedia(id === DEFAULT_ID ? { audio: true } : { audio: { deviceId: { exact: id } } });
    } catch (err) {
      return refusedByThePhone(err) ? { ok: false, kind: 'permission-denied', message: 'The microphone was not allowed.' } : null;
    }
    if (stopped) {
      closeStream(stream);
      return null;
    }
    const label = stream.getAudioTracks()[0]?.label || name;
    let running: RunningWake | null = null;
    let quiet = false;
    /** The input gave only silence: it is marked and left for the next (once it is the one listened on). */
    const leave = (): void => {
      if (stopped || !running || current !== running) return;
      silentInputs.add(id);
      log(`heard nothing on ${label}; trying the next input`);
      void moveOn(running);
    };
    const silence = watchForSilence(quietMs, () => {
      quiet = true;
      leave();
    });
    const result = await start({
      ...options,
      stream,
      onInput: (samples, inputRate) => {
        options.onInput?.(samples, inputRate);
        if (watch) silence(samples, inputRate);
      },
    });
    if (!result.ok) {
      closeStream(stream);
      return result.kind === 'not-supported' ? result : null;
    }
    const wake: RunningWake = {
      ...result,
      stop: () => {
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
    log(`listening for 'Hey Lampas' on ${label}`);
    if (quiet) queueMicrotask(leave);
    return wake;
  };

  /** The next input that opens, in the order of wakeInputs (read afresh: a silent input has just been marked, or the list has changed). */
  const next = async (): Promise<RunningWake | WakeFailure | null> => {
    for (;;) {
      if (stopped) return null;
      const devices = await listInputs(media);
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
      log('no input heard anything; listening on the default microphone');
      opened = await listenOn(DEFAULT_ID, 'the default microphone', false);
    }
    if (!stopped && !(opened && opened.ok)) log('the wake word is not listened for: no input would open');
  };

  const first = await next();
  if (first && !first.ok) return first;
  if (!first) return start(options);
  return {
    ...first,
    stop: () => {
      if (stopped) return;
      stopped = true;
      current?.stop();
    },
  };
}
