# Research: Logos's Morphology Charts at a paradigm or a form

Story mw-rfjjzd.20 (design: docs/design/library-at-scale.md section 10 lead 4). Written 2026-10-22. Research only: no app code changed.
Read from his library listing (vault `plans/lampas-logos-library-2026-10-08.csv`), from Logos's own product page (fetched 2026-10-22), from `curl` against
ref.ly on 2026-10-22, and from search-engine excerpts of the Logos forum and blog (the forum answers 403 to a script, as docs/resources.md says).
**Nothing here was opened in Logos: the Laptop has none. Every link below is UNVERIFIED on a device until the Governor taps the one link in HOW TO CHECK IT.**

## What I found

* **No source documents a link parameter for Morphology Charts, or for any Logos interactive.** Searched: the Logos product page, the Logos forum tips for the chart
  and for the Greek Alphabet Tutor, Logos's blog, and the forms `logosres:INTERACTIVE`, `INTERACTIVE:MORPH-CHARTS`, "interactive" with ref.ly. Nothing names a way to open an
  interactive from a link at all, let alone at a lemma. The design's "likely not" stands as *not documented*, which is not the same as *does not work*.
* **What the tool takes is a Greek lemma, typed into a box.** Logos's product page (https://www.logos.com/product/45605/morphology-charts , fetched 2026-10-22):
  "Enter the lemma, and the Morphology Chart populates an interactive chart that shows all the forms that lemma takes on in the New Testament."
  The page says nothing of a reference or of how the tool is opened, and says "This product is not currently available to purchase" (it comes with Logos 6 Silver and higher,
  and is in his library as `INTERACTIVE:MORPH-CHARTS`, type `lbx.interactive`).
