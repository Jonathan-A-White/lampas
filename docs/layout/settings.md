# Layout: Settings

Which file holds what, for `src/settings/` (the registry, the rows, the links, the controls and `defineSetting`) and the Settings screen (`src/SettingsScreen.tsx`). The study resources (`src/resources/`) are in `docs/resources.md`.

Settings is a home and pages (mw-3ased2.1). The grouping is the Builder's, PROVISIONAL, until the Governor amends it.

## The Greek dial (mw-3ased2.2)

The first thing on the home, under the search field, is **How much Greek?**: six named steps, 0 Just English, 1 Curious, 2 Dipping a toe, 3 Learning, 4 Reading in Greek, 5 All in (names and lines: `GREEK_LEVELS`, `src/settings/definitions/greekInterest.ts`; PROVISIONAL, from the epic mw-3ased2). It is the setting `greekInterest` (a choice of `'0'` to `'5'`, section `dial`, drawn on the home by `controls/greekInterest.tsx`; the tutor may read and change it like any setting). A phone not yet placed reads 5, so nothing is hidden; `placeGreekInterest` (`src/main.tsx`, before the first render) places it once.

- **What each step shows** is the ordinary `dependsOn` rule: a Greek row says `dependsOn: greekFrom(n)` (shown from step n up); a detail of one of those (Order and Grammar under the Weave, New words at and Move it under New words a day) is hidden through the chain. 1: the Reader's English | Greek view, the word sheet (its Greek word, lemma, parsing and Strong's number; Strong's study resource), Greek voice, Greek speed, Pronunciation, Words and Review. 2: the Weave rows. 3: New words a day (and its details), Grammar approach, Handwriting drills, Read lessons to me, Quiz goal; the Greek page appears. 4: Goal. 5: Hebrew in the tutor, Paradigms. At 0 no Greek row, no Greek page and no word sheet is drawn. `tests/unit/greek-interest.test.ts` lists the table.
- **What the Reader does with it**: `viewAt`, `weaveAt` and `newWordsAt` (same file) clamp what is saved: the Reader (`useReaderSettings`, `useViewSettings`), the Language switch (`Reader.tsx`), the word sheet (`WordSheet.tsx`) and the pace (`usePace.ts`) read the dial, so what is hidden does not act. A row a link opens that the dial hides says which step shows it (`neededText`, `SettingsScreen.tsx`).
- **Moving it** is `setGreekInterest` (`src/data/repositories/greekInterest.ts`): up, each step passed brings in its starting values (Weave Solid at 2, 3 new words at 3, the Greek view, Greek word order and 5 new words at 4); down, what the lower step hides is turned off (the Greek view, the Weave, new words a day, Handwriting drills, Read lessons, Quiz goal, Goal) after his own value is kept under `greekKept.<key>`; going back up restores it (his value wins over a starting value). The Greek voice, speed, pronunciation, Grammar approach, New words at, Move it and Hebrew's depth have no Off of their own and stay as they are. The welcome's English defaults are step 0 (`putEnglishDefaults` is `setGreekInterest(0)`).
- **Where a phone starts**: a phone with nothing of a reader kept starts at 0 and nothing else is written; a reader from before is placed by what he has (Greek view on 4, new words above 0 is 3, Weave on 2, else 0). The `lampas.greekInterestStart` key in localStorage (docs/testing.md) is a test's way to start a phone at another step.
- The dial's section `dial` is in `HOME_SECTIONS` (`rows.ts`), in no group: `groupOf` throws for it, so a caller of `groupOf` over every row filters `isHomeRow` first.

## The home and the groups

`#/settings` is the home: a search field pinned under the header ("Search settings"), the Greek dial and the groups, each a button that opens its page.

| Group | Sections it holds |
| --- | --- |
| Reading | appearance, layout, reading, headings, immersive, weave (Weave rows from step 2) |
| Greek | newWords, paradigms (How much of a table, from step 5, mw-irpgqi.2), goal, approach, handwriting (the page is listed from step 3) |
| The tutor | readTutor, askBy, talk (Talk Hold | Tap, Send On release | By button), hebrew, tips, studyWay (Quiz goal, My study way) |
| Listening | readAloud, voices, speed, pronunciation |
| Daily | daily |
| Study resources | resources, logos |
| Account | aboutYou, memory, more (Words, Review, Paradigms, Ask for more, Your requests, About) |
| Developer | developer (listed on the home only once Developer mode is found on About) |

The table is `GROUPS` in `src/settings/rows.ts`: one entry per group with its `sections`, and `groupOf(section)` reads it. A section is in exactly one group (`tests/unit/settings-groups.test.ts` fails on a section in none or two, and on an empty group). `visibleGroups(values)` is what the home lists: the groups with a row drawn.

