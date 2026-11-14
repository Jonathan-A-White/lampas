# One Sermons list: every sermon source in one place, clear at 100 and more

A design (mw-qtu3zvz.93, Fable at xhigh, the Governor's ask of 2026-11-12) for the one list that switches every sermon source the Sermons door draws on. Design only: no product code changes here.
It is story A of three: this document, then the Logos ownership rule (mw-qtu3zvz.94), then the build (mw-qtu3zvz.92), which builds what section 14 states. The mockups are ASCII, 30 characters wide: on a 390 px phone GitHub's code box is 280 px wide with 16 px of padding, 248 px of text, which is 30 characters at its 13.6 px monospace, so each is read whole without dragging the box sideways. A mockup shortens to fit: it writes the Back of a page as '‹ Study' (the page's Back reads '‹ Study resources'), the page's title 'Sermon sources' as 'Sources' and the Study resources page's as 'Resources', the search field's 'Search 120 sermon sources' as 'Search 120 sources', and a name that would meet its switch on a second line; the page itself wraps a name by its own width. In a row, brackets mark the chosen step: 'Off [On]' is On, '[Off] On' is Off.
Everything in this file is **PROVISIONAL** until the Governor confirms it; the choices that are most his are gathered in 'For the Governor' at the end.

His words that rule it (Postern, 2026-11-12, direct:ad77adaa...3b561b and direct:25815aac...ff4f5f): "Are these two screens redundant? I like the look and feel of the first, but don't find it useful to be able to just open the book of
sermons when disassociated with the sermon mapper. If a book has more than just sermons, it makes sense to keep it in both locations." And: "Needs to be super clear, organized, and easy to use even with many sermon collections. Also, logos
resources should only show up if the user has indicated they have that resource (in the import). Unless you know it is a free resource logos provides to new users." Read as: one list, in the look of Library > Sermons; a sermon book is switched
where the sermons are found, not where books are opened; a book that is more than sermons keeps its place in the Library too; and the list must still be easy at 120 sources.

<!-- toc -->

