// tests/e2e/app-ready.ts — the one shared wait for the app's own ready state (mw-fnvjof.17.113; the class of mw-5r3p30.1068 and mw-fnvjof.17.108 to .111).
// A spec that goes on the moment a first element shows reads a screen that is still being made: the Reader's settings arrive from IndexedDB after its first paint (the Weave button, the
// header's width), the fonts swap the header's metrics, a service worker takes its time to install. On a host at two to five times its cores that gap is long enough to fail a
// whole run, and a fixed sleep only guesses at it. These waits name what the app has finished, poll with expect.poll (so the host's load only lengthens them), and never sleep.
import { expect, type Page } from '@playwright/test';

/** What a screen has finished when `appReady` returns. */
export interface ReadyOptions {
  /** The selector of the screen's own first content; the Reader's chapter text by default. */
  content?: string;
  /** A Reader that has taken its settings (main[data-reader]'s data-weave and data-view): the attribute values it must show. */
  reader?: { weave?: string; view?: string };
}

/** One look at the page: `ready` is true when everything the app promises of a finished screen holds; `why` says what does not, for the failure message. */
export async function readiness(page: Page, options: ReadyOptions = {}): Promise<{ ready: boolean; why: string }> {
  const { content = '[data-verse]', reader } = options;
  return page.evaluate(
    async ({ content, reader }) => {
      const missing: string[] = [];
      if (document.querySelector(content) === null) missing.push(`no ${content}`);
      if (document.querySelector('[aria-busy="true"]') !== null) missing.push('a screen is still aria-busy');
      if (document.fonts.status !== 'loaded') missing.push(`fonts ${document.fonts.status}`);
      if (reader) {
        const main = document.querySelector('main[data-reader]');
        if (main === null) missing.push('no Reader main');
        else {
          for (const [name, value] of Object.entries(reader)) if (value !== undefined && main.getAttribute(`data-${name}`) !== value) missing.push(`data-${name} is ${main.getAttribute(`data-${name}`)}, not ${value}`);
        }
      }
      // the layout holds still: the header's and the screen's boxes are the same over three frames in a row
      const boxes = () => Array.from(document.querySelectorAll('header, header *, main')).map((el) => { const r = el.getBoundingClientRect(); return `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}`; }).join('|');
      const frame = () => new Promise<void>((done) => requestAnimationFrame(() => done()));
      let last = boxes();
      let still = 0;
      for (let i = 0; i < 12 && still < 3; i += 1) {
        await frame();
        const now = boxes();
        still = now === last ? still + 1 : 0;
        last = now;
      }
      if (still < 3) missing.push('the layout is still moving');
      return { ready: missing.length === 0, why: missing.join('; ') };
    },
    { content, reader },
  );
}

/** Waits until the app has finished drawing the screen: its content is there, nothing is aria-busy, the fonts are loaded, the Reader (when named) has its settings, and the layout holds still. */
export async function appReady(page: Page, options: ReadyOptions = {}): Promise<void> {
  await expect
    .poll(async () => {
      const seen = await readiness(page, options);
      return seen.ready ? 'ready' : seen.why;
    }, { message: 'the app is ready' })
    .toBe('ready');
}

/** How long a service worker may take to install: it precaches the whole build (272 files, 5.8 MB) through a preview server that a dozen browsers share on a loaded host, which took over 20 s. */
export const WORKER_INSTALL_MS = 120_000;

/** Waits until the page's service worker has installed and is active (the state of its own registration, not a guess at its time). The spec raises its test timeout past WORKER_INSTALL_MS. */
export async function workerReady(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration?.active?.state ?? (registration?.installing ? 'installing' : 'unregistered');
        }),
      { message: 'the service worker activates', timeout: WORKER_INSTALL_MS },
    )
    .toBe('activated');
}

/** Waits until the page is under its worker's control. */
export async function workerControls(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { message: 'the worker controls the page', timeout: WORKER_INSTALL_MS }).toBe(true);
}

/** Waits until a measured number is inside a window (min up to, not including, below), the whole window in one wait: a measure taken in two steps (first one side, then the other) sees a value that is still on its way. */
export async function expectInWindow(measure: () => Promise<number>, window: { min: number; below: number }): Promise<void> {
  await expect
    .poll(async () => {
      const value = await measure();
      return value >= window.min && value < window.below ? 'in the window' : `${value} is outside ${window.min} to ${window.below}`;
    })
    .toBe('in the window');
}
