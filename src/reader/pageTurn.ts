// src/reader/pageTurn.ts — the one page turn of Turn pages (mw-5r3p30.621): every turn, by a tap on a third, a swipe, a drag, the Previous and Next page
// buttons and across a chapter, is drawn here. A layer the reading box's size ([data-page-turn], aria-hidden, untouchable) lies over the text while a page
// turns and goes when it has: the text under it is the page he is on from the moment the turn is decided, so the layer only draws the motion. It draws a
// page curl in WebGL (src/reader/pageCurl.ts) or, with no WebGL, the plain slide: the sheet slides off to the left over the page under it. With the
// phone's Reduce motion on, no turn is drawn (src/reader/usePages.ts turns at once).
// A turn is a sheet and the page under it, each a picture (src/reader/pageSnapshot.ts), and `turned`, how far over the sheet is: 0 lies flat, 1 has gone.
// Forward the sheet is the page he was on and goes from 0 to 1; back it is the page before, and comes from 1 to 0, over the page he was on.
import { type Curl, createCurl } from './pageCurl';
import type { Snapshot } from './pageSnapshot';

export type TurnLook = 'curl' | 'slide';

export const reducedMotion = (): boolean => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A tap's turn, start to end (a drag's is timed by its flick, releaseMs). */
export const TAP_TURN_MS = 480;
/** A released page never takes longer than this to land or spring back, nor less than the shortest. */
const LONGEST_MS = 700;
const SHORTEST_MS = 110;
/** A finger let go at less than this (px per ms) has the page land at this speed: a still finger lets go of a page that settles of itself. */
const RESTING_SPEED = 0.8;
/** How long a page of a chapter just opened takes to show on the paper drawn for it till then. */
const FILL_MS = 160;

/** How long a page released `px` from where it lands takes to get there: as fast as the finger let it go (the ease-out starts at three times the mean
 * speed), never slower than a page settling of itself. */
export function releaseMs(px: number, speed: number): number {
  return Math.round(Math.min(LONGEST_MS, Math.max(SHORTEST_MS, (3 * Math.abs(px)) / Math.max(speed, RESTING_SPEED))));
}

type Curve = 'out' | 'inOut';
const ease = (curve: Curve, t: number) => (curve === 'out' ? 1 - (1 - t) ** 3 : 0.5 - Math.cos(Math.PI * t) / 2);

/** The WebGL canvas and its curl are made once and kept: a context and its program cost more than a frame to make. */
let stage: { canvas: HTMLCanvasElement; curl: Curl; key: string } | null = null;
/** Set when WebGL would not start: every turn after is the slide. */
let noCurl = false;

function curlFor(width: number, height: number, scale: number, paper: string): { canvas: HTMLCanvasElement; curl: Curl } | null {
  if (noCurl) return null;
  const key = `${width}x${height}@${scale}:${paper}`;
  if (stage?.key === key && !stage.curl.lost()) return stage;
  stage?.curl.dispose();
  stage = null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const curl = createCurl(canvas, width, height, paper);
  if (!curl) {
    noCurl = true;
    return null;
  }
  stage = { canvas, curl, key };
  return stage;
}

/** Makes the WebGL canvas for a turn of `box` ahead of the first turn, when the phone has a moment: making it in a turn would cost that turn frames. */
export function prepareTurns(box: HTMLElement, scale: number, paper: string): void {
  if (reducedMotion()) return;
  const r = box.getBoundingClientRect();
  if (r.width > 0 && r.height > 0) curlFor(r.width, r.height, scale, paper);
}

/** True while a turn is drawn: work that can wait (the pictures drawn ahead) waits till it is over, so it costs the turn no frames. */
export const turning = (): boolean => current !== null;

const fill = (el: HTMLElement) => {
  el.style.position = 'absolute';
  el.style.inset = '0';
  el.style.width = '100%';
  el.style.height = '100%';
};

/** One turn on screen. */
export interface Turn {
  readonly look: TurnLook;
  /** Shows the sheet `turned` over, as a finger holds it; `tilt` slants the fold (radians). */
  follow(turned: number, tilt?: number): void;
  /** Takes the sheet to `to` in `ms`; resolves when it is there and the layer has gone, or the turn was ended first. */
  run(to: 0 | 1, ms: number, curve?: Curve): Promise<void>;
  /** Draws a page in place of the paper drawn for it: the page of the chapter just opened. */
  fill(which: 'sheet' | 'under', page: Snapshot): void;
  /** Takes the layer away at once. */
  end(): void;
  readonly turned: number;
  readonly ended: boolean;
}

