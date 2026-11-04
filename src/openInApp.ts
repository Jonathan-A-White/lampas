// src/openInApp.ts — 'Open in the app' (mw-5r3p30.1041): what the control needs, apart from drawing it. A page cannot force the installed app open, so in a Chrome tab on
// Android where navigator.getInstalledRelatedApps() (https://developer.chrome.com/docs/capabilities/get-installed-related-apps) names Lampas, his tap hands the SAME address
// to Android as an intent: URL; nothing here ever leaves the page by itself. The manifest names Lampas in related_applications (pwa-manifest.ts) so the API can see it.

import { topVerseOf } from './reader/useKeepTopVerse';
import { linkOf, osisOf } from './nav/links';
import { pathOf } from './nav/path';
import { readerOf } from './nav/route';

/** In sessionStorage: 'Not now' put the control away for the rest of the tab's session. */
export const DISMISSED_KEY = 'lampas.openInAppDismissed';

interface RelatedApp {
  platform?: string;
}
type RelatedAppsApi = () => Promise<RelatedApp[]>;

/** The installed app's own window: display-mode standalone (the manifest's), or a bigger one. A Chrome tab is display-mode browser. */
export function inInstalledApp(): boolean {
  if (typeof window.matchMedia !== 'function') return false;
  return ['standalone', 'minimal-ui', 'fullscreen', 'window-controls-overlay'].some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches);
}

/** An intent: URL is Android Chrome's; any other browser would show a dead address. */
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
 * The intent: URL for an http(s) address: `intent://host/path#/hash#Intent;scheme=https;S.browser_fallback_url=<the address>;end`. Android reads everything before the last '#Intent;'
 * as the address, so the hash and the verse in it go across whole (handedHref says which hash). Without a package, the app that has the address in its scope takes it (the installed
 * Lampas). The fallback keeps the page where it is if nothing takes it. Not proven on a real install: that is his phone's to say (the story's HOW TO CHECK IT).
 */
export function intentUrl(href: string, onTop: number | null = null): string {
  const handed = handedHref(href, onTop);
  const url = new URL(handed);
  const scheme = url.protocol.replace(':', '');
  return `intent://${handed.slice(url.protocol.length + 2)}#Intent;scheme=${scheme};S.browser_fallback_url=${encodeURIComponent(handed)};end`;
}

/** Leaves the page for the address (his tap only). A seam: the tests stand in for it, a jsdom window cannot navigate. */
export function goTo(url: string): void {
  window.location.assign(url);
}
