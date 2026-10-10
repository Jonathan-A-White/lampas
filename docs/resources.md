# Study resources

Settings > Study resources lists every resource registered in `src/resources/`, each with an on/off switch, all off to start
with. A word's sheet has a **Study** row with the links of every resource that is on, and no row when none is. Only links are
built: no lexicon text is bundled in Lampas and none is fetched, so the licences of BDAG and the others never come into it.
The switches and the names he types are kept in the settings store (`resource.<id>` is `on` or `off`,
`resourceOption.<id>` the typed text; `src/data/repositories/resources.ts`) and survive a close. They are not in the
settings registry (`src/settings/registry.ts`), so the Bible talk cannot change them.

## The three that ship

| id | Switch | Adds to the Study row | Source of the URL form |
| --- | --- | --- | --- |
| `strongs` | Strong's | the word's number, such as `G4903`, a link to `https://www.stepbible.org/?q=strong=G0…` | STEPBible's own search address; STEPBible is the lexicon source Lampas already credits (ATTRIBUTION.md) and its data are CC BY 4.0 |
| `logos` | Logos | `Open in Logos: <lexicon>` per ticked lexicon: `logosres:<Resource ID>;<key>` (the key each lexicon takes: "Logos: the key each lexicon is filed under" below); and `Bible Word Study in Logos`: `logos4:Guide;t=Bible%20Word%20Study;lemma=lbs%2Fel%2F<lemma>` | `logosres:` form: Logos forum post pairing `logosres:becnt65ac;ref=Bible.Ac6.3;off=114` with `https://ref.ly/logosres/becnt65ac?ref=Bible.Ac6.3&off=114` (the `Bible.Ac6.3` reference form is from it); `logos4:` is Logos' older scheme, which its release notes say still works. `hw=` is **UNVERIFIED** (below); the Guide's `lbs%2Fel%2F<lemma>` form is Logos' own, see "Bible Word Study's lemma" below |
| `accordance` | Accordance | `Open in Accordance`: `accord://search/<module>?<lemma>` | Accordance's help topic "Using Links for Common Tasks": `accord://search/[module];[field]?[query]` |

STEPBible was chosen over Blue Letter Bible because Lampas already takes its lexicon from STEPBible, so the number and the
entry agree. The number is written with four digits (`G25` becomes `G0025`), as STEPBible writes it. With Strong's on, the word sheet's plain
`Strong's` fact is hidden so the number shows once, as the link.

STEP keys a word by TBESG's extended Strong's number, so the bare number is not always enough: `G2424` (Jesus) lists 0 verses on STEP,
`G2424G` lists 886. `src/resources/stepExtended.ts` holds `STEP_LETTER` (105 numbers that need a letter) and `STEP_NO_VERSES` (53 numbers
STEP lists no verses for under any letter; these link to Blue Letter Bible's lexicon entry, `blueletterbible.org/lexicon/g1228/kjv/tr/0-1/`; G6029, G6856 and G6897,
TBESG-only numbers past Strong's list, get no link). Both were found by asking STEP once per number; `npm run check:step` (not in the gate,
it uses the network) repeats the ask for G1722, G3361, G2424 and the 20 most frequent lemmas of Romans 8, `-- G25 G2962` for numbers you name,
`-- --all` for every number the text uses (about 2 minutes). STEP's REST search answers a browser User-Agent only. Run it after `data:build`
brings in a new number.

Accordance asks for a text field in Settings: the module as Accordance names it (`BDAG`; empty means BDAG). The lemma is
percent-encoded UTF-8, in NFC.

## Logos: his lexicons, the scheme and the fallback

With Logos on, Settings shows his Logos lexicons as a searchable, scrolling ticked list (`src/ui/SearchableList.tsx`: a search field, the ticked ones first, a box about five rows high that scrolls on its own; BDAG ticked until he changes it; the ticked ids are a JSON
array in `resourceOption.logos`). The list is data: `LEXICONS` in `src/resources/logos.ts`, in the order Logos' Bible Word Study
shows them; adding a lexicon is one line there. Each ticked one gives `Open in Logos: <name>` on the word sheet, and one
`Bible Word Study in Logos` link (for the lemma alone, no verse) always comes with Logos.

