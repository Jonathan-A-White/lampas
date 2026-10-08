// The scheme-then-fallback opener (src/resources/openApp.ts): the app's own scheme is tried first by the link itself; the https
// address is opened only when the page stayed in front for the wait (the phone found no app for the scheme).
import { describe, expect, it } from 'vitest';
import { armFallback, browserEnv, type OpenEnv } from '../../src/resources/openApp';
import { storeUrl } from '../../src/resources/appStore';

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

describe('armFallback with an app that may be missing', () => {
  it('says the app is missing when there is no fallback and the page stayed in front', () => {
    const f = fakeEnv();
    const missing: string[] = [];
    armFallback(undefined, f.env, () => missing.push('gone'));
    expect(missing).toEqual([]);
    f.wait();
    expect(missing).toEqual(['gone']);
    expect(f.opened).toEqual([]);
  });

  it('says nothing when the app took the page away', () => {
    const f = fakeEnv();
    const missing: string[] = [];
    armFallback(undefined, f.env, () => missing.push('gone'));
    f.goAway();
    f.wait();
    expect(missing).toEqual([]);
  });

  it('opens the https fallback, not the sheet, when the link has one', () => {
    const f = fakeEnv();
    const missing: string[] = [];
    armFallback('https://ref.ly/x', f.env, () => missing.push('gone'));
    f.wait();
    expect(f.opened).toEqual(['https://ref.ly/x']);
    expect(missing).toEqual([]);
  });

  it('waits about 1.5 seconds on the page', () => {
    expect(browserEnv.waitMs).toBe(1500);
  });
});

describe('storeUrl', () => {
  it('is the Play Store on Android and anywhere else, the App Store on an iPhone or iPad', () => {
    expect(storeUrl('Accordance', 'Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe('https://play.google.com/store/search?q=Accordance&c=apps');
    expect(storeUrl('Accordance', 'Mozilla/5.0 (X11; Linux x86_64)')).toBe('https://play.google.com/store/search?q=Accordance&c=apps');
    for (const ua of ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)']) {
      expect(storeUrl('Accordance', ua)).toBe('itms-apps://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?media=software&q=Accordance');
    }
  });

  it('encodes the app name', () => {
    expect(storeUrl('A & B', 'Android')).toContain('q=A%20%26%20B');
  });
});