/** The turn on screen, if any: a new one ends it. */
let current: Turn | null = null;

/** Ends any turn being drawn. */
export function endTurn(): void {
  current?.end();
}

/** Puts up the layer over `box` for a turn of `sheet` over `under`, `turned` over at first. Null under Reduce motion: no turn is drawn. */
export function startTurn(box: HTMLElement, sheet: Snapshot, under: Snapshot, paper: string, turned: number, tilt = 0): Turn | null {
  current?.end();
  if (reducedMotion()) return null;
  const r = box.getBoundingClientRect();
  const width = r.width;
  const height = r.height;
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, {
    position: 'fixed',
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${width}px`,
    height: `${height}px`,
    zIndex: '4',
    pointerEvents: 'none',
    overflow: 'hidden',
    contain: 'strict',
    background: paper,
  } satisfies Partial<CSSStyleDeclaration>);

  let at = turned;
  let slant = tilt;
  let ended = false;
  let frame = 0;
  let settle: (() => void) | null = null;
  let fills: { which: 'sheet' | 'under'; started: number }[] = [];
  const gl = curlFor(width, height, sheet.scale, paper);
  let draw: () => void;
  let fillWith: (which: 'sheet' | 'under', page: Snapshot) => void;

  if (gl) {
    layer.dataset.pageTurn = 'curl';
    fill(gl.canvas);
    layer.append(gl.canvas);
    gl.curl.setPages(sheet.canvas, under.canvas);
    draw = () => {
      const now = performance.now();
      fills = fills.filter((f) => {
        gl.curl.fade(f.which, Math.min(1, (now - f.started) / FILL_MS));
        return now - f.started < FILL_MS;
      });
      gl.curl.draw({ turned: at, tilt: slant });
    };
    fillWith = (which, page) => {
      gl.curl.replace(which, page.canvas);
      fills = [...fills.filter((f) => f.which !== which), { which, started: performance.now() }];
      if (!frame) draw();
    };
  } else {
    // the plain slide: the sheet, a little shadow at its edge, slides over the page under it
    layer.dataset.pageTurn = 'slide';
    const place = (canvas: HTMLCanvasElement) => {
      const holder = document.createElement('div');
      fill(holder);
      fill(canvas);
      holder.append(canvas);
      layer.append(holder);
      return holder;
    };
    place(under.canvas);
    const leaf = place(sheet.canvas);
    leaf.style.boxShadow = '0 0 22px rgba(0, 0, 0, 0.28)';
    leaf.style.background = paper;
    leaf.style.willChange = 'transform';
    const holders = { under: layer.children[0] as HTMLElement, sheet: leaf };
    draw = () => {
      leaf.style.transform = `translate3d(${(-at * (width + 24)).toFixed(2)}px, 0, 0)`;
    };
    fillWith = (which, page) => {
      const canvas = page.canvas;
      fill(canvas);
      canvas.style.opacity = '0';
      canvas.style.transition = `opacity ${FILL_MS}ms ease-out`;
      holders[which].append(canvas);
      requestAnimationFrame(() => {
        canvas.style.opacity = '1';
      });
    };
  }

  const end = () => {
    if (ended) return;
    ended = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    layer.remove();
    if (current === turn) current = null;
    settle?.();
    settle = null;
  };

  const turn: Turn = {
    look: gl ? 'curl' : 'slide',
    get turned() {
      return at;
    },
    get ended() {
      return ended;
    },
    follow(to, newTilt) {
      if (ended) return;
      at = Math.max(0, Math.min(1, to));
      if (newTilt !== undefined) slant = newTilt;
      if (!frame) draw();
    },
    run(to, ms, curve = 'out') {
      if (ended) return Promise.resolve();
      if (frame) cancelAnimationFrame(frame);
      const from = at;
      const began = performance.now();
      return new Promise<void>((resolve) => {
        const was = settle;
        settle = () => {
          was?.();
          resolve();
        };
        const step = () => {
          const t = ms <= 0 ? 1 : Math.min(1, (performance.now() - began) / ms);
          at = from + (to - from) * ease(curve, t);
          draw();
          if (t >= 1) {
            frame = 0;
            end();
            return;
          }
          frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      });
    },
    fill: (which, page) => {
      if (!ended) fillWith(which, page);
    },
    end,
  };
  current = turn;
  draw();
  document.body.append(layer);
  return turn;
}
