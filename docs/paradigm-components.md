# The paradigm epic's shared parts (mw-irpgqi)

The audit the Governor asked for (mw-irpgqi.2, his words of 2026-10-21 11:51Z: reuse shared components, do not repeat the same code all over).
Written before the code of mw-irpgqi.2, kept true by it. Every component named here exists at its path after mw-irpgqi.2 lands; mw-irpgqi.3 and
mw-irpgqi.4 reuse what the last section says and add nothing this file does not list without adding it here.

## What the app already had, and the epic uses

| Component | File | Props or shape | Who calls it |
| --- | --- | --- | --- |
| `ScreenHeader`, `HeaderButton` | `src/ScreenHeader.tsx` | `{title, subtitle?, back, action?}`; a text button | every screen's bar; the table screen puts the extent switch in `action` |
| `SettingRow`, `RowName`, `MoreHelp`, `Section` | `src/settings/controls/SettingRow.tsx` | a Settings row's frame, its name above its chips, its help | every Settings control; the new How much of a table row |
| `ChipRow` | `src/settings/controls/SettingRow.tsx` | `{name, current, options, settingKey}`: the chips of one setting, written through `writeSetting` | the Weave, New words, Talk and Handwriting rows; the extent chips (below) |
| `SelfGrade` | `src/ui/SelfGrade.tsx` | Show, then two grade buttons (`I knew it` / `Not yet`) | Review's word and grammar flashcards; the Drill's Had it / Missed are its grade buttons (below) |
| `IdeaSheet`, `WordSheet` | `src/IdeaSheet.tsx`, `src/WordSheet.tsx` | the idea's sheet; a word's sheet | the Needs line's Go to buttons open them over the table (mw-svw421.25) |
| `oneTap`, `justTapped`, `useSettled` | `src/ui/settle.ts` | one tap per settle moment | every flip control of the table screen |
| `bringIntoScrollBox` | `src/ui/reveal.ts` | scrolls an element into a `.screen` box | the word's lit cell (mw-irpgqi.1) |
| `paradigmOf`, `paradigmHash`, `openParadigm`, `ParadigmAddress` | `src/nav/route.ts` | the table screen's address: table, mode, cell, word, parse | the word sheet, the idea sheet, Review's See the table, the screen itself |
| `cellName`, `cellsOf`, `isAvailable`, `missingIdeas`, `paradigmOfWord`, `tableFor` | `src/data/paradigms/index.ts` | pure: a cell's name, which cells are his, a word's table and cell | the screen, Review's draw (`cells.ts`), the word sheet |
| `PARADIGM_KIND`, `cellPrompt`, `spokenForm`, `drawCellQuestions` | `src/data/paradigms/cells.ts` | the Review kind of a table; a cell in plain words; what the voice says | Review (`src/review/kinds.ts` PARADIGM); the Drill's grade line names the cell with `cellPrompt` |
| `needsOf`, `needsText` | `src/data/paradigms/needs.ts` | what a locked cell still needs | the Needs line |
| `recordReview`, `writeReview`, `ensureScheduled`, `reviewsOf` | `src/data/repositories/reviews.ts` | the back-off schedule's writes | Review; Drill this table; the Drill's miss (below) |
| `askAboutParadigm` + `paradigmQuestion`, `ParadigmFocus` | `src/nav/readerRequest.ts`, `src/services/talk.ts` | the one tutor entry of a table: opens the Reader's Talk sheet with the table and the forms showing | Ask the tutor on the table screen; mw-irpgqi.3 widens the focus |
| `useSetting`, `getSetting`, `setSetting` | `src/settings/store.ts` | a declared setting, read live | the screen reads the extent with it |
| `greekLang`, `GREEK_LANG` | `src/script/greekLang.ts` | the `lang` attributes of a Greek span | every Greek cell |

## What mw-irpgqi.2 makes, shared

