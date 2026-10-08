import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Theme } from '../../src/appearance/themes';

// The start-up read of the saved Theme and Text size, held open by hand so a tap can land before it resolves.
const reads = vi.hoisted(() => ({
  theme: undefined as unknown as { resolve: (t: Theme) => void; promise: Promise<Theme> },
  size: undefined as unknown as { resolve: (n: number) => void; promise: Promise<number> },
}));
vi.mock('../../src/data/repositories', () => ({
  getTheme: () => reads.theme.promise,
  getTextSize: () => reads.size.promise,
}));

import { startAppearanceSync } from '../../src/appearance/appearanceSync';
import { clearBus, latest, publish } from '../../src/events/bus';

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { resolve, promise };
}
const settle = () => new Promise((r) => setTimeout(r, 0));
const scale = () => document.documentElement.style.getPropertyValue('--lp-scale');

let stop: () => void;
beforeEach(() => {
  clearBus();
  reads.theme = deferred<Theme>();
  reads.size = deferred<number>();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('--lp-scale');
  stop = startAppearanceSync();
});
afterEach(() => stop());

describe('the start-up read of the saved appearance', () => {
  it('applies the saved Text size and Theme when nothing was written meanwhile', async () => {
    reads.theme.resolve('light');
    reads.size.resolve(115);
    await settle();
    expect(latest('text-size-changed')?.percent).toBe(115);
    expect(scale()).toBe('1.15');
    expect(latest('theme-changed')?.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('lets a Text size written before the read resolves win over the saved one', async () => {
    publish({ kind: 'text-size-changed', percent: 130 });
    reads.theme.resolve('phone');
    reads.size.resolve(100);
    await settle();
    expect(latest('text-size-changed')?.percent).toBe(130);
    expect(scale()).toBe('1.3');
  });

  it('lets a Theme written before the read resolves win over the saved one', async () => {
    publish({ kind: 'theme-changed', theme: 'dark' });
    reads.theme.resolve('light');
    reads.size.resolve(100);
    await settle();
    expect(latest('theme-changed')?.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('keeps the saved value of the setting that was not written', async () => {
    publish({ kind: 'text-size-changed', percent: 130 });
    reads.theme.resolve('light');
    reads.size.resolve(100);
    await settle();
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
