// src/settings/extraRows/tools.ts — the Tools screen's doors, TOOL_ROWS of rows.ts (the section 'tools', in no Settings page) (mw-6ww.175.107: rows that are not settings are gathered by glob, src/settings/gather.ts; this file is the place of its own).
import { depthFrom } from "../definitions/interest";
import { extraRows, type SettingsRow } from "../row";

/** Your Logos library (mw-rfjjzd.5, docs/design/library-at-scale.md 3.8): the one line that says how many books are on and opens the Library, where the lexicons, grammar books, commentaries and
 *  the rest are chosen, and his Verse lists are reached. A row of Study resources directly under the Logos switch with Bible in Logos (mw-5r3p30.837; mw-5r3p30.752 had put it on the Settings home),
 *  drawn only while Logos is On (mw-rfjjzd.23: the Logos switch governs everything Logos), no licence needed. A door, not a setting: the tutor does not read or change it (isTalkable) and learns the shelf as `works`, never as settings. */
const LIBRARY_ROW: SettingsRow = {
  key: "library",
  label: "Your Logos library",
  hint: "The books of your Logos library that Lampas opens, and which are on.",
  help: "Lampas cannot see your Logos library, so you say which books to use. Open it to tick them by hand or to import your list. The word sheet, the idea sheet and the tutor use the ones that are on; the devotionals that are on are the ones Daily draws from. It shows only while Logos is On. Import reads the list Logos saves (Library > Save as Spreadsheet) on the phone and keeps only each book's id, title, series, languages and passages; only links to a book or verse are built, and no text of any book is kept, shown or sent. Ask for a book sends the makers the title you type, or the book you pick with its Resource ID, type, series and passages, and Ask the makers about these sends once, when you tap it, how many books you have of each Logos type and a file of the titles Lampas does not open yet; nothing else of your library leaves the phone.",
  section: "tools",
  dependsOn: { key: "resource.logos", shown: (value) => value === "on" },
};

/** The Tools screen's doors (mw-5r3p30.754, his words of 2026-10-24: "things that interact with the Bible but are not the Bible themselves", not settings): the Library, his Verse lists, Memorize, Paradigms, Words and Review, in the order
 *  the screen draws them. They are rows of the section 'tools', which no Settings group holds, so no Settings page draws them and the tutor neither reads nor changes them (isTalkable); they stay rows so that the same
 *  `dependsOn` hides them (Words and Review below the Curious step, Paradigms below All in, the library while Logos is Off) and the Settings search finds them (visibleToolRows), `ToolsScreen.tsx` draws them
 *  and src/tools.ts says where each opens. */
const TOOL_ROWS: readonly SettingsRow[] = [
  LIBRARY_ROW,
  {
    key: "link.lists",
    label: "Verse lists",
    hint: "Lists of verses you keep, to read, listen to and memorize.",
    section: "tools",
  },
  {
    key: "link.memorize",
    label: "Memorize",
    hint: "Learn verses by heart, the one that is due first.",
    section: "tools",
  },
  {
    key: "link.paradigms",
    label: "Paradigms",
    hint: "Tables of endings, opened as you learn the grammar.",
    section: "tools",
    dependsOn: depthFrom(5),
  },
  {
    key: "link.words",
    label: "Words",
    hint: "The words you are learning.",
    section: "tools",
    dependsOn: depthFrom(1),
  },
  {
    key: "link.review",
    label: "Review",
    hint: "The words and ideas that are due.",
    section: "tools",
    dependsOn: depthFrom(1),
  },
];

export const toolRows = extraRows(5, TOOL_ROWS);
