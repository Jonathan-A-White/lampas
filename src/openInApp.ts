// src/openInApp.ts — 'Open in the app' (mw-5r3p30.1041): what the control needs, apart from drawing it. A page cannot force the installed app open, so in a Chrome tab on
// Android where navigator.getInstalledRelatedApps() (https://developer.chrome.com/docs/capabilities/get-installed-related-apps) names Lampas, his tap hands the SAME address
// to Android in a new tab with no referrer (goTo; not an intent: URL, which Chrome keeps in the tab for its own host); nothing here ever leaves the page by itself. The manifest names Lampas in related_applications (pwa-manifest.ts) so the API can see it.

import { topVerseOf } from './reader/useKeepTopVerse';
import { linkOf, osisOf } from './nav/links';
import { pathOf } from './nav/path';
import { pendingRequest } from './nav/readerRequest';
import { readerOf } from './nav/route';

/** In sessionStorage: 'Not now' put the control away for the rest of the tab's session. */
export const DISMISSED_KEY = 'lampas.openInAppDismissed';

interface RelatedApp {
  platform?: string;
}
type RelatedAppsApi = () => Promise<RelatedApp[]>;

/**
 * The installed app's own window: display-mode standalone (the manifest's display), or a bigger one. NOT minimal-ui (mw-5r3p30.1090): the manifest never asks for it, and a page opened from
 * another app (a link tapped in Postern) is a Chrome Custom Tab, a browser tab with a minimal toolbar that Chrome can present as minimal-ui; it is no installed app and wants the strip.
 * A Custom Tab has the same user agent and the same getInstalledRelatedApps as a Chrome tab, so display-mode is the one thing that told them apart; unproven on a phone.
 */
export function inInstalledApp(): boolean {
  if (typeof window.matchMedia !== 'function') return false;
  return ['standalone', 'fullscreen', 'window-controls-overlay'].some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches);
}

/** The hand-over is Android Chrome's (it launches the installed web app); any other browser would only open a second tab. */
export const onAndroid = (): boolean => /Android/i.test(navigator.userAgent);

/** True where the page is in a browser tab on Android and the installed Lampas is reported by getInstalledRelatedApps; false for every other case, an absent or failing API too. */
export async function installedAppSeen(): Promise<boolean> {
  if (!onAndroid() || inInstalledApp()) return false;
  const ask = (navigator as unknown as { getInstalledRelatedApps?: RelatedAppsApi }).getInstalledRelatedApps;
  if (typeof ask !== 'function') return false;
  try {
    return (await ask.call(navigator)).some((app) => app.platform === 'webapp');
  } catch {
    return false;
  }
}

/**
 * The address the installed app is handed (mw-5r3p30.1050). The Reader keeps no verse in its own address (`#/?b=rom&c=8&view=english&weave=off`: the verse he is reading is only where the
 * box is scrolled, and a `v` is the Verse view), so handed whole it opens the chapter at verse 1 in an app with no saved place. The Reader's address is turned into the link form every
 * app opens at a verse (`#/?ref=Rom.8.28`, a range `Rom.8.1-11`, src/nav/LinkOpener.tsx), keeping its view and weave: the verse the Verse view or passage names, else `onTop`, the verse
 * at the top of the reading box (`verseOnTop`), else the chapter. A link not yet opened, a word link, an address with no chapter, and every other screen are handed as they are.
 */
export function handedHref(href: string, onTop: number | null = null): string {
  const url = new URL(href);
  const hash = url.hash;
  if (pathOf(hash) !== '#/' || linkOf(hash)) return href;
  const at = readerOf(hash);
  if (at.chapter === undefined) return href;
  const place = `${osisOf(at.book ?? 'rom')}.${at.chapter}`;
  const first = at.passage ?? at.verse ?? onTop;
  const params = new URLSearchParams();
  params.set('ref', first === null ? place : at.passage !== undefined && at.passageTo !== undefined ? `${place}.${first}-${at.passageTo}` : `${place}.${first}`);
  if (at.view) params.set('view', at.view);
  if (at.weave) params.set('weave', at.weave);
  url.hash = `#/?${params.toString()}`;
  return url.toString();
}

