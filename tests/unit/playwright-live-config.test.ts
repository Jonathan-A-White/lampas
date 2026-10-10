// The 'live' Playwright project drives the deployed app: Postern's CORS allows only the real origin, so a
// localhost preview can never reach the tutor. Importing the config reads the environment, hence resetModules.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { PHONE_WIDTH_SPECS } from '../support/e2e-projects';
import type { PlaywrightTestConfig } from '@playwright/test';

async function loadConfig(env: Record<string, string | undefined>): Promise<PlaywrightTestConfig> {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(name, undefined as unknown as string);
    else vi.stubEnv(name, value);
  }
  return (await import('../../playwright.config')).default;
}

describe('the live Playwright project', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('drives the deployed app at https://lampas.allmymind.org by default', async () => {
    const config = await loadConfig({ LAMPAS_LIVE_URL: undefined, LAMPAS_E2E: 'live' });
    const live = config.projects?.find((p) => p.name === 'live');
    expect(live?.use?.baseURL).toBe('https://lampas.allmymind.org');
  });

  it('takes another origin from LAMPAS_LIVE_URL', async () => {
    const config = await loadConfig({ LAMPAS_LIVE_URL: 'https://example.test', LAMPAS_E2E: 'live' });
    expect(config.projects?.find((p) => p.name === 'live')?.use?.baseURL).toBe('https://example.test');
  });

  it('starts no preview server when the run is the live one', async () => {
    const config = await loadConfig({ LAMPAS_E2E: 'live' });
    expect(config.webServer).toBeUndefined();
  });

  it('leaves the other projects on the local preview, with its server', async () => {
    const config = await loadConfig({ LAMPAS_E2E: undefined });
    expect(config.webServer).toBeDefined();
    expect(config.use?.baseURL).toMatch(/^http:\/\/localhost:\d+$/);
  });

  it('is left out of a plain run, which would otherwise load the live specs (they import src/config, which needs a Vite define)', async () => {
    const config = await loadConfig({ LAMPAS_E2E: undefined });
    expect(config.projects?.map((p) => p.name)).toEqual(['chromium', 'shots']);
  });

  it('listens to a bundled clip of Romans 8:28 as its fake microphone, and may use the microphone', async () => {
    const config = await loadConfig({ LAMPAS_E2E: 'live' });
    const live = config.projects?.find((p) => p.name === 'live');
    const args = live?.use?.launchOptions?.args ?? [];
    expect(args).toContain('--use-fake-device-for-media-stream');
    expect(args).toContain('--use-fake-ui-for-media-stream');
    const clip = args.find((a) => a.startsWith('--use-file-for-fake-audio-capture='))?.split('=')[1] ?? '';
    expect(clip).toMatch(/tests\/fixtures\/read-8-28\.wav$/);
    expect(existsSync(clip)).toBe(true);
    expect(live?.use?.permissions).toContain('microphone');
  });

  it('is run by an e2e:live script that marks the run as live and builds nothing', () => {
    const script = JSON.parse(readFileSync('package.json', 'utf-8')).scripts['e2e:live'] as string;
    expect(script).toContain('LAMPAS_E2E=live');
    expect(script).toContain('--project=live');
    expect(script).not.toContain('build');
  });
});

describe('the chromium and shots Playwright projects', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const ignored = (p: { testIgnore?: unknown } | undefined): string[] => ([] as string[]).concat((p?.testIgnore ?? []) as string | string[]);

  it('keep the phone-width specs out of chromium (1280 wide) and run them under shots', async () => {
    const config = await loadConfig({ LAMPAS_E2E: undefined });
    const chromium = config.projects?.find((p) => p.name === 'chromium');
    const shots = config.projects?.find((p) => p.name === 'shots');
    for (const file of PHONE_WIDTH_SPECS) {
      expect(existsSync(`tests/e2e/${file}`), `${file} exists`).toBe(true);
      expect(ignored(chromium), file).toContain(`**/${file}`);
      expect(ignored(shots), file).not.toContain(`**/${file}`);
    }
    expect(PHONE_WIDTH_SPECS.length).toBeGreaterThan(0);
  });

  it('leave every spec (but the live ones) to at least one of them', async () => {
    const config = await loadConfig({ LAMPAS_E2E: undefined });
    const specs = readdirSync('tests/e2e').filter((f) => f.endsWith('.spec.ts') && !f.endsWith('-live.spec.ts'));
    for (const file of specs) {
      const runsIn = ['chromium', 'shots'].filter((name) => {
        const project = config.projects?.find((p) => p.name === name);
        return !ignored(project).includes(`**/${file}`);
      });
      expect(runsIn.length, file).toBeGreaterThan(0);
    }
  });
});
