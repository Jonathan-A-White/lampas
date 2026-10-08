import { afterEach, describe, expect, it, vi } from 'vitest';

const GOVERNOR_ISSUER = '035666d4ea414a65801ac092a4e28be6515065adcc7ac58d9cc76db8d5597f44c4';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('the configured issuer', () => {
  it('is the Governor’s issuer key when VITE_LAMPAS_ISSUER is not set', async () => {
    vi.stubEnv('VITE_LAMPAS_ISSUER', '');
    vi.resetModules();
    const config = await import('../../src/config');
    expect(config.DEFAULT_ISSUER).toBe(GOVERNOR_ISSUER);
    expect(config.ISSUER).toBe(GOVERNOR_ISSUER);
  });

  it('can be overridden for a build, in lower case', async () => {
    vi.stubEnv('VITE_LAMPAS_ISSUER', ' 02ABCD ');
    vi.resetModules();
    expect((await import('../../src/config')).ISSUER).toBe('02abcd');
  });
});