**The scheme first, https only as the fallback.** A link's `href` is the app's own scheme (`logosres:`, `logos4:`); on a phone
with Logos the tap hands it to the app. A phone with no app for the scheme does nothing on its own, so the tap also starts a
timer (`src/resources/openApp.ts`): if the page is still in front 1.5 s later (not hidden, blurred or left), the link's https
`ref.ly` address is opened instead. Each Logos link carries it (`data-fallback`). Accordance has no web page for its lexicons, so
its link has no fallback: the word sheet then opens a small sheet over itself, "<App> isn't on this phone", with `Get <App>` (the
store page of `src/resources/appStore.ts`: the Play Store, or the App Store on an iPhone or iPad) and `Turn off <App>` (the resource goes off in Settings at once). Any new resource of kind
`'app'` gets this sheet for a link with no `fallback`.

**Store ids (mw-5r3p30.108).** `STORE_IDS` in `src/resources/appStore.ts` holds the id an app has in each store, keyed by the name the Study
row gives it; an app with an id opens its own page, an app without one keeps a search for its name. Accordance is Accordance Mobile, by OakTree
Software, free on Google Play as `com.accordancebible.accordance` (`https://play.google.com/store/apps/details?id=com.accordancebible.accordance`;
named on `https://www.accordancebible.com/Accordance-For-Android`) and, on the App Store, "Accordance Bible Software", id `411970514`
(`itms-apps://apps.apple.com/app/id411970514`; confirmed on `https://apps.apple.com/us/app/accordance-bible-software/id411970514`, developer
OakTree Software, 2026-10-09). The earlier note that Accordance might have no Android app was wrong. Logos has no id here yet (it keeps the
search): add one line to `STORE_IDS` when it is confirmed.

**No check at the switch (mw-5r3p30.116, PROVISIONAL, Governor to confirm; it replaces mw-5r3p30.68's check).** A web page cannot list the apps on a
phone (`getInstalledRelatedApps` sees only apps that declare the site), and the only other way, opening the app and seeing whether the page goes away,
opened Logos on an empty Bible Word Study page and flipped a missing Accordance Off with no way to get it. So turning an app On in Settings opens nothing,
checks nothing, and the switch stays On. While it is On, its row (a resource of kind `'app'`) says "Don't have <App>?" with a **Get <App>** link
(`storeUrl(app)` in `src/resources/appStore.ts`: Accordance's own Play page by id on Android, the App Store page on an iPhone, a store search for an app
with no id). An Off row shows nothing more than its name, its one-line help and the switch (mw-5r3p30.106). Strong's (kind `'number'`) has no Get link.
The word sheet's Study row lists only the resources that are On; a Study link whose app does not open still shows the "isn't on this phone" sheet with
Get <App> and Turn off <App> (`armFallback`). `features/app-on-phone.feature` holds the rules; Settings never says "Looking for" or "found".

**The Study row's grid.** The links are equal tiles, two to a row, under the app's name for a resource of kind `'app'`. A link's `label`
is its accessible name ('Open in Logos: BDAG'); its optional `tile` is the short text on the tile ('BDAG', 'Bible Word Study'; a Logos lexicon's
is its `short` in `LEXICONS`). A tile names its book in words (mw-5r3p30.135): it may take two lines, never one cut short, so no two tiles are alike and no title is shortened to its first word.

**Resource ids.** The `resource` of each lexicon is the **Resource ID** Logos prints on the product's page (the "resourceId" in the page's data; the
Information pane of a resource in Logos shows the same), such as `LLS:46.10.26` for EDNT. The earlier short names (`bdag`, `ednt`, `dblgreek` ...) were guesses
and EDNT's opened nothing (the Governor, 2026-10-08, mw-5r3p30.64). Logos' own Links Guide builds book links on the full Resource ID
(`app.logos.com/books/LLS%3A1.0.710`); here the link is `logosres:LLS:46.10.26;hw=<lemma>` and its https fallback encodes the colon the same way,
`https://ref.ly/logosres/LLS%3A46.10.26?hw=<lemma>`. Found 2026-10-08 on `https://www.logos.com/product/<n>` (a product page is readable with a browser User-Agent; the Logos wiki and forum answer 403):

