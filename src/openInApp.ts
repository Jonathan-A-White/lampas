// src/openInApp.ts — 'Open in the app' (mw-5r3p30.1041): what the control needs, apart from drawing it. A page cannot force the installed app open, so in a Chrome tab on
// Android where navigator.getInstalledRelatedApps() (https://developer.chrome.com/docs/capabilities/get-installed-related-apps) names Lampas, his tap hands the SAME address
// to Android as an intent: URL; nothing here ever leaves the page by itself. The manifest names Lampas in related_applications (pwa-manifest.ts) so the API can see it.

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
 * The intent: URL for an http(s) address: `intent://host/path#/hash#Intent;scheme=https;S.browser_fallback_url=<the address>;end`. Android reads everything before the last '#Intent;'
 * as the address, so the hash and the verse in it go across whole. Without a package, the app that has the address in its scope takes it (the installed Lampas). The fallback keeps
 * the page where it is if nothing takes it. Not proven on a real install: that is his phone's to say (the story's HOW TO CHECK IT).
 */
export function intentUrl(href: string): string {
  const url = new URL(href);
  const scheme = url.protocol.replace(':', '');
  return `intent://${href.slice(url.protocol.length + 2)}#Intent;scheme=${scheme};S.browser_fallback_url=${encodeURIComponent(href)};end`;
}

/** Leaves the page for the address (his tap only). A seam: the tests stand in for it, a jsdom window cannot navigate. */
export function goTo(url: string): void {
  window.location.assign(url);
}
