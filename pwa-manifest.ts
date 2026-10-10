import type { ManifestOptions } from 'vite-plugin-pwa';

// One plain object, imported by vite.config.ts and by the tests, so the manifest cannot drift unseen.
// The theme and background match index.html's theme-color meta and the root background in src/index.css.
export const THEME_COLOR = '#0a0e17';

export const pwaManifest: Partial<ManifestOptions> = {
  name: 'Lampas',
  short_name: 'Lampas',
  description: 'Read the New Testament in Koine Greek, with the English woven in',
  display: 'standalone',
  orientation: 'portrait',
  start_url: '/',
  scope: '/',
  background_color: THEME_COLOR,
  theme_color: THEME_COLOR,
  // web+lampas:Rom.8.28 opens the installed app on that verse where the browser supports it (Chrome and Edge, not iOS Safari); docs/links.md.
  protocol_handlers: [{ protocol: 'web+lampas', url: '/#/?ref=%s' }],
  // Lampas in the phone's share sheet (mw-y3qno5.2): src/sw.ts parks the pictures and words and the window opens on the Share screen (src/share/).
  share_target: {
    action: '/share-target', // src/share/target.ts SHARE_TARGET_PATH (tests/unit/manifest.test.ts holds them equal)
    method: 'POST',
    enctype: 'multipart/form-data',
    params: { title: 'title', text: 'text', url: 'url', files: [{ name: 'files', accept: ['image/*'] }] },
  },
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
  ],
};
