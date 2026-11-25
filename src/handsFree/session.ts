// src/handsFree/session.ts — the ONE Hands-free session of the app (mw-rl10piw.6): voice-kit/handsfree's session over voice-kit/wake, started while the Hands-free
// setting is On (src/handsFree/HandsFreeGate.tsx calls runHandsFree) and stopped when it is Off. On 'Hey Lampas' it pauses what is sounding (playback.ts), sounds a
// short soft chime as the microphone opens for the command, takes the silence he chose after his words as the end (his setting 'Pause before it acts', 1.5 s to start; the kit reads it at each command), and hands the words to commands.ts;
// when the exchange is over what it paused goes on. The microphone is handed over ('handover', the kit's default): the wake's stream is closed before the recogniser
// opens and opened again after, the same path as a hold-to-talk.
//  - The wake model (voice-kit/wake/models/hey-lampas.json, about 470 KB) is not in the app's first download: it is fetched as a file the first time Hands-free is
//    turned On (WAKE_MODEL_URL, a hashed asset of the build) and the service worker keeps it (src/sw.ts), so a later start works offline.
//  - The command's recogniser is composer's browserSpeech, the transcriber a Talk hold listens through, in its language (en-US) and on the input a hold chooses: the car's Bluetooth or hands-free microphone
//    when the phone lists one (openBluetoothInput), else the phone's default (mw-5r3p30.1224).
//  - While another feature has the microphone (micBusy.ts: a hold-to-talk, a recording) the session is stopped, its stream closed; it starts again after.
//  - The mark (HandsFreeGate) shows the session's state through `handsFreeSource`. A microphone refused turns the setting Off and says MIC_REFUSED on screen and aloud.
//  - 'needs-touch' (the audio will not start until the page is touched): the next touch anywhere starts it again; it never pretends to listen.
//  - The wake listens on a live input, not simply the phone's default (wakeInput.ts, mw-5r3p30.1213): on his car's Bluetooth the default is the car's route,
//    which carries no sound; the shared chooser's Bluetooth pick is tried first, an input that gives only silence is left for the next, and a log line names it.
//  - What the wake does is kept in the wake log (wakeLog.ts, mw-5r3p30.1231): its inputs, what each heard, where it settled, the session's states and the command's
//    input; Settings, Hands-free 'Send what Hands-free heard' and a three-finger long press send it to the makers (sendLog.ts).
//  - While the tutor speaks (an answer read aloud, by itself or from its speaker; any text a 'Read aloud' speaker reads) no microphone is open (mw-rl10piw.74): on Android an
//    open microphone puts the phone's sound on the call route (the voice goes soft, and on the car's Bluetooth narrow), and a microphone opening, closing or moving
//    between inputs as it speaks cuts the voice off. The wake lets go of its microphone as the reading begins, the voice starts MIC_SETTLE_MS after (readAloud's answer
//    gate), and the wake listens again when the reading is over or stopped; a command's recogniser open at that moment (the follow-up window) is put down too. So the
//    wake word is not heard while the tutor speaks: the speaking bar's Stop (or a tap on the answer) stops it, and a wake while the answer is still awaited cuts it as before.
//  - Any other failed wake (the model cannot be fetched, no microphone, a browser with no wake) is told on screen and aloud (COULD_NOT_START); the mic-less and fetch-less kinds
//    start again by themselves when the network is back ('online') or on the next touch anywhere, and the setting stays On; a browser that cannot do it at all turns it Off.
import modelUrl from 'voice-kit/wake/models/hey-lampas.json?url';
import { browserSpeech, canChooseInput, openBluetoothInput } from 'voice-kit/composer';
import { browserWake, createChimes, createHandsFree, documentVisibility, type ChimePort, type HandsFree, type HandsFreeClock, type HandsFreeState, type WakePort } from 'voice-kit/handsfree';
import type { WakeModel } from 'voice-kit/wake';
import { handsFreePauseSetting } from '../settings/definitions/handsFreePause';
import { handsFreeSetting } from '../settings/definitions/handsFree';
import { handsFreePauseMs, type HandsFreePauseValue } from '../settings/definitions/handsFreePause';
import { getSetting, onSetting, setSetting } from '../settings/store';
import { openMicInput } from '../audio/recorder';
import { SETTING_SAID_KEY, speakText, whenSaid } from '../speech/greek';
import { getReading, setAnswerGate, subscribeReading } from '../speech/readAloud';
import { forgetAsk, interruptAsk } from './ask';
import { runCommand } from './commands';
import { isMicBusy, onMicBusy } from './micBusy';
import { forgetPlayback, goOnAtClose, SAID_KEY, silenceAtWake, takeSound } from './playback';
import { forgetWakeInputs, startOnLiveInput, wakeFoundSilent, wakeLiveInput } from './wakeInput';
import { logWake } from './wakeLog';

