// src/reader/usePages.ts — Turn pages (Settings > Reading, mw-5r3p30.299): the Reader's chapter laid out in pages the size of the reading box, like a
// Kindle. The text (`inner`, [data-pages]) is set in CSS columns one box wide and one box high (src/index.css 'Turn pages'), so the browser breaks it
// between lines, never through one; the reading box (`box`) clips them and shows one column at a time by its scrollLeft. A tap on the right third of
// the text or a swipe to the left turns forward a page, the left third or a swipe to the right turns back; past the last page the next chapter opens
// on its first page and back past the first page the previous chapter opens on its last (`cross`, src/reader/crossChapter.ts, mw-5r3p30.620; at Matthew 1 and
// Revelation 22 nothing happens). A tap on a button or link outside the verses (the
// chapter buttons) does what it does; a verse's number and play button and a section heading's button are text: their outer thirds turn the page, as a
// Kindle's edges always do (mw-5r3p30.609: the number is a 44 px button at the left edge, where a thumb taps to turn back). A tap in the middle third
// still opens the word, verse or heading; so does a long press (the word's own click guard drops its click; a held number talks, or with no licence opens
// its verse), and so does Enter on a focused number (a click with no short press before it). A swipe is a drag (below); no drag starts within the chapter swipe's EDGE_PX of the screen's edge (src/reader/useChapterSwipe.ts, off while pages are on).
// When the box changes size (text size, the hint card closed, the bars brought back) the pages are cut afresh and the page shown is the one where the
// first verse that was in view begins, so no text is skipped.
// A turn he makes (a tap, a swipe, the Next and Previous page buttons) is told to `onTurned`: with the Immersive reader On the next page puts the bars
// away, as scrolling down does with Scroll (mw-5r3p30.611, src/Reader.tsx); a page the app shows for him (read aloud, a put-back) is not his turn.
// The page he is on is kept per chapter (src/nav/scrollMemory.ts keepPage, mw-5r3p30.608): a Reader opened on the chapter again (back from Settings or any
// screen it gave way to) cuts the pages and shows that page, or, cut otherwise (another text size), the page of the verse that began it, until he turns one.
// The page follows the finger (mw-5r3p30.621): once a press has gone FOLLOW_AFTER_PX across, more across than down, the page lifts and turns as far as the
// finger has gone across the box; let go past half, or flicked faster than FLICK_SPEED, it turns, at the speed of the flick; let go short of half, it
// springs back. At Matthew 1 and Revelation 22 the edge page lifts a little and settles back. Every turn, a drag's, a swipe's, a tap's, a button's and the
// turn into another chapter, is drawn by src/reader/pageTurn.ts (a page curl, or a slide with no WebGL; none under Reduce motion, where it turns at once).
// The page he lands on is shown under the turn the moment it is decided; `onTurned` hears of it when the turn has been drawn. Each page's picture is drawn
// from the layout (src/reader/pageSnapshot.ts) and kept, the pages either side of the one shown drawn ahead when the phone is idle.
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { keepPage, keptPage } from '../nav/scrollMemory';
import { type Snapshot, blankPage, paperOf, scaleOf, snapshotPage, whenIconsLoad } from './pageSnapshot';
import { TAP_TURN_MS, type Turn, endTurn, prepareTurns, reducedMotion, releaseMs, startTurn, turning } from './pageTurn';
import { EDGE_PX } from './useChapterSwipe';

/** A press longer than this, or one that wandered farther than TAP_SLOP_PX, is not a tap (the word's own long press is 500 ms and 10 px). */
const TAP_MS = 500;
const TAP_SLOP_PX = 10;
/** A press that has gone this far across, more across than down, is a drag: the page lifts with it. */
const FOLLOW_AFTER_PX = 10;
/** A finger let go faster than this (px per ms) across turns the page its way, however short the drag; slower, the page turns only past half. */
export const FLICK_SPEED = 0.5;
/** The finger's speed is how far it went in its last this many ms. */
const SPEED_WINDOW_MS = 100;
/** At Matthew 1 and Revelation 22 the page lifts at most this far and settles back: there is no page to turn to. */
const EDGE_LIFT = 0.1;
/** A tap's turn slants its fold this much (radians), as a thumb lifts a page by its lower corner; a drag's slant follows the finger, up to MAX_TILT. */
const TAP_TILT = 0.08;
const MAX_TILT = 0.3;

