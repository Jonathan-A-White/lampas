// src/settings/extraRows/counted.ts — the door to What Lampas has counted (mw-6ww.175.107: rows that are not settings are gathered by glob, src/settings/gather.ts; this file is the place of its own).
import { homeDoor } from "../row";

/** What Lampas has counted (mw-6ww.175.87, his words: "This should be behind a tap. Not off the main settings."): a row of the home that opens a page of its own (src/tips/UsageCounted.tsx), drawn in the list of groups
 *  last before Developer (homeEntries). A door, not a group: it holds no section, no row and no setting, so the tutor and the tests that count the groups do not see it; the Settings search finds it all the same (foundDoors, mw-6ww.175.103).
 *  PROVISIONAL: its own row on the home, and where it sits, are the Mayor's reading of 'behind a tap', the Governor to confirm. */
export const COUNTED_DOOR = homeDoor({
  id: "counted",
  title: "What Lampas has counted",
  hint: "How often you opened each screen.",
  link: "#/settings?page=counted",
  before: "developer",
});
