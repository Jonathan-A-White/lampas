// The scheme-then-fallback opener (src/resources/openApp.ts): the app's own scheme is tried first by the link itself; the https
// address is opened only when the page stayed in front for the wait (the phone found no app for the scheme).
import { describe, expect, it } from 'vitest';
import { armFallback, browserEnv, checkApp, type OpenEnv } from '../../src/resources/openApp';
import { storeUrl } from '../../src/resources/appStore';

function fakeEnv() {
  const away = new Set<() => void>();
  const back = new Set<() => void>();
  const launched: string[] = [];
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
    launch: (url) => void launched.push(url),
    onReturn: (fn) => {
      back.add(fn);
      return () => back.delete(fn);
    },
  };
  return {
    env,
    opened,
    launched,
    comeBack: () => [...back].forEach((fn) => fn()),
    wait: () => timer?.(),
    goAway: () => [...away].forEach((fn) => fn()),
    armed: () => timer !== null,
  };
}

describe('armFallback', () => {
  it('opens the https address when nothing took the page away in the wait', () => {
    const f = fakeEnv();
    armFallback('https://ref.ly/logosres/LLS%3A46.30.18?hw=x', f.env);
    expect(f.opened).toEqual([]);
    f.wait();
    expect(f.opened).toEqual(['https://ref.ly/logosres/LLS%3A46.30.18?hw=x']);
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

describe('checkApp', () => {
  const handlers = () => {
    const said: string[] = [];
    return { said, h: { onOpened: () => said.push('opened'), onBack: () => said.push('back'), onMissing: () => said.push('missing') } };
  };

  it('opens the app address once and says missing when the page stays in front for the wait', () => {
    const f = fakeEnv();
    const { said, h } = handlers();
    checkApp('accord://', h, f.env);
    expect(f.launched).toEqual(['accord://']);
    expect(said).toEqual([]);
    f.wait();
    expect(said).toEqual(['missing']);
  });

  it('says opened when the page goes away, never missing, and back when it returns', () => {
    const f = fakeEnv();
    const { said, h } = handlers();
    checkApp('accord://', h, f.env);
    f.goAway();
    expect(f.armed()).toBe(false);
    f.wait();
    expect(said).toEqual(['opened']);
    f.comeBack();
    f.comeBack();
    expect(said).toEqual(['opened', 'back']);
  });

  it('says nothing once dropped', () => {
    const f = fakeEnv();
    const { said, h } = handlers();
    checkApp('accord://', h, f.env)();
    f.wait();
    f.goAway();
    expect(said).toEqual([]);
  });
});

describe('storeUrl', () => {
  const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8)';
  const IOS = ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)'];

  it('opens Accordance Mobile by its id on Android and anywhere else, and in the App Store on an iPhone or iPad', () => {
    expect(storeUrl('Accordance', ANDROID)).toBe('https://play.google.com/store/apps/details?id=com.accordancebible.accordance');
    expect(storeUrl('Accordance', 'Mozilla/5.0 (X11; Linux x86_64)')).toBe('https://play.google.com/store/apps/details?id=com.accordancebible.accordance');
    for (const ua of IOS) expect(storeUrl('Accordance', ua)).toBe('itms-apps://apps.apple.com/app/id411970514');
  });

  it('keeps the name search for an app with no known id', () => {
    expect(storeUrl('Logos', ANDROID)).toBe('https://play.google.com/store/search?q=Logos&c=apps');
    expect(storeUrl('Logos', IOS[0])).toBe('itms-apps://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?media=software&q=Logos');
  });

  it('encodes the app name', () => {
    expect(storeUrl('A & B', 'Android')).toContain('q=A%20%26%20B');
  });
});
