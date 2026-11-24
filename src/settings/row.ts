// src/settings/row.ts — a row of Settings, and the two things a file of src/settings/extraRows/ can hold besides a setting: rows that are not settings (a link, a door, a request box, the
// rows kept outside the registry) at a place among the others, and a door on the Settings home (mw-6ww.175.107). src/settings/rows.ts gathers them (src/settings/gather.ts) with the rows made from the settings.
import type { SettingsRow as KitRow } from "pwa-kit/settings";
import type { GroupId, SectionId } from "./define";

/** A row of Settings (the kit's, over Lampas's sections): `key` is a setting's ('weave'), a resource switch's ('resource.logos') or a link's ('link.words'). */
export type SettingsRow = KitRow<SectionId> & {
  /** the row sets how the tutor works (the AI: what is sent to the mill): with no licence it is drawn off and greyed, with 'Needs a licence' (mw-8m9dyu.3) */
  ai?: boolean;
  /** the row is not drawn at all without a licence, not even greyed: the Hand row (mw-5r3p30.880: with no licence no tutor door exists, "none of it should show up") */
  licenceOnly?: boolean;
};

/**
 * Rows that are not settings, as a file of src/settings/extraRows/ exports them: a door, a link, a request box, a value the screen keeps outside the registry. The tutor neither reads nor changes any of them
 * (rows.ts isTalkable). `place` puts them among the other such rows (lowest first, then by the first key; the rows made from settings come before them in a section); `after` puts them directly after the
 * row of that key instead. A row of the section 'tools' is a door of the Tools screen (rows.ts TOOL_ROWS), in no Settings page.
 */
export interface ExtraRows {
  extraRows: true;
  place: number;
  after?: string;
  rows: readonly SettingsRow[];
}

export const extraRows = (
  place: number,
  rows: readonly SettingsRow[],
  after?: string,
): ExtraRows => ({ extraRows: true, place, after, rows });

/** A door on the Settings home that opens a page of its own and holds no section, row or setting (What Lampas has counted): listed among the groups, before the group `before`, else last. */
export interface HomeDoor {
  homeDoor: true;
  id: string;
  title: string;
  hint: string;
  before?: GroupId;
}

export const homeDoor = (door: Omit<HomeDoor, "homeDoor">): HomeDoor => ({
  homeDoor: true,
  ...door,
});
