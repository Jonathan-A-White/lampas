// tests/unit/reader-settings.test.tsx — the Reader's settings reads (src/reader/useReaderSettings.ts, docs/module-map.md R1b/R1c): undefined until
// every value has loaded, then the values, and a change to a setting is followed; the bus is told of the view, the weave, the layout and the headings.
import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { setLayout, setReaderView, setSectionHeadings, setWeave } from '../../src/data/repositories';
import { clearBus, latest } from '../../src/events/bus';
import { useReaderSettings } from '../../src/reader/useReaderSettings';

beforeEach(async () => {
  clearBus();
  window.location.hash = '';
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('useReaderSettings', () => {
  it('is undefined until every value has loaded, then holds the nine values', async () => {
    const { result } = renderHook(() => useReaderSettings());
    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current).toBeDefined());
    const settings = result.current!;
    expect(settings.view).toBe('english');
    expect(settings.weave).toBe('off');
    expect(settings.weaveGrammar).toBe('any');
    expect(settings.layout).toBe('verse');
    expect(settings.headings).toBe('on');
    expect(settings.readSpan).toBe('chapter');
    expect(settings.solid).toBeInstanceOf(Set);
    expect(settings.learning).toBeInstanceOf(Set);
    expect(settings.levels).toBeInstanceOf(Map);
  });

  it('follows a change to a setting', async () => {
    const { result } = renderHook(() => useReaderSettings());
    await waitFor(() => expect(result.current).toBeDefined());
    await act(async () => {
      await setReaderView('greek');
      await setWeave('solid');
      await setLayout('paragraph');
      await setSectionHeadings('off');
    });
    await waitFor(() => expect(result.current).toMatchObject({ view: 'greek', weave: 'solid', layout: 'paragraph', headings: 'off' }));
  });

  it('tells the bus the view, the layout and the headings once they have loaded', async () => {
    const { result } = renderHook(() => useReaderSettings());
    await waitFor(() => expect(result.current).toBeDefined());
    expect(latest('view-changed')?.view).toBe('english');
    expect(latest('layout-changed')?.layout).toBe('verse');
    expect(latest('headings-changed')?.headings).toBe('on');
  });

  it('puts the view the address named back in the settings, as the Reader did when it opened', async () => {
    window.location.hash = '#/?view=greek&v=1';
    const { result } = renderHook(() => useReaderSettings());
    await waitFor(() => expect(result.current?.view).toBe('greek'));
    await waitFor(() => expect(latest('view-changed')?.view).toBe('greek'));
  });
});