* **It is reached from the menu in the app, not by an address.** Search excerpts of the forum tips: the Greek Alphabet Tutor is opened by "Tools --> Interactive Media --> Greek
  Alphabet Tutor" (https://community.logos.com/discussion/114026/tip-of-the-day-greek-alphabet-tutor), and a Logos blog post (https://www.logos.com/grow/?p=55157) puts Morphology Charts
  in the same Interactive Media group; you "right click any term in your Bible, copy the lemma … and insert that lemma" (search excerpt of https://community.logos.com/forums/t/123791.aspx ,
  https://community.logos.com/forums/t/193906.aspx ). The tool covers verbs (participles too), nouns and adjectives, and pronouns and articles in Greek; it needs a tagged text such as the SBLGNT.
* **The id itself is well formed as a resource id.** His listing has `INTERACTIVE:MORPH-CHARTS` as a ResourceId like any other, and ref.ly passes `logosres:` plus any id on unchanged. Measured 2026-10-22:

  ```
  curl -I 'https://ref.ly/logosres/INTERACTIVE%3AMORPH-CHARTS'
    301 -> https://app.logos.com/refly?uri=logosres%3AINTERACTIVE%3AMORPH-CHARTS
  curl -I 'https://ref.ly/logosres/INTERACTIVE%3AMORPH-CHARTS?lemma=%E1%BC%80%CE%B3%CE%B1%CF%80%CE%AC%CF%89'
    301 -> https://app.logos.com/refly?uri=logosres%3AINTERACTIVE%3AMORPH-CHARTS%3Blemma%3D%24E1%24BC%2480%24CE%24B3%24CE%24B1%24CF%2480%24CE%24AC%24CF%2489
  ```

  ref.ly would pass `hw=` the same way. That shows the link is accepted as an address; it cannot show whether the app opens an interactive from it, or fills the box (the target page wants a Faithlife sign-in).
* **So the best link is a guess by analogy.** Two parameter names exist for a Greek lemma elsewhere in Logos links Lampas already builds: `hw=<lemma>` for a lexicon (src/resources/logos.ts) and `lemma=` for the
  Bible Word Study guide (`logos4:Guide;t=Bible%20Word%20Study;lemma=lbs%2Fel%2F<lemma>`). Neither is sourced for an interactive. `lemma=` is chosen because it is the name the tool's own input has (its box is "lemma") and the Guide's.

## The built links

Built the way `resourceLink(id, query)` in src/resources/logosRes.ts builds one (scheme first, ref.ly as the fallback, the colon of the id `%3A` in the https path, the lemma NFC and `encodeURIComponent`ed as logos.ts does):

| Lemma | scheme | https |
| --- | --- | --- |
| ἀγαπάω | `logosres:INTERACTIVE:MORPH-CHARTS;lemma=%E1%BC%80%CE%B3%CE%B1%CF%80%CE%AC%CF%89` | `https://ref.ly/logosres/INTERACTIVE%3AMORPH-CHARTS?lemma=%E1%BC%80%CE%B3%CE%B1%CF%80%CE%AC%CF%89` |
| ποιέω | `logosres:INTERACTIVE:MORPH-CHARTS;lemma=%CF%80%CE%BF%CE%B9%CE%AD%CF%89` | `https://ref.ly/logosres/INTERACTIVE%3AMORPH-CHARTS?lemma=%CF%80%CE%BF%CE%B9%CE%AD%CF%89` |
| πληρόω | `logosres:INTERACTIVE:MORPH-CHARTS;lemma=%CF%80%CE%BB%CE%B7%CF%81%CF%8C%CF%89` | `https://ref.ly/logosres/INTERACTIVE%3AMORPH-CHARTS?lemma=%CF%80%CE%BB%CE%B7%CF%81%CF%8C%CF%89` |
| (no lemma: the chart's start) | `logosres:INTERACTIVE:MORPH-CHARTS` | `https://ref.ly/logosres/INTERACTIVE%3AMORPH-CHARTS` |

The first three are the Contract verbs table's three verbs (docs/paradigms.md `contract-verbs`: ἀγαπάω, ποιέω, πληρόω); the fourth is the fallback if a lemma does nothing. There is
no link at a *paradigm* or a *form* (a cell): the chart takes a lemma and draws every form itself, so the most a link can do is name the verb. A form-level link has nothing to carry.

If the lemma link opens the chart empty, the parameter name is wrong or ignored: try `hw=` before giving up. If the start link opens nothing, interactives cannot be opened by address and the door is dead.

## Where the door would sit

On the Paradigms table screen (`ParadigmTable`, src/ParadigmsScreen.tsx), in the row under the table beside **Drill this table** and **Ask the tutor**: a third button, **Morphology Chart in Logos**,
shown only when Logos is his study resource and `INTERACTIVE:MORPH-CHARTS` is in his library. Its target:

* a table that opened from a word's sheet (the address carries `l=<lemma>`, docs/paradigms.md 'This word'): the chart for that lemma;
* otherwise, the table's model verb: ἀγαπάω for Contract verbs, λύω for the verb tables, δίδωμι for Verbs in -μι, εἰμί for εἰμί; none for the article, the pronouns and the nouns
  that the chart does not take as one lemma (the chart takes a noun or adjective lemma, so λόγος would work too, but a table of five noun kinds has no one lemma).

A door on the word sheet's `Paradigm` row would put it a tap earlier, but the word sheet is already full (docs/layout/words.md, the height proofs in tests/e2e/reader.spec.ts), so the table screen is the place.
Design section 4 lists the chart as *drop now*: this is a door on one screen, not a catalogue entry; nothing in the catalogue changes.

## Sweep: every Logos interactive his listing names

His listing has 36 rows of type `lbx.interactive`. The only parameter any source gives is the listing's own `ReferenceSupersets` (what Bible range the interactive is indexed to); no source documents a link
parameter for any of them. **A "None documented" row is not a "does not take one".**

| Interactive | Resource ID | Takes a parameter? |
| --- | --- | --- |
| An Empty Tomb | `INTERACTIVE:EMPTY-TOMB` | None documented |
| Ancient Inscriptions | `INTERACTIVE:ANCIENT-INSCRIPTIONS` | None documented |
| Before and After: Biblical Sites | `INTERACTIVE:BEFORE-AND-AFTER` | None documented |
| Bible Books Explorer | `INTERACTIVE:BIBLE-BOOKS` | None documented |
| Bible Outline Browser | `INTERACTIVE:BIBLE-OUTLINE-BROWSER` | None documented |
| Bible People Visual Timelines | `INTERACTIVE:LIFE-OF-TIMELINES` | None documented |
| Biblical Event Navigator | `INTERACTIVE:BIBLICAL-EVENT-NAVIGATOR` | None documented |
| Canon Comparison | `INTERACTIVE:CANON-COMPARISON` | None documented |
| Commandments of the Law | `INTERACTIVE:OT-COMMANDMENTS` | None documented |
| Counting the Ten Commandments | `INTERACTIVE:TEN-COMMANDMENTS` | None documented |
| Days of Creation | `INTERACTIVE:DAYS-OF-CREATION` | None documented |
| Exploring Biblical Manuscripts | `INTERACTIVE:BIBLICAL-MANUSCRIPTS` | None documented |
| Greek Alphabet Tutor | `INTERACTIVE:GREEK-ALPHABET-TUTOR` | A letter, chosen in the app; no link parameter documented |
| Hebrew Alphabet Tutor | `INTERACTIVE:HEBREW-ALPHABET-TUTOR` | None documented |
| Hebrew Bible Manuscript Explorer | `INTERACTIVE:HEBREW-MANUSCRIPT-EXPLORER` | None documented |
| Interactive Infographics from the Faithlife Study Bible | `INTERACTIVE:FSB-INFOGRAPHICS` | None documented |
| Interlinear Explorer | `INTERACTIVE:WHAT-IS-AN-INTERLINEAR` | None documented |
| Israelite Feasts and Sacrifices | `INTERACTIVE:FEASTS-AND-SACRIFICES` | None documented |
| Listen & Learn: Greek | `INTERACTIVE:LISTEN-AND-LEARN-GREEK` | None documented |
| Miracles of the Bible | `INTERACTIVE:MIRACLES` | None documented |
| Morphology Charts | `INTERACTIVE:MORPH-CHARTS` | A Greek lemma, typed in its box in the app; no link parameter documented (this doc) |
| Names of God | `INTERACTIVE:NAMES-OF-GOD` | None documented |
| Narrative Character Maps | `INTERACTIVE:NARRATIVE-CHARACTER-MAPS` | None documented |
| New Testament Manuscript Explorer | `INTERACTIVE:NTMANUSCRIPTEXPLORER` | None documented |
| New Testament Use of the Old Testament | `INTERACTIVE:NTUSEOFOT` | None documented |
| Numeric Converter | `INTERACTIVE:NUMERIC-CONVERTER` | None documented |
| Parallel Gospel Reader | `INTERACTIVE:PARALLEL-GOSPEL-READER` | A Bible reference: the listing gives it `bible.61-64`; form `ref=Bible.<book><chapter>` is by analogy (UNVERIFIED) |
| Proverbs Explorer | `INTERACTIVE:PROVERBS-BROWSER` | None documented |
| Psalms Explorer | `INTERACTIVE:PSALMS-BROWSER` | A Bible reference: the listing gives it `bible.19`; form `ref=Bible.<book><chapter>` is by analogy (UNVERIFIED) |
| Reverse Interlinear Explorer | `INTERACTIVE:WHAT-IS-A-REVERSE-INTERLINEAR` | None documented |
| Speaking to God | `INTERACTIVE:SPEAKING-TO-GOD` | None documented |
| Synopsis of Samuel, Kings, and Chronicles | `INTERACTIVE:SYNOPSIS-OT-BOOKS` | None documented |
| Systematic Theologies | `INTERACTIVE:SYSTEMATIC-THEOLOGIES` | None documented |
| Text Converter | `INTERACTIVE:TEXT-CONVERTER` | None documented |
| Weights & Measures Converter | `INTERACTIVE:WEIGHTS-AND-MEASURES-CONVERTER` | None documented |
| Who Killed Goliath? | `INTERACTIVE:WHO-KILLED-GOLIATH` | None documented |

Only two of the 36 carry a Bible range (Parallel Gospel Reader `bible.61-64`, Psalms Explorer `bible.19`), so only those two could plausibly take a `ref=Bible.…`; the rest have nothing a link could name from the listing.
The three the design names for the Greek reader (Greek Alphabet Tutor, Listen & Learn: Greek, Morphology Charts) are all "None documented" for a link; Lampas has its own letter drill and Paradigms.

## HOW TO CHECK IT, for the Governor

On the phone that has the Logos app signed in to his library:

1. Open this link on the phone (paste it in a message to yourself, or the browser's address bar):
   `https://ref.ly/logosres/INTERACTIVE%3AMORPH-CHARTS?lemma=%E1%BC%80%CE%B3%CE%B1%CF%80%CE%AC%CF%89`
2. Choose to open it in Logos if the phone asks.
3. Right looks like: Logos opens **Morphology Charts** with **ἀγαπάω** already in the lemma box and the chart of its forms showing.
4. Half right: Morphology Charts opens with an empty box. Then interactives open from a link but this parameter is ignored; say "opens, empty" on mw-rfjjzd.20.
5. Wrong: nothing opens, or the tab you already had stays on screen. Then interactives cannot be opened from a link and the door is not built; say "nothing" on mw-rfjjzd.20.

**UNVERIFIED** until he does this: that the Logos app opens an interactive from `logosres:`/ref.ly at all, that `lemma=` is a parameter it reads, and that the NFC percent-encoded lemma is the form the box takes.
The only sources for the tool's input are Logos's product page and search excerpts of its forum and blog, not the pages.