| lexicon (`id`) | product | Resource ID |
| --- | --- | --- |
| BDAG (`bdag`) | 3878 | `LLS:46.30.18` |
| Louw-Nida (`louwnida`) | 199 | `LLS:46.30.4` |
| Lexham Theological Wordbook (`lexhamtheolwordbk`) | 45638 | `LLS:LXTHEOWRDBK` |
| DBL Greek (`dbl`) | 693 | `LLS:46.30.9` |
| EDNT (`ednt`) | 5791 | `LLS:46.10.26` |
| NASB Dictionaries (`nasbdict`; product "New American Standard Exhaustive Concordance, Updated Edition: Hebrew-Aramaic and Greek Dictionaries") | 25731 | `LLS:46.10.12` |
| LEH LXX (`leh`; "A Greek-English Lexicon of the Septuagint, Revised Edition") | 1797 | `LLS:46.30.22` |
| An Intermediate Greek-English Lexicon (`intermediategel`; "(LSJI)") | 108 | `LLS:46.30.1` |
| LXGRCANLEX (`lxgrcanlex`) | 4580 | `LLS:LXGRCANLEX` |
| New Strong's (`newstrongs`) | 1212 | `LLS:46.10.6` |
| TDNTA (`tdnta`) | 390 | `LLS:46.10.1` |
| Building Your NT Greek Vocabulary (`vocab3`) | 2671 | `LLS:NTGRKVOCAB` |
| LXGNTLEX (`lxgntlex`; matched to "Lexham Research Lexicon of the Greek New Testament") | 197493 | `LLS:FBGNTLEX` |
| LXLXXLEX (`lxlxxlex`; matched to "Lexham Research Lexicon of the Septuagint") | 197497 | `LLS:FBLXXLEX` |
| A Greek and English Lexicon to the NT (`gelnt`) | 29722 | `LLS:GRKENGLXCNNTBLMSFIELD` |
| Cremer (`biblicotheolexicon`) | 15703 | `LLS:LEXNTGRKCREMER` |
| Lexham Analytical Lexicon of the Septuagint (`lexhamanalyticallxx`; the Swete edition) | 27295 | `LLS:LXGRKOTANLEX` |
| Abbott-Smith (`manualgreeklex`) | 31160 | `LLS:MNLGRKLXABBOTSMITH` |
| A Pocket Lexicon to the Greek NT (`pocketlex`) | 41596 | `LLS:PCKTLXCNGRKNWTS` |
| A Concise Dictionary ... (`concisedict`; "The New Strong's Concise Dictionary of the Words in the Greek Testament and The Hebrew Bible") | 10514 | `LLS:STRNGDICHEBGRK` |
| Thayer (`gelntthayer`) | 5682 | `LLS:THAYERGELEXNT` |

Two rows are a match by title, not by the abbreviation Logos shows: `lxgntlex` and `lxlxxlex` (the abbreviations are not on the product pages). If either opens the
wrong book, check the Information pane of that book in Logos. The id is confirmed by the product page; that the Logos app takes a full `LLS:` id in a `logosres:` link
(rather than only a short file name) is the Governor's check on his phone, see below.