A group's page is `#/settings?group=<id>` (`groupLink`, `groupIdOf`, `openSettingsGroup` in `src/settings/link.ts`; ids `reading greek tutor listening daily study account developer`). It has the group's title, the `‹ Settings` back arrow (`backToSettingsHome`: a step Back when the home is the entry behind, else the home in its place) and the group's sections in `SECTIONS` order. The phone's Back from the home leaves Settings, as before. Each page keeps its own scroll place (`scrollAddress` in `src/nav/scrollMemory.ts`).

## What the Settings screen holds

Settings (opened by the gear; a setting's details show only while it is on, mw-5r3p30.106: the Weave's Grammar row while the Weave is not Off, New words at and Move it while New words a day is not Off, Bible in Logos while Logos is On) holds the Appearance (Theme Phone | Light | Dark | Sepia | High contrast, Text size Small | Normal | Large | Largest), the Layout (Verse by verse | Paragraph), Section headings (On | Off), the Weave (two rows: Words Off | Solid | + Learning, Grammar Any | Solid | + Frontier), the English and Greek voice pickers (under the Greek one, the name of the voice in use and Test, which says πατήρ then ἀγάπη: settings/controls/voice.tsx GreekVoiceInUse, greek.ts voiceInUse / testGreekVoice, features/greek-voice-test.feature), the English and Greek speed sliders, the Greek pronunciation list, and links to Words and About;

## Search

Typing on the home swaps the groups for the rows that match by name or hint (`visibleRows`; a detail hidden by a setting that is off is found through the row that turns it on). Each result names its group; choosing one opens its page at the row (`openSetting` for a setting of the registry: scrolled to, marked; a row outside the registry, such as a link, opens its page at its section). The field keeps its text when he comes back to the home.

## Links into Settings

- `#/settings?setting=<key>` (`settingLink`, `openSetting`): the page holding that row, at the row, marked until his next tap; the row is drawn whatever its dependency would hide, with the setting to turn on first beside it (`rowsAt`, `neededFor`).
- `#/settings?section=<id>` (`openSettingsSection`): the page holding that section, scrolled to it. The Goal screen's Choose a goal and Change (`goal`), the reference card's and the link notice's Link Logos in Settings (`resources`) use it.
- A screen that returns to Settings by `backTo('settings')` (About you, Memory, My study way, Ask for more, Placement) steps Back to the page it came from.

## Adding a setting to a group

1. Declare the setting (`src/settings/definitions/<name>.ts`, one line in its `index.ts`, or an entry in `src/settings/registry.ts`) with its `section`, and write its control in `src/settings/controls/` (`CONTROLS`, `index.ts`).
2. Its page is the page of its section's group: nothing else to do. To put a setting on another page, change its `section`.
3. A new section: add its id to `SectionId` (`define.ts`), an entry in `SECTIONS` (`rows.ts`) and its id to the `sections` of one group in `GROUPS`; the unit test fails until it is in exactly one.
4. A new group: an entry in `GROUPS` (id, title, hint, sections) and its id in `GroupId`.

## Files

```
src/SettingsScreen.tsx  # the home (search field, groups, found rows) and a group's page (its sections, drawn from the rows, each with its control); reports the screen to the tutor with every setting
src/settings/rows.ts  # SECTIONS, GROUPS (which group a section is in), ROWS, visibleRows, rowsAt, neededFor, visibleGroups, searchSettings; the links, the Request a devotional box, Works and Developer mode are rows too
src/settings/define.ts  # defineSetting and SectionId
src/settings/definitions/greekInterest.ts  # the Greek dial: GREEK_LEVELS, greekFrom, viewAt / weaveAt / newWordsAt, placementOf, the setting
src/settings/useGreekInterest.ts  # the step, live
src/data/repositories/greekInterest.ts  # setGreekInterest, placeGreekInterest, raiseGreekInterest, the kept values
src/settings/registry.ts  # every talkable setting: key, label, hint, help, section, dependency, values, read and write
src/settings/link.ts  # the addresses into Settings: a setting, a section, a group; backToSettingsHome
src/settings/controls/  # the control of each row (CONTROLS by key) and the Section, SettingRow and MoreHelp pieces; ChipRow is src/ui/Chips.tsx bound to a setting
src/settings/definitions/grammarExtent.ts  # the settings whose choices are grammar extents (weaveGrammar, pickerGrammar, paradigmExtent): one table of their values, labels and extents; controls/grammarExtent.tsx ExtentChips draws any of them (mw-irpgqi.2)
```