/** Where the build serves the wake model (a hashed asset, fetched only when Hands-free is first turned On). */
export const WAKE_MODEL_URL: string = modelUrl;

// The pause he chose, kept here because the kit asks for it at each command and cannot wait for a read of the store: the saved value is read when the session is made and a
// later change (his tap, the tutor's, an undo) arrives on the bus (followed from when the session is made); the kit reads it at the next command, so the wake is not restarted.
let pauseValue: HandsFreePauseValue = handsFreePauseSetting.default;
let unfollowPause: (() => void) | null = null;
/** Starts following the setting (the bus), and reads the saved value; once for a session. */
function followPause(): void {
  unfollowPause?.();
  let changed = false;
  unfollowPause = onSetting(handsFreePauseSetting, (value) => {
    changed = true;
    pauseValue = value;
  });
  void getSetting(handsFreePauseSetting).then((saved) => {
    // a change that arrived while the saved value was being read is the later one
    if (!changed) pauseValue = saved;
  });
}
/** The silence that ends the next command, in milliseconds. */
const pauseNow = (): number => handsFreePauseMs(pauseValue);

/** What is said, on screen and aloud, when the browser refuses the microphone. */
export const MIC_REFUSED = "Lampas may not use the microphone. Allow it in the browser's site settings, then turn Hands-free on again.";

/** What is said, on screen and aloud, when the wake could not start for a reason that may pass (the model not fetched, no microphone found): it tries again by itself. */
export const COULD_NOT_START = "Hands-free could not start: the wake word could not be loaded or the microphone was not found. It tries again when the network is back, or when you touch the screen.";

/** What is said when this browser cannot listen for the wake word at all: no retry would help, so Hands-free turns itself Off. */
export const NOT_SUPPORTED = 'This browser cannot listen for the wake word, so Hands-free is off.';

/** The language a command is heard in: the Talk hold's (src/talk/useTalkHold.ts). */
const COMMAND_LANG = 'en-US';

/** The longest a sentence it says is waited for, should the phone never say it has ended. */
const SAY_WAIT_MS = 8000;

/** For tests: the clock the session's own waits run on (the pause, the 6 s with no words), read when the session is made; `quietMs`, the silence that leaves
 * a wake's input (wakeInput.ts QUIET_MS), read at each start. */
export const handsFreeSeam: { clock?: HandsFreeClock; chime?: ChimePort; quietMs?: number } = {};

const realClock: HandsFreeClock = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};
const clockNow = (): HandsFreeClock => handsFreeSeam.clock ?? realClock;

// --- the microphone the wake holds ----------------------------------------------------------------------------------------------------------------

/** How long after the wake lets go of the microphone a sentence waits, for the phone's audio to settle back from the call route (a sentence started in the same instant is clipped at both ends, mw-rl10piw.50). */
const MIC_SETTLE_MS = 150;

/** The longest a sentence waits for the microphone to be let go, should the wake never say it has stopped. */
const MIC_WAIT_MS = 2000;

let wakesOpen = 0;
let closedAt = Number.NEGATIVE_INFINITY;
const closeWaiters = new Set<() => void>();

function wakeClosed(): void {
  wakesOpen = Math.max(0, wakesOpen - 1);
  if (wakesOpen > 0) return;
  closedAt = Date.now();
  [...closeWaiters].forEach((waiter) => waiter());
}

