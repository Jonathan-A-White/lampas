import { afterEach, describe, expect, it } from 'vitest';
import { connectionKind, setConnectionForTests } from '../../src/speech/connection';

function fakeNavigatorConnection(value: unknown): void {
  Object.defineProperty(navigator, 'connection', { value, configurable: true });
}

afterEach(() => {
  setConnectionForTests(undefined);
  // jsdom has no navigator.connection: take the fake off again
  delete (navigator as unknown as Record<string, unknown>).connection;
});

describe('connectionKind', () => {
  it.each([
    ['wifi', 'wifi'],
    ['ethernet', 'wifi'],
    ['cellular', 'other'],
    ['unknown', 'other'],
    ['none', 'other'],
    ['bluetooth', 'other'],
  ])('navigator.connection.type %s gives %s', (type, kind) => {
    fakeNavigatorConnection({ type });
    expect(connectionKind()).toBe(kind);
  });

  it('a connection object with no type gives null', () => {
    fakeNavigatorConnection({ effectiveType: '4g' });
    expect(connectionKind()).toBeNull();
  });

  it('no navigator.connection gives null', () => {
    expect(connectionKind()).toBeNull();
  });

  it('the test setter stands in for navigator.connection and undefined gives it back', () => {
    fakeNavigatorConnection({ type: 'cellular' });
    setConnectionForTests({ type: 'wifi' });
    expect(connectionKind()).toBe('wifi');
    setConnectionForTests(null);
    expect(connectionKind()).toBeNull();
    setConnectionForTests(undefined);
    expect(connectionKind()).toBe('other');
  });
});
