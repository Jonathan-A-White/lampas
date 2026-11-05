// src/reftagger/popup.ts — the blog's verse popup (mw-5r3p30.1048): a tap on a tagged reference (tagger.ts) opens a small card beside it with the verse in the Majority Standard Bible and
// an Open in Lampas button, as RefTagger's did; a mouse opens it by hovering and closes it by leaving, and a click on the link with a mouse still goes straight to Lampas (PROVISIONAL, the
// Governor to confirm). The text is the app's own chapter file, fetched from the page that loaded the script: a cross-origin fetch, so it needs the host to send Access-Control-Allow-Origin
// (docs/links.md 'The blog's popup'); when it cannot be had the card is still the reference and the button. The card lives in a shadow root, so the blog's styles never reach it and its
// own never reach the blog. One card at a time. It sets no cookie and sends no header of its own.
import { MARK } from './tagger';
import { chapterUrl, headingOf, passageOf, versesOf, type ShownVerse, type TaggedPassage } from './passage';

const HOST = 'data-lampas-popup';
const GAP = 6;
const EDGE = 8;
const WIDTH = 352;
const HOVER_OPEN_MS = 120;
const HOVER_CLOSE_MS = 250;
const FETCH_MS = 8000;

const LIGHT = { bg: '#ffffff', fg: '#1a1a1a', muted: '#555555', line: '#c9c9c9', button: '#1d4ed8', buttonText: '#ffffff', shadow: 'rgba(0,0,0,.25)' };
const DARK = { bg: '#1e1e1e', fg: '#ececec', muted: '#b4b4b4', line: '#4a4a4a', button: '#8ab4ff', buttonText: '#0b1220', shadow: 'rgba(0,0,0,.6)' };

const css = (c: typeof LIGHT): string => `
  :host { all: initial; }
  .card { position: absolute; box-sizing: border-box; background: ${c.bg}; color: ${c.fg}; border: 1px solid ${c.line}; border-radius: 10px; box-shadow: 0 6px 24px ${c.shadow};
    font: 15px/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; text-align: left; display: flex; flex-direction: column; overflow: hidden; }
  .head { padding: 10px 14px 0; font-weight: 600; font-size: 16px; }
  .head small { font-weight: 400; font-size: 12px; color: ${c.muted}; margin-left: 6px; }
  .body { padding: 6px 14px 4px; overflow-y: auto; overscroll-behavior: contain; min-height: 0; }
  .body p { margin: 0 0 8px; }
  .body sup { color: ${c.muted}; font-size: 11px; margin-right: 3px; }
  .wait { color: ${c.muted}; }
  .open { display: block; box-sizing: border-box; margin: 8px 14px 12px; padding: 10px 14px; min-height: 44px; text-align: center; text-decoration: none; font-weight: 600;
    background: ${c.button}; color: ${c.buttonText}; border-radius: 8px; flex: none; }
  .open:focus-visible { outline: 3px solid ${c.fg}; outline-offset: 2px; }
`;

/** The page is dark when the first colour behind the link is: Ghost themes switch by their own class as often as by the phone's setting, so the page itself is asked first. */
function isDark(from: Element): boolean {
  for (let at: Element | null = from; at; at = at.parentElement) {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(getComputedStyle(at).backgroundColor);
    if (m && (m[4] === undefined || Number(m[4]) > 0.5)) return (0.299 * Number(m[1]) + 0.587 * Number(m[2]) + 0.114 * Number(m[3])) / 255 < 0.5;
  }
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

const chapters = new Map<string, Promise<unknown>>();

/** The chapter file, once per page; null when it cannot be had (CORS refused, offline, a 404, too slow): never a throw. */
function fetchChapter(p: TaggedPassage): Promise<unknown> {
  const url = chapterUrl(p, dataOrigin);
  let held = chapters.get(url);
  if (!held) {
    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), FETCH_MS);
    held = fetch(url, { mode: 'cors', credentials: 'omit', signal: stop.signal })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .finally(() => clearTimeout(timer));
    chapters.set(url, held);
  }
  return held;
}

interface Open {
  link: HTMLAnchorElement;
  host: HTMLElement;
  card: HTMLElement;
}

let dataOrigin: string | undefined;
let current: Open | null = null;
let openTimer = 0;
let closeTimer = 0;

export function closePopup(): void {
  clearTimeout(openTimer);
  clearTimeout(closeTimer);
  current?.host.remove();
  current = null;
}

