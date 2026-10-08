// The 'live' Playwright project drives the deployed app: Postern's CORS allows only the real origin, so a
// localhost preview can never reach the tutor. Importing the config reads the environment, hence resetModules.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
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
    const live = config.projects?.find((p) => p.name === 'live');
    expect(live?.use?.baseURL).toBe('https://lampas.allmymind.org');
  });

  it('is run by an e2e:live script that marks the run as live and builds nothing', () => {
    const script = JSON.parse(readFileSync('package.json', 'utf-8')).scripts['e2e:live'] as string;
    expect(script).toContain('LAMPAS_E2E=live');
    expect(script).toContain('--project=live');
    expect(script).not.toContain('build');
  });
});
