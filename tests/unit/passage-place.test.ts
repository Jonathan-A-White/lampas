// tests/unit/passage-place.test.ts — the place a passage reading was left at (src/speech/passagePlace.ts, mw-5r3p30.1236): one per list and one per reference, kept on the device.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPlace, getPlace, listKey, refKey, savePlace, subscribePlace, labelOf } from '../../src/speech/passagePlace';

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('the place store', () => {
  it('saves, reads and clears a list place', () => {
    expect(getPlace(listKey(3))).toBeNull();
    savePlace(listKey(3), { heading: '1 Samuel 12-17', verse: 2006, label: '1 Samuel 14:6' });
    expect(getPlace(listKey(3))).toEqual({ heading: '1 Samuel 12-17', verse: 2006, label: '1 Samuel 14:6' });
    expect(getPlace(listKey(4))).toBeNull();
    clearPlace(listKey(3));
    expect(getPlace(listKey(3))).toBeNull();
  });

  it('keeps a reference place apart from the lists', () => {
    savePlace(refKey('Hebrews 7:1-3'), { heading: 'Hebrews 7:1-3', verse: 2, label: 'Hebrews 7:2' });
    expect(getPlace(refKey('Hebrews 7:1-3'))).toMatchObject({ verse: 2 });
    expect(getPlace(listKey(1))).toBeNull();
    expect(getPlace(refKey('Hebrews 7:4'))).toBeNull();
  });

  it('survives a reload: it is read from the device', () => {
    savePlace(listKey(1), { heading: 'John 3:16', verse: 16, label: 'John 3:16' });
    expect(JSON.parse(localStorage.getItem('lampas.passagePlaces') ?? '{}')).toHaveProperty(listKey(1));
    expect(getPlace(listKey(1))).toMatchObject({ verse: 16 });
  });

  it('answers the same object while nothing changed, and tells a listener of each change', () => {
    const heard = vi.fn();
    const stop = subscribePlace(heard);
    savePlace(listKey(1), { heading: 'John 3:16', verse: 16, label: 'John 3:16' });
    expect(getPlace(listKey(1))).toBe(getPlace(listKey(1)));
    expect(heard).toHaveBeenCalledTimes(1);
    clearPlace(listKey(1));
    expect(heard).toHaveBeenCalledTimes(2);
    stop();
    clearPlace(listKey(1));
    expect(heard).toHaveBeenCalledTimes(2);
  });

  it('ignores damaged storage', () => {
    localStorage.setItem('lampas.passagePlaces', '{nope');
    expect(getPlace(listKey(1))).toBeNull();
  });
});

describe('labelOf', () => {
  it('names a verse of a single chapter and of chapters read through', () => {
    expect(labelOf('Hebrews 7:1-3', 7, false, 2)).toBe('Hebrews 7:2');
    expect(labelOf('1 Samuel 12-17', 12, true, 2006)).toBe('1 Samuel 14:6');
    expect(labelOf('1 Samuel 8', 8, true, 5)).toBe('1 Samuel 8:5');
    expect(labelOf('Psalm 23', 23, true, 0)).toBe('Psalm 23');
  });
});
