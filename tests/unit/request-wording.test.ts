// Your requests' status lines (mw-5r3p30.796): every status of the kit says what became of the ask and when, with or without the date, version, reason and setting.
import { describe, expect, it } from 'vitest';
import { REQUEST_STATUSES, type RequestRecord } from 'pwa-kit/requests';
import { QUEUE_DAYS, stillInQueue, statusWording } from '../../src/data/requestWording';

const DAY = 86_400_000;
const date = (ms: number): string => `d${ms}`;
const base: RequestRecord = { id: 'direct:1', kind: 'tutor-ask', words: 'w', summary: 's', talkId: '', who: 'grown-up', sentAt: 1000, day: '1970-01-01', status: 'sent' };
const at = (fields: Partial<RequestRecord>): RequestRecord => ({ ...base, ...fields });

describe('the wording of a status line', () => {
  it('words every status of the kit with its date', () => {
    expect(statusWording(at({ status: 'sent' }), date)).toBe('Sent to the factory · d1000');
    expect(statusWording(at({ status: 'filed', statusAt: 2000 }), date)).toBe('Filed as a story · d2000, waiting its turn');
    expect(statusWording(at({ status: 'building', statusAt: 3000 }), date)).toBe('Being built · since d3000');
    expect(statusWording(at({ status: 'landed', statusAt: 4000, version: '0.1.86' }), date)).toBe('Adopted in 0.1.86 · d4000');
    expect(statusWording(at({ status: 'declined', statusAt: 5000, reason: 'outside what this app is for' }), date)).toBe('Declined · d5000: outside what this app is for');
    expect(statusWording(at({ status: 'adopted-as-setting', statusAt: 6000, setting: 'Settings > Appearance > Text size' }), date)).toBe('Now a setting: Settings > Appearance > Text size · d6000');
  });

  it('words every status of the kit without a date', () => {
    expect(statusWording(at({ status: 'filed' }), date)).toBe('Filed as a story, waiting its turn');
    expect(statusWording(at({ status: 'building' }), date)).toBe('Being built');
    expect(statusWording(at({ status: 'landed', version: '0.1.86' }), date)).toBe('Adopted in 0.1.86');
    expect(statusWording(at({ status: 'declined', reason: 'no' }), date)).toBe('Declined: no');
    expect(statusWording(at({ status: 'adopted-as-setting', setting: 'Sepia' }), date)).toBe('Now a setting: Sepia');
  });

  it('words landed, declined and adopted-as-setting without their version, reason and setting', () => {
    expect(statusWording(at({ status: 'landed', statusAt: 4000 }), date)).toBe('Adopted · d4000');
    expect(statusWording(at({ status: 'landed' }), date)).toBe('Adopted');
    expect(statusWording(at({ status: 'declined', statusAt: 5000 }), date)).toBe('Declined · d5000');
    expect(statusWording(at({ status: 'declined' }), date)).toBe('Declined');
    expect(statusWording(at({ status: 'adopted-as-setting', statusAt: 6000 }), date)).toBe('Now a setting · d6000');
    expect(statusWording(at({ status: 'adopted-as-setting' }), date)).toBe('Now a setting');
  });

  it('has a line for every status the kit names', () => {
    for (const status of REQUEST_STATUSES) expect(statusWording(at({ status }), date), status).not.toBe('');
  });

  it('fails on a status it does not know', () => {
    expect(() => statusWording(at({ status: 'postponed' as RequestRecord['status'] }), date)).toThrow(/postponed/);
  });

  it('formats the date as the sent date is', () => {
    expect(statusWording(at({ status: 'sent', sentAt: Date.UTC(2026, 9, 20, 12) }))).toMatch(/^Sent to the factory · .*2026/);
  });
});

describe('still in the queue', () => {
  const now = 100 * DAY;
  it('is true for a filed request that has waited more than 7 days since it was filed', () => {
    expect(QUEUE_DAYS).toBe(7);
    expect(stillInQueue(at({ status: 'filed', statusAt: now - 8 * DAY }), now)).toBe(true);
    expect(stillInQueue(at({ status: 'filed', statusAt: now - 7 * DAY }), now)).toBe(false);
    expect(stillInQueue(at({ status: 'filed', statusAt: now - 2 * DAY, sentAt: now - 20 * DAY }), now)).toBe(false);
  });
  it('counts from the day it was sent when no filing date came', () => {
    expect(stillInQueue(at({ status: 'filed', sentAt: now - 9 * DAY }), now)).toBe(true);
  });
  it('is false for every other status', () => {
    for (const status of REQUEST_STATUSES.filter((s) => s !== 'filed')) expect(stillInQueue(at({ status, statusAt: 0, sentAt: 0 }), now), status).toBe(false);
  });
});