export interface Pages {
  /** the page shown, from 1 */
  page: number;
  /** how many pages the chapter has (1 until it is laid out) */
  count: number;
  /** turns a page forward (1) or back (-1), as a tap on the outer thirds or a swipe does: for the Previous and Next page buttons (src/ReaderControls.tsx) */
  turn(by: 1 | -1): void;
  /** turns to the page an element (a verse) begins on: for the verse read aloud, or the teach sheet's verse number */
  show(el: Element): void;
}

/** True when the press began somewhere a swipe or a page tap is not wanted. */
const ignoredStart = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('input, textarea, select, [data-hold-bar], [role="slider"], [contenteditable="true"]') !== null;

/** What the layout effect lets the rest of the hook do while the pages are cut. */
interface Turner {
  /** Turns at once, with no turn drawn; `quiet` leaves onTurned to the caller; `swipe` says a swipe or drag made the turn (a chapter it opens is then a swipe's,
   * mw-5r3p30.706). True when a page turned or another chapter opened. */
  turn(by: 1 | -1, quiet?: boolean, swipe?: boolean): boolean;
  show(el: Element): void;
  /** the page shown, from 0, and how many */
  where(): { page: number; count: number };
  /** the picture of a page, kept until the layout changes */
  picture(page: number): Snapshot;
}

/** A turn into another chapter, drawn on paper until that chapter's page is laid out: the picture then fills in `which` place. */
let arriving: { turn: Turn; which: 'sheet' | 'under'; key?: string } | null = null;

/** The pull of a drag (px toward the turn), as the share of the box the page has turned. */
const pulled = (pull: number, width: number, edge: boolean) => {
  const share = Math.max(0, Math.min(1, pull / Math.max(1, width)));
  return edge ? EDGE_LIFT * (1 - Math.exp(-share * 4)) : share;
};

/** A turn a drag has begun and let go to land: its turn drawn (none under Reduce motion) and how long it takes to land. */
interface Drawn {
  turn: Turn | null;
  ms: number;
}

/** Puts up the turn of the page shown `by` a page: forward the sheet is that page, flat, over the next; back it is the page before, wholly turned, over
 * the page shown. A page of another chapter is paper till it is laid out. Null when no turn is drawn; a picture that will not draw turns the page undrawn,
 * never not at all. */
function turnOf(el: HTMLElement, t: Turner, by: 1 | -1, crossing: boolean, tilt = 0): Turn | null {
  try {
    const { page } = t.where();
    const paper = paperOf(el);
    const here = t.picture(page);
    const there = crossing ? blankPage(el, paper) : t.picture(page + by);
    return by > 0 ? startTurn(el, here, there, paper, 0, tilt) : startTurn(el, there, here, paper, 1, tilt);
  } catch (error) {
    console.warn('the page turn could not be drawn', error);
    endTurn();
    return null;
  }
}

/** Turns `by` a page, drawn: the pictures of the sheet and the page under it are taken, the page under is shown at once, and the sheet turns over it (a
 * tap's turn, TAP_TURN_MS), or the turn a drag let go lands in `drawn.ms`. Under Reduce motion, or with no box to draw, at once. `heard` gives onTurned,
 * told when the turn has been drawn. */