- [In one screen](#in-one-screen)
- [1. Today: two screens for one door](#1-today-two-screens-for-one-door)
- [2. Where the list lives](#2-where-the-list-lives)
- [3. The list at 120 sources](#3-the-list-at-120-sources)
- [4. What a source is, and the two groups](#4-what-a-source-is-and-the-two-groups)
- [5. What a row says](#5-what-a-row-says)
- [6. The order](#6-the-order)
- [7. Search, and All on / All off](#7-search-and-all-on--all-off)
- [8. The counts](#8-the-counts)
- [9. How 120 stays easy](#9-how-120-stays-easy)
- [10. The empty and none-owned states](#10-the-empty-and-none-owned-states)
- [11. The Library after the change](#11-the-library-after-the-change)
- [12. The Sermons door and its sheet](#12-the-sermons-door-and-its-sheet)
- [13. The tutor, and the words that point here](#13-the-tutor-and-the-words-that-point-here)
- [14. The end state mw-qtu3zvz.92 must reach](#14-the-end-state-mw-qtu3zvz92-must-reach)
- [15. Checked against VISION.md](#15-checked-against-visionmd)
- [16. Alternatives weighed, and why they lost](#16-alternatives-weighed-and-why-they-lost)
- [17. Later, not in mw-qtu3zvz.92](#17-later-not-in-mw-qtu3zvz92)
- [For the Governor](#for-the-governor)

<!-- /toc -->

## In one screen

- **One list.** Settings > Study resources > Sermons has one row, **Sermon sources**, with its count ('17 of 120 on'). It opens a page of its own in the look of Library > Sermons: All on / All off, a search field, a count, and one row for each source with **Off | On**.
- **One row for each source.** Today Greg Laurie is two rows on two screens (his list in Settings, his archive in the Library). In the one list he is one row. The sources bundled today go from 87 rows on two screens to 73 on one.
- **Two groups, named by what On gives.** *Listed by passage*: each sermon is listed at its verse, and the count on the Sermons door is these. *Logos books, at the verse*: Logos opens the book at the verse, and Lampas cannot say which sermons it holds there.
- **A row says three things:** the source's name, how many sermons and where they open ('3,467 sermons · on the web'), and Off | On. No Pin anywhere.
- **What is on comes first** in each group, then the rest by name. Nothing moves under his thumb.
- **Search finds a source by any word** of its name, its series or a book under it, and a preacher where a name holds it (no file names a preacher yet; section 17). With a search typed, the two buttons act only on what is shown and say so: 'These 10 off'.
- **A slip is undone in one tap.** After All on or All off a line says what changed, with **Undo**.
- **The Library loses its Sermons row.** A book that is only sermons is in this list and nowhere else. A book that is more than sermons (Augustine's Homilies on John, which is on the Commentaries page) stays in the Library and is also in this list, as one book with one switch.

Where each thing lives after the build:

| Thing | Where he finds it |
| --- | --- |
| Every sermon source, Off or On | Settings > Study resources > Sermons > **Sermon sources** (the one list) |
| Open web sermons in | Settings > Study resources > Sermons, the row under Sermon sources (where it is today) |
| A Logos book that is only sermons | the one list, and nowhere in the Library |
| A Logos book that is more than sermons | its page of the Library (Commentaries), as now, **and** the one list |
| The theme lists | Settings > Study resources > Themes (unchanged) |
| The sermons themselves | the Sermons door on a verse, and its sheet (unchanged) |
| The books of a Logos library he has not imported | not shown; the list says how to import |

## 1. Today: two screens for one door

| | Settings > Study resources > Sermons | Library > Sermons |
| --- | --- | --- |
| Holds | the passage lists: 9 bundled (`public/sermons/index.json`) and each one the sermon index service adds (`growSermonRows`) | the Logos sermon books of the catalogue: 71 (`src/resources/catalogue/sermons.json`: of the 78 books Logos types as sermons or sermon outlines, 7 are left out, mw-qtu3zvz.108) |
| Looks like | a section of rows at the foot of a Settings page, On / Off each, no search, no count | a page: header with its count at the right, help line, All on / All off, 'Search 71 sermon archives', a count, Off / On / Pin each (`src/library/KindPage.tsx`) |
| Kept as | the setting `sermons.<id>` | the shelf row of the book (`db.library`, Off / On / Pinned) |
| On gives | its sermons at their verses on the Sermons sheet, counted on the door | one link under **In Logos** on the Sermons sheet, at every verse, not counted; and a row behind In another book… at the verse, the Pinned ones first |

What is wrong with it, beyond there being two:

1. **One source, two rows.** Seven of the nine lists are made from 14 of the 71 books (Greg Laurie, J. D. Greear and Skip Heitzig one book each, My Sermon Notes two, Wesley four, Whitefield one, Moody four). Each is switched twice, on two screens, by two names: Settings > Study resources > Sermons shows 'Greg Laurie's sermons' with the line 'Listed by passage; opens in Logos.', and Library > Sermons shows 'Greg Laurie Sermon Archive'. (The longer names, such as 'Greg Laurie's sermons (Logos archive)' and 'Matthew Henry's sermons (Internet Archive scans)', are in `public/sermons/index.json`; Settings drops a bracket at the end of a name that ends '(Logos archive)' or '(Logos library)' or is over 40 characters, `src/settings/definitions/sermons.ts`, so it shows 'Spurgeon's sermons (CCEL)' whole.)
2. **The better screen holds the weaker sources.** The page with the search and the count is the one for books Lampas cannot look inside; the lists, whose sermons it can name, are plain rows under three other sections.
3. **Pin does nothing he wants.** It puts a sermon book among the other books at a verse, "disassociated with the sermon mapper".
4. **Neither says why the door's number is what it is.** With 71 books On and two lists On, the door can read 'Sermons · 3': nothing says that only the lists are counted.
5. **Everyone is shown his books.** The 71 are the Governor's own; another reader sees all of them, and the seven Logos lists too (mw-qtu3zvz.94 mends this).

## 2. Where the list lives

Under **Settings > Study resources > Sermons**, as a page of its own behind one row. The Sermons section of the Study resources page becomes two rows and never grows again:

```text
┌────────────────────────────┐
│ ‹ Settings  Resources      │
├────────────────────────────┤
│ ...                        │
│ (Study resources, Maps and │
│  Themes, as today)         │
│                            │
│ Sermons                    │
│ Which sermon lists the     │
│ Sermons door draws on.     │
│────────────────────────────│
│ Sermon sources     17 on › │
│────────────────────────────│
│ Open web sermons in        │
│ Where a text sermon opens. │
│ Firefox works on Android   │
│ only.                      │
│ [This browser]   Firefox   │
└────────────────────────────┘
```

- The row **Sermon sources** is a door in the shape of a Library home row ('Lexicons  19 on · 2 pinned ›'): its name, the count, a chevron, 48 px high. It opens the page **Sermon sources**, whose Back is the Study resources page at this row.
- **Open web sermons in** stays where it is. It is about every web sermon, not about one source, and under a list of 120 rows nobody would find it.
- Why a page and not rows in the section: the vault's rule is that a long list is a widget, not a page of rows (quoted at the top of `src/ui/SearchableList.tsx`); the Library design found the five-row widget cramped at 110 books and gave each kind a page (`docs/design/library-at-scale.md` 3.3); and the look he likes *is* that page. A page also gives the list the header for its count, a scroll place of its own, and a search field at the top of the screen.
- **No dead address.** `#/library?kind=sermons` (the old Library > Sermons) opens the page in its place, and with `book=<id>` at that book's row. `#/settings?section=sermons` opens the Study resources page at the section, as now. `#/settings?setting=sermons.<id>` (the tutor's link to a source, a Settings search result) opens the page at that source's row, marked until his next tap.

## 3. The list at 120 sources

The top of the list as it opens. The 120 here are 23 lists (14 on the web, 9 from Logos books) and 97 Logos books; 17 are on. The numbers of the first rows are today's real sources; their names are the ones section 5 gives (Settings shows 'Spurgeon's sermons (CCEL)' today). Brackets mark the chosen step ('Off [On]' is On). This mockup shows the first group, *Listed by passage*; the second group, *Logos books, at the verse*, is drawn in the next one, after 'Scrolled past the first group'.

```text
┌────────────────────────────┐
│ ‹ Study  Sources     17 on │
├────────────────────────────┤
│ The Sermons door at a      │
│ verse draws on the sources │
│ that are on.               │
│ [ All on ]  [ All off ]    │
│ ┌────────────────────────┐ │
│ │ Search 120 sources     │ │
│ └────────────────────────┘ │
│ 17 of 120 on               │
│                            │
│ Listed by passage          │
│                 6 of 23 on │
│ Each sermon is listed at   │
│ its verse. The count on    │
│ the Sermons door is these. │
│────────────────────────────│
│ Greg Laurie's     Off [On] │
│ sermons                    │
│ 1,091 sermons · in Logos   │
│────────────────────────────│
│ Matthew Henry's   Off [On] │
│ sermons                    │
│ 45 sermons · on the web    │
│────────────────────────────│
│ Spurgeon's        Off [On] │
│ sermons                    │
│ 3,467 sermons · on the web │
│────────────────────────────│
│ ...                        │
└────────────────────────────┘
```

Top to bottom:

| Part | What it is | Scrolls away? |
| --- | --- | --- |
| Header | '‹ Study resources', the title **Sermon sources**, and the count of those on ('17 on', 'none on') where the Library's page has it | no |
| Help line | one sentence, what the list is for | yes |
| All on / All off | two 48 px buttons under the help line and above the search field, as on the Library's page (section 7) | yes |
| Search field | 'Search 120 sermon sources' (the number is the sources listed); 48 px; never focused by itself, so the keyboard does not open over the list | no: it stays at the top of the list |
| Status line | '17 of 120 on'; with a search, '· 2 shown' is added | no: with the field |
| A group | its heading with its own count ('6 of 23 on'), one line saying what On gives, then its rows | yes |
| A row | section 5 | yes |

The parts run in the Library's order (header, help line, buttons, search field, count, rows). Where this page differs from Library > Sermons (`src/library/KindPage.tsx`): its help line is one sentence, not a paragraph about Pin; its field says 'Search 120 sermon sources', the Library's 'Search 71 sermon archives'; while a search is typed its buttons read 'These 2 on' and 'These 2 off', the Library's 'All shown on' and 'All shown off'; its rows are in two headed groups, the Library's in one flat list; its rows are Off | On, the Library's Off | On | Pin; and the line with **Undo** (section 7) is new.

Scrolled past the first group, the second begins:

```text
│ Spurgeon's My     [Off] On │
│ Sermon Notes               │
│ 264 sermons · in Logos     │
│                            │
│ Logos books, at the verse  │
│                11 of 97 on │
│ Logos opens the book at    │
│ the verse you are reading. │
│ Lampas cannot say which    │
│ sermons it holds there.    │
│────────────────────────────│
│ The Beatitudes    Off [On] │
│────────────────────────────│
│ Fresh Sermons     Off [On] │
│────────────────────────────│
│ Princeton Sermons Off [On] │
│────────────────────────────│
│ ...                        │
│────────────────────────────│
│ The World's Great [Off] On │
│ Sermons, Volume 1: Basil   │
│ to Calvin                  │
│────────────────────────────│
│ The World's Great [Off] On │
│ Sermons, Volume 2: Hooker  │
│ to South                   │
└────────────────────────────┘
```

## 4. What a source is, and the two groups

A source is one thing he can turn on. There are three sorts, and the list names them by what On gives, because that is what he is choosing:

| Sort | Example today | On gives | Group |
| --- | --- | --- | --- |
| A list on the web | Spurgeon's sermons (3,467, at CCEL); Matthew Henry's (45, at the Internet Archive); each list the sermon index service adds | each sermon at its verse on the Sermons sheet, opened on the web, free to anyone; counted on the door | **Listed by passage** |
| A list from Logos books | Greg Laurie's sermons (1,091), J. D. Greear's, Skip Heitzig's, Spurgeon's My Sermon Notes, John Wesley's, George Whitefield's, D. L. Moody's | each sermon at its verse, opened in Logos, for an owner of the book; counted on the door | **Listed by passage** |
| A Logos book | The World's Great Sermons (10 volumes), Princeton Sermons, Sermon Outlines on Romans: 64 of his 78 | one link to the whole book at the verse, under **In Logos** on the Sermons sheet; not counted | **Logos books, at the verse** |

- **Listed by passage comes first.** VISION.md: sermons are found "by Bible passage first". These are the sources that answer 'is there a sermon on this verse?'; the books are the long tail behind them.
- **The headings are about what On gives, not where a sermon opens.** Where it opens is on each row ('on the web', 'in Logos'). Grouping by Web and Logos would put the seven Logos lists among 97 books they do not behave like, and would still not explain the door's count.
- **A group with no row is not drawn**, and when only one group has rows it has no heading: a reader with no Logos sees a plain list of web sources.
- **One row for a list and the books under it.** A list from Logos books names its books by Resource ID (Greg Laurie's is `LLS:GRGLRSRMNRCH`; Wesley's are `LLS:36.0.11` and `LLS:WORKSWESLEY05` to `07`). Those books have no row of their own: the list's row stands for them, the search finds it by their titles, and the Sermons sheet draws no In Logos link for them (each of their sermons is already a link into the same book). This is the mapping mw-qtu3zvz.94 needs too, to know whether he owns a list's books; it is stated once, in the source's own data, not worked out from its rows (Moody's rows name two of his four books).
- **What is not a source.** A book about preaching is not a book of sermons. Two of the 78 are such (How to Write Narrative Sermons; Transformational Preaching); Logos types them as sermons and the type rule took them. They left the catalogue's sermons in mw-qtu3zvz.108: the rules' `exclude` names them, so a regenerated catalogue and a reader's matched list leave them out.

## 5. What a row says

Three things, always in the same places, so 120 rows read as one column of names and one column of switches:

```text
│ Spurgeon's        Off [On] │
│ sermons                    │
│ 3,467 sermons · on the web │
```

| | A list on the web | A list from Logos books | A Logos book |
| --- | --- | --- | --- |
| Line 1, the name (16 px, medium) | 'Spurgeon's sermons' | 'Greg Laurie's sermons' | the book's short name: 'Princeton Sermons' |
| Line 2 (14 px, muted) | '3,467 sermons · on the web' | '1,091 sermons · in Logos' | its series, where the catalogue knows it (`series`) and the name does not already say it: 'Butler's Sermon Starters' under 'Sermon Starters, Volume 1'; none otherwise. A preacher joins it once the catalogue names preachers (section 17) |
| Line 3, only where it applies (14 px, accent) | | 'Free with Logos' (mw-qtu3zvz.94's list) | 'Free with Logos'; 'Also in your Library: Commentaries ›' (section 11) |
| Control | Off \| On | Off \| On | Off \| On |

- **The name** is the source's name without a bracket at its end: 'Spurgeon's sermons', not 'Spurgeon's sermons (CCEL)' as Settings shows it today; line 2 says where it opens.
- **'his Logos archive'** was the index file's name for the three archives of the Governor's Logos (`public/sermons/index.json`) until mw-qtu3zvz.108 took 'his' out, now '(Logos archive)'; Settings never showed that name (it drops the bracket), and the page drops it too: it was written about the Governor, and another owner would read it as someone else's.
- **Two lines at most for a name.** A book's name is the catalogue's short name; a title that would run past two lines ('Sermons on the Beatitudes, with Others Mostly Preached before the University of Oxford; To Which Is Added…', 169 characters) is cut with an ellipsis (25 of the 78 short names are longer than two lines today, so the rules should give those a shorter one). The whole title is what TalkBack reads and what the search looks in. The type is never made smaller to fit.
- **How many sermons** is the index's own number of sermons listed for the source (`rows`). A source that does not say has no number: 'on the web'.
- **The control** is the Library's segmented control with two steps (as Devotionals has it): each step 44 px, the chosen one filled, a radio group named by the source, so a screen reader says the source's name and then 'On, radio button, 2 of 2'. It sits at the right edge, under the thumb. **No Pin**: there is nothing left for it to mean.
- **A tap is saved at once** and changes the door's count at once, as today. There is no Save.
- **Nothing else is on a row.** The credit and the link to a source's home stay where they are, under the sermons on the Sermons sheet and in About.

## 6. The order

- Within a group: **the sources that are on, then the rest; each by name.** So the top of each group is the answer to 'what is the door drawing on?'.
- By name means as a library files it: a leading 'A', 'An' or 'The' is passed over ('The Beatitudes' is under B), and a number is read as a number ('Volume 2' before 'Volume 10'). The volumes of a series therefore stand together.
- **The order is made when the page opens and when the search changes, never as he taps** (`SearchableList`'s rule). A row he turns Off stays where it is until he comes back; the headings' counts change at once. The groups are by sort, which a tap cannot change, so no heading is ever wrong about the rows under it. That is why the list is not headed 'On' and 'Off'.

## 7. Search, and All on / All off

```text
┌────────────────────────────┐
│ ‹ Study  Sources     17 on │
├────────────────────────────┤
│ [These 2 on] [These 2 off] │
│ ┌────────────────────────┐ │
│ │ wesley                 │ │
│ └────────────────────────┘ │
│ 17 of 120 on · 2 shown     │
│                            │
│ Listed by passage          │
│────────────────────────────│
│ John Wesley's     [Off] On │
│ sermons                    │
│ 137 sermons · in Logos     │
│                            │
│ Logos books, at the verse  │
│────────────────────────────│
│ Sermons by the    Off [On] │
│ Late Rev. Charles Wesley   │
│                            │
│                            │
│ (the keyboard)             │
└────────────────────────────┘
```

**Search.**

- It looks in a source's name (`name` in `public/sermons/index.json`; a Logos book's `short` in `src/resources/catalogue/sermons.json`), its full title (`title`), its series (`series`; 35 of the 71 entries have one), the titles of the books under a list (`LOGOS_RESOURCES` in `src/sermons/sources/bundled.ts`, each book's `title` in the catalogue: 'several occasions' finds John Wesley's sermons), and the words 'web', 'Logos' and 'outlines' for what it is (the row's sort, which the page knows). **A preacher is found only where a name holds it** ('Wesley' is in the name of his list and of 'Sermons by the Late Rev. Charles Wesley'): neither file has a field for a preacher, so one that no name or title holds finds nothing until the catalogue names preachers (section 17). It forgives a slip at the start of a name, as the Library's lists do (`src/ui/listFilter.ts`).
- It filters as he types. The groups and their order stay; a group with no match is not drawn; the headings drop their counts while a search is typed, and the status line says how many are shown. Typing brings the list back to its top.
- **No match:** 'No sermon source matches', and under it the door **Ask for a preacher** that the Sermons sheet has at its foot (greyed, 'Needs a licence', without one). The native ✕ of the field clears it.
- **Under eight sources there is no field** (the vault's rule gives the search to a list longer than about seven): two rows need no search.

**All on / All off.**

- With no search they are **All on** and **All off** and act on every source listed.
- **With a search typed they act only on what is shown, and their words say so:** 'These 2 on', 'These 2 off'. A button never changes a row he cannot see. This is the one tool for a series, a preacher or a kind: type 'great sermons', tap 'These 10 off'. A preacher works the same way where a name holds it.
- **Undo.** After either, one line stands under the buttons, 'Turned off 17.' with **Undo**, which puts back exactly what was there. It stays until his next tap on a switch or until he leaves. At 120 sources a slip on All on would otherwise cost him his whole choice, with no way to see what it was.
- After All off, with no search:

```text
┌────────────────────────────┐
│ ‹ Study  Sources   none on │
├────────────────────────────┤
│ The Sermons door at a      │
│ verse draws on the sources │
│ that are on.               │
│ [ All on ]  [ All off ]    │
│ Turned off 17.    [ Undo ] │
│ No source is on, so no     │
│ verse has a Sermons door.  │
│ ┌────────────────────────┐ │
│ │ Search 120 sources     │ │
│ └────────────────────────┘ │
│ none of 120 on             │
│                            │
│ Listed by passage          │
│              none of 23 on │
│ Each sermon is listed at   │
│ its verse. The count on    │
│ the Sermons door is these. │
│────────────────────────────│
│ Greg Laurie's     [Off] On │
│ sermons                    │
│ 1,091 sermons · in Logos   │
│────────────────────────────│
│ Matthew Henry's   [Off] On │
│ sermons                    │
│ 45 sermons · on the web    │
│────────────────────────────│
│ ...                        │
└────────────────────────────┘
```

The rows have not moved: the three that were on are still first, now Off, so he can see what he had.

## 8. The counts

| Where | What it counts | Reads |
| --- | --- | --- |
| The row on the Study resources page | sources on, of those listed | '17 of 120 on', 'none of 120 on' |
| The page's header | sources on | '17 on', 'none on' |
| The status line under the search | sources on, of those listed; with a search, how many are shown | '17 of 120 on', '17 of 120 on · 2 shown' |
| A group's heading | the group's sources on, of the group's | '6 of 23 on' |
| The search field | sources listed | 'Search 120 sermon sources' |
| A row's second line | the source's sermons | '3,467 sermons' |
| All on / All off with a search | the rows they will change | 'These 2 off' |
| The line after All on / All off | the rows that changed | 'Turned off 17.' |
| The door on a verse (unchanged) | the sermons listed for the place, from the lists that are on | 'Sermons · 12' |

Every count of sources counts what is listed: a source he does not own, or one that is hidden while Logos is off, is in none of them. All of them follow a tap at once.

## 9. How 120 stays easy

A row is about 64 px (a name and one line), so 120 rows are some 7,700 px, ten screens of list. He is never asked to read them all:

| He wants to | What he does |
| --- | --- |
| See what the door draws on | nothing: the count is in the header, and what is on leads each group |
| Turn one source on | type three letters of it, tap On |
| Turn a series, a preacher (where a name holds it) or the outlines off | type its name, tap 'These N off' |
| Start again from nothing, or from everything | All off, or All on; Undo if it was a slip |
| Know why the door says 3 when 60 are on | the first group's line: the count on the door is these |
| Find what is new or unknown to him | scroll one group: its rows are alike, two or three lines each, in A to Z order, the volumes of a series together |

The devices, in one place: one row per source (87 rows become 73 for the sources bundled today); two groups that do not change under a tap; what is on first; a name of two lines at most; one fixed place for each of the three things a row says; a search over every word; buttons that act on what is shown; Undo; counts at every level.

## 10. The empty and none-owned states

| State | What the page shows |
| --- | --- |
| **No Logos** (the Logos study resource is Off, and no Logos source was ever on) | the web lists only, with no heading and no word about Logos. Most readers see this: a short list, Spurgeon and Matthew Henry on |
| **Logos is On, no list imported** | the web lists and the sources that are free with Logos (mw-qtu3zvz.94), then the card below |
| **A list imported, no sermon book in it** | the same, and the card reads 'Your Logos list holds no sermon book Lampas can open.' with **Import again** |
| **Logos turned Off after sources were on** | the Logos sources are not listed; one line at the foot: '106 sources in your Logos library are not offered while Logos is off in Study resources. Your switches stay as they are.' with 'Study resources' a link to the Logos row |
| **None on** | 'none on' in the header and the status line, and 'No source is on, so no verse has a Sermons door.' under the buttons (section 7) |
| **Search with no match** | 'No sermon source matches' and Ask for a preacher (section 7) |
| **Offline** | the whole list: it is read from the phone. A source the service added on an earlier day is still listed |
| **While the phone reads his settings and shelf** | the header and the help line; the list is drawn once both are read, never first with every switch Off |

None owned, at 390 px:

```text
┌────────────────────────────┐
│ ‹ Study  Sources      2 on │
├────────────────────────────┤
│ The Sermons door at a      │
│ verse draws on the sources │
│ that are on.               │
│ [ All on ]  [ All off ]    │
│ 2 of 2 on                  │
│────────────────────────────│
│ Matthew Henry's   Off [On] │
│ sermons                    │
│ 45 sermons · on the web    │
│────────────────────────────│
│ Spurgeon's        Off [On] │
│ sermons                    │
│ 3,467 sermons · on the web │
│────────────────────────────│
│                            │
│ ┌────────────────────────┐ │
│ │ Sermon books in Logos? │ │
│ │ Import your Logos      │ │
│ │ list, and the ones     │ │
│ │ Lampas can open join   │ │
│ │ this list.             │ │
│ │ [ Import ]             │ │
│ └────────────────────────┘ │
└────────────────────────────┘
```

- The card is drawn only while Logos is On. It opens the Library's Import (`#/library?import`), the one way Lampas learns what he owns: his words, "(in the import)". A sermon book cannot be ticked by hand, because an unowned one is not listed.
- **It never sells.** No price, no 'get Logos', no link to a shop (VISION.md 'Never commercial'). 'Free with Logos' on a row states a fact about a book he already has.

## 11. The Library after the change

**A book that is only sermons leaves the Library.** That is every book of the catalogue's kind `sermons`.

- The Library's home has eight kinds, not nine: no **Sermons** row. Its first card no longer says 'and sermon archives'.
- 'Search your books' does not find it. The Settings search does, and answers 'Princeton Sermons · Sermon sources', which opens the one list at its row.
- **In another book…** at a verse has no 'Sermon archives' group: a sermon book opens only through the Sermons door.
- **No Pin.** A book that was Pinned becomes On, once; On stays On and Off stays Off.
- A row that stands for books (a list from Logos books) is On if the list was On; and where the list's switch was never touched, it is On if any of its books was On or Pinned. Nothing he could open before the change stops being offered without his tap.
- An import still matches his sermon books and turns the ones he owns On; its result names where they went ('64 sermon books: in Settings > Study resources > Sermons').

**A book that is more than sermons stays in the Library, and is also in the list.**

- What it is: a book whose home is another page of the Library, which also holds sermons. The catalogue marks it (a mark on its entry, set in `data/logos/catalogue-rules.json` by Resource ID or series). Four of his books are such today, all on the Commentaries page, and their titles say so: Augustine's Homilies on the Gospel according to St. John (`LLS:SLSRHMTRTSTGSTN`), Chrysostom's Commentary on Galatians and Homilies on Ephesians (`LLS:HMLSSTJHNCHRYSTM10`), and the two Augustine volumes of the Nicene and Post-Nicene Fathers (NPNF1.6 and 1.7, `LLS:6.60.6` and `LLS:6.60.7`). They are proposed as the first to carry the mark.
- In the Library nothing changes for it: its page, Off | On | Pin, its door at the verses it covers.
- In the list it is a row of the second group, with a third line that says where else it lives and goes there:

```text
│ Homilies on the   Off [On] │
│ Gospel according to St.    │
│ John, and His…             │
│ A Library of Fathers of    │
│ the Holy Catholic Church   │
│ Also in your Library:      │
│ Commentaries ›             │
```

- **One book, one switch.** The list shows the shelf's own state for it (Pinned reads as On) and writes it. Off here is Off in the Library; that third line is why he will expect it. Two switches for one book would let it be On in one place and Off in the other, and then neither screen could say whether Lampas uses it.
- Under In Logos on the Sermons sheet it is offered only at the verses it covers, as it is among the commentaries.
- **What 'more than sermons' cannot mean.** The build story points at `src/library/reasons.ts:65`, 'Other books, collected works and journals'. That line is not a kind: it is the reason given for the books of his list Lampas cannot open at all. A book there has no switch anywhere, so it can neither stay nor be listed. (Its label once named 'sermons', which was out of date because sermon books have been opened since mw-qtu3zvz.3; mw-qtu3zvz.104 took the word out.) When the makers add such a book to the catalogue under another kind, the mark puts it in the list.
- A neighbouring case, for the catalogue and not for the build: Chrysostom's five volumes of homilies (NPNF1.10 to 1.14, `LLS:6.60.10` to `LLS:6.60.14`) are typed by Logos as sermons, so they are sermon books and leave the Library, while Augustine's two (1.6 and 1.7) are typed as commentaries. If he wants Chrysostom at the verse among the commentaries, the rules move those five and give them the mark.

## 12. The Sermons door and its sheet

Little changes, and one thing must:

- **In Logos** lists the Logos books that are On, by name; there is no 'Pinned first' any more. A book under a list is not drawn there.
- **The door where nothing is listed.** Today the door is drawn only when the place has a listed sermon (`SermonsDoor`: no count, no door), and a sermon book can still be reached through In another book…. Once that door closes to sermon books, a place with no listed sermon (all of 2 John, which no bundled list reaches) would have no way to them at all. So: where no sermon is listed and a Logos book is On, the door is drawn as **Sermons**, with no number, and its sheet says 'No sermons here.' above In Logos. The number stays what it was: listed sermons.
- The count, the groups, the search, the credits and Ask for a preacher are as they are.

## 13. The tutor, and the words that point here

- **The tutor is told the page** (`useReportScreen`): its name, 'On: 17 of 120', and each group's count. It is not told 120 rows.
- **The switches it may flip stay the ones it flips today**: the bundled lists' `sermons.<id>`. A Logos book and a list the service added are not settings of the tutor's request, which is full (76 rows); he switches those himself.
- **A link from the tutor to a source** opens the page at the row (section 2).
- **Its instructions name the one place**: 'Settings > Study resources > Sermons > Sermon sources', wherever they or Help (`src/help.ts`) or the Library's own help say where sermon sources are switched.
- Which sermons the tutor is told of a passage is unchanged: those of the sources that are on.

## 14. The end state mw-qtu3zvz.92 must reach

1. **One list.** Settings > Study resources > Sermons holds the row **Sermon sources** with 'N of M on', and under it Open web sermons in. No source has a row on the Study resources page.
2. **The page, in the Library > Sermons look:** the header with the count of those on; the help line; **All on / All off**; a search field **'Search N sermon sources'** (from eight sources up); a status line with how many are on; the list (the Library's order). It keeps its own scroll place, and Back returns to the Study resources page.
3. **Every source once:** the passage lists (bundled and from the service) and the Logos sermon books he owns, a list from Logos books standing for those books. Each row **Off | On**; no Pin on the page.
4. **Two groups** with their headings, their one line and their counts; a group with no row not drawn; one group alone has no heading.
5. **A row** says its name in two lines at most, then what section 5 gives for its sort.
6. **The order** of section 6, not changed by a tap.
7. **The search and the two buttons** of section 7: the buttons act on what is shown and say how many; Undo after either; the none-on line.
8. **The states** of section 10.
9. **A sermons-only Logos book leaves the Library**: no Sermons row on its home, not in its search, not in In another book…, no Pin; Pinned becomes On and the rest carry over (section 11). It opens only through the Sermons door, which is drawn where a book is On and nothing is listed (section 12).
10. **A book with more than sermons stays in the Library and is also in the list**, as one book with one switch and the line 'Also in your Library' (section 11).
11. **No dead link:** the old Library > Sermons address opens the page; a link to a source's setting opens it at the row; Help, the Library's help text and the tutor's instructions name the one place.
12. **Proved at 120:** a Playwright spec at 390x844 over 120 sources (the top of the list, a search, All off and Undo), ending in a screenshot of each, and the axe check on the page.

What this adds to the build story's criteria as written, for the Mayor: the list is a page behind a row (its criterion 1 says only 'shows ONE list'); a list and its books are one row; the buttons act on what is shown, with Undo; the door is drawn where a book is On and nothing is listed; and criterion 3's pointer to `reasons.ts:65` is replaced by the mark of section 11.

What it leaves to mw-qtu3zvz.94: which Logos sources are listed at all (owned by his import, or free with Logos), the list of free ones, and each Logos list naming its books. The design needs only its answer: is this source listed, and is it free with Logos.

## 15. Checked against VISION.md

Read whole, 2026-11-12. Each part, and what the design was held to:

| VISION.md | What was checked | Holds? |
| --- | --- | --- |
| 'Sermons, one click from the reading': "the app chooses which collections are on, as it chooses Logos books"; "by Bible passage first and by theme second" | The one list is that choosing, in the Library's own look; the passage lists are the first group; the theme lists keep their own section; the door is still one tap from the verse, and section 12 keeps it there for a place with nothing listed | yes |
| "easy to use correctly, hard to use incorrectly; large clear type, one hand on a phone" | One place and one row per source, so nothing can be set two ways; the buttons name what they change; Undo; no row moves under a tap; 16 px names, 44 px switches at the right edge, a 48 px field; nothing to drag or hold | yes |
| The line "never put a reader's licensed books (Logos) in the app or the tutor" | The list holds names, counts and links only, as today; the books listed are the ones his own import names; the tutor is told counts, not his shelf | yes |
| The line "credit every source it stands on" | No source is added or dropped; each credit stays under the sermons on the sheet and in About. The page itself carries none, as Settings carries none today | yes |
| 'Free to read, a licence for the AI' | The page needs no licence and sends nothing to the mill. Its one door to the mill, Ask for a preacher on a search with no match, is greyed with 'Needs a licence' as on the sheet | yes |
| 'Never commercial' | The none-owned card says Import and nothing about buying; 'Free with Logos' states a fact; no shop link | yes |
| 'The tutor' | Which sources are on already decides which sermons the tutor is told; the page reports its counts; the flips by talk are unchanged | yes |
| 'Every age and every ability' | Headings are headings; each switch is a radio group named by its source; the counts are announced as they change; state is a filled step and a word, never colour alone; a cut name is read whole by TalkBack; the type is never shrunk | yes |
| 'The Preface' | About texts only; this changes no text and no source, so the Preface does not change. The build changes what the app does, so it updates Help | yes |
| 'Pronunciation' | Nothing here speaks or spells a sound | not touched |
| 'How feedback is weighed' | His feedback fits the vision and is built; nothing crosses a line. The choices that are his are listed below, each with a recommendation | yes |

Also held to the phone rules (CLAUDE.md 'Conventions', `docs/pwa-best-practices.md` section 7): the page never scrolls and the list scrolls in its own box; the field is not focused on opening (no `autoFocus`); the list ends with `var(--lp-end-inset)`; the scroll place is kept across Back.

## 16. Alternatives weighed, and why they lost

| Alternative | Why it lost |
| --- | --- |
| Keep both screens and link each to the other | Still two switches for one source, and the door's count still unexplained |
| The list in the Library (Library > Sermons holding the passage lists too) | The Library is 'Your Logos library', shown only while Logos is On; Spurgeon and Matthew Henry are free to a reader with no Logos. And his words: not useful "when disassociated with the sermon mapper" |
| The rows in the Sermons section itself, no page | 120 rows under three other sections; no header for the count; the field cannot be the top of the screen; Open web sermons in is lost under them |
| A five-row box that scrolls inside the section | The Library design tried it at 110 books: cramped, and no place for All on or the groups |
| Headings 'On' and 'Off' | A row he turns Off would sit under 'On' until he came back: the heading would be wrong. Order alone says the same without being wrong |
| Groups by where it opens (On the web, In Logos) | Puts the Logos lists among the books, and leaves the door's count unexplained; where it opens fits on the row |
| Three groups (web lists, Logos lists, Logos books) | A third heading for seven rows; the row already says 'in Logos' |
| A list and its book as two rows | The fault this design starts from |
| Two switches for a book in both places | The same book On in one place and Off in the other; neither screen could say whether it is used |
| Filter chips (All, On, Web, Logos) above the list | A second way to do what the order, the groups and the search already do; one more thing to leave in the wrong state |
| All on / All off always acting on everything, as the Library's pages do | With 'wesley' typed, All off would turn off 118 rows he cannot see |
| Confirm before All off | A question on every use, to guard a slip Undo mends after the fact |

## 17. Later, not in mw-qtu3zvz.92

Each is left out to keep the build to what was asked; each fits the page as designed.

- **A series as one row.** Thirty-four of his 64 books are volumes of six series (The World's Great Sermons 10, Standard Sermon Starters 8, Butler's Sermon Starters 5, Chrysostom in the Early Church Fathers 5, the Sermon Outline Series 3, Edwards on the Matthean Parables 3). A row for the series ('The World's Great Sermons · 10 volumes') with its volumes behind it would bring 64 rows to 36. It needs a third state ('3 of 10 on') and a way to open the row. Until then the volumes stand together by name, and a search with 'These 10 off' does the same work in two steps.
- **New.** A source the service adds arrives Off, silently, somewhere in its group. A 'New' mark on its row until the page is next closed, and '· 1 new' on the Study resources row, would let him find it.
- **The preacher of every book.** (Done, mw-qtu3zvz.106: the rules' `authors` name 60 of the 71.) The catalogue's 71 sermon entries named no author (his Logos list has no author column), so a row cannot say who preached 'The Beatitudes' (a book with a row of its own, `LLS:BEATITUDES`) and a search for a preacher that no title holds finds nothing. The rules can name them, by hand, once; search and line 2 of a row (sections 5 and 7) then use them.
- **In Logos on the sheet, at 60 books.** Every book that is On is a row there at every verse. Folding the group to a few rows and 'N more', as In another book… folds its groups, is a design for the sheet.
- **The same two for the Library's pages:** buttons that act on what is shown, and Undo.

## For the Governor

Each is PROVISIONAL; the recommendation is what the document above describes.

| | The choice | Recommended |
| --- | --- | --- |
| D1 | Is the one list a page behind the row **Sermon sources**, or rows in the Sermons section of the Study resources page? | A page (section 2) |
| D2 | Is a list and the Logos book it is made from one row or two? | One: 'Greg Laurie's sermons', standing for the archive (section 4) |
| D3 | Are the two groups named by what On gives (**Listed by passage**; **Logos books, at the verse**), or by where a sermon opens (On the web; In Logos)? | By what On gives (section 4) |
| D4 | Does a book that is in the Library and in the list have one switch or two? | One: Off in the list is Off in the Library (section 11) |
| D5 | With a search typed, do All on / All off act on what is shown ('These 10 off'), with Undo after either? | Yes (section 7) |
| D6 | Where a verse has no listed sermon and a Logos sermon book is On, is the door drawn as **Sermons** with no number? | Yes: otherwise the book cannot be opened there at all (section 12) |
| D7 | Are these four the first books 'with more than sermons': Augustine's Homilies on John, Chrysostom on Galatians and Ephesians, NPNF 1.6 and 1.7? | Yes, and Chrysostom's five volumes of homilies stay sermon books unless he says otherwise (section 11) |
| D8 | The words: the row and page **Sermon sources**; the headings; 'These N on'; 'Turned off N.'; the card's two sentences | As written; his to reword |
