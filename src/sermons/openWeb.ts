// src/sermons/openWeb.ts — 'Open web sermons in' (Settings > Study resources > Sermons, mw-qtu3zvz.16, docs/sermons.md 'Open web sermons in'): a web sermon opens in this browser (the plain https link, as
// ever) or in Firefox. Chrome's Reading mode read-aloud plays on the phone's speaker, Firefox's goes over his Bluetooth. Firefox is reached by an Android intent:// address that names its package and
// carries the https address as its browser_fallback_url, so a phone without Firefox opens the page where it was going to anyway. Off Android the choice does nothing.
import { createContext, useContext } from 'react';
import { onAndroid } from '../openInApp';
import { isSubsplashHost } from './merge';
import { openWebSetting } from '../settings/definitions/sermons';
import type { OpenWebIn } from '../settings/definitions/sermons';
import { useSetting } from '../settings/store';

export type { OpenWebIn } from '../settings/definitions/sermons';

const FIREFOX = 'org.mozilla.firefox';

/** Whether an address is a video: its host is youtube.com, youtu.be or a subdomain of either (m.youtube.com), or a Subsplash host (merge.ts isSubsplashHost; Subsplash pages are the service's video). A look-alike (youtube.com.evil.example, notyoutube.com) is text. PROVISIONAL, the Governor to confirm (mw-qtu3zvz.62). */
export function isVideoAddress(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  const youtube = ['youtube.com', 'youtu.be'].some((domain) => host === domain || host.endsWith(`.${domain}`));
  return youtube || isSubsplashHost(host);
}

/** The link for an https address under the choice: the Firefox intent where Firefox is chosen on Android, else the address as it is. Anything that is not an https address, and a video (Firefox is for a page of text; a video has its own sound), is left alone. */
export function webHref(url: string, choice: OpenWebIn, android: boolean): string {
  if (choice !== 'firefox' || !android || !url.startsWith('https:')) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (isVideoAddress(url)) return url;
  // the page's own #fragment cannot ride in an intent address (its '#' starts the intent's parts); the fallback keeps it
  return `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=https;package=${FIREFOX};S.browser_fallback_url=${encodeURIComponent(parsed.href)};end`;
}

/** The href of a sermon row: only a row that opens on the web is turned; a Logos row (its app link and its ref.ly fallback) is never touched. */
export function rowHref(row: { opensIn: 'web' | 'logos'; open: { url: string } }, choice: OpenWebIn, android: boolean): string {
  return row.opensIn === 'web' ? webHref(row.open.url, choice, android) : row.open.url;
}

/** The choice the sheet's links follow: read once by the sheet (SermonsSheet) and handed to its rows, so a row asks nothing itself. 'browser' until it is read. */
export const OpenWebContext = createContext<OpenWebIn>('browser');

/** Reads the saved choice, following every change; 'browser' until it has been read. */
export function useOpenWebIn(): OpenWebIn {
  return useSetting(openWebSetting) ?? 'browser';
}

/** The href for a web address, under the sheet's choice and this phone. */
export function useWebHref(): (url: string) => string {
  const choice = useContext(OpenWebContext);
  return (url) => webHref(url, choice, onAndroid());
}

/** The href for a sermon row, under the sheet's choice and this phone. */
export function useRowHref(): (row: { opensIn: 'web' | 'logos'; open: { url: string } }) => string {
  const choice = useContext(OpenWebContext);
  return (row) => rowHref(row, choice, onAndroid());
}

/** Whether a link is for a new tab: an https address is; the Firefox intent is not (it hands the page to another app and a blank tab would be left behind). */
export const opensNewTab = (href: string): boolean => href.startsWith('https:');
