// src/settings/extraRows/variants.ts — Read as, a row of the Variants section kept outside the registry (mw-6ww.175.107: rows that are not settings are gathered by glob, src/settings/gather.ts; this file is the place of its own).
import { extraRows, type SettingsRow } from "../row";

/** Read as (mw-9ji6ek0.25): which reading set the Reader reads and the sets he named (src/reader/ReadingSetSheet.tsx). A row of the Variants section, not a setting: the set in force and his sets
 *  live in the readingSets table (repositories/readingSets.ts), so the tutor does not read or change it here (isTalkable; its Settings request is full) and the tutor learns the set from the talk. */
const READING_SET_ROW: SettingsRow = {
  key: "readingSet",
  label: "Read as",
  hint: "Which reading the Reader lays in each place: Byzantine, NA, ECM or a set of your own.",
  help: "Byzantine reads the text as it stands. NA reads Nestle-Aland where the apparatus gives it, and ECM the Editio Critica Maior where it gives that (18 places in Acts), else NA. Read this on a variant sheet starts Mine from the set you read; Save as… keeps a copy of the set you read under a name, to switch back to, and Rename and Delete change one of yours. The built-in sets never change.",
  section: "variants",
};

export const readingSetRows = extraRows(50, [READING_SET_ROW]);