/** Puts the card under the link, or over it when the page below is short of room, kept inside the screen at both sides; page coordinates, so it scrolls with the text. */
function place({ link, card }: Open): void {
  const view = document.documentElement;
  const vw = view.clientWidth;
  const vh = window.innerHeight;
  const rects = link.getClientRects();
  const rect = rects.length > 0 ? rects[0] : link.getBoundingClientRect();
  const width = Math.min(WIDTH, vw - 2 * EDGE);
  card.style.width = `${width}px`;
  card.style.maxHeight = `${Math.max(120, Math.min(360, vh - 2 * EDGE))}px`;
  const height = card.offsetHeight;
  const below = rect.bottom + GAP;
  const above = rect.top - GAP - height;
  let top = below + height <= vh - EDGE ? below : above >= EDGE ? above : Math.max(EDGE, Math.min(below, vh - EDGE - height));
  top = Math.max(EDGE, top);
  const left = Math.max(EDGE, Math.min(rect.left, vw - width - EDGE));
  card.style.left = `${left + window.scrollX}px`;
  card.style.top = `${top + window.scrollY}px`;
}

function fill(open: Open, p: TaggedPassage, verses: ShownVerse[] | null, href: string): void {
  const { card } = open;
  card.replaceChildren();
  const head = document.createElement('div');
  head.className = 'head';
  head.textContent = headingOf(p);
  if (verses && verses.length > 0) {
    const small = document.createElement('small');
    small.textContent = 'Majority Standard Bible';
    head.append(small);
  }
  card.append(head);
  if (verses === null || verses.length > 0) {
    const body = document.createElement('div');
    body.className = 'body';
    if (verses === null) {
      body.className += ' wait';
      body.textContent = 'Loading the verse…';
    } else {
      const numbered = verses.length > 1;
      for (const v of verses) {
        const para = document.createElement('p');
        para.setAttribute('data-verse', String(v.n));
        if (numbered) {
          const n = document.createElement('sup');
          n.textContent = String(v.n);
          para.append(n);
        }
        para.append(v.text);
        body.append(para);
      }
    }
    card.append(body);
  }
  const go = document.createElement('a');
  go.className = 'open';
  go.href = href;
  go.target = '_blank';
  go.rel = 'noopener';
  go.textContent = 'Open in Lampas';
  card.append(go);
}

/** Opens the card for a tagged link, closing any other first. `focus` puts the keyboard on its button. */
export function openPopup(link: HTMLAnchorElement, focus = false): void {
  closePopup();
  const href = link.getAttribute('href') ?? '';
  const p = passageOf(href);
  if (!p) return;
  const host = document.createElement('div');
  host.setAttribute(HOST, '');
  host.style.cssText = 'all: initial; position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css(isDark(link) ? DARK : LIGHT);
  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', headingOf(p));
  shadow.append(style, card);
  const open: Open = { link, host, card };
  current = open;
  host.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  host.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') closeLater(e.relatedTarget);
  });
  fill(open, p, null, href);
  document.body.append(host);
  place(open);
  if (focus) card.querySelector<HTMLElement>('.open')?.focus({ preventScroll: true });
  void fetchChapter(p).then((file) => {
    if (current !== open) return;
    const verses = file === null ? [] : versesOf(file, p);
    fill(open, p, verses, href);
    place(open);
    if (focus) card.querySelector<HTMLElement>('.open')?.focus({ preventScroll: true });
  });
}

function closeLater(to: EventTarget | null): void {
  if (current && to instanceof Node && (current.host.contains(to) || current.link.contains(to))) return;
  clearTimeout(closeTimer);
  closeTimer = window.setTimeout(closePopup, HOVER_CLOSE_MS);
}

const linkOf = (e: Event): HTMLAnchorElement | null => {
  const t = e.target;
  return t instanceof Element ? t.closest<HTMLAnchorElement>(`a[${MARK}]`) : null;
};

/** Listens on the page for a tap or a hover on a tagged link. Called once; `from` is the origin the script was loaded from, where the chapter files are (the app's, when unknown). */
export function listenForPopups(from?: string): void {
  dataOrigin = from;
  // A mouse hovers: the card opens a moment after the pointer rests on the link and closes a moment after it leaves both (the gap between them is crossed).
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const link = linkOf(e);
    if (!link) return;
    clearTimeout(closeTimer);
    if (current?.link === link) return;
    clearTimeout(openTimer);
    openTimer = window.setTimeout(() => openPopup(link), HOVER_OPEN_MS);
  });
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse' || !linkOf(e)) return;
    clearTimeout(openTimer);
    closeLater(e.relatedTarget);
  });
  // A click with a mouse goes to Lampas as the link always did; a tap, a pen or the Enter key opens the card instead and the page stays.
  document.addEventListener('click', (e) => {
    const link = linkOf(e);
    if (!link || (e as PointerEvent).pointerType === 'mouse' || e.button !== 0) {
      if (link) closePopup();
      return;
    }
    e.preventDefault();
    if (current?.link === link) closePopup();
    else openPopup(link, (e as PointerEvent).pointerType === '');
  });
  // A touch anywhere else closes it (a press on a link is the click's to answer).
  document.addEventListener('pointerdown', (e) => {
    if (!current || linkOf(e) || e.composedPath().includes(current.host)) return;
    closePopup();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePopup();
  });
  window.addEventListener('resize', () => current && place(current));
}
