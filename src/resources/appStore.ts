// src/resources/appStore.ts — where to get an app that a Study link could not open: the Play Store (Android, and anywhere else) or the App
// Store (iPhone, iPad). An app with a known id opens its own store page; one without keeps a search for its name (docs/resources.md).
// Accordance: Accordance Mobile, by OakTree Software, free on Google Play as com.accordancebible.accordance (named on
// https://www.accordancebible.com/Accordance-For-Android and in the Play listing, mw-5r3p30.108); on the App Store it is
// 'Accordance Bible Software', id 411970514 (https://apps.apple.com/us/app/accordance-bible-software/id411970514, developer OakTree Software).

/** The id an app has in each store, by the name the Study row gives it. */
const STORE_IDS: Record<string, { play: string; apple: string }> = {
  Accordance: { play: 'com.accordancebible.accordance', apple: '411970514' },
};

/** The store page for `app` on the phone whose user agent is `agent`: its own page when its id is known, else a search for its name. */
export function storeUrl(app: string, agent: string = navigator.userAgent): string {
  const name = encodeURIComponent(app);
  const ids = STORE_IDS[app];
  if (/iPhone|iPad|iPod/.test(agent)) {
    if (ids) return `itms-apps://apps.apple.com/app/id${ids.apple}`;
    return `itms-apps://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?media=software&q=${name}`;
  }
  if (ids) return `https://play.google.com/store/apps/details?id=${ids.play}`;
  return `https://play.google.com/store/search?q=${name}&c=apps`;
}