/** Calls `then` once the wake has let go of the microphone and the phone's audio has had MIC_SETTLE_MS to settle: at once when no wake is open and none closed just now.
 * A sentence said at the moment the microphone closes is clipped at both ends on a phone (mw-rl10piw.50). Returns the way to give up waiting, which never calls `then`. */
export function whenMicClosed(then: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let over = false;
  const give = (): void => {
    over = true;
    clearTimeout(timer);
    closeWaiters.delete(check);
  };
  const go = (): void => {
    if (over) return;
    give();
    then();
  };
  function check(): void {
    if (over || wakesOpen > 0) return;
    clearTimeout(timer);
    timer = setTimeout(go, MIC_SETTLE_MS);
  }
  if (wakesOpen === 0) {
    const left = MIC_SETTLE_MS - (Date.now() - closedAt);
    if (left <= 0) {
      then();
      return () => undefined;
    }
    timer = setTimeout(go, left);
    return give;
  }
  closeWaiters.add(check);
  // a wake that never says it has stopped must not keep the sentence silent
  timer = setTimeout(go, MIC_WAIT_MS);
  return give;
}

/** A microphone other than the wake's (the command's recogniser) was let go just now: a sentence waits MIC_SETTLE_MS from here too. */
function micLetGo(): void {
  if (wakesOpen === 0) closedAt = Date.now();
}

// --- while the tutor speaks, no microphone ---------------------------------------------------------------------------------------------------

/** Whether the tutor's voice holds the speech: an answer, or a text a speaker reads (readAloud's `answer`), read or paused. The microphone stays shut meanwhile (mw-rl10piw.74).
 * A Listen (the passage player, the Verse view's Listen: the Bible's text, as a chapter read is) is not: the wake is heard over it, to pause or stop it. */
const tutorSpeaks = (): boolean => {
  const reading = getReading();
  return reading.status !== 'idle' && reading.answer !== null && reading.listen === null;
};

let micShut = false;
const shutListeners = new Set<() => void>();

/** Calls `listener` each time the microphone is shut for the tutor's voice or may open again; returns how to stop. */
function onMicShut(listener: () => void): () => void {
  shutListeners.add(listener);
  return () => shutListeners.delete(listener);
}

/** Resolves once the tutor's voice no longer holds the speech (at once when it does not). */
function untilMicMayOpen(): Promise<void> {
  if (!micShut) return Promise.resolve();
  return new Promise((resolve) => {
    const stop = onMicShut(() => {
      if (micShut) return;
      stop();
      resolve();
    });
  });
}

/** The reading changed: when the tutor's voice takes the speech the microphone is shut at once (the wake lets go, a recogniser listening for a command is put down);
 * when it ends the wake opens again a moment later (a macrotask: a follow-up the answer's end opens takes the microphone first, with no open-and-close of the wake between). */
function followReading(): void {
  const shut = tutorSpeaks();
  if (shut === micShut) return;
  micShut = shut;
  if (shut) {
    logWake('the tutor speaks: no microphone until it has done');
    putDownRecogniser();
    shutListeners.forEach((listener) => listener());
  } else {
    globalThis.setTimeout(() => {
      if (!micShut) shutListeners.forEach((listener) => listener());
    }, 0);
  }
}

if (typeof window !== 'undefined') subscribeReading(followReading);

// an answer's voice starts once the wake has let go of the microphone and the phone's audio has settled (at once when none is open)
setAnswerGate((go) => {
  followReading();
  if (micShut) whenMicClosed(go);
  else go();
});

/** A command's recogniser listening now (after a wake, or in the follow-up window) is put down as the tutor's voice starts from his tap: the session starts afresh, and its wake
 * opens when the voice has done. What the wake paused is not gone on with at the close (his tap took the sound over). */
function putDownRecogniser(): void {
  const name = session?.state().name;
  if (name !== 'listening' && name !== 'follow-up') return;
  takeSound();
  session?.stop();
  micLetGo();
  if (wanted && !isMicBusy()) void session?.start();
}

// --- the model, fetched once -------------------------------------------------------------------------------------------------------------------

let model: Promise<WakeModel> | null = null;

