// src/settings/extraRows/hand.ts — Hand, kept outside the registry (src/settings/hand.ts) (mw-6ww.175.107: rows that are not settings are gathered by glob, src/settings/gather.ts; this file is the place of its own).
import { handSetting } from "../hand";
import { extraRows, type SettingsRow } from "../row";

/** Hand (mw-5r3p30.879): the row of a setting declared once (hand.ts) that is kept out of the registry and DEFINITIONS, so the tutor does not read or change it and its Settings request (full),
 *  src/tutor/knows.ts and the bible-talk instructions do not carry it (isTalkable). Hand is a row of Layout that any screen reads (hand.ts); the floating ? sits on its side. The Tutor door row is gone (mw-5r3p30.882): the floating ? is the one door. */
const rowOfDefinition = (def: typeof handSetting): SettingsRow => ({
  key: def.key,
  label: def.label,
  hint: def.hint,
  help: def.help,
  section: def.section,
  licenceOnly: true,
});
const HAND_ROW: SettingsRow = rowOfDefinition(handSetting);

export const handRows = extraRows(10, [HAND_ROW]);
