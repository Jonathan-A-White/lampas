// src/resources/appStore.ts — where to get an app that a Study link could not open: the Play Store (Android, and anywhere else) or the App
// Store (iPhone, iPad). A search for the app's name, because no app id could be confirmed (docs/resources.md): the search lands on the app
// when the store has one. Accordance, for one, may have no Android app, and then Turn off is the way out.

/** The store page to search for `app` on the phone whose user agent is `agent`. */
export function storeUrl(app: string, agent: string = navigator.userAgent): string {
  const name = encodeURIComponent(app);
  if (/iPhone|iPad|iPod/.test(agent)) return `itms-apps://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?media=software&q=${name}`;
  return `https://play.google.com/store/search?q=${name}&c=apps`;
}
