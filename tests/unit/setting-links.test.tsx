// A link to each setting (mw-5r3p30.502): '#/settings?setting=<key>' opens Settings at that row, scrolled to, marked and shown whatever the
// search holds; a row whose setting is off says what to turn on first. The keys checked are the registry's, so a new setting is covered with no edit.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { SettingsScreen } from '../../src/SettingsScreen';
import { SETTINGS } from '../../src/settings/registry';
import { ROWS, rowOf, searchSettings } from '../../src/settings/rows';
import { settingKeyOf, settingLink } from '../../src/settings/link';

const scrolled = vi.fn();
Element.prototype.scrollIntoView = function (this: Element, ...args: unknown[]) {
  scrolled.apply(this, args);
};

afterAll(() => {
  cleanup();
  db.close();
});

beforeEach(async () => {
  clearBus();
  scrolled.mockClear();
  await db.open();
  await db.settings.clear();
});

const go = (hash: string) => act(() => void (window.location.hash = hash));
const needs = () => document.querySelector<HTMLElement>('[data-setting-needs]');
const row = (key: string) => document.querySelector<HTMLElement>(`[data-setting="${key}"]`);

describe('settingLink', () => {
  it('gives every setting of the registry an address that names it, and a key that is not one gives none', () => {
    const checked: string[] = [];
    for (const s of SETTINGS) {
      expect(settingLink(s.key), s.key).toBe(`#/settings?setting=${s.key}`);
      expect(settingKeyOf(settingLink(s.key) as string), s.key).toBe(s.key);
      checked.push(s.key);
    }
    expect(checked).toEqual(SETTINGS.map((s) => s.key));
    expect(checked.length).toBeGreaterThan(30);
    for (const bad of ['', 'noSuchSetting', 'developer', 'link.words', 'textsize', '__proto__', 'resource.nothing']) expect(settingLink(bad), bad).toBeNull();
  });

  it('is read back from an address, and only from a Settings address', () => {
    expect(settingKeyOf('#/settings?setting=textSize')).toBe('textSize');
    expect(settingKeyOf('#/settings?section=resources&setting=weave')).toBe('weave');
    expect(settingKeyOf('#/settings')).toBeNull();
    expect(settingKeyOf('#/words?setting=textSize')).toBeNull();
    expect(settingKeyOf('#/settings?setting=noSuchSetting')).toBeNull();
  });

  it('opens a row with data-setting=<key> for every setting', async () => {
    cleanup();
    window.location.hash = '#/settings';
    // the values every dependency needs, so no row is hidden: this checks that the address finds its row
    await db.settings.bulkPut([
      { key: 'weave', value: 'solid' },
      { key: 'newWordsADay', value: '3' },
      { key: 'immersiveReader', value: 'on' },
      { key: 'resource.logos', value: 'on' },
    ]);
    render(<SettingsScreen />);
    await screen.findByRole('group', { name: 'Theme' });
    for (const s of SETTINGS) {
      await go(settingLink(s.key) as string);
      await waitFor(() => expect(row(s.key), s.key).not.toBeNull());
      await waitFor(() => expect(row(s.key)?.hasAttribute('data-highlighted'), s.key).toBe(true));
    }
    cleanup();
  }, 60_000);
});

describe('searchSettings', () => {
  it('lists the rows of the registry whose name or hint holds the words, hidden details included, and no link row', () => {
    expect(searchSettings('text size').map((r) => r.key)).toContain('textSize');
    expect(searchSettings('TEXT SIZE')[0]?.key).toBe('textSize');
    expect(searchSettings('bible in logos').map((r) => r.key)).toEqual(['logosBible']);
    expect(searchSettings('').length).toBe(0);
    expect(searchSettings('zzzz')).toEqual([]);
    for (const r of searchSettings('e')) expect(settingLink(r.key), r.key).not.toBeNull();
    expect(ROWS.some((r) => r.key.startsWith('link.'))).toBe(true);
  });
});

describe('the Settings screen at a setting link', () => {
  it('scrolls to the row, marks it, and clears the mark on the next tap', async () => {
    cleanup();
    window.location.hash = '#/settings?setting=textSize';
    render(<SettingsScreen />);
    await screen.findByRole('group', { name: 'Text size' });
    await waitFor(() => expect(row('textSize')?.hasAttribute('data-highlighted')).toBe(true));
    expect(scrolled.mock.contexts).toContain(row('textSize'));
    expect(document.querySelectorAll('[data-highlighted]').length).toBe(1);
    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    await waitFor(() => expect(row('textSize')?.hasAttribute('data-highlighted')).toBe(false));
    cleanup();
  });

  it('shows the row though the search box holds a query that would hide it', async () => {
    cleanup();
    window.location.hash = '#/settings?setting=textSize';
    render(<SettingsScreen />);
    await screen.findByRole('group', { name: 'Text size' });
    const search = screen.getByRole('searchbox', { name: 'Search settings' });
    expect(search).toHaveValue('');
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      set?.call(search, 'logos');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await waitFor(() => expect(screen.queryByRole('group', { name: 'Theme' })).toBeNull());
    expect(row('textSize')).not.toBeNull();
    expect(row('textSize')?.hasAttribute('data-highlighted')).toBe(true);
    cleanup();
  });

  it('says what to turn on first when the row depends on a setting that is off, and shows that setting', async () => {
    cleanup();
    window.location.hash = '#/settings?setting=logosBible';
    await db.settings.put({ key: 'resource.logos', value: 'off' });
    render(<SettingsScreen />);
    await waitFor(() => expect(row('logosBible')).not.toBeNull());
    await waitFor(() => expect(needs()).not.toBeNull());
    expect(needs()).toHaveTextContent(`“${rowOf('logosBible')?.label}”`);
    expect(needs()).toHaveTextContent(`“${rowOf('resource.logos')?.label}”`);
    expect(needs()).toHaveTextContent(/turn .* on first/i);
    expect(row('resource.logos')).not.toBeNull();
    expect(row('logosBible')?.hasAttribute('data-highlighted')).toBe(true);
    // with the setting on there is nothing to say
    await act(() => db.settings.put({ key: 'resource.logos', value: 'on' }));
    await waitFor(() => expect(needs()).toBeNull());
    expect(row('logosBible')).not.toBeNull();
    cleanup();
  });

  it('opens an address with an invented key as plain Settings', async () => {
    cleanup();
    window.location.hash = '#/settings?setting=noSuchSetting';
    render(<SettingsScreen />);
    await screen.findByRole('group', { name: 'Theme' });
    expect(document.querySelector('[data-highlighted]')).toBeNull();
    expect(needs()).toBeNull();
    cleanup();
  });
});
