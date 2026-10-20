# Layout: Settings

Which file holds what, for `src/settings/` (the registry, the rows, the links, the controls and `defineSetting`) and the Settings screen (`src/SettingsScreen.tsx`). The study resources (`src/resources/`) are in `docs/resources.md`.

Settings is a home and pages (mw-3ased2.1). The grouping is the Builder's, PROVISIONAL, until the Governor amends it.

## The home and the groups

`#/settings` is the home: a search field pinned under the header ("Search settings") and the groups, each a button that opens its page.

| Group | Sections it holds |
| --- | --- |
| Reading | appearance, layout, reading, headings, immersive, weave |
| Greek | newWords, goal, approach, handwriting |
| The tutor | readTutor, askBy, talk (Talk Hold | Tap, Send On release | By button), hebrew, tips, studyWay (Quiz goal, My study way) |
| Listening | readAloud, voices, speed, pronunciation |
| Daily | daily |
| Study resources | resources, logos |
| Account | aboutYou, memory, more (Words, Review, Paradigms, Ask for more, Your requests, About) |
| Developer | developer (listed on the home only once Developer mode is found on About) |

The table is `GROUPS` in `src/settings/rows.ts`: one entry per group with its `sections`, and `groupOf(section)` reads it. A section is in exactly one group (`tests/unit/settings-groups.test.ts` fails on a section in none or two, and on an empty group). `visibleGroups(values)` is what the home lists: the groups with a row drawn.

A group's page is `#/settings?group=<id>` (`groupLink`, `groupIdOf`, `openSettingsGroup` in `src/settings/link.ts`; ids `reading greek tutor listening daily study account developer`). It has the group's title, the `‹ Settings` back arrow (`backToSettingsHome`: a step Back when the home is the entry behind, else the home in its place) and the group's sections in `SECTIONS` order. The phone's Back from the home leaves Settings, as before. Each page keeps its own scroll place (`scrollAddress` in `src/nav/scrollMemory.ts`).

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
src/settings/registry.ts  # every talkable setting: key, label, hint, help, section, dependency, values, read and write
src/settings/link.ts  # the addresses into Settings: a setting, a section, a group; backToSettingsHome
src/settings/controls/  # the control of each row (CONTROLS by key) and the Section, SettingRow and MoreHelp pieces
```
