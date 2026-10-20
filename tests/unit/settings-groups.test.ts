// The groups of Settings (src/settings/rows.ts GROUPS, mw-3ased2.1): the home lists them and each is a page of its own. One table says which group a
// section is in, so a section in none or in two fails here, and so does a group with nothing in it.
import { describe, expect, it } from 'vitest';
import { GROUPS, ROWS, SECTIONS, groupById, groupOf, visibleGroups, type Values } from '../../src/settings/rows';
import { groupIdOf, groupLink } from '../../src/settings/link';
import { GROUP_PAGES } from '../support/settings-groups';

describe('the groups', () => {
  it('puts every section of SECTIONS in exactly one group', () => {
    for (const section of SECTIONS) {
      const holding = GROUPS.filter((g) => g.sections.includes(section.id));
      expect(holding.map((g) => g.id), `${section.id} is in ${holding.length} groups`).toHaveLength(1);
      expect(groupOf(section.id).id).toBe(holding[0]?.id);
    }
  });

  it('names no section twice, none that does not exist, and has no empty group', () => {
    const named = GROUPS.flatMap((g) => g.sections);
    expect(new Set(named).size).toBe(named.length);
    expect([...named].sort()).toEqual(SECTIONS.map((s) => s.id).sort());
    for (const g of GROUPS) {
      expect(g.sections.length, g.id).toBeGreaterThan(0);
      expect(g.title, g.id).not.toBe('');
    }
    expect(new Set(GROUPS.map((g) => g.id)).size).toBe(GROUPS.length);
    expect(new Set(GROUPS.map((g) => g.title)).size).toBe(GROUPS.length);
  });

  it('lists the eight groups the Governor asked for, in order', () => {
    expect(GROUPS.map((g) => g.title)).toEqual(['Reading', 'Greek', 'The tutor', 'Listening', 'Daily', 'Study resources', 'Account', 'Developer']);
  });

  it('gives every row a group through its section', () => {
    for (const row of ROWS) expect(groupOf(row.section), row.key).toBeDefined();
  });
});

describe('the specs\' list of groups', () => {
  it('is the table, in order', () => {
    expect(GROUP_PAGES).toEqual(GROUPS.map((g) => ({ id: g.id, title: g.title })));
  });
});

describe('the group links', () => {
  it('writes a group as an address and reads it back; an unknown group is no group', () => {
    for (const g of GROUPS) {
      expect(groupLink(g.id)).toBe(`#/settings?group=${g.id}`);
      expect(groupIdOf(groupLink(g.id))).toBe(g.id);
      expect(groupById(g.id)).toBe(g);
    }
    expect(groupIdOf('#/settings')).toBeNull();
    expect(groupIdOf('#/settings?group=nothing')).toBeNull();
    expect(groupIdOf('#/words?group=reading')).toBeNull();
  });
});

describe('visibleGroups', () => {
  it('leaves out the Developer group until Developer mode is found, and keeps every other', () => {
    const hidden: Values = { developerMode: 'hidden' };
    expect(visibleGroups(hidden).map((g) => g.title)).toEqual(['Reading', 'Greek', 'The tutor', 'Listening', 'Daily', 'Study resources', 'Account']);
    expect(visibleGroups({ developerMode: 'off' }).map((g) => g.title)).toContain('Developer');
  });
});