function drawTurn(t: Turner, box: RefObject<HTMLElement | null>, by: 1 | -1, drawn: Drawn | undefined, crossable: ((by: 1 | -1) => boolean) | undefined, heard: () => ((by: 1 | -1) => void) | undefined) {
  const el = box.current;
  const { page, count } = t.where();
  const crossing = page + by < 0 || page + by >= count;
  if (!el || reducedMotion() || el.getBoundingClientRect().width <= 0) {
    drawn?.turn?.end();
    t.turn(by, false, drawn !== undefined);
    return;
  }
  let turn = drawn?.turn ?? null;
  if (!turn) {
    if (crossing && !(crossable?.(by) ?? false)) return;
    turn = turnOf(el, t, by, crossing, by > 0 ? TAP_TILT : -TAP_TILT);
  }
  const moved = t.turn(by, true, drawn !== undefined);
  if (!turn) return;
  if (!moved) {
    turn.end();
    return;
  }
  const shown = turn;
  if (crossing) arriving = { turn: shown, which: by > 0 ? 'under' : 'sheet' };
  void shown.run(by > 0 ? 1 : 0, drawn ? drawn.ms : TAP_TURN_MS, drawn ? 'out' : 'inOut').then(() => {
    if (arriving?.turn === shown) arriving = null;
    if (!crossing) heard()?.(by);
  });
}

/** Lays out the text of `box` in pages while `enabled`, and turns them by tap and swipe unless `blocked` (a sheet is open); the page is kept under `chapter`.
 * `onTurned` hears each turn he makes, after the page has changed; `cross` hears a turn past the first or the last page, which is to open the chapter there (`swipe` when a swipe or drag made it). */
