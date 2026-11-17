// features/steps/build.steps.ts — runs features/build.feature against one real vite build, made once (mw-5r3p30.1175). It is in
// BUILD_PART_FILES (tests/support/build-part.ts): no shard runs it, the gate's build part (LAMPAS_TESTS=build) runs it alone.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { childBuildTestMs, viteBuild } from '../../tests/support/child-build';
import { HOOK_TIMEOUT_MS } from '../../tests/support/timeouts';

// The first scenario to ask for the build waits for it.
vi.setConfig({ testTimeout: childBuildTestMs(1) });

interface Icon {
  sizes?: string;
  type?: string;
  src: string;
}
interface Manifest {
  name: string;
  short_name: string;
  display: string;
  icons: Icon[];
  protocol_handlers?: { protocol: string; url: string }[];
}

const outDir = mkdtempSync(join(tmpdir(), 'lampas-build-'));
let built = false;
afterAll(() => rmSync(outDir, { recursive: true, force: true }), HOOK_TIMEOUT_MS);

// vite's own CLI in a child process: esbuild refuses to run inside this jsdom test environment.
function buildOnce(): void {
  if (built) return;
  viteBuild(outDir);
  built = true;
}

const manifestOf = () => JSON.parse(readFileSync(join(outDir, 'manifest.webmanifest'), 'utf8')) as Manifest;
let swText = '';

const feature = await loadFeature('features/build.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The manifest makes Lampas installable', ({ Given, Then }) => {
    Given('the app is built', () => {
      buildOnce();
    });

    Then('the manifest names the app Lampas, display standalone, with 192 and 512 icons', () => {
      const manifest = manifestOf();
      expect(manifest.name).toBe('Lampas');
      expect(manifest.short_name).toBe('Lampas');
      expect(manifest.display).toBe('standalone');
      const png = (size: string) => manifest.icons.find((icon) => icon.sizes === size && icon.type === 'image/png');
      expect(png('192x192')).toBeDefined();
      expect(png('512x512')).toBeDefined();
      for (const icon of manifest.icons) {
        expect(readFileSync(join(outDir, icon.src.replace(/^\//, ''))).length).toBeGreaterThan(0);
      }
      // Served at the root of its own domain: every asset reference is root-absolute.
      const page = readFileSync(join(outDir, 'index.html'), 'utf8');
      expect(page).toMatch(/src="\/assets\/[^"]+\.js"/);
      expect(page).toMatch(/href="\/assets\/[^"]+\.css"/);
      expect(page).not.toMatch(/(src|href)="\.\/?assets/);
    });
  });

  Scenario('The built manifest hands web+lampas: links to the app', ({ Given, Then }) => {
    Given('the app is built', () => {
      buildOnce();
    });

    Then('the manifest has a protocol handler for web+lampas that opens the reference in the address', () => {
      expect(manifestOf().protocol_handlers).toEqual([{ protocol: 'web+lampas', url: '/#/?ref=%s' }]);
    });
  });

  Scenario('Only the index, the lemma lexicon, the frequency table and Romans 8 are precached', ({ Given, Then, And }) => {
    Given('the app is built', () => {
      buildOnce();
      swText = readFileSync(join(outDir, 'sw.js'), 'utf8');
    });
    Then('the service worker precaches data/index.json, data/lexicon.json, data/frequency.json and data/rom/8.json and no other chapter or Old Testament file', () => {
      const urls = [...swText.matchAll(/"url":"([^"]+)"/g)].map((m) => m[1]);
      const data = urls.filter((u) => u.startsWith('data/')).sort();
      expect(data).toEqual(['data/frequency.json', 'data/index.json', 'data/lexicon.json', 'data/rom/8.json']);
      expect(urls.length).toBeGreaterThan(4);
    });
    And('the service worker serves other chapters cache-first from a runtime cache', () => {
      expect(readFileSync('src/sw.ts', 'utf8')).toMatch(/CacheFirst/);
      expect(swText).toMatch(/\/data\//);
    });
  });
});