/**
 * The address to hand over now (mw-5r3p30.1066). The verse a `ref=` link named is no longer in the address (src/nav/LinkOpener.tsx replaced it with the plain chapter) and the box cannot
 * say a verse until the chapter's verses are drawn (loading, a chapter swap that still shows the chapter before, a chapter arriving after the strip), but the request LinkOpener made
 * (bringVerse) is still waiting then and names it: for the address's own chapter it is the verse until the Reader has met it, then the box answers.
 */
export function handOverHref(href: string = window.location.href): string {
  const at = readerOf(new URL(href).hash);
  const asked = pendingRequest();
  const named = asked?.action === 'verse' && asked.book === (at.book ?? 'rom') && asked.chapter === at.chapter ? asked.verse : null;
  return handedHref(href, named ?? verseOnTop());
}

/** The verse at the top of the Reader's reading box now (Turn pages: the first verse that begins on the page showing), or null where the box is at the chapter's top or no Reader is drawn. */
export function verseOnTop(): number | null {
  const box = document.querySelector<HTMLElement>('main[data-reader]');
  if (!box) return null;
  if (box.dataset.paging !== 'pages') return topVerseOf(box);
  const room = box.getBoundingClientRect();
  for (const el of box.querySelectorAll<HTMLElement>('[data-verse]')) {
    const first = el.getClientRects()[0];
    if (first && first.width > 0 && first.left >= room.left - 1 && first.left < room.right) {
      const n = Number(el.dataset.verse);
      return Number.isInteger(n) && n > 1 ? n : null;
    }
  }
  return null;
}

/**
 * Where the strip stands, in px from the top of the shell's bars (mw-5r3p30.1093): under the bars the shell holds (Update ready, the tutor's bar, Welcome back; the strip floats, so it
 * is not one of them and they never sit under it) and under the screen's own top bar, a `header` that starts where the bars end (the Reader's, a screen's ScreenHeader, the Verse
 * view's), whichever ends lowest. It floats over the text below, which does not move. Null where the bars are not drawn.
 */
export function stripTop(): number | null {
  const bars = document.querySelector<HTMLElement>('[data-shell-bars]');
  if (!bars) return null;
  const room = bars.getBoundingClientRect();
  let foot = room.bottom;
  for (const header of document.querySelectorAll<HTMLElement>('header')) {
    if (bars.contains(header) || header.getClientRects().length === 0) continue;
    const at = header.getBoundingClientRect();
    if (at.height > 0 && at.top <= room.bottom + 4 && at.bottom > foot) foot = at.bottom;
  }
  return Math.round(foot - room.top);
}

/**
 * Leaves the page for the address, in a NEW tab with no opener and no referrer (his tap only; mw-5r3p30.1082). A seam: the tests stand in for it, a jsdom window cannot navigate.
 *
 * Why this form, from Chromium's own source (components/external_intents, ExternalNavigationHandler.java; the story's closing comment has the walk through): an intent: URL for the
 * app's own address (the form here until mw-5r3p30.1082, scheme=https and no package) is a 'navigation to self': the default handler of an https address is the browser itself (an
 * installed web app is not a verified app link), so isNavigationToSelf loads it in the same tab, which is what he saw. A link to the address from a page of the same host is held in
 * Chrome by shouldStayWithinHost ('same host, no new resolvers'). A navigation that starts in a new tab with no referrer has no earlier page of that host to compare with, so that rule
 * does not hold it, and the app that is the sole handler of the address (the installed web app, where Android's link handling for it is on) is launched. Needs his user gesture (this is
 * called from his tap), a visible tab, and no wait. Not proven on a real install: that is his phone's to say (the story's HOW TO CHECK IT).
 */
export function goTo(url: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.referrerPolicy = 'no-referrer';
  link.hidden = true;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
  }
}
