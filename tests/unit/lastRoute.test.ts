import { beforeEach, describe, expect, it } from 'vitest';
import {
  KEPT_ADDRESSES,
  forgetTrail,
  isKeptHash,
  readLastRoute,
  readScrolls,
  restoreLastRoute,
  saveLastRoute,
  saveScrolls,
} from '../../src/nav/lastRoute';
import { navigate } from '../../src/nav/route';

const visit = (hash: string) => {
  window.history.pushState(null, '', `/${hash}`);
  saveLastRoute(hash);
};
const savedTrail = (): string[] => JSON.parse(localStorage.getItem('lampas.trail') ?? '[]');

beforeEach(() => {
  localStorage.clear();
  forgetTrail();
  window.history.replaceState(null, '', '/');
});

describe('the trail of places he visited', () => {
  it('keeps the last 20 and no more', () => {
    for (let n = 1; n <= 30; n += 1) visit(`#/?c=8&v=${n}`);
    const trail = savedTrail();
    expect(trail).toHaveLength(KEPT_ADDRESSES);
    expect(trail[0]).toBe('#/?c=8&v=11');
    expect(trail[19]).toBe('#/?c=8&v=30');
  });

  it('drops repeats in a row', () => {
    visit('#/words');
    visit('#/words');
    visit('#/test');
    visit('#/words');
    expect(savedTrail()).toEqual(['#/words', '#/test', '#/words']);
  });

  it('never keeps the Unlock screen or the licence screen', () => {
    visit('#/words');
    visit('#/unlock');
    visit('#/licence');
    expect(savedTrail()).toEqual(['#/words']);
    expect(isKeptHash('#/settings')).toBe(true);
    expect(isKeptHash('#/unlock')).toBe(false);
    expect(isKeptHash('#/licence')).toBe(false);
    expect(readLastRoute()).toBe('#/words');
  });

  it('keeps the last place as the one a bare open returns to', () => {
    visit('#/words');
    visit('#/test');
    expect(readLastRoute()).toBe('#/test');
  });
});

describe('opening the app', () => {
  it('a bare open lands on the newest place and rebuilds history so Back walks the trail', () => {
    localStorage.setItem('lampas.trail', JSON.stringify(['#/?c=8&view=greek&v=28', '#/words', '#/test']));
    restoreLastRoute();
    expect(window.location.hash).toBe('#/test');
    window.history.back();
    return new Promise<void>((resolve) =>
      window.addEventListener(
        'popstate',
        () => {
          expect(window.location.hash).toBe('#/words');
          resolve();
        },
        { once: true },
      ),
    );
  });

  it('past the oldest place Back lands on Home', async () => {
    localStorage.setItem('lampas.trail', JSON.stringify(['#/words', '#/test']));
    restoreLastRoute();
    const back = () =>
      new Promise<string>((resolve) => {
        window.addEventListener('popstate', () => resolve(window.location.hash), { once: true });
        window.history.back();
      });
    expect(await back()).toBe('#/words');
    expect(await back()).toBe('#/');
  });

  it('an address in the URL at open wins over the saved one', () => {
    localStorage.setItem('lampas.trail', JSON.stringify(['#/words', '#/test']));
    window.history.replaceState(null, '', '/#/about');
    restoreLastRoute();
    expect(window.location.hash).toBe('#/about');
  });

  it('with nothing saved a bare open stays bare', () => {
    restoreLastRoute();
    expect(window.location.hash).toBe('');
  });

  it('ignores a damaged trail', () => {
    localStorage.setItem('lampas.trail', '{nope');
    restoreLastRoute();
    expect(window.location.hash).toBe('');
  });
});

describe('scroll per address', () => {
  it('keeps offsets of the address and gives them back', () => {
    saveScrolls(new Map([['#/words#words', 420]]), '#/words');
    expect(readScrolls('#/words')).toEqual([['#/words#words', 420]]);
  });

  it('does not keep the offsets of a place not kept', () => {
    saveScrolls(new Map([['#/unlock#x', 5]]), '#/unlock');
    expect(readScrolls('#/unlock')).toEqual([]);
  });

  it('keeps the offsets of the last 20 addresses only', () => {
    for (let n = 0; n < 25; n += 1) saveScrolls(new Map([[`#/?v=${n}#reader`, n + 1]]), `#/?v=${n}`);
    expect(readScrolls('#/?v=0')).toEqual([]);
    expect(readScrolls('#/?v=24')).toEqual([['#/?v=24#reader', 25]]);
  });
});

describe('navigate keeps working with the trail', () => {
  it('a move between screens pushes an entry', () => {
    const before = window.history.length;
    navigate('words');
    expect(window.location.hash).toBe('#/words');
    expect(window.history.length).toBe(before + 1);
  });
});
