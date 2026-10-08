// The injectManifest options, shared by vite.config.ts and its unit test. Workbox drops a file over
// maximumFileSizeToCacheInBytes (default 2 MiB) from the precache without an error, so the limit is
// raised past the biggest chunk the app will ship.
export const injectManifestOptions = {
  globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
};
