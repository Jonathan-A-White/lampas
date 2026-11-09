// src/data/versionedLists.ts — the plain-address lists under /data/ that the app fetches and the worker does not precache (mw-fnvjof.17.41). Each is asked for as
// /data/<list>.json?v=<fingerprint> (chapter.ts listUrl), the fingerprint in index.json `lists`, so the worker keeps it under that address (src/dataCache.ts
// isVersionedList) and a changed list reaches a phone that kept the old. Here and not in chapter.ts so the data build (scripts/) can name them without the app.
// The Greek lexicon.json and frequency.json are precached, so a new build replaces them; they are not here.
export const VERSIONED_LISTS = ['lexicon-hbo', 'frequency-hbo'] as const;
export type VersionedList = (typeof VERSIONED_LISTS)[number];
