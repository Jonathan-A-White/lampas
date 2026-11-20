// The Reader's scroll memory (src/nav/scrollMemory.ts) keeps one place per chapter: switching the mode (English / Weave / Greek, mw-5r3p30.863) must not change
// the key the offset is kept under, or the switch restores the offset the other mode last had, unrelated to the verse he was reading.
// Settings keeps one place per page (the home, a group, a section, a setting, What Lampas has counted, Sermon sources): the second half of this file (mw-6ww.175.102).
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { forgetScrolls, hasKeptScroll, restoreScrolls, scrollAddress } from '../../src/nav/scrollMemory';
import { COUNTED_LINK, groupLink, openCounted, openFoundRow, openSermonSources, openSetting, openSettingsGroup, openSettingsSection, sermonSourcesLink } from '../../src/settings/link';

describe('the address a Reader scroll offset is kept under', () => {
  const chapter = '#/?b=act&c=18';

  it('does not change with the view', () => {
    expect(scrollAddress(`${chapter}&view=english&weave=solid`)).toBe(scrollAddress(`${chapter}&view=greek&weave=solid`));
  });

  it('does not change with the weave', () => {
    const kept = scrollAddress(`${chapter}&view=english&weave=off`);
    expect(scrollAddress(`${chapter}&view=english&weave=solid`)).toBe(kept);
    expect(scrollAddress(`${chapter}&view=english&weave=solid%2Blearning`)).toBe(kept);
  });

  it('does not change with the selected verse', () => {
    expect(scrollAddress(`${chapter}&view=greek&weave=solid&v=14`)).toBe(scrollAddress(`${chapter}&view=greek&weave=solid`));
  });

  it('still tells one chapter from another', () => {
    expect(scrollAddress('#/?b=act&c=18&view=greek')).not.toBe(scrollAddress('#/?b=act&c=19&view=greek'));
    expect(scrollAddress('#/?b=act&c=18')).not.toBe(scrollAddress('#/?b=rom&c=18'));
  });
});

// mw-6ww.175.102: every page of Settings that an opener of src/settings/link.ts opens "at the top" forgets its own place first (forgetScrollsAt). A page whose address scrollAddress does not
// keep apart from the home's shares the home's place, so opening it wiped where he left the home: Sermon sources ('#/settings?sources=sermons') did.
describe('the address a Settings scroll offset is kept under', () => {
  const HOME = '#/settings';

  it('gives Sermon sources a place of its own, apart from the home', () => {
    expect(scrollAddress('#/settings?sources=sermons')).not.toBe(scrollAddress(HOME));
    expect(scrollAddress(sermonSourcesLink())).toBe('#/settings?sources=sermons');
  });

  it('gives Sermon sources opened at a source a place apart from the home and from the plain list', () => {
    const at = scrollAddress(sermonSourcesLink('sermons.spurgeon'));
    expect(at).not.toBe(scrollAddress(HOME));
    expect(at).not.toBe(scrollAddress(sermonSourcesLink()));
    expect(at).not.toBe(scrollAddress(sermonSourcesLink('LLS:29.99.1')));
    // the same source is the same place, however its id is written in the address
    expect(scrollAddress('#/settings?sources=sermons&at=LLS:29.99.1')).toBe(scrollAddress(sermonSourcesLink('LLS:29.99.1')));
  });

  it('keeps the home, a group, a section, a setting, a page and Sermon sources all apart', () => {
    const addresses = [HOME, groupLink('study'), '#/settings?section=sermons', '#/settings?setting=textSize', COUNTED_LINK, sermonSourcesLink(), sermonSourcesLink('sermons.spurgeon')];
    expect(new Set(addresses.map(scrollAddress)).size).toBe(addresses.length);
  });
});

describe('opening a page of Settings at its top', () => {
  const HOME = '#/settings';
  /** Each opener of src/settings/link.ts that forgets a place before it opens: the address it opens and the scroll box of the screen drawn there. */
  const OPENERS: { name: string; open: () => void; link: string; slot: string }[] = [
    { name: 'openFoundRow', open: () => openFoundRow('offlineCopy'), link: '#/settings?setting=offlineCopy', slot: 'settings' },
    { name: 'openSetting', open: () => openSetting('textSize'), link: '#/settings?setting=textSize', slot: 'settings' },
    { name: 'openSettingsSection', open: () => openSettingsSection('sermons'), link: '#/settings?section=sermons', slot: 'settings' },
    { name: 'openSermonSources', open: () => openSermonSources(), link: '#/settings?sources=sermons', slot: 'sermon-sources' },
    { name: 'openSermonSources at a source', open: () => openSermonSources('sermons.spurgeon'), link: '#/settings?sources=sermons&at=sermons.spurgeon', slot: 'sermon-sources' },
    { name: 'openCounted', open: () => openCounted(), link: COUNTED_LINK, slot: 'counted' },
    { name: 'openSettingsGroup', open: () => openSettingsGroup('study'), link: groupLink('study'), slot: 'settings' },
  ];

  /** Puts kept offsets in the scroll memory as a reopened app reads them: from the phone ('lampas.scrolls', src/nav/lastRoute.ts). */
  function keep(places: Record<string, string>): void {
    const stored: Record<string, Record<string, number>> = {};
    for (const [hash, slot] of Object.entries(places)) stored[scrollAddress(hash)] = { ...stored[scrollAddress(hash)], [`${scrollAddress(hash)}#${slot}`]: 60 };
    localStorage.setItem('lampas.scrolls', JSON.stringify(stored));
    restoreScrolls();
  }

  beforeEach(() => {
    forgetScrolls();
    localStorage.clear();
    window.history.replaceState(null, '', '/#/settings');
  });
  afterEach(() => {
    forgetScrolls();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it.each(OPENERS)('$name leaves the home where he left it, and its own page starts at the top', ({ open, link, slot }) => {
    keep({ [HOME]: 'settings', [link]: slot });
    expect(hasKeptScroll(HOME, 'settings')).toBe(true);
    expect(hasKeptScroll(link, slot)).toBe(true);

    open();

    expect(window.location.hash).toBe(link);
    // the page's own place is forgotten: it opens at the top (or at the row the address names)
    expect(hasKeptScroll(link, slot)).toBe(false);
    // and the home's is not
    expect(hasKeptScroll(HOME, 'settings')).toBe(true);
  });

  it('has every opener of src/settings/link.ts that forgets a place in the table above', () => {
    const source = readFileSync('src/settings/link.ts', 'utf8');
    const forgetters = [...source.matchAll(/^export function (\w+)\([^\n]*\{\n(?:(?!^\}).*\n)*?[^\n]*forgetScrollsAt\(/gm)].map((m) => m[1]);
    // every call is in an exported opener the scan can name: one written another way (an arrow, a helper) fails here until the scan and the table know it
    expect(forgetters.length).toBe((source.match(/forgetScrollsAt\(/g) ?? []).length);
    expect(forgetters.length).toBeGreaterThan(0);
    expect(forgetters.filter((name) => !OPENERS.some((o) => o.name === name || o.name.startsWith(`${name} `)))).toEqual([]);
  });
});