function loadModel(): Promise<WakeModel> {
  model ??= fetch(WAKE_MODEL_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`The wake word could not be loaded (${response.status}).`);
      return response.json() as Promise<WakeModel>;
    })
    .catch((err: unknown) => {
      model = null;
      throw err;
    });
  return model;
}

// --- the state the mark shows -------------------------------------------------------------------------------------------------------------------

const OFF: HandsFreeState = { name: 'off' };
let state: HandsFreeState = OFF;
const stateListeners = new Set<(state: HandsFreeState) => void>();

function setState(next: HandsFreeState): void {
  state = next;
  stateListeners.forEach((listener) => listener(next));
}

/** The session's state, for voice-kit's useHandsFree: the same source whichever session runs. */
export const handsFreeSource = {
  state: (): HandsFreeState => state,
  subscribe(listener: (state: HandsFreeState) => void): () => void {
    stateListeners.add(listener);
    return () => stateListeners.delete(listener);
  },
};

// --- the notice of a refused microphone ---------------------------------------------------------------------------------------------------------

let notice: string | null = null;
const noticeListeners = new Set<() => void>();

function setNotice(next: string | null): void {
  if (next === notice) return;
  notice = next;
  noticeListeners.forEach((listener) => listener());
}

/** The notice to show, or null. */
export const handsFreeNotice = (): string | null => notice;

/** Calls `listener` when the notice changes; returns how to stop. */
export function onHandsFreeNotice(listener: () => void): () => void {
  noticeListeners.add(listener);
  return () => noticeListeners.delete(listener);
}

/** He has read the notice. */
export const dismissHandsFreeNotice = (): void => setNotice(null);

// --- saying a sentence ----------------------------------------------------------------------------------------------------------------------------

/** Says `text` in the English voice and resolves when it has been said (or SAY_WAIT_MS on, should the phone never say so). */
function sayAloud(text: string): Promise<void> {
  const clock = clockNow();
  return new Promise((resolve) => {
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      clock.clearTimeout(timer);
      resolve();
    };
    const timer = clock.setTimeout(finish, SAY_WAIT_MS);
    if (!speakText(text, SAID_KEY, { language: 'english', onEnd: finish })) finish();
  });
}

// --- the session ---------------------------------------------------------------------------------------------------------------------------------

let session: HandsFree | null = null;
let wanted = false;
let untouch: (() => void) | null = null;
const chimes = createChimes();
/** The two chimes: the kit's, or the test's spy (handsFreeSeam.chime), read at each sound. */
const chimePort: ChimePort = {
  open: () => (handsFreeSeam.chime ?? chimes).open(),
  close: () => (handsFreeSeam.chime ?? chimes).close(),
};

/** Opens the wake on the microphone, `loaded` the model: counted open (whenMicClosed) until its stop. */
async function openWake(loaded: WakeModel, onWake: Parameters<WakePort['start']>[0]): ReturnType<WakePort['start']> {
  const quietMs = handsFreeSeam.quietMs;
  const choosing = canChooseInput();
  if (!choosing) logWake('this browser cannot list its inputs: the wake opens the default microphone');
  wakesOpen++;
  let result: Awaited<ReturnType<WakePort['start']>>;
  try {
    result = await browserWake({
      model: loaded,
      ready: () => chimes.ready(),
      ...(choosing ? { startWake: (options) => startOnLiveInput(options, quietMs === undefined ? {} : { quietMs }) } : {}),
    }).start(onWake);
  } catch (err) {
    wakeClosed();
    throw err;
  }
  if (!result.ok) {
    wakeClosed();
    return result;
  }
  // the sentence 'Hands-free off' waits for this stop (whenMicClosed)
  let stopped = false;
  return {
    ...result,
    stop() {
      try {
        result.stop();
      } finally {
        if (!stopped) {
          stopped = true;
          wakeClosed();
        }
      }
    },
  };
}

/** The wake: the model is loaded on the first start (not before), then the kit's browserWake over startWake, which the testing fake takes over in tests; where the
 * browser can list its inputs, startWake is given a live one (wakeInput.ts) rather than opening the default. While the tutor speaks (micShut) it holds no microphone:
 * a start waits for the voice to end, and a running wake lets go of its microphone and opens it again after; the session sees one wake throughout. */
