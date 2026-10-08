import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearBus, latest, publish, subscribe, type AppEvent } from '../../src/events/bus';

afterEach(clearBus);

describe('the event bus', () => {
  it('calls listeners in subscribe order', () => {
    const calls: string[] = [];
    subscribe('reading-stopped', () => calls.push('first'));
    subscribe('reading-stopped', () => calls.push('second'));
    subscribe('reading-stopped', () => calls.push('third'));
    publish({ kind: 'reading-stopped' });
    expect(calls).toEqual(['first', 'second', 'third']);
  });

  it('calls a listener only for the kind it subscribed to, with the payload', () => {
    const heard = vi.fn();
    subscribe('verse-selected', heard);
    publish({ kind: 'view-changed', view: 'greek' });
    expect(heard).not.toHaveBeenCalled();
    publish({ kind: 'verse-selected', chapter: 8, verse: 28 });
    expect(heard).toHaveBeenCalledExactlyOnceWith({ kind: 'verse-selected', chapter: 8, verse: 28 });
  });

  it('stops calling a listener once it unsubscribes', () => {
    const heard = vi.fn();
    const off = subscribe('weave-changed', heard);
    publish({ kind: 'weave-changed', weave: 'solid' });
    off();
    publish({ kind: 'weave-changed', weave: 'off' });
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('does not let a throwing listener stop the next, and logs it', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const after = vi.fn();
    subscribe('reading-stopped', () => {
      throw new Error('boom');
    });
    subscribe('reading-stopped', after);
    publish({ kind: 'reading-stopped' });
    expect(after).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it('keeps a listener that unsubscribes while an event is being delivered from skipping the others', () => {
    const calls: string[] = [];
    const off = subscribe('reading-stopped', () => {
      calls.push('first');
      off();
    });
    subscribe('reading-stopped', () => calls.push('second'));
    publish({ kind: 'reading-stopped' });
    publish({ kind: 'reading-stopped' });
    expect(calls).toEqual(['first', 'second', 'second']);
  });

  it('returns the last event of a kind from latest, and undefined before any', () => {
    expect(latest('verse-selected')).toBeUndefined();
    publish({ kind: 'verse-selected', chapter: 8, verse: 1 });
    publish({ kind: 'verse-selected', chapter: 8, verse: 28 });
    publish({ kind: 'view-changed', view: 'greek' });
    expect(latest('verse-selected')).toEqual({ kind: 'verse-selected', chapter: 8, verse: 28 });
    expect(latest('view-changed')).toEqual({ kind: 'view-changed', view: 'greek' });
    expect(latest('weave-changed')).toBeUndefined();
  });
});

describe('docs/events.md', () => {
  it('names every kind in the AppEvent union', () => {
    // Each key is a kind; the Record type makes this list fail to compile when the union grows without it.
    const kinds: Record<AppEvent['kind'], true> = {
      'verse-selected': true,
      'view-changed': true,
      'weave-changed': true,
      'layout-changed': true,
      'headings-changed': true,
      'voices-changed': true,
      'pronunciation-changed': true,
      'theme-changed': true,
      'text-size-changed': true,
      'rates-changed': true,
      'verse-reading': true,
      'reading-stopped': true,
      'word-tapped': true,
      'word-spoken': true,
      'word-help': true,
      'grammar-term-opened': true,
      'grammar-term-known': true,
      'reader-requested': true,
    };
    const doc = readFileSync('docs/events.md', 'utf8');
    for (const kind of Object.keys(kinds)) expect(doc, kind).toContain(`\`${kind}\``);
  });
});
