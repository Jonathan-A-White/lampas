import { beforeEach, describe, expect, it } from 'vitest';
import { DEVICE_KEY_STORAGE_KEY, LICENCE_GRACE_MS } from '../../src/config';
import { getOrCreateDeviceKey } from '../../src/services/deviceKey';
import { forgetHeld, heldWithinGrace, rememberHeld } from '../../src/services/licenceCache';

beforeEach(() => window.localStorage.clear());

describe('the device key', () => {
  it('is made once, stored as 64 hex chars, and the same on every later call', () => {
    const first = getOrCreateDeviceKey();
    expect(first.publicKeyHex).toMatch(/^0[23][0-9a-f]{64}$/);
    expect(window.localStorage.getItem(DEVICE_KEY_STORAGE_KEY)).toMatch(/^[0-9a-f]{64}$/);
    expect(getOrCreateDeviceKey()).toEqual(first);
  });

  it('uses a key stored before boot', () => {
    window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, '00'.repeat(31) + '01');
    expect(getOrCreateDeviceKey().publicKeyHex).toBe('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798');
  });

  it('replaces a stored value that is not a key', () => {
    for (const junk of ['nonsense', '00'.repeat(32), 'ff'.repeat(32)]) {
      window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, junk);
      expect(getOrCreateDeviceKey().publicKeyHex).toMatch(/^0[23][0-9a-f]{64}$/);
      expect(window.localStorage.getItem(DEVICE_KEY_STORAGE_KEY)).not.toBe(junk);
    }
  });
});

describe('the held-licence memory', () => {
  const NOW = Date.parse('2026-10-08T12:00:00Z');

  it('lasts the grace for the same key, and no longer', () => {
    rememberHeld('pub', NOW);
    expect(heldWithinGrace('pub', NOW + LICENCE_GRACE_MS)).toBe(true);
    expect(heldWithinGrace('pub', NOW + LICENCE_GRACE_MS + 1)).toBe(false);
  });

  it('does not carry over to another key, a clock gone backwards, or after forgetting', () => {
    rememberHeld('pub', NOW);
    expect(heldWithinGrace('other', NOW)).toBe(false);
    expect(heldWithinGrace('pub', NOW - 1)).toBe(false);
    forgetHeld();
    expect(heldWithinGrace('pub', NOW)).toBe(false);
  });

  it('reads junk as not held', () => {
    window.localStorage.setItem('lampas.licenceHeld', '{not json');
    expect(heldWithinGrace('pub', NOW)).toBe(false);
  });
});
