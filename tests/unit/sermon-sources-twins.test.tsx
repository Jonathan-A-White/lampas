// The page of Sermon sources with a remembered source that shares an id with a bundled one (mw-qtu3zvz.229): D. L. Moody's, George Whitefield's and John Wesley's were listed twice, once from the kept list of the
// service's sources and once from the bundle. Each is listed once, the bundled one.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { SettingsScreen } from '../../src/SettingsScreen';
import { setKnownSermonSources } from '../../src/sermons/known';
import { forgetGrownSermonRows } from '../support/settings';
import { EVERY_LOGOS_SERMON, keepImport } from '../support/logos-import';

afterAll(() => {
  cleanup();
  setKnownSermonSources([]);
  vi.unstubAllGlobals();
  db.close();
});

beforeEach(async () => {
  clearBus();
  cleanup();
  await db.open();
  await Promise.all([db.settings.clear(), db.meta.clear()]);
  forgetGrownSermonRows();
  setKnownSermonSources([]);
});

const TWINS = [
  ['moody-logos', 'D. L. Moody’s sermons (web)'],
  ['whitefield-logos', 'George Whitefield’s sermons (web)'],
  ['wesley-logos', 'John Wesley’s sermons (web)'],
] as const;

describe('the page of Sermon sources', () => {
  it('lists Moody, Whitefield and John Wesley once each when the kept list holds them too', async () => {
    await db.settings.put({ key: 'resource.logos', value: 'on' });
    await keepImport(EVERY_LOGOS_SERMON);
    const kept = TWINS.map(([id, name]) => ({ id, name, credit: name, homepage: 'https://twin.example', onByDefault: false }));
    await db.meta.put({ key: 'sermonSources', value: JSON.stringify(kept) });
    window.location.hash = '#/settings?sources=sermons';
    render(<SettingsScreen />);
    await screen.findByRole('heading', { name: 'Sermon sources', level: 1 });
    await waitFor(() => expect(document.querySelectorAll('[data-source="sermons.moody-logos"]').length).toBeGreaterThan(0));
    for (const [id] of TWINS) expect(document.querySelectorAll(`[data-source="sermons.${id}"]`), id).toHaveLength(1);
    const keys = [...document.querySelectorAll('[data-source]')].map((el) => el.getAttribute('data-source'));
    expect(new Set(keys).size).toBe(keys.length);
    // the one listed is the bundled one: it opens in Logos
    expect(document.querySelector('[data-source="sermons.moody-logos"]')?.textContent).toContain('in Logos');
  });
});