| Component | File | Props or shape | Who calls it |
| --- | --- | --- | --- |
| `GrammarExtent`, `EXTENTS`, `DEFAULT_EXTENT`, `withinExtent`, `EXTENT_LABELS` | `src/data/grammar/extent.ts` | the three extents (`any`, `solid+frontier`, `solid`), most to least, and the ONE rule 'is this idea's level within the extent' | `formPasses` (the Weave and the picker), `isAvailable` and `standingOf` (the tables), the extent settings |
| `EXTENT_SETTINGS`, `extentOf`, `paradigmExtentSetting` | `src/settings/definitions/grammarExtent.ts` | the settings whose choices are extents (`weaveGrammar`, `pickerGrammar`, `paradigmExtent`): each one's stored values, labels and the extent each stands for; the new setting's definition | the registry's entries, the controls, the table screen |
| `ExtentChips`, `GrammarExtentControl` | `src/settings/controls/grammarExtent.tsx` | `ExtentChips {settingKey, name, current, size?}`: `ChipRow` over `EXTENT_SETTINGS`; the Settings row of How much of a table | the Weave's Grammar row (`weave.tsx`), New words at (`newWords.tsx`), the How much of a table row, the table screen's header switch |
| `useParadigmExtent`, `useExtentSetting` | `src/settings/useExtent.ts` | How much of a table, live; any extent setting's value and extent, live | the table screen and the list; mw-irpgqi.4's This word view |
| `Chips` | `src/ui/Chips.tsx` | `{name, current, options, onChoose}`: the segmented chips (`ChipRow` is `Chips` bound to a setting) | `ChipRow`; the Learn \| Drill switch |
| `Grades` | `src/ui/SelfGrade.tsx` | `{right, wrong, picked, onPick}`: the two grade buttons of a flashcard, with their labels given | `SelfGrade` (I knew it / Not yet); the Drill's grade line (Had it / Missed) |
| `standingOf`, `isAvailable(cell, levels, extent)`, `availableCount(table, levels, extent)`, `availableText(count, extent)` | `src/data/paradigms/index.ts` | a cell's standing under an extent: `open` (shown, his), `notYet` (shown under Any, not his), `outside` (his, hidden under Solid only), `locked` | the list, the table, Review's `live` (default extent: today's rule) |
| `drillOf`, `revealCell`, `gradeCell`, `drillMissed`, `startAgain`, `scoreOf`, `forgetDrills` | `src/data/paradigms/drill.ts` | the Drill's state per table while the page lives (replaces `revealed.ts`): the cells asked, each grade, the open cell | the table screen; mw-irpgqi.4's This word view |
| `recordDrillMiss` | `src/data/repositories/reviews.ts` | a miss in a self-drill: the table's row takes a wrong answer and is due now | the Drill's first Missed of a run |
| `ModeSwitch`, `NeedsRow`, `GradeRow`, `DrillEnd` | `src/ParadigmsScreen.tsx` | Learn \| Drill; the line under a row saying what a cell needs; the Had it / Missed line under the open cell; 'N of M' and Drill the missed again | the table screen; mw-irpgqi.4 draws This word with the same `Table` |

## Duplicates mw-irpgqi.2 removes

- The Weave's Grammar options (`weave.tsx` WEAVE_ROWS.weaveGrammar) and New words at's (`newWords.tsx` NEW_WORDS.pickerGrammar) were two option
  tables beside the registry's two `choice` lists: all four now read `EXTENT_SETTINGS`.
- The level test was written twice: `formPasses` (`formLevel.ts`) and `AVAILABLE` in `src/data/paradigms/index.ts`: both read `withinExtent`.
- `revealed.ts` (the Study mode's revealed cells) goes; `drill.ts` holds the Drill's state, the revealed cells among it.
- The Paradigms screen drew the Needs line in one place and the grade buttons would have been a second pair: `NeedsRow` and `Grades` are each one.
- The segmented chips were drawn by `ChipRow` alone, bound to a setting; `Chips` is the look, so the Learn | Drill switch is not a second copy.

## What mw-irpgqi.3 must reuse

- The tutor entry is `askAboutParadigm` + `paradigmQuestion` + `ParadigmFocus` (`src/services/talk.ts`): widen the focus with the mode, the cell in
  focus and the word, do not add a second request path. The mode is `ParadigmAddress.mode` (`learn` | `drill`); the cell in focus is `drillOf(table).open`
  or the address's `cell`; the word and parse are the address's. `shownForms` in `ParadigmsScreen.tsx` gives the forms showing.
- The button is the screen's `Ask the tutor` (`BUTTON` class) or a `HeaderButton`; the list gets the same.
- The talk's name per table follows the passage-ref pattern of `src/services/talk.ts`.

## What mw-irpgqi.4 must reuse

- The `Table` of `ParadigmsScreen.tsx` with its cell standings (`standingOf`): This word adds a cell's own form or 'not in the NT' as data, not a second table.
- The extent is `useParadigmExtent()` (`src/settings/useExtent.ts`) and `isAvailable(cell, levels, extent)`; Drill on This word asks the cells that have a form and are within the extent.
- The Drill's state is `drill.ts`, keyed by the table's id (add the view to the key, do not keep a second state).
- The toggle This word | The pattern is `Chips`; the address gains a `view` in `paradigmOf` / `paradigmHash`.