**The key each lexicon is filed under (mw-5r3p30.131).** A lexicon is opened by the key it indexes, not by the Greek lemma for all. `LEXICONS` in `logos.ts` gives each a `key`
(default `lemma`); a tile is left out when Lampas has no such key for the word, never a guess. Sources: Logos' Personal Book Builder tutorial (https://www.logos.com/media/pbb/tutorial.html,
read 2026-10-09) names the reference data types `Bible`, `Topic` and `GreekStrongs` (`GreekStrongs:g3056`); the Logos Community wiki "Hyperlinks" and "About Personal Books" pages (403 to a
script; read through a search engine's excerpts, 2026-10-09) give `logosref:GreekStrongs.104` for a Greek Strong's number, `logosref:Hebrew.<lemma>` for a Hebrew headword, `[[Lemma:lbs/el/δοῦλος]]`
and the resource forms `https://ref.ly/logosres/dblgreek?hw=ἄνθρωπος` (headword) and `https://ref.ly/logosres/dblgreek?ref=DBLGreek.DBLG+476` (a resource's own index data type).

| key | `logos.ts` builds | lexicons | source of the key |
| --- | --- | --- | --- |
| Greek lemma | `logosres:<id>;hw=<lemma>` (https `ref.ly/logosres/<id>?hw=<lemma>`) | BDAG, Louw-Nida, DBL Greek, EDNT, LXGRCANLEX, TDNTA, Vocab 3, LXGNTLEX, LXLXXLEX, Cremer, Lexham LXX, Abbott-Smith, Pocket Lexicon, Thayer | the `hw=` headword form of the DBL Greek example above; each is a Greek-headword lexicon by its product page. **`hw=` itself and TDNTA, Louw-Nida (also keyed by Domain number) and Vocab 3 are UNVERIFIED on a device** |
| Greek lemma, common words only (`commonLemma`, mw-5r3p30.134) | `logosres:<id>;hw=<lemma>` as above, and **no tile when the lemma opens with a capital** (a proper name: Ἀβραάμ, Μελχισεδέκ, Παῦλος) | LEH LXX, Intermediate (LSJI), Greek-English NT (Bloomfield) | The Governor (2026-10-09, mw-5r3p30.134): these three opened a stale page, "Navigation failed", for Μελχισεδέκ (Hebrews 7:1, G3198). Cause: they have no entry for a biblical name, so the lookup finds nothing. Evidence, read 2026-10-09: **Bloomfield** (Internet Archive full text `greekenglishlexi00bloo`, the preface): "excluding all proper names"; its headwords are the usual accented lemmas (Ἱερεύς). **LEH**: a published review of the Lust-Eynikel-Hauspie revised edition (jbtc.org/v03/Lust-etal1998rev.html, as quoted by a search engine) says proper nouns are not included, except transliterated Hebrew common nouns. **Intermediate** (Internet Archive `intermediategree00lidd`, the OCR text): a Liddell-Scott abridgement of classical Greek; it has Ἀθῆναι, Ἀθήνη and Ἰουδαῖος, and no Μελχισεδέκ or Ἀβραάμ; its headwords are the usual lemmas (λόγος, ὁ) with the accents and breathings of the printed book. A common word keeps `hw=<lemma>` as before. A proper name is told by its capital initial, so a classical name the Intermediate does have (Κόρινθος, Αἴγυπτος) and a gentilic LEH may have (Ἰουδαῖος) also lose the tile: only a missing tile, never a wrong one. **UNVERIFIED on a device**: that `hw=` opens these three at a common word (λόγος) and that each lacks the name in Logos' own copy (the printed prefaces and the OCR are the evidence, not the Logos edition); that Logos' headwords carry the same accents as the printed book. LXGRCANLEX files the name as Μελχισεδέκ and opened it right (the Governor's list), so Logos matches a headword loosely on accent; the same is assumed here and not shown |
| Strong's number | `logosres:<id>;ref=GreekStrongs.11` or `ref=HebrewStrongs.539` (https `?ref=…`): the letter of the word's number picks Greek or Hebrew, the digits lose their padding | NASB Dictionaries, New Strong's, Concise Dictionary | the data type names `GreekStrongs` (PBB tutorial, wiki) and `HebrewStrongs`, in the `?ref=<DataType>.<key>` form of the DBL example. Greek and Hebrew numbers overlap (a bare `11` or `539` lands in the wrong language: NASB opened Hebrew 539 אָמַן for Ἀβραάμ), so the data type is always named. These three are filed by Strong's number per their product pages (the Concise Dictionary's title names both testaments). **The `logosres:` + `ref=GreekStrongs.n` pairing and `HebrewStrongs` are UNVERIFIED on a device**; no word has no number, and with no readable number there is no tile |
| English topic | `logosres:LLS:LXTHEOWRDBK;hw=<Topic>`, the topic capitalised (https `?hw=<Topic>`) | Lexham Theological Wordbook | it is headed by English topics (Condemnation), not Greek words, so the Greek lemma finds nothing (the Governor's screenshot, 2026-10-09: "Navigation failed" at Hebrew עָנָן). Lampas has no topic list: the word sheet offers the lexicon's gloss (`src/resources/topic.ts`) when it is a plain noun-like phrase (`condemnation`, not `to preach` or `implanted/ingrafted`), and without a topic there is no tile. **UNVERIFIED on a device**: that the wordbook takes `hw=` at all, and that a gloss is its topic (`condemnation` for κατάκριμα should land on Condemnation; a gloss that is not a topic will not). The tutor's chips (`wordChips`) carry no topic, so Lexham gives none there |

A Hebrew word is not yet shown in Lampas; the Hebrew form is built and tested for when it is.

**Not verified on a device (no phone with Logos or Accordance was available).** Unverified: that `logosres:<Resource ID>;hw=<lemma>`
opens that lexicon at the headword (the `hw` part, and the other keys in the table above), that `logos4:Guide;t=Bible%20Word%20Study;lemma=lbs%2Fel%2F...` opens the Bible
Word Study guide, that the Logos Android app claims `logosres:` and `logos4:` at all, and that the
Accordance `accord://search/<module>?<lemma>` form finds a word in a lexicon module. The https fallback is kept for all of them. If a link does not open the
entry, the fix is in that resource's file.

## Old Testament chapters in Logos (mw-5r3p30.71)

Lampas holds no Old Testament text, so the Reader's chapter picker (`src/ChapterPicker.tsx`) lists the 39 Old Testament books in canon order before
Matthew, each marked `Opens in Logos ↗` (`OT_BOOKS`, `src/data/otBooks.ts`: our three-letter code, the name, the book's Logos abbreviation and its chapter count). Picking
a book shows its chapters; each is a link that opens that chapter in his Logos library, in the **Bible in Logos** (Settings > Bible in Logos, the registry setting
`logosBible`, `LLS:LGCYSTNDRDBBLSB`, the Legacy Standard Bible, until he changes it; a short list of common Bibles, `COMMON_BIBLES` in `src/resources/logosBible.ts`,
or a typed Resource ID of the form `LLS:...`). The link is built by `chapterLink(book, chapter, resourceId)` in the same two forms as the lexicon links:

| | form | example (Genesis 1, the default) |
| --- | --- | --- |
| scheme, first | `logosres:<bible>;ref=Bible.<book><chapter>` | `logosres:lgcystndrdbblsb;ref=Bible.Ge1` |
| https, fallback | `https://ref.ly/logosres/<bible>?ref=Bible.<book><chapter>` | `https://ref.ly/logosres/lgcystndrdbblsb?ref=Bible.Ge1` |

`<bible>` is the Resource ID without `LLS:`, in lower case (the form the story gave: `lgcystndrdbblsb`). The scheme is the link's `href`; `openApp.ts armFallback` opens the
https address only when the page is still in front 1.5 s after the tap. Picking an Old Testament chapter opens no Lampas chapter and changes neither the address nor the
open chapter. With Logos off in Settings > Study resources the books still show; picking one says "Logos is off" and `Turn on Logos` switches it on in one tap (no app check, as
the link's own fallback covers a phone with no Logos).

**Book abbreviations** (the `ref=Bible.<book><chapter>` part; `Bible.Ac6.3` is the form in the Logos forum post above). Each abbreviation is one on Logos' own list of Bible book
abbreviations (https://www.logos.com/bible-book-abbreviations, read 2026-10-08, which lists the spellings Logos accepts for each book), taking the two- or three-letter form where the list has one (also the form of the Logos COM API list,
https://community.logos.com/kb/articles/846, which answers 403 to a script): Ge, Ex, Le, Nu, De, Jos, Jdg, Ru, 1Sa, 2Sa, 1Ki, 2Ki, 1Ch, 2Ch, Ezr, Ne, Es, Job, Ps, Pr, Ec, So, Isa, Jer, La, Eze, Da, Ho, Joel, Am, Ob, Jon, Mic, Na, Hab, Zep, Hag, Zec, Mal.
`tests/unit/logos-bible.test.ts` holds the table and checks Genesis 1, Psalms 23 and Malachi 4. Joel is written `Joel`, as Logos lists it first (`Jl` is the other form); Judges is `Jdg`
(`Jud` is Jude).

**Not verified on a device.** Unverified: that the Logos app opens a Bible at a chapter from `logosres:<bible>;ref=Bible.Ge1` (the form is the story's, and the forum post's
`logosres:becnt65ac;ref=Bible.Ac6.3` has the same shape), that a Resource ID with digits such as `LLS:1.0.710` (ESV) becomes `1.0.710` in the scheme and not a short name such as
`esv` (the Resource IDs of the short list were read from the library listing, vault `plans/lampas-logos-library-2026-10-08.csv`; the LSB id is the Governor's own), and that every
abbreviation above is read by the Logos app's link handler as it is by its list. If a Bible does not open, its entry in `COMMON_BIBLES`, or the typed ID, is the thing to change.

## Bible Word Study's lemma

Logos names a Greek lemma `lbs/el/<lemma>` (Hebrew `lbs/he/…`, English `lbs/en/…`), and in a link its slashes must be escaped as `%2F`
(a literal slash is silently rejected). With a bare `lemma=Ἰησοῦς` the Logos app opened Bible Word Study with a search `lemma.ιησουσ`
and empty Definition, Hebrew words and Greek words (the Governor's phone, 2026-10-08), so the link now names `lbs%2Fel%2F<lemma>`, the lemma
in NFC and percent-encoded. Source: the pull request "Fix UI navigation: use documented L4 link syntax for logos4:/logosref: URLs"
(https://github.com/robrawks/LogosBibleSoftwareMCP/pull/8), whose form was rewritten to match what Logos emits via Copy location and checked
in the Windows app: `logos4:Guide;t=Bible%20Word%20Study;lemma=lbs%2Fen%2Flove`. The `lbs/el/λόγος` Greek form is also Logos' search syntax
(`<Lemma = lbs/el/λόγος>`). The accents and the capital stay (`Ἰησοῦς`, `νόμος`, `ἐν`, in NFC).
The link has **no `;ref=`** (mw-5r3p30.67): the PR's working forms carry none, and the earlier `;ref=Bible.Ro8.1` was ours, never in a source; with the lemma named,
the guide needs no verse and the link names no one book or Bible. The Strong's number is not in the link (no source for a Strong's form in a Guide link was found).
Examples: Ἰησοῦς (G2424) `lemma=lbs%2Fel%2F%E1%BC%B8%CE%B7%CF%83%CE%BF%E1%BF%A6%CF%82`; νόμος (G3551) `lemma=lbs%2Fel%2F%CE%BD%CF%8C%CE%BC%CE%BF%CF%82`; ἐν (G1722) `lemma=lbs%2Fel%2F%E1%BC%90%CE%BD`.
**Still UNVERIFIED on a device** after the 2026-10-08 22:56Z screenshot (the lbs form landed 17:50 local, an hour before it; whether his phone had the new build is unknown).

## How to add a resource

1. Add `src/resources/<name>.ts` exporting a `StudyResource` (`src/resources/types.ts`): an `id` (kept in the store, so never
   changed), a `name` (the switch's label), a `kind`, one line `describe`, an optional `option` (a text field: label, default,
   hint) and `linksFor(word, option)`, which returns `[{ label, url, fallback? }]` for a `StudyWord` `{ form, lemma, strongs, ref? }`; a resource with a list to tick gives `choices` instead of `option`.
2. Add it to `RESOURCES` in `src/resources/index.ts`. Settings and the word sheet draw from that list and need no change.
3. URLs are `https:` or the app's own scheme, with the lemma passed through `encodeURIComponent`; never put lexicon text in one. A scheme link may carry an https `fallback`.
4. Add its row to the table above and to the unit test's expected ids (`tests/unit/resources.test.ts`).

## The tutor's links (mw-5r3p30.75, PROVISIONAL, Governor to confirm)

A Bible talk answer may carry `links` (grinds/bible-talk.answer.schema.json): at most three, each a word (`{kind: 'word', lemma}`, the dictionary form) or a verse
(`{kind: 'verse', reference}`, such as `Romans 8:31`); the grind's instructions say when to add one, most of all in quiz mode and in the map. The app keeps them
with the turn (`links`, no table change) and draws them under the answer (`src/TutorLinks.tsx`) as a group of chips for each link, chosen **when the answer is
drawn**, so a resource he switches on later shows on an old answer:

| link | chips (`src/resources/tutorLinks.ts`) |
| --- | --- |
| word | the **first** link of each resource that is on, named for the lemma: Strong's `G26 for ἀγάπη`; Logos his first ticked lexicon, `Open in Logos: BDAG for ἀγάπη` (`logosres:LLS:46.30.18;hw=<lemma>`, its https fallback as on the word sheet); Accordance `Open in Accordance for ἀγάπη`. The Strong's number is the lexicon's (`src/data/lexicon.ts`), never the tutor's; a lemma the lexicon lacks gets no Strong's chip |
| verse | `Open Romans 8:31 in Lampas` (the Reader on the verse, the Talk sheet closes first; a Back step) and, with Logos on, `Open Romans 8:31 in Logos` in his Bible in Logos (`logosres:<bible>;ref=Bible.Ro8.31`, `verseLink` in `logosBible.ts`: the chapter link's form with the New Testament abbreviations of Logos' own list, UNVERIFIED on a device) |

A link to a resource that is off is not drawn and nothing says so; a link with no chip leaves no group, and an answer with no chip at all draws no list. A verse
the canon does not hold (an unknown book, a chapter or verse out of range) is dropped.
**An Old Testament verse** (`Isaiah 53:5`, `Genesis 15:6`; mw-5r3p30.99) is a verse link like any other: `placeOf` in `tutorLinks.ts` reads the reference against the one canon
list (`data/books.ts` and `data/otBooks.ts`, `parseCanonReference` in `nav/links.ts`), and the chips are those of the resources that are on and can show a Bible, in the Bible
he chose in Settings (`Open Genesis 15:6 in Logos`, `logosres:<bible>;ref=Bible.Ge15.6`), never a fixed one. There is no `in Lampas` chip, because Lampas holds no Old
Testament text: `TutorPlace.reader` is the one flag, and an Old Testament reader later only turns it on. A chapter's last verse is not checked for the Old Testament (no counts). Accordance gives no verse chip: its field names a lexicon module, not a Bible.
More than three links in an answer: the app keeps the first three (the schema's limit is for the mill). A resource that can show a Bible gives `versesFor(place, bible)`;
one that cannot has none.

**What the tutor is told, and what a link in the text may be** (mw-5r3p30.123, PROVISIONAL, Governor to confirm). The bible-talk request carries `resources`
(`resourcesForTutor` in `tutorLinks.ts`): the study resources that are On in Settings, each `{id, name, words, verses}` (an empty list when none is; absent only in
a talk from About). The instructions say to link only what those can open, only when it truly helps the question, never as decoration, and only through `links`: a
web address the model writes is never trusted. In the text of an answer, `src/markdown/Markdown.tsx` draws a link only to a host in `src/resources/hosts.ts`
`RESOURCE_HOSTS` (the hosts the resources build links on; tests/unit/tutor-resources.test.ts holds the list against the builders) or at a credit's own address (About's talk
hands the tutor those, `src/tutor/credits.ts`), and shows any other address as text.

**A Bible reference named in the text** (`Hebrews 7:2`, `Heb 7:1-3`, `Romans 8:28`, `Romans 8`, `Ps. 110`; `src/markdown/verseLinks.ts`, mw-5r3p30.133) is a link, in the
form Lampas takes in (`#/?ref=Heb%207%3A1-3`, the reference as written). A tap opens a card under it (`src/markdown/ReferenceCard.tsx`, as the Logos verse pop-up does):
the reference as its heading (`Hebrews 7:1-3`; a whole chapter shows and is headed by its first verse, `Romans 8:1`; a range ends at the chapter's last verse at most),
the verse's English from the chapter file (the Majority Standard Bible, named on the card) and **Open**, which closes the Talk sheet if it is the one showing and opens
the Verse view on the first verse as a new Back step (`nav/route.ts` `openVerseAt`). A tap outside the card, Close, Escape or Back (the card is a `useSheetBack` sheet)
closes it and nothing moves; it stands below the words tapped, or above them when there is no room, and its text scrolls when it is longer than the room. A book of the
Old Testament has a card too, headed `Psalm 110`, saying `Not in Lampas yet`, with no Open; its jumping-off chips stay under the answer. The book and numbers are
read by `nav/links.ts` and `resources/tutorLinks.ts` `placeOf` (no second parser). A name needs a capital letter (`a 7:2 ratio` is not a reference), and one that names no
book or a chapter or verse the book lacks is plain text. The instructions of both talk grinds say to answer a question about another passage there and then
and to name its verse this way, never to send him to ask elsewhere.
