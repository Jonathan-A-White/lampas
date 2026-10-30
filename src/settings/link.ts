// src/settings/link.ts — a link to each setting (mw-5r3p30.502): '#/settings?setting=<key>' opens Settings scrolled to that row, marks it and shows it though the
// search or its dependency would hide it (src/SettingsScreen.tsx, src/settings/rows.ts rowsAt). The key is one of the registry's SETTINGS (src/settings/registry.ts):
// a key that is not (the door row 'library' is the one exception) has no link, so the tutor's invented key (src/TutorLinks.tsx) and a mistyped address draw nothing. docs/links.md.
import { forgetScrollsAt } from '../nav/scrollMemory';
import { previousAddress } from '../nav/lastRoute';
import { openHash, pathOf, replaceHash } from '../nav/route';
import { settingOf } from './registry';
import { groupById, rowOf, type GroupId } from './rows';

/** The rows that are no setting but have a link: the door to Your Logos library, a row of Study resources under the Logos switch (mw-rfjjzd.23), and Keep on this phone (mw-lcv9z3g.4). */
const DOOR_ROWS: readonly string[] = ['library', 'offlineCopy'];

const linkable = (key: string): boolean => settingOf(key) !== undefined || DOOR_ROWS.includes(key);

/** The address that opens Settings at the setting `key`, or null when the registry has no such setting (or door row). */
export function settingLink(key: string): string | null {
  return linkable(key) ? `#/settings?setting=${encodeURIComponent(key)}` : null;
}

/** A row the Settings search can find that is no setting of the registry: Keep on this phone, the Reading set, a link row such as About, Ask for the devotional. Such a row has an address
 *  of its own so that choosing it lands on it, marked, as a setting does (mw-5r3p30.877), but the tutor gets none for it (settingLink stays the registry's). */
const foundRow = (key: string): boolean => rowOf(key) !== undefined;

/** The setting or row an address asks for ('#/settings?setting=textSize'), or null when it is not a Settings address or names no setting of the registry, door row or row of the list. */
export function settingKeyOf(hash: string): string | null {
  if (pathOf(hash) !== '#/settings') return null;
  const q = hash.indexOf('?');
  const key = new URLSearchParams(q < 0 ? '' : hash.slice(q + 1)).get('setting');
  return key !== null && (linkable(key) || foundRow(key)) ? key : null;
}

/** Opens Settings at a row the search found (a setting, or a row that is no setting: foundRow) as a new Back step, scrolled to and marked. Nothing for a key that is no row. */
export function openFoundRow(key: string): void {
  if (!linkable(key) && !foundRow(key)) return;
  const link = `#/settings?setting=${encodeURIComponent(key)}`;
  forgetScrollsAt(link);
  openHash(link);
}

/** Opens Settings at the setting `key` as a new Back step, from where he is; it starts at the row, not where he last left Settings. Nothing for a key without a link. */
export function openSetting(key: string): void {
  const link = settingLink(key);
  if (!link) return;
  forgetScrollsAt(link);
  openHash(link);
}

/** Opens Settings scrolled to the section `id` ('resources': Study resources) as a new Back step; it starts at the section, not where he last left Settings (mw-5r3p30.427). */
export function openSettingsSection(id: string): void {
  const link = `#/settings?section=${encodeURIComponent(id)}`;
  forgetScrollsAt(link);
  openHash(link);
}

/** The address of the page of the group `id` ('#/settings?group=reading', mw-3ased2.1); '#/settings' alone is the home that lists the groups. */
export const groupLink = (id: GroupId): string => `#/settings?group=${id}`;

/** The group an address names ('#/settings?group=reading'), or null when it is not a Settings address or names no group. */
export function groupIdOf(hash: string): GroupId | null {
  if (pathOf(hash) !== '#/settings') return null;
  const q = hash.indexOf('?');
  const id = new URLSearchParams(q < 0 ? '' : hash.slice(q + 1)).get('group');
  return id !== null ? (groupById(id)?.id ?? null) : null;
}

/** Opens the page of the group `id` as a new Back step, from the home; it starts at the top, not where he last left the page. */
export function openSettingsGroup(id: GroupId): void {
  const link = groupLink(id);
  forgetScrollsAt(link);
  openHash(link);
}

/** The group page's back arrow: a step Back when the entry behind this one is the Settings home (so the phone's Back after it leaves Settings, as
 *  the header back buttons do, mw-5r3p30.458), else (a link or a reload put him on the page) the home in place of this page. */
export function backToSettingsHome(): void {
  const behind = previousAddress();
  if (behind !== null && behind === '#/settings') {
    window.history.back();
    return;
  }
  replaceHash('#/settings');
}
