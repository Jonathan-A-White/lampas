// The Tools screen's doors (mw-5r3p30.754): the six rows that left Settings, what hides each, what opens each, the Settings search that still finds them, the old Settings address, the tutor's places for them.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { isKeptHash } from '../../src/nav/lastRoute';
import { routeOf, ROUTES } from '../../src/nav/route';
import { movedTool, settingKeyOf, settingLink } from '../../src/settings/link';
import { GROUPS, isTalkable, ROWS, SECTIONS, TOOL_ROWS, visibleRows, visibleToolRows } from '../../src/settings/rows';
import { TOOL_SCREENS } from '../../src/tools';
import { lampasRegistry, placeNameOf } from '../../src/tutor/registry';
import { SCREEN_NAMES, suggestionsFor } from '../../src/tutor/screen';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  window.location.hash = '';
});

const keys = (rows: readonly { key: string }[]): string[] => rows.map((r) => r.key);
const FIVE = { 'resource.logos': 'on', depth: '5', greekInterest: '5', hebrewInterest: '5', languages: 'both' };

describe('the Tools rows', () => {
  it('are the library, Verse lists, Memorize, Paradigms, Words and Review, in that order, as Tools draws them', () => {
    expect(TOOL_ROWS.map((r) => r.label)).toEqual(['Your Logos library', 'Verse lists', 'Memorize', 'Paradigms', 'Words', 'Review']);
    expect(keys(visibleToolRows(FIVE, ''))).toEqual(['library', 'link.lists', 'link.memorize', 'link.paradigms', 'link.words', 'link.review']);
  });

  it('are in no group of Settings and no row of its list, and the tutor neither reads nor changes them', () => {
    const rows = keys(ROWS);
    for (const row of TOOL_ROWS) {
      expect(rows, row.key).not.toContain(row.key);
      expect(isTalkable(row.key), row.key).toBe(false);
      expect(GROUPS.flatMap((g) => g.sections), row.key).not.toContain(row.section);
    }
    expect(SECTIONS.map((s) => s.id)).not.toContain('tools');
  });

  it('open the screen they opened as rows of Settings', () => {
    expect(TOOL_SCREENS).toEqual({ library: 'library', 'link.lists': 'lists', 'link.memorize': 'memorize', 'link.paradigms': 'paradigms', 'link.words': 'words', 'link.review': 'review' });
    expect(Object.keys(TOOL_SCREENS).sort()).toEqual(keys(TOOL_ROWS).sort());
  });

  it('are hidden by what hid them: the library while Logos is Off, Words and Review below Curious, Paradigms below All in', () => {
    expect(keys(visibleToolRows({ ...FIVE, 'resource.logos': 'off' }, ''))).not.toContain('library');
    const at = (depth: string) => keys(visibleToolRows({ ...FIVE, depth }, ''));
    expect(at('0')).toEqual(['library', 'link.lists', 'link.memorize']);
    expect(at('1')).toEqual(['library', 'link.lists', 'link.memorize', 'link.words', 'link.review']);
    expect(at('4')).not.toContain('link.paradigms');
    expect(at('5')).toContain('link.paradigms');
  });
});

describe('the Settings search over the tools', () => {
  it('finds a tool by its name or its hint, and the Settings list does not hold it', () => {
    expect(keys(visibleToolRows(FIVE, 'review'))).toContain('link.review');
    expect(keys(visibleToolRows(FIVE, 'verses you keep'))).toEqual(['link.lists']);
    expect(keys(visibleToolRows(FIVE, 'library'))).toContain('library');
    expect(keys(visibleRows(FIVE, 'words'))).not.toContain('link.words');
    expect(keys(visibleToolRows(FIVE, 'textsize'))).toEqual([]);
  });
});

describe('the old Settings addresses', () => {
  it('name no setting any more, and the Settings screen opens the tool in their place', () => {
    for (const key of Object.keys(TOOL_SCREENS)) {
      expect(settingLink(key), key).toBeNull();
      expect(settingKeyOf(`#/settings?setting=${key}`), key).toBeNull();
      expect(movedTool(`#/settings?setting=${key}`), key).toBe(TOOL_SCREENS[key]);
    }
    expect(movedTool('#/settings?setting=textSize')).toBeNull();
    expect(movedTool('#/settings')).toBeNull();
  });
});

describe('the Tools screen as a place', () => {
  it('has the address #/tools, a name the tutor knows and questions to start a talk', () => {
    expect(routeOf('#/tools')).toBe('tools');
    expect(ROUTES).toContain('tools');
    expect(SCREEN_NAMES.tools).toBe('Tools');
    expect(suggestionsFor('Tools').length).toBeGreaterThanOrEqual(2);
  });

  it('is kept in the trail, so a cold open rebuilds Back through Tools (tests/e2e/reopen.spec.ts)', () => {
    expect(isKeptHash('#/tools')).toBe(true);
  });

  it('is a place the tutor opens, as are the screens of the tools it holds', async () => {
    const registry = lampasRegistry();
    for (const route of ['tools', ...Object.values(TOOL_SCREENS)] as (keyof typeof SCREEN_NAMES)[]) {
      window.location.hash = '#/';
      expect(registry.place(placeNameOf(route))?.tell, route).toContain(SCREEN_NAMES[route]);
      expect(await registry.open(placeNameOf(route), {}), route).toEqual({ ok: true });
      expect(routeOf(window.location.hash), route).toBe(route);
      expect(window.history.state).toEqual({ tutorGo: true });
    }
  });
});
