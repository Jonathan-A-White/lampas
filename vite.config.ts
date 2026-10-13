import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { pwaManifest } from './pwa-manifest';
import { injectManifestOptions } from './pwa-precache';
import { buildTime, buildVersion, shortCommit } from './build-version';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// The build's version stamp (its time and commit) and the plain version are written into index.html as two globals, NOT
// defined into the code: a define puts the stamp into whichever chunk reads it, so every build renamed that chunk and the
// phone downloaded all of it again (mw-5r3p30.277). index.html is not hashed and is a few hundred bytes.
// src/vite-env.d.ts declares them; vitest.config.ts still defines them for the tests.
const versionGlobals = () => ({
  name: 'lampas-version-globals',
  transformIndexHtml: () => [
    {
      tag: 'script',
      children: `globalThis.__APP_VERSION__=${JSON.stringify(buildVersion(pkg.version, buildTime(), shortCommit()))};globalThis.__APP_SEMVER__=${JSON.stringify(pkg.version)};`,
      injectTo: 'head-prepend' as const,
    },
  ],
});

// Libraries from node_modules sit in one chunk of their own, so a build that changes only app code keeps its name.
function manualChunks(id: string): string | undefined {
  return id.includes('/node_modules/') ? 'vendor' : undefined;
}

// https://vite.dev/config/
export default defineConfig({
  // Served at the root of https://lampas.allmymind.org: root-absolute asset paths, a self-contained dist/.
  base: '/',
  plugins: [
    react(),
    versionGlobals(),
    tailwindcss(),
    VitePWA({
      // 'prompt': a new build waits until he taps the Update banner (docs/pwa-best-practices.md section 10).
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: pwaManifest,
      injectManifest: injectManifestOptions,
    }),
  ],
  build: {
    rollupOptions: { output: { manualChunks } },
  },
});
