// The licence tip's clock (mw-8m9dyu.6, src/gate/licenceTip.ts): a visit is an open on a different local day, the tip is due from the third,
// first shows on one day and is over when closed.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { endLicenceTip, licenceTipDue, markLicenceTipShown, noteVisit } from '../../src/gate/licenceTip';

const DAY = 24 * 60 * 60 * 1000;
const D1 = Date.parse('2026-10-12T12:00:00.000Z');

beforeEach(() => window.localStorage.clear());

describe('noteVisit', () => {
  it('counts one visit a day, however often the app opens', () => {
    noteVisit(D1);
    noteVisit(D1 + 1000);
    noteVisit(D1 + 5 * 60 * 60 * 1000);
    expect(JSON.parse(window.localStorage.getItem('lampas.visits')!).count).toBe(1);
    noteVisit(D1 + DAY);
    expect(JSON.parse(window.localStorage.getItem('lampas.visits')!).count).toBe(2);
  });

  it('starts from nothing when what was kept cannot be read', () => {
    window.localStorage.setItem('lampas.visits', '{nope');
    noteVisit(D1);
    expect(JSON.parse(window.localStorage.getItem('lampas.visits')!).count).toBe(1);
  });
});

describe('licenceTipDue', () => {
  it('is not due on the first or second visit and is due on the third', () => {
    noteVisit(D1);
    expect(licenceTipDue(D1)).toBe(false);
    noteVisit(D1 + DAY);
    expect(licenceTipDue(D1 + DAY)).toBe(false);
    noteVisit(D1 + 2 * DAY);
    expect(licenceTipDue(D1 + 2 * DAY)).toBe(true);
  });

  it('stays due on the day it first showed, and not on a later day', () => {
    for (const n of [0, 1, 2]) noteVisit(D1 + n * DAY);
    const third = D1 + 2 * DAY;
    markLicenceTipShown(third);
    expect(licenceTipDue(third + 1000)).toBe(true);
    noteVisit(third + DAY);
    expect(licenceTipDue(third + DAY)).toBe(false);
  });

  it('is over for good once ended', () => {
    for (const n of [0, 1, 2]) noteVisit(D1 + n * DAY);
    const third = D1 + 2 * DAY;
    markLicenceTipShown(third);
    endLicenceTip();
    expect(licenceTipDue(third)).toBe(false);
  });
});

describe('VISION.md', () => {
  const vision = readFileSync('VISION.md', 'utf8');
  it('holds his words about the gentle tip, with channel and txid, and the rule they made', () => {
    expect(vision).toContain("I'm not trying to force it on them it would be good for people to know that there is something else as well gently");
    expect(vision).toContain('direct:da4ec432e5ce0e668052e6fcce0100a65edcd71527538c21772071d5fd15601e');
    expect(vision).toContain('it should be very very easy for somebody to get a license if they want it');
    expect(vision).toContain('direct:1e4792913f0aae158b63a75d5fe7f7962caf271038f73b26431d507716c3d154');
    expect(vision).toContain('the free app is complete on its own; a licence is mentioned once, gently, and never pressed'.replace('the free', 'The free'));
  });
});
