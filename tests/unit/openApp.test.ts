// The scheme-then-fallback opener (src/resources/openApp.ts): the app's own scheme is tried first by the link itself; the https
// address is opened only when the page stayed in front for the wait (the phone found no app for the scheme).
import { describe, expect, it } from 'vitest';
import { armFallback, type OpenEnv } from '../../src/resources/openApp';

function fakeEnv() {
  const away = new Set<() => void>();
  let timer: (() => void) | null = null;
  const opened: string[] = [];
  const env: OpenEnv = {
    waitMs: 1800,
    after: (fn) => {
      timer = fn;
      return () => {
        timer = null;
      };
    },
    onAway: (fn) => {
      away.add(fn);
      return () => away.delete(fn);
    },
    open: (url) => void opened.push(url),
  };
  return {
    env,
    opened,
    wait: () => timer?.(),
    goAway: () => [...away].forEach((fn) => fn()),
    armed: () => timer !== null,
  };
}

describe('armFallback', () => {
  it('opens the https address when nothing took the page away in the wait', () => {
    const f = fakeEnv();
    armFallback('https://ref.ly/logosres/bdag?hw=x', f.env);
    expect(f.opened).toEqual([]);
    f.wait();
    expect(f.opened).toEqual(['https://ref.ly/logosres/bdag?hw=x']);
  });

  it('opens nothing when the app took the page away (hidden, blurred or left) before the wait ended', () => {
    const f = fakeEnv();
    armFallback('https://ref.ly/x', f.env);
    f.goAway();
    expect(f.armed()).toBe(false);
    f.wait();
    expect(f.opened).toEqual([]);
  });

  it('does nothing at all for a link with no fallback', () => {
    const f = fakeEnv();
    armFallback(undefined, f.env);
    expect(f.armed()).toBe(false);
    expect(f.opened).toEqual([]);
  });

  it('refuses a fallback that is not https', () => {
    const f = fakeEnv();
    armFallback('javascript:alert(1)', f.env);
    expect(f.armed()).toBe(false);
  });
});
