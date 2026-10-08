// The injectManifest options, shared by vite.config.ts and its unit test. Workbox drops a file over
// maximumFileSizeToCacheInBytes (default 2 MiB) from the precache without an error, so the limit is
// raised past the biggest chunk the app will ship. The New Testament data (public/data, about 30 MB for
// 260 chapters) is not precached whole: only the index, the lemma lexicon (data/lexicon.json, about 300 KB) and Romans 8, the chapter the demo reads, ship with
// the build; every other chapter is fetched on demand and kept by the worker's /data/ route (src/sw.ts).
// The patterns for it name its two files, no wildcard. The memory pictures (public/pictures, about 20 KB
// in all) are precached by name too, so a card shows its picture offline.
export const injectManifestOptions = {
  globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}', 'pictures/*.svg', 'data/index.json', 'data/lexicon.json', 'data/rom/8.json'],
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
};