const wake: WakePort = {
  async start(onWake) {
    let loaded: WakeModel;
    try {
      loaded = await loadModel();
    } catch (err) {
      return { ok: false, kind: 'other', message: err instanceof Error ? err.message : String(err) };
    }
    await untilMicMayOpen();
    const first = await openWake(loaded, onWake);
    if (!first.ok) return first;
    let inner: typeof first | null = first;
    let stopped = false;
    let opening = false;
    /** Holds the microphone when it may (not stopped, the tutor not speaking), else lets it go. */
    const settle = async (): Promise<void> => {
      if (opening) return;
      if (stopped || micShut) {
        const was = inner;
        inner = null;
        was?.stop();
        return;
      }
      if (inner) return;
      opening = true;
      let again: Awaited<ReturnType<WakePort['start']>>;
      try {
        again = await openWake(loaded, onWake);
      } catch (err) {
        again = { ok: false, kind: 'other', message: err instanceof Error ? err.message : String(err) };
      }
      opening = false;
      if (!again.ok) {
        // the session starts afresh, so its failure is told as any failed start is
        logWake(`the wake would not open again after the tutor spoke: ${again.kind}, ${again.message}`);
        if (!stopped && session) {
          stopped = true;
          unfollow();
          session.stop();
          if (wanted && !isMicBusy()) void session.start();
        }
        return;
      }
      inner = again;
      void settle();
    };
    const unfollow = onMicShut(() => void settle());
    // the tutor began to speak while it opened
    if (micShut) void settle();
    return {
      ...first,
      stop() {
        if (stopped) return;
        stopped = true;
        unfollow();
        void settle();
      },
    };
  },
};

/** The wake did not start: the next touch anywhere starts the session again; so does the network coming back when `online` (a failure that may be the network's). */
function startOnTouch(online: boolean): void {
  if (untouch || typeof document === 'undefined') return;
  const again = (): void => {
    untouch?.();
    if (wanted && !isMicBusy()) void session?.start();
  };
  document.addEventListener('pointerdown', again, true);
  if (online) window.addEventListener('online', again);
  untouch = () => {
    document.removeEventListener('pointerdown', again, true);
    if (online) window.removeEventListener('online', again);
    untouch = null;
  };
}

/** The microphone was refused (or the browser cannot do it): Hands-free turns itself Off (in silence: the notice says why instead) and says why. */
function refused(text: string): void {
  wanted = false;
  session?.stop();
  void setSetting(handsFreeSetting, 'off');
  setNotice(text);
  void sayAloud(text);
}

/** True once a failure has been said, until the wake is waiting again, so each touch that fails again does not say it again. */
let toldFailure = false;

/** The state as the wake log says it: its name, and a failure's kind and message. */
const stateText = (next: HandsFreeState): string => ('kind' in next ? `${next.name} (${String(next.kind)}${'message' in next && next.message ? `: ${String(next.message)}` : ''})` : next.name);

/** The command's recogniser listens on the input a hold chooses, less any input the wake found silent (mw-5r3p30.1235: the wake left the car's route for the phone's
 * microphone, and the command is heard there, not on the route again); the log says which (the car's hands-free microphone, the one the wake found live, or the default). */
async function commandInput(): ReturnType<typeof openBluetoothInput> {
  let input = await openBluetoothInput();
  // a chosen input the wake found silent is marked for the shared chooser too and let go; the chooser then picks another, or none
  for (let tries = 0; input && wakeFoundSilent(input.deviceId) && tries < 4; tries++) {
    input.silent?.();
    input.close();
    input = await openBluetoothInput();
  }
  if (input && wakeFoundSilent(input.deviceId)) {
    input.close();
    input = undefined;
  }
  if (!input) input = await openWakeLiveInput();
  logWake(input ? `the command listens on "${input.label}"` : 'the command listens on the default microphone');
  return input;
}

