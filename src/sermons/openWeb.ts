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
/** The Logos app's Android package: the Play listing 'Logos Bible' is https://play.google.com/store/apps/details?id=com.logos.androidlogos (Faithlife's community post of its Android apps links the same id). */
const LOGOS_APP = 'com.logos.androidlogos';

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

/** Whether an https address is a link into Logos: its host is ref.ly (Faithlife's short links, `https://ref.ly/logosres/LLS:<id>?...`). A look-alike (ref.ly.evil.example) is text. */
export function isLogosAddress(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === 'https:' && parsed.hostname.toLowerCase() === 'ref.ly';
}

/**
 * The link for an https address, so that Android asks nothing (mw-qtu3zvz.86): an intent:// address that names the app and carries the https address as its browser_fallback_url, so a phone without the app opens the page.
 * A ref.ly (Logos) address is the Logos app's, with either choice; a video is left alone (mw-qtu3zvz.62); any other https address is Firefox's where Firefox is chosen. Off Android, and anything that is not an https address, is left alone.
 */
export function webHref(url: string, choice: OpenWebIn, android: boolean): string {
  if (!android || !url.startsWith('https:')) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const app = isLogosAddress(url) ? LOGOS_APP : choice === 'firefox' && !isVideoAddress(url) ? FIREFOX : undefined;
  if (app === undefined) return url;
  // the page's own #fragment cannot ride in an intent address (its '#' starts the intent's parts); the fallback keeps it
  return `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=https;package=${app};S.browser_fallback_url=${encodeURIComponent(parsed.href)};end`;
}

/** The href of a sermon row: its address through webHref, a web row and a Logos row (its ref.ly address) alike; a Logos app link (logosres:) is not https and is never touched. */
export function rowHref(row: { opensIn: 'web' | 'logos'; open: { url: string } }, choice: OpenWebIn, android: boolean): string {
  return webHref(row.open.url, choice, android);
}

/** The address a source's credit links to: the Logos archive itself (the ref.ly address of its first resource) for a source that has resources, else its homepage (a Logos archive's homepage is logos.com, a sale page). */
export function creditAddress(source: { homepage: string; resources?: readonly string[] }): string {
  const first = source.resources?.[0];
  return first === undefined ? source.homepage : `https://ref.ly/logosres/${encodeURIComponent(first)}`;
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
