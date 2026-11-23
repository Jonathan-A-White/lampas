// src/settings/extraRows/requests.ts — the rows that send a request to the factory (mw-6ww.175.107: rows that are not settings are gathered by glob, src/settings/gather.ts; this file is the place of its own).
import { extraRows, type SettingsRow } from "../row";

/** The rows that send a request to the factory (Ask for a devotional opens Ask for a book): a door, not a setting, so the tutor does not read or change them. */
const REQUESTS: readonly SettingsRow[] = [
  {
    key: "request.devotional",
    label: "Ask for a devotional",
    hint: "Ask for another devotional to be added to Which devotional.",
    help: "Search your Logos list for the devotional, or type its title, and Send. The makers add it to the list when they find its Logos id; Your requests follows it. It goes to the factory through the tutor's mill, so it needs a licence.",
    section: "daily",
    dependsOn: { key: "resource.logos", shown: (value) => value === "on" },
  },
];

export const requestRows = extraRows(70, REQUESTS);
