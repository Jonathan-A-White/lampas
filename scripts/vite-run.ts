// scripts/vite-run.ts — runs a script through Vite's own module loader (`tsx scripts/vite-run.ts <script>`), for a script that imports app code which gathers files by
// import.meta.glob (src/settings/definitions/index.ts, mw-6ww.175.105): a plain tsx has no import.meta.glob. The script's own imports and exit work as under tsx.
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

const script = process.argv[2];
if (!script) throw new Error('usage: tsx scripts/vite-run.ts <script.ts>');

const server = await createServer({ configFile: false, define: { __APP_VERSION__: JSON.stringify(version), __APP_SEMVER__: JSON.stringify(version) }, appType: 'custom', logLevel: 'error', server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true } });
try {
  await server.ssrLoadModule(`/${script.replace(/^\.?\//, '')}`);
} finally {
  await server.close();
}
