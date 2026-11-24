// src/settings/extraRows/developer.ts — Developer mode, found on About and kept outside the registry (mw-6ww.175.107: rows that are not settings are gathered by glob, src/settings/gather.ts; this file is the place of its own).
import { getDeveloper } from "../../data/repositories";
import { derivedValue, extraRows, type SettingsRow } from "../row";

/** Developer mode is found, not set (seven taps on About's version number): its switch is drawn only once it is no longer 'hidden'. */
const DEVELOPER: SettingsRow = {
  key: "developer",
  label: "Developer mode",
  hint: "For finding faults: On shows Download my recording under a reading check's result.",
  help: "For finding faults. On shows Download my recording under a reading check's result, to save the clip as it was recorded, and Show the welcome again, which puts the English defaults back and brings the tutor's welcome round again for the demo.",
  section: "developer",
  dependsOn: {
    key: "developerMode",
    shown: (value) => value === "on" || value === "off",
  },
};

export const developerRows = extraRows(80, [DEVELOPER]);

/** The value of the key the row depends on: 'hidden' until found, then 'on' or 'off' (gathered by src/settings/gather.ts derivedOf, mw-6ww.175.112). */
export const developerModeValue = derivedValue("developerMode", () => getDeveloper());
