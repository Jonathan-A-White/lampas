// src/settings/extraRows/offlineCopy.ts — Keep on this phone, a row of the Reading section kept outside the registry (mw-6ww.175.107: rows that are not settings are gathered by glob, src/settings/gather.ts; this file is the place of its own).
import { extraRows, type SettingsRow } from "../row";

/** Keep on this phone (mw-lcv9z3g.2): which chapters the offline copy keeps (src/data/offlineCopy.ts) and how the copy stands (src/settings/OfflineCopyRow.tsx). A row of the Reading section, not a setting:
 *  the scope is the offline copy's own key in the settings store, so the tutor does not read or change it here (isTalkable; its Settings request is full). */
const OFFLINE_COPY_ROW: SettingsRow = {
  key: "offlineCopy",
  label: "Keep on this phone",
  hint: "Keep the chapters on this phone, to read with no signal.",
  help: "Nothing extra keeps only what you have opened. Old Testament: Hebrew keeps every Old Testament chapter in Hebrew with its English, Old Testament: Septuagint every Septuagint chapter there is so far, in Swete's Greek with Brenton's English, New Testament all 260 chapters in Greek with the English, and All keeps the three. The megabytes are what each fetches, and the Septuagint's grows as books are added. Each is kept as it stands today. Keep the app open while it fetches: it waits while the phone is offline and goes on when it is back. Choosing Nothing extra stops the fetching and deletes nothing.",
  section: "reading",
};

export const offlineCopyRows = extraRows(60, [OFFLINE_COPY_ROW]);
