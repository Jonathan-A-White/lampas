# Research: Logos's Exegetical Guide at a verse

Story mw-rfjjzd.19 (design: docs/design/library-at-scale.md section 10 lead 3 and 3.6; the Governor's choice 4, A). Written 2026-10-23. Research only: no app code changed.
Read from one third-party repository's pull request that tested guide links on Verbum for Windows and on macOS (fetched 2026-10-23), one third-party Raycast extension's store page (fetched 2026-10-23),
search-engine excerpts of Logos's own help pages, `curl` against ref.ly on 2026-10-23, and Lampas's own code (`src/resources/logos.ts`, `logosBible.ts`, docs/resources.md 'Bible Word Study's lemma').
Logos's support and community pages answer 403 to a script, as docs/resources.md says.
**Nothing here was opened in Logos: the Laptop has none. Every link below is UNVERIFIED on a device until the Governor taps the one link in HOW TO CHECK IT.**

<!-- toc -->

- [The link form, and its source](#the-link-form-and-its-source)
- [The built links](#the-built-links)
- [Where the door would sit](#where-the-door-would-sit)
- [Sweep: every Logos guide and tool the sources name, and whether it takes a reference](#sweep-every-logos-guide-and-tool-the-sources-name-and-whether-it-takes-a-reference)
- [HOW TO CHECK IT, for the Governor](#how-to-check-it-for-the-governor)

<!-- /toc -->

## The link form, and its source

* **The Guide scheme, tested.** robrawks/LogosBibleSoftwareMCP, pull request #8 by droza123, 2026-08-26 (https://github.com/robrawks/LogosBibleSoftwareMCP/pull/8 , fetched 2026-10-23), the same pull request docs/resources.md
  already cites for Bible Word Study. Its table lists `open_guide`: "`logos4:Guide;t=Passage%20Guide;ref=Bible.Jn6.35`", "Verified on Windows and macOS" (the status as the pull request records it: its author on Verbum for Windows,
  pauxier-coder on macOS, Logos 53.1.0.0002). Beside it: "`logos4:Guide;t=Passage+Guide`" failed on Windows ("Unable to load Guide"), and "`logos4:Guide;t=PassageGuide;ref=Bible.Eph1.4`" came up blank on macOS. So **the title is written
  with `%20` for its spaces, in full and in the title Logos shows, and the reference is `ref=Bible.<book><chapter>.<verse>`**. The same pull request's `logos4:Guide;t=Bible%20Word%20Study;lemma=lbs%2Fel%2F…` is the form
  `study` in src/resources/logos.ts builds, so one builder serves both: `Guide;t=<title>;<parameter>=<value>`.
* **The Exegetical Guide's title and `ref=`, by one stranger's extension.** Raycast Store, "Logos Launcher" by michael_marvive (https://www.raycast.com/michael_marvive/logos-launcher , fetched 2026-10-23):
  its Exegetical Guide command opens a "`ref.ly/logos4/Guide`" link with "`t=`" and "`ref=`"; its guide title defaults to "**My Exegetical Guide**" (configurable); a reference such as "Matthew 5" becomes "`ref=BibleESV.Mt5…`".
  The page prints the shape, not a full link, and the extension's source was not found, so this is the only place that puts the words *Exegetical Guide* in a `t=` and it is not a tested link.
  Two things in it differ from the Passage Guide's: the title (`My Exegetical Guide`, which suggests the user-made copy Logos keeps of the built-in guide, not the built-in's own name) and a reference prefixed with a Bible (`BibleESV`).
* **Logos's own word, as excerpts.** Logos Support, "Study a Passage with the Exegetical Guide" (https://support.logos.com/hc/en-us/articles/360016462852-Study-a-Passage-with-the-Exegetical-Guide , 403 to a script; read as the search engine's excerpt):
  the Exegetical Guide gives detail on the underlying Greek or Hebrew text, including textual variants and grammar, where the Passage Guide gives the broader overview (commentaries, cross-references);
  either is opened from the Guides menu, or by right-clicking a passage and choosing Reference, then the guide. Nothing there writes a link.

So the form is: `logos4:Guide;t=Exegetical%20Guide;ref=Bible.<book><chapter>.<verse>`, and its fallback `https://ref.ly/logos4/Guide?t=Exegetical%20Guide&ref=Bible.<book><chapter>.<verse>`
(in the scheme the parameters are separated by `;`; in the https address the first is `?` and the next `&`, as `ref.ly/logosres/<id>?ref=…` is in docs/resources.md). `Bible.Ro8.31` is the reference form `bibleRef` in src/resources/logosBible.ts already builds
(`Bible.2Jn1.1` for 2 John); the Bible-neutral `Bible.` prefix is the Passage Guide's tested one, so the Bible's name (`BibleESV`) is left out.

**What is a guess:** that the built-in title is `Exegetical Guide` (the design's, by analogy; Logos shows that name in its menu, but a link takes the template's name as the app holds it, and the Raycast extension's default is `My Exegetical Guide`).
This is the one thing the tap decides. The Passage Guide's title is the only one a test has covered.

## The built links

Built the way `study` in src/resources/logos.ts builds a `logos4:` link (scheme first, ref.ly as the fallback) with the title `encodeURIComponent`ed (`%20`) and the place from `bibleRef`.

| Place | scheme | https |
| --- | --- | --- |
| Romans 8:31 | `logos4:Guide;t=Exegetical%20Guide;ref=Bible.Ro8.31` | `https://ref.ly/logos4/Guide?t=Exegetical%20Guide&ref=Bible.Ro8.31` |
| 2 John 1:1 | `logos4:Guide;t=Exegetical%20Guide;ref=Bible.2Jn1.1` | `https://ref.ly/logos4/Guide?t=Exegetical%20Guide&ref=Bible.2Jn1.1` |
| Romans 8:31, the tested title (for the Governor to compare) | `logos4:Guide;t=Passage%20Guide;ref=Bible.Ro8.31` | `https://ref.ly/logos4/Guide?t=Passage%20Guide&ref=Bible.Ro8.31` |
| Romans 8:31, the extension's title (the fallback if `Exegetical Guide` opens blank) | `logos4:Guide;t=My%20Exegetical%20Guide;ref=Bible.Ro8.31` | `https://ref.ly/logos4/Guide?t=My%20Exegetical%20Guide&ref=Bible.Ro8.31` |

2 John 1:1 is the book's first verse; the book has one chapter, and `bibleRef('2jn', 1, 1)` gives `Bible.2Jn1.1`.

ref.ly was asked on 2026-10-23 and accepts all four, passing them on and writing the title's spaces as `_` in the address it forwards to the app. A control, the Bible Word Study link Lampas already builds, is rewritten the same way
(`t=Bible_Word_Study`), so this is ref.ly's own treatment and not a fault of the form:

```
curl -I 'https://ref.ly/logos4/Guide?t=Exegetical%20Guide&ref=Bible.Ro8.31'
  301 -> https://app.logos.com/refly?uri=logos4%3AGuide%3Bt%3DExegetical_Guide%3Bref%3DBible.Ro8.31
curl -I 'https://ref.ly/logos4/Guide?t=Exegetical%20Guide&ref=Bible.2Jn1.1'
  301 -> https://app.logos.com/refly?uri=logos4%3AGuide%3Bt%3DExegetical_Guide%3Bref%3DBible.2Jn1.1
curl -I 'https://ref.ly/logos4/Guide?t=Passage%20Guide&ref=Bible.Ro8.31'
  301 -> https://app.logos.com/refly?uri=logos4%3AGuide%3Bt%3DPassage_Guide%3Bref%3DBible.Ro8.31
curl -I 'https://ref.ly/logos4/Guide?t=My%20Exegetical%20Guide&ref=Bible.Ro8.31'
  301 -> https://app.logos.com/refly?uri=logos4%3AGuide%3Bt%3DMy_Exegetical_Guide%3Bref%3DBible.Ro8.31
curl -I 'https://ref.ly/logos4/Guide?t=Bible%20Word%20Study&lemma=lbs%2Fel%2F%CE%BD%CF%8C%CE%BC%CE%BF%CF%82'    (control)
  301 -> https://app.logos.com/refly?uri=logos4%3AGuide%3Bt%3DBible_Word_Study%3Blemma%3Dlbs%242Fel%242F%24CE%24BD%24CF%248C%24CE%24BC%24CE%24BF%24CF%2482
```

That shows the address is well formed; the target page wants a Faithlife sign-in, so it cannot show what the app does with the title.

## Where the door would sit

Beside **In another book…** (design 3.6, S8, `InLogosDoors` in src/library/InLogosDoors.tsx): the pair `In Logos` / `In another book…` is a two-cell grid; a third cell **Study this verse in Logos** (its label in the design), drawn by the same
component at the same places (the Verse view's actions, the tutor's verse chip row, Today's Psalms and Proverbs, the Old Testament reference card) and only while Logos is On.

* It needs no book on the shelf: the Exegetical Guide is a tool of the app, gathering the user's whole library itself, so unlike *In another book…* it is not hidden when no Greek text, interlinear or commentary is On. It depends on Logos being On
  and on the place having a Logos reference (`bibleRef`; an Old Testament verse has one too, so the door works there, which *In another book…* does not).
* The row is a two-column grid today (`grid grid-cols-2`); a third door is either a line of its own under the pair or takes the second cell when *In another book…* has nothing to list. Which is for the build story's layout
  proof at 390x844, not for this note.
* A chip in the tutor's verse chip row would be a third chip beside *In another book*; that row is already two, so the Verse view and the reference card are the places that come first.
* Nothing in the catalogue changes: like Morphology Charts (docs/research/logos-morph-charts.md) and Factbook (docs/research/logos-factbook.md), it is a door, not a book.

## Sweep: every Logos guide and tool the sources name, and whether it takes a reference

From the pull request's table and the extension's page (the "reference" column is a Bible reference, `ref=Bible.Ro8.31`, unless a note says otherwise). "Tested" is the pull request's own status; the extension's links are untested here.

| Guide or tool | Named by | Link form | Takes a reference? |
| --- | --- | --- | --- |
| Passage Guide | pull request | `logos4:Guide;t=Passage%20Guide;ref=Bible.Jn6.35` | **Yes**, tested on Windows and macOS |
| Exegetical Guide | extension (as "My Exegetical Guide") | `ref.ly/logos4/Guide?t=…&ref=…` | **Yes**, by the extension; title unconfirmed; the one this note builds |
| Bible Word Study | pull request, extension | `logos4:Guide;t=Bible%20Word%20Study;lemma=lbs%2Fel%2F<lemma>` | By lemma (`lemma=`), not a verse; the extension says it sends the canonical reference of the word; Lampas's link has no `ref=` (docs/resources.md) |
| Factbook | pull request, extension | `logos4:Factbook;id=ref%3Abk.%23Moses;lens=all` | By entry key (`id=`), not a verse; the extension writes `logos4:Factbook;ref=…` with a topic identifier, which the pull request lists as a form that did not parse for a name in its other scheme (docs/research/logos-factbook.md) |
| Search (all) | pull request, extension | `logos4:Search;kind=Everything;q=…`; the extension `https://ref.ly/logos4/Search` with `kind=AllSearch&syntax=v2` | No, a text query |
| Search (Bible) | pull request, extension | `logos4:Search;kind=Bible`; the extension `kind=BibleSearch` | No, a text query |
| Passage navigation | pull request | `logosref:Bible.Jn6.35` | Yes, a reference, in no book or guide; tested on Windows |
| Open a resource | pull request, extension | `logosres:<id>;ref=bible.<ref>`; the extension `logos4:Open?resource={id}` | Yes (`logosres:` with a `ref=`, the form `resourceLink` builds); `logos4:Open?resource=` takes a resource, not a place |
| Open a verse | extension | a ref.ly deep link, form not printed | Yes, "John 3:16", optionally with a Bible |
| Reading plans | extension | the plan's Logos URI, not printed | No, the day's assignment |
| Layouts | extension | the layout's stored Logos URI, not printed | No |
| Tools launcher: Atlas, Text Comparison, Study Assistant, Sermon Builder, Copy Bible Verses, Advanced Timeline, Systematic Theologies, Psalms Explorer | extension (`logos4:`, `logos4-command://`, ref.ly; forms not printed) | not printed | No, the extension takes none |
| Morphology Charts (not named by either source; docs/research/logos-morph-charts.md) | none | no source for a link | No source; unconfirmed |

Two things the sweep shows. The Exegetical Guide and the Passage Guide are the two Guides that take a verse, and the Passage Guide's is the only form a stranger's test has covered, so it is the sure fallback if the Exegetical Guide's title is wrong.
And nothing in either source takes a verse for Factbook, Bible Word Study or a tool: those stay lemma- and name-shaped doors, and this is the only new verse-shaped one.

## HOW TO CHECK IT, for the Governor

On the phone or the Laptop that has the Logos app signed in to his library:

1. Open this link (paste it in a message to yourself or the browser's address bar): `https://ref.ly/logos4/Guide?t=Exegetical%20Guide&ref=Bible.Ro8.31`
2. Choose to open it in Logos if it asks.
3. Right looks like: Logos opens a guide panel for **Romans 8:31** headed **Exegetical Guide**, with sections on the Greek text (such as the word list, textual variants and grammar) filled from your books.
4. Half right: a guide opens but is blank, says it cannot load, or is the wrong guide. Then the link form works and the guide's name is wrong; say "opens, blank" on mw-rfjjzd.19, and try
   `https://ref.ly/logos4/Guide?t=Passage%20Guide&ref=Bible.Ro8.31` (the tested name) and then `https://ref.ly/logos4/Guide?t=My%20Exegetical%20Guide&ref=Bible.Ro8.31`; say which opened.
5. Wrong: nothing opens, or the tab you already had stays on screen. Then guides cannot be opened from a link here and the door is not built; say "nothing" on mw-rfjjzd.19.

**UNVERIFIED** until he does this: that the Logos app opens a Guide from `logos4:`/ref.ly at all on his devices (the pull request tested the Passage Guide on Windows and macOS, never on Android or iOS, which is his phone);
that the Exegetical Guide's template name in a link is `Exegetical Guide` (a guess by analogy with the Passage Guide's; the extension's default is `My Exegetical Guide`); that `Bible.Ro8.31` and `Bible.2Jn1.1` are the right references
(the form is from the Passage Guide's test; `2Jn` is `bibleRef`'s existing code and was not tested in a guide); and that it works for an Old Testament place. The sources are one pull request on GitHub, one Raycast store page, and Logos Support's
page as a search excerpt; none is Logos's own statement of a link.
