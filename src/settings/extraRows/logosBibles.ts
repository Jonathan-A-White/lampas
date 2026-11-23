// src/settings/extraRows/logosBibles.ts — the Bible in Logos rows of the Old Testament, the Apocrypha and the Septuagint, directly after the setting logosBible (mw-6ww.175.107: rows that are not settings are gathered by glob, src/settings/gather.ts; this file is the place of its own).
import { extraRows, type SettingsRow } from "../row";

/** Bible in Logos for the Old Testament, the Apocrypha and the Septuagint (mw-5r3p30.841, mw-u2w5klk.266): the New Testament's is the setting `logosBible` (registry.ts), these are rows of the same section drawn after it. The Old Testament's follows
 *  the New Testament's until it is picked; the Apocrypha's starts as the NRSV; the Septuagint's starts as Swete's Greek and is the one a chapter of the Septuagint Lampas has not shipped opens in. Doors to a value the screen keeps, not settings: the tutor does not read or change them (isTalkable) and its Settings request does not carry them. */
const PART_ROWS: readonly SettingsRow[] = [
  { key: "logosBibleOt", part: "Old Testament" },
  { key: "logosBibleApocrypha", part: "Apocrypha" },
  { key: "logosBibleSeptuagint", part: "Septuagint" },
].map(({ key, part }) => ({
  key,
  label: `${part} Bible in Logos`,
  hint:
    part === "Septuagint"
      ? "The Septuagint that a chapter Lampas has not shipped opens in, in Logos."
      : `The Bible that ${part} verses open in, in Logos.`,
  help:
    part === "Septuagint"
      ? 'The Septuagint in your Logos library that a chapter of the Septuagint Lampas has not shipped yet opens in (Old Testament in Greek (Septuagint) On), by the door "Read it in Logos". It lists your Logos Septuagints and starts as Swete\'s Greek, the text Lampas reads. It shows only while Logos is On.'
      : `The Bible in your Logos library that ${part} verses open in. ${part === "Apocrypha" ? "It lists only Bibles that have the Apocrypha, and starts as the NRSV." : "It is the New Testament's Bible until you pick one."} It shows only while Logos is On. Library > Bibles sets all three at once.`,
  section: "resources",
  dependsOn: { key: "resource.logos", shown: (value) => value === "on" },
}));

export const partRows = extraRows(0, PART_ROWS, "logosBible");