export function usePages(
  enabled: boolean,
  box: RefObject<HTMLElement | null>,
  inner: RefObject<HTMLElement | null>,
  blocked: boolean,
  chapter: string,
  onTurned?: (by: 1 | -1) => void,
  cross?: (by: 1 | -1, swipe: boolean) => boolean,
  crossable?: (by: 1 | -1) => boolean,
): Pages {
  const [place, setPlace] = useState({ page: 0, count: 1 });
  const turner = useRef<Turner | null>(null);
  const turned = useRef(onTurned);
  const crossed = useRef(cross);
  const canCross = useRef(crossable);
  useEffect(() => {
    turned.current = onTurned;
    crossed.current = cross;
    canCross.current = crossable;
  });
  // a turn still drawn when the Reader goes is taken away with it
  useEffect(() => endTurn, []);

  // the pages are cut when the text is there and again whenever the box or the text changes
  useEffect(() => {
    const found = box.current;
    const text = inner.current;
    if (!enabled || !found || !text) return;
    const el: HTMLElement = found;
    const content: HTMLElement = text;
    let page = 0;
    let count = 1;
    /** the width of a page and the gap after it */
    let step = 0;
    /** the first verse that began on the page shown: the page is found again by it when the pages are cut afresh */
    let anchor: Element | null = null;
    /** the page kept from when he was last in this chapter: shown at each cut until he turns a page (or one is shown for him) */
    let kept = keptPage(chapter);

    /** The page an x on screen falls on. */
    const pageAt = (x: number): number => (step <= 0 ? 0 : Math.max(0, Math.floor((x - content.getBoundingClientRect().left + 1) / step)));

    const go = (to: number, keepAnchor = false) => {
      page = Math.max(0, Math.min(count - 1, to));
      setPlace((was) => (was.page === page && was.count === count ? was : { page, count }));
      el.scrollLeft = page * step;
      if (keepAnchor) return;
      // the first verse that begins on this page, else the one that runs across it
      const left = content.getBoundingClientRect().left + page * step;
      const on = (r: DOMRect) => r.width > 0 && r.left >= left - 1 && r.left < left + step - 1;
      const verses = Array.from(content.querySelectorAll('[data-verse]'));
      anchor =
        verses.find((v) => {
          const first = v.getClientRects()[0];
          return first !== undefined && on(first);
        }) ??
        verses.find((v) => Array.from(v.getClientRects()).some(on)) ??
        null;
    };

    /** Shows `to` and keeps it as his place, unless the kept page is still being put back. */
    const move = (to: number, keepAnchor = false) => {
      go(to, keepAnchor);
      if (!kept) keepPage(chapter, { page, count, verse: anchor instanceof HTMLElement ? (anchor.dataset.verse ?? null) : null });
    };

    /** Shows the kept page: the same page when the pages are cut as they were, else the one its verse begins on. */
    const putBack = (k: { page: number; count: number; verse: string | null }) => {
      const verse = k.count === count || k.verse === null ? null : content.querySelector(`[data-verse="${k.verse}"]`);
      const first = verse?.getClientRects()[0];
      go(first ? pageAt(first.left) : k.page);
    };

    /** the pictures of the pages, by page, while the layout stands */
    const pictures = new Map<number, Snapshot>();
    let ahead: ReturnType<typeof setTimeout> | number | undefined;
    const picture = (at: number): Snapshot => {
      let shot = pictures.get(at);
      if (!shot) {
        shot = snapshotPage({ box: el, content, step }, at);
        pictures.set(at, shot);
      }
      return shot;
    };
    /** Draws the pictures of the page shown and the pages either side when the phone has a moment, one a moment, and never while a page turns, so a turn
     * starts with them and none of its frames are spent on them. The WebGL canvas is made the first time. */
    const drawAhead = () => {
      if (ahead !== undefined || reducedMotion()) return;
      const idle = typeof requestIdleCallback === 'function' ? (f: () => void) => requestIdleCallback(f, { timeout: 1000 }) : (f: () => void) => setTimeout(f, 150);
      ahead = idle(() => {
        ahead = undefined;
        if (!live || step <= 0) return;
        if (turning()) {
          drawAhead();
          return;
        }
        const next = [page, page + 1, page - 1].find((at) => at >= 0 && at < count && !pictures.has(at));
        try {
          prepareTurns(el, scaleOf(), paperOf(el));
          if (next === undefined) return;
          picture(next);
        } catch {
          // drawn when a turn needs it, or the turn is not drawn (turnOf)
          return;
        }
        drawAhead();
      });
    };
    const forget = () => {
      pictures.clear();
      drawAhead();
    };
    whenIconsLoad(forget);

    /** Cuts the pages afresh: how wide one is, how many there are, and which one shows the anchor. */
    const measure = () => {
      forget();
      const width = content.clientWidth;
      if (width <= 0) return;
      const before = { step, count };
      step = width + (parseFloat(getComputedStyle(content).columnGap) || 0);
      const last = content.lastElementChild;
      const rects = last ? last.getClientRects() : null;
      count = rects && rects.length > 0 ? pageAt(rects[rects.length - 1].left) + 1 : 1;
      if (kept) {
        putBack(kept);
        fillArriving();
        return;
      }
      // nothing moved between pages: the page shown stays
      if (step === before.step && count === before.count) {
        move(page, true);
        return;
      }
      const first = anchor?.isConnected ? anchor.getClientRects()[0] : undefined;
      if (first) move(pageAt(first.left), true);
      else move(page);
      fillArriving();
    };

    /** A turn into this chapter drawn on paper: the page it opened on is drawn in, once it has its verses (again if the pages are cut afresh). */
    function fillArriving() {
      const wait = arriving;
      if (!wait || wait.turn.ended || !content.querySelector('[data-verse]')) return;
      const key = `${chapter}:${page}:${count}:${step}`;
      if (wait.key === key) return;
      wait.key = key;
      wait.turn.fill(wait.which, picture(page));
    }

    turner.current = {
      turn: (by, quiet = false, swipe = false) => {
        const to = page + by;
        if (to < 0 || to >= count) return crossed.current?.(by, swipe) ?? false;
        kept = undefined;
        move(to);
        drawAhead();
        if (!quiet) turned.current?.(by);
        return true;
      },
      show: (target) => {
        const first = target.getClientRects()[0];
        if (!first) return;
        kept = undefined;
        endTurn();
        move(pageAt(first.left));
      },
      where: () => ({ page, count }),
      picture,
    };
    measure();
    const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    watch?.observe(el);
    watch?.observe(content);
    const changes = typeof MutationObserver === 'function' ? new MutationObserver(measure) : null;
    changes?.observe(content, { childList: true, subtree: true, characterData: true });
    // a look that changes and moves nothing (a verse selected, the verse read aloud) is drawn afresh in the pictures
    const looks = typeof MutationObserver === 'function' ? new MutationObserver(() => pictures.clear()) : null;
    looks?.observe(content, { attributes: true, subtree: true });
    let live = true;
    void document.fonts?.ready.then(() => live && measure());
    // the box scrolled by something else (focus moved to a word on another page): the page follows it
    const onScroll = () => {
      if (step <= 0 || kept) return;
      const shown = Math.round(el.scrollLeft / step);
      if (shown !== page) move(shown);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      live = false;
      turner.current = null;
      watch?.disconnect();
      changes?.disconnect();
      looks?.disconnect();
      whenIconsLoad(null);
      if (typeof ahead === 'number' && typeof cancelIdleCallback === 'function') cancelIdleCallback(ahead);
      else clearTimeout(ahead);
      el.removeEventListener('scroll', onScroll);
      el.scrollLeft = 0;
      setPlace({ page: 0, count: 1 });
    };
  }, [enabled, box, inner, chapter]);

  const turnDrawn = useCallback(
    (by: 1 | -1, drawn?: Drawn) => {
      const t = turner.current;
      if (t) drawTurn(t, box, by, drawn, canCross.current, () => turned.current);
    },
    [box],
  );

  // taps on the thirds, and the page that follows the finger
  useEffect(() => {
    const found = box.current;
    if (!enabled || blocked || !found) return;
    const el: HTMLElement = found;
    /** A drag under way: the way it turns, the turn drawn (none under Reduce motion), and whether there is no page that way (the edge of the Bible). */
    interface Drag {
      by: 1 | -1;
      turn: Turn | null;
      edge: boolean;
      width: number;
      top: number;
      height: number;
    }
    let press: { id: number; x: number; y: number; at: number; swipes: boolean; moves: { t: number; x: number }[]; drag: Drag | null } | null = null;
    /** the press that ended last: whether its click may be a tap, and whether it was a drag (its click, if one comes, is dropped) */
    let tapped = false;
    let swiped = false;
    const stop = () => {
      press = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
    /** The page let go where it is: back flat where it started. */
    const springBack = (d: Drag, speed: number) => {
      const turn = d.turn;
      if (!turn || turn.ended) return;
      const home = d.by > 0 ? 0 : 1;
      void turn.run(home, releaseMs(Math.abs(turn.turned - home) * d.width, speed));
    };
    /** Starts the drag `by`: the sheet and the page under it, the sheet flat (forward) or wholly turned (back). */
    const begin = (by: 1 | -1): Drag => {
      const r = el.getBoundingClientRect();
      const t = turner.current;
      const where = t?.where() ?? { page: 0, count: 1 };
      const crossing = where.page + by < 0 || where.page + by >= where.count;
      const edge = crossing && !(canCross.current?.(by) ?? false);
      const d: Drag = { by, turn: null, edge, width: r.width, top: r.top, height: r.height };
      if (!t || reducedMotion() || r.width <= 0) return d;
      d.turn = turnOf(el, t, by, crossing);
      return d;
    };
    /** The slant of the fold for a finger at `y` that took hold at `fromY`: lower down, the lower corner leads, and the fold follows the finger up or down. */
    const tiltAt = (d: Drag, fromY: number, y: number) => {
      const lean = ((fromY - (d.top + d.height / 2)) / d.height) * 0.4 + ((y - fromY) / d.height) * 0.9;
      const slant = Math.max(-MAX_TILT, Math.min(MAX_TILT, lean));
      return d.by > 0 ? slant : -slant;
    };
    function onCancel() {
      tapped = false;
      if (press?.drag) springBack(press.drag, 0);
      stop();
    }
    function onMove(e: PointerEvent) {
      const p = press;
      if (!p || e.pointerId !== p.id || !p.swipes) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      const now = performance.now();
      p.moves.push({ t: now, x: e.clientX });
      while (p.moves.length > 2 && now - p.moves[0].t > SPEED_WINDOW_MS) p.moves.shift();
      if (!p.drag) {
        if (Math.abs(dx) < FOLLOW_AFTER_PX || Math.abs(dx) <= Math.abs(dy)) return;
        p.drag = begin(dx < 0 ? 1 : -1);
      }
      const d = p.drag;
      const share = pulled(d.by > 0 ? -dx : dx, d.width, d.edge);
      d.turn?.follow(d.by > 0 ? share : 1 - share, tiltAt(d, p.y, e.clientY));
    }
    function onUp(e: PointerEvent) {
      const p = press;
      if (!p || e.pointerId !== p.id) return;
      stop();
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      const now = performance.now();
      tapped = now - p.at <= TAP_MS && Math.hypot(dx, dy) <= TAP_SLOP_PX;
      const d = p.drag;
      if (!d) return;
      swiped = true;
      // the finger's speed toward the turn, over its last moves (none, when it lifted at once: the page goes by how far it was pulled)
      let first = p.moves.find((m) => now - m.t <= SPEED_WINDOW_MS);
      // moves further apart than the window (a slow finger, a busy phone): the one before the last
      if (!first || now - first.t < 4) first = p.moves.findLast((m) => now - m.t >= 4);
      const ms = first ? now - first.t : 0;
      const speed = first && ms >= 4 ? ((e.clientX - first.x) / ms) * -d.by : 0;
      const pull = d.by > 0 ? -dx : dx;
      const share = pulled(pull, d.width, false);
      const goes = !d.edge && (Math.abs(speed) >= FLICK_SPEED ? speed > 0 : share >= 0.5);
      if (!goes) {
        springBack(d, Math.max(0, -speed));
        return;
      }
      const turn = d.turn;
      const left = turn ? Math.abs((d.by > 0 ? 1 : 0) - turn.turned) * d.width : 0;
      turnDrawn(d.by, { turn, ms: releaseMs(left, Math.max(0, speed)) });
    }
    const onDown = (e: PointerEvent) => {
      tapped = false;
      swiped = false;
      if (press) {
        // a second finger: neither is a drag nor a tap
        if (press.drag) springBack(press.drag, 0);
        stop();
        return;
      }
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (ignoredStart(e.target)) return;
      // Android's back gesture owns the screen's edges: no drag starts there (a tap there is still a tap)
      const swipes = e.clientX >= EDGE_PX && e.clientX <= window.innerWidth - EDGE_PX;
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now(), swipes, moves: [{ t: performance.now(), x: e.clientX }], drag: null };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    };
    // In the bubble phase, before the app's own click handlers (React's, on the root): a capture guard that already stopped the click (a two-finger
    // tap, src/immersive.ts) keeps it from here too.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (swiped) {
        swiped = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // a click with no short press before it (a long press, Enter on a button) is not a page tap
      if (!tapped) return;
      tapped = false;
      // a verse's own buttons (its number, its play button) and a heading's are text here, opened from the middle third like a word: the number sits
      // at the left edge, right where a thumb taps to turn back (mw-5r3p30.609); the chapter buttons keep their taps
      const control = e.target instanceof Element ? e.target.closest('a, button, input, select, textarea, label, summary') : null;
      if (control && !control.closest('[data-heading], [data-verse]')) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const by = x < r.width / 3 ? -1 : x > (r.width * 2) / 3 ? 1 : 0;
      if (by === 0) return;
      e.preventDefault();
      e.stopPropagation();
      turnDrawn(by);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('click', onClick);
      if (press?.drag) springBack(press.drag, 0);
      stop();
    };
  }, [enabled, blocked, box, turnDrawn]);

  const show = useCallback((el: Element) => turner.current?.show(el), []);
  const turn = useCallback((by: 1 | -1) => turnDrawn(by), [turnDrawn]);

  return { page: place.page + 1, count: place.count, show, turn };
}
