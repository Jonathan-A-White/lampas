// The Logos switch governs everything Logos (mw-rfjjzd.23): Your Logos library, Bible in Logos (three parts) and the Logos-only Daily rows sit under the Logos switch in Study resources
// and are drawn only while it is On; no licence gates any of them.
import { describe, expect, it } from 'vitest';
import type { GreekLevel } from '../../src/settings/definitions/greekInterest';
import { GROUPS, ROWS, SECTIONS, orderResourceRows, rowOf, visibleRows, type SettingsRow } from '../../src/settings/rows';

const study = (values: Record<string, string>): string[] =>
  visibleRows({ languages: 'both', greekInterest: '5', hebrewInterest: '5', depth: '5', ...values }, '')
    .filter((r) => r.section === 'resources')
    .map((r) => r.key)
    // the Audio Bible and the Reading plan are the section's other rows: no Logos in them
    .filter((key) => key !== 'audioBible' && key !== 'readingPlan');
const keysOf = (values: Record<string, string>): string[] => visibleRows({ languages: 'both', greekInterest: '5', hebrewInterest: '5', depth: '5', ...values }, '').map((r) => r.key);

const UNDER_LOGOS = ['library', 'logosBible', 'logosBibleOt', 'logosBibleApocrypha'];

describe('Study resources with Logos Off', () => {
  it('draws the two switches and nothing of Logos under them', () => {
    expect(study({ 'resource.logos': 'off' })).toEqual(['resource.strongs', 'resource.logos']);
    expect(study({})).toEqual(['resource.strongs', 'resource.logos']);
  });
});

describe('Study resources with Logos On', () => {
  it('draws the library and the three Bibles in Logos directly beneath the Logos switch, in that order', () => {
    expect(study({ 'resource.logos': 'on' })).toEqual(['resource.strongs', 'resource.logos', ...UNDER_LOGOS]);
  });

  it('has no section of its own for Bible in Logos any more', () => {
    expect(SECTIONS.map((s) => s.id)).not.toContain('logos');
    expect(GROUPS.flatMap((g) => g.sections)).not.toContain('logos');
  });

  it('each row beneath the switch depends on it and none needs a licence', () => {
    for (const key of UNDER_LOGOS) {
      const row = rowOf(key) as SettingsRow;
      expect(row.dependsOn?.key).toBe('resource.logos');
      expect(row.ai).toBeUndefined();
    }
  });
});

describe('the Daily rows that exist only to open Logos', () => {
  const DAILY = ['dailyPsalms', 'dailyDevotional', 'devotional', 'devotionalDraw', 'todaysDevotional', 'request.devotional'];

  it('are hidden while Logos is Off, the rest of Daily is not', () => {
    const off = keysOf({ 'resource.logos': 'off', devotional: 'random' });
    for (const key of DAILY) expect(off).not.toContain(key);
    expect(off).toEqual(expect.arrayContaining(['dailyReview', 'dailyMemorize', 'dailyPlan', 'dailyTicks']));
  });

  it('are drawn while Logos is On', () => {
    const on = keysOf({ 'resource.logos': 'on', devotional: 'random' });
    for (const key of DAILY) expect(on).toContain(key);
  });

  it('are in the order they were', () => {
    expect(ROWS.filter((r) => r.section === 'daily').map((r) => r.key)).toEqual(expect.arrayContaining(DAILY));
  });
});

describe('the order the screen draws (orderResourceRows)', () => {
  const drawn = (values: Record<string, string>, level: 0 | 1 | 5): string[] =>
    orderResourceRows(visibleRows({ languages: 'both', greekInterest: String(level), hebrewInterest: '5', depth: '5', ...values }, ''), level as GreekLevel)
      .filter((r) => r.section === 'resources')
      .map((r) => r.key);

  it('keeps the library and the Bibles directly under the Logos switch at every step of the dial', () => {
    for (const level of [1, 5] as const) {
      const keys = drawn({ 'resource.logos': 'on' }, level);
      const at = keys.indexOf('resource.logos');
      expect(keys.slice(at + 1, at + 5)).toEqual(UNDER_LOGOS);
    }
  });

  it('draws nothing under Logos while it is Off', () => {
    expect(drawn({ 'resource.logos': 'off' }, 1).filter((k) => UNDER_LOGOS.includes(k))).toEqual([]);
  });
});