/** The input the wake settled on, opened by id for the command (nothing when the wake is on the default, or the input would not open). */
async function openWakeLiveInput(): ReturnType<typeof openBluetoothInput> {
  const live = wakeLiveInput();
  if (!live) return undefined;
  try {
    const stream = await openMicInput(live.id);
    const track = stream.getAudioTracks()[0];
    if (!track) {
      stream.getTracks().forEach((each) => each.stop());
      return undefined;
    }
    return { label: track.label || live.label, track, deviceId: live.id, close: () => stream.getTracks().forEach((each) => each.stop()) };
  } catch {
    return undefined;
  }
}

function onState(next: HandsFreeState): void {
  if (next.name !== state.name) logWake(`state: ${stateText(next)}`);
  setState(next);
  untouch?.();
  if (next.name === 'needs-touch') startOnTouch(false);
  if (next.name === 'waiting') {
    toldFailure = false;
    setNotice(null);
  }
  if (next.name !== 'failed') return;
  if (next.kind === 'permission-denied') refused(MIC_REFUSED);
  else if (next.kind === 'not-supported') refused(NOT_SUPPORTED);
  else {
    startOnTouch(true);
    setNotice(COULD_NOT_START);
    if (!toldFailure) void sayAloud(COULD_NOT_START);
    toldFailure = true;
  }
}

function sessionNow(): HandsFree {
  if (!session) followPause();
  session ??= createHandsFree(
    {
      wake,
      // the transcriber every hold of Lampas listens through (askTranscriber wraps it), so a command is heard as a Talk hold is
      // the command is heard on the car's Bluetooth or hands-free input when the phone lists one, as a hold-to-talk is (composer's chooser); a recogniser handed no
      // input takes whatever microphone Android picks, which on his car's Bluetooth is the route that carries no sound (mw-5r3p30.1224). No such input: the default, as before.
      listen: (options) => browserSpeech.start({ ...options, ...(canChooseInput() ? { openInput: commandInput } : {}) }),
      chime: chimePort,
      ...(typeof document === 'undefined' ? {} : { visibility: documentVisibility(document) }),
      clock: clockNow(),
      onOpen: silenceAtWake,
      onCommand: (words, info) => runCommand(words, sayAloud, info),
      // a wake while the tutor's answer is waited for or spoken stops it and opens a new command; during any other command the wake is ignored, as before
      onInterrupt: interruptAsk,
      onClose: goOnAtClose,
      onState,
    },
    { pauseMs: pauseNow, listenOptions: { lang: COMMAND_LANG, appName: 'Lampas' } },
  );
  return session;
}

/** Gives up a start that waits for the sentence 'Hands-free on' to end. */
let cancelStart: (() => void) | null = null;

/** Starts the session when Hands-free is wanted and no other feature has the microphone; stops it otherwise. A start waits for the sentence the switch is saying ('Hands-free on'):
 * the microphone opening in the same instant clips it at both ends on a phone (mw-rl10piw.50). */
function sync(): void {
  cancelStart?.();
  cancelStart = null;
  if (wanted && !isMicBusy()) {
    cancelStart = whenSaid(SETTING_SAID_KEY, () => {
      cancelStart = null;
      if (wanted && !isMicBusy()) void sessionNow().start();
    });
  } else session?.stop();
}

onMicBusy(sync);

/** Hands-free is On (the session runs) or Off (it ends: no wake listening, no recogniser). */
export function runHandsFree(on: boolean): void {
  if (on) {
    setNotice(null);
    toldFailure = false;
  }
  if (on === wanted) return;
  wanted = on;
  sync();
}

/** Ends the session and forgets it, the model and the notice (tests: the next start is made afresh, with the seam's clock). */
export function resetHandsFree(): void {
  wanted = false;
  cancelStart?.();
  cancelStart = null;
  session?.stop();
  session = null;
  model = null;
  unfollowPause?.();
  unfollowPause = null;
  pauseValue = handsFreePauseSetting.default;
  toldFailure = false;
  untouch?.();
  forgetPlayback();
  forgetAsk();
  forgetWakeInputs();
  wakesOpen = 0;
  closedAt = Number.NEGATIVE_INFINITY;
  micShut = tutorSpeaks();
  closeWaiters.clear();
  setNotice(null);
  setState(OFF);
}
