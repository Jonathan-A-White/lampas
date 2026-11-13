// src/settings/link.ts — a link to each setting (mw-5r3p30.502): '#/settings?setting=<key>' opens Settings scrolled to that row, marks it and shows it though the
// search or its dependency would hide it (src/SettingsScreen.tsx, src/settings/rows.ts rowsAt). The key is one of the registry's SETTINGS (src/settings/registry.ts):
// a key that is not (the door row 'offlineCopy' is the one exception) has no link, so the tutor's invented key (src/TutorLinks.tsx) and a mistyped address draw nothing. docs/links.md.
import { forgetScrollsAt } from '../nav/scrollMemory';
import { previousAddress } from '../nav/lastRoute';
import { openHash, pathOf, replaceHash, type Route } from '../nav/route';
import { TOOL_SCREENS } from '../tools';
import { settingOf } from './registry';
import { groupById, rowOf, type GroupId } from './rows';

/** The rows that are no setting but have a link: Keep on this phone (mw-lcv9z3g.4). Your Logos library was one until it moved to Tools (mw-5r3p30.754, movedTool below). */
const DOOR_ROWS: readonly string[] = ['offlineCopy'];

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

/** The address of the one list of sermon sources (mw-qtu3zvz.92, src/sermons/SermonSourcesPage.tsx), a page of its own behind the row Sermon sources; `at` is the source its row is marked at: the key of a list's
 *  setting ('sermons.<id>') or a Logos book's Resource ID. */
export const sermonSourcesLink = (at?: string): string => (at ? `#/settings?sources=sermons&at=${encodeURIComponent(at)}` : '#/settings?sources=sermons');

/** What an address says of the list of sermon sources: `{}` for the page, `{ at }` for the page at a source's row, null for any other address. A link to a source's setting ('#/settings?setting=sermons.<id>': the
 *  tutor's link, a Settings search result) is the page at that source's row, since no source has a row on the Study resources page. */
export function sermonSourcesOf(hash: string): { at?: string } | null {
  if (pathOf(hash) !== '#/settings') return null;
  const q = hash.indexOf('?');
  const params = new URLSearchParams(q < 0 ? '' : hash.slice(q + 1));
  const setting = params.get('setting');
  if (setting !== null && setting.startsWith('sermons.')) return { at: setting };
  if (params.get('sources') !== 'sermons') return null;
  const at = params.get('at');
  return at ? { at } : {};
}

/** Opens the list of sermon sources as a new Back step, at a source's row when one is named; it starts at the top (or the row), not where he last left it. */
export function openSermonSources(at?: string): void {
  const link = sermonSourcesLink(at);
  forgetScrollsAt(link);
  openHash(link);
}

/** The list's back arrow: a step Back when the entry behind it is the Study resources page (so he is at the row he came from), else that page at its Sermons section in place of the list. */
export function backToStudyResources(): void {
  const behind = previousAddress();
  if (behind !== null && pathOf(behind) === '#/settings' && (groupIdOf(behind) === 'study' || /[?&]section=sermons\b/.test(behind))) {
    window.history.back();
    return;
  }
  replaceHash('#/settings?section=sermons');
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

/** The screen an old Settings address for a row that has moved to Tools now belongs to ('#/settings?setting=library' is the Library, '#/settings?setting=link.words' Words), or null when it names no such row.
 *  The Settings screen replaces such an address by that screen's, so a link kept from before the move still lands on the tool (mw-5r3p30.754). */
export function movedTool(hash: string): Route | null {
  if (pathOf(hash) !== '#/settings') return null;
  const q = hash.indexOf('?');
  const key = new URLSearchParams(q < 0 ? '' : hash.slice(q + 1)).get('setting');
  return key !== null && Object.hasOwn(TOOL_SCREENS, key) ? TOOL_SCREENS[key] : null;
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
