// src/settings/extraRows/hiddenThemes.ts — the Hidden themes row, kept outside the registry (mw-6ww.175.107: rows that are not settings are gathered by glob, src/settings/gather.ts; this file is the place of its own).
import { hiddenThemesSetting } from "../definitions/themes";
import { extraRows, type SettingsRow } from "../row";

/** Hidden themes (mw-qtu3zvz.91, hiddenThemesSetting): the list of themes he hid from a verse's Themes line, each with 'Show again'; kept out of the registry like Open web sermons in, so the tutor does not read or change it (isTalkable). It follows the theme lists' own switches. */
const HIDDEN_THEMES_ROW: SettingsRow = {
  key: hiddenThemesSetting.key,
  label: hiddenThemesSetting.label,
  hint: hiddenThemesSetting.hint,
  help: hiddenThemesSetting.help,
  section: hiddenThemesSetting.section,
};

export const hiddenThemesRows = extraRows(20, [HIDDEN_THEMES_ROW]);
