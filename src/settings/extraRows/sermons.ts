// src/settings/extraRows/sermons.ts — the Sermon sources door and Open web sermons in, rows of the Sermons section that are not registry settings (mw-6ww.175.107: rows that are not settings are gathered by glob, src/settings/gather.ts; this file is the place of its own).
import { openWebSetting } from "../definitions/sermons";
import { extraRows, type SettingsRow } from "../row";

/** Sermon sources (mw-qtu3zvz.92, docs/design/sermon-sources.md): the one row of the Sermons section that stands for every sermon source, with how many are on; it opens the page that lists them
 *  (src/sermons/SermonSourcesPage.tsx). A door, not a setting: the tutor does not read or change it (isTalkable), and the switches it does change are still the settings `sermons.<id>`, whose rows are kept for the
 *  search and the tutor and are not drawn on the Study resources page (isSermonSourceRow). Its key has no dot: 'sermons.<id>' is a source's switch. */
const SERMON_SOURCES_ROW: SettingsRow = {
  key: "sermonSources",
  label: "Sermon sources",
  hint: "Every list and book of sermons the Sermons door draws on, each Off or On.",
  help: "One list holds every sermon source: the lists of sermons by passage, and the books of sermons in your Logos library that your import holds. A source that is on gives the Sermons door its sermons at a verse; a Logos book that is on is a link under In Logos on the Sermons sheet. A book that is only sermons is switched here and not in Your Logos library.",
  section: "sermons",
};
/** Open web sermons in (mw-qtu3zvz.16, openWebSetting): kept out of the registry and DEFINITIONS like Hand, so the tutor does not read or change it (isTalkable). No licence needed. */
const OPEN_WEB_ROW: SettingsRow = {
  key: openWebSetting.key,
  label: openWebSetting.label,
  hint: openWebSetting.hint,
  help: openWebSetting.help,
  section: openWebSetting.section,
};

export const sermonSourcesRows = extraRows(30, [SERMON_SOURCES_ROW]);
export const openWebRows = extraRows(40, [OPEN_WEB_ROW]);
