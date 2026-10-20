// A page that was loaded on another screen (Settings, then reloaded there) reaches the Reader later by Back, and the address of that older entry
// carries the weave it was written with: the Reader must not put it back over the weave he chose since (mw-5r3p30.658; the e2e proof is
// tests/e2e/settings.spec.ts 'Settings at phone width: the weave...'). route.ts openedOnReader() tells which kind of page it is.
import { afterEach, describe, expect, it, vi } from 'vitest';

async function routeModuleLoadedAt(hash: string) {
  window.history.replaceState(null, '', `/${hash}`);
  vi.resetModules();
  return import('../../src/nav/route');
}

afterEach(() => window.history.replaceState(null, '', '/'));

describe('the screen the page was loaded on', () => {
  it('is the Reader for a bare open and for a Reader address', async () => {
    expect((await routeModuleLoadedAt('')).openedOnReader()).toBe(true);
    expect((await routeModuleLoadedAt('#/?b=rom&c=8&view=english&weave=solid')).openedOnReader()).toBe(true);
  });

  it('is not the Reader for Settings or any other screen', async () => {
    expect((await routeModuleLoadedAt('#/settings')).openedOnReader()).toBe(false);
    expect((await routeModuleLoadedAt('#/words')).openedOnReader()).toBe(false);
  });

  it('stays what it was at load when he moves on later', async () => {
    const route = await routeModuleLoadedAt('#/settings');
    window.history.pushState(null, '', '/#/?c=8');
    expect(route.openedOnReader()).toBe(false);
  });
});
