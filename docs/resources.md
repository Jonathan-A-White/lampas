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

Since mw-rfjjzd.5 Settings lists no lexicon: with Logos on, the row under it says `Your Logos library · N books on` and opens `#/library` (`LibraryControl`, `src/settings/controls/resources.tsx`), and the lexicons are chosen on Library > Lexicons (BDAG On
until he changes it; the shelf's rows, `src/data/repositories/library.ts`; `resourceOption.logos` is the old key it took). The list is data: `LEXICONS` in `src/resources/logos.ts`, a view over the catalogue's lexicons (see 'The catalogue' below), in the order Logos' Bible Word Study
shows them; adding a lexicon is one entry in `data/logos/catalogue-rules.json` and `npm run logos:catalogue`. Each ticked one gives `Open in Logos: <name>` on the word sheet, and one
`Bible Word Study in Logos` link (for the lemma alone, no verse) always comes with Logos.

**An English word's dictionary (mw-5r3p30.707).** A tap on an English word is looked up in his English dictionary, Webster's 1828 (*An American Dictionary of the English Language*, Noah Webster; the Book Info in Logos prints `LLS:AMDICTENLANG`),
so a reader at Just English, who has no Greek word sheet, is still helped with the word. `ENGLISH_DICTIONARY` in `src/resources/logos.ts` is the one constant (no setting yet: a choice comes when a second dictionary is known to open); `englishDictionaryLink(word)`
builds `logosres:AMDICTENLANG;hw=<word>` with the fallback `https://ref.ly/logosres/AMDICTENLANG?hw=<word>` (resourceLink), and `englishHeadwords(text)` is the word as tapped: lowercased, the marks around it dropped, no stemming (Logos finds the nearest headword).
An English chunk is often more than one word (`we love`): the sheet then has a link for each word (`Look it up in Logos: love`), since a tap names the chunk and not the word. At Just English the small sheet (`src/EnglishWordSheet.tsx`, a dialog named `English word`) holds the word, Listen and the link;
with Logos off it says `Turn on Logos to look words up` with `Turn on Logos` (one tap, as the chapter picker's Logos off prompt). At the Greek steps the Greek word sheet of a tapped English word (not of a Greek word) ends with the same row, `Look it up in Logos (English)`, drawn only while Logos is on.
**UNVERIFIED on a device** (his phone is the check): that the Logos app takes `logosres:` with the id `AMDICTENLANG` written without `LLS:` (the form the story gave; the lexicons above keep `LLS:`, the Bibles drop it and lower-case it), that it takes `hw=` for this dictionary, and the ref.ly `?hw=` fallback. If it opens nothing, try `LLS:AMDICTENLANG`, then `amdictenlang`.
The open-source dictionary a reader without Logos could use is held (a separate ticket).

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
is its `short` in `LEXICONS`). With more than `LEXICON_FOLD` (3) lexicons On the Logos group draws only the pinned ones, Bible Word Study and a door, `All N lexicons ›` (N counts the lexicons with an entry for the word), to `src/library/AllLexiconsSheet.tsx`: a search, every lexicon On as a row that opens the word's entry (pinned first), and Manage (the Lexicons page; `holdWord` brings the word sheet back on Back); `logosStudy` in `src/resources/logos.ts` builds it, and the tutor's word chip names the first pinned lexicon (`pinnedFirst`, `StudyResources.pinnedLexicons` from `getStudyResources`; mw-rfjjzd.8). A tile names its book in words (mw-5r3p30.135): it may take two lines, never one cut short, so no two tiles are alike and no title is shortened to its first word.

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
| Lexham Analytical Lexicon to the Greek New Testament (`lxgrcanlex`; product title confirmed 2026-10-15) | 4580 | `LLS:LXGRCANLEX` |
| New Strong's (`newstrongs`) | 1212 | `LLS:46.10.6` |
| TDNTA (`tdnta`) | 390 | `LLS:46.10.1` |
| Building Your NT Greek Vocabulary (`vocab3`) | 2671 | `LLS:NTGRKVOCAB` |
| Lexham Research Lexicon of the Greek New Testament (`lxgntlex`; product title confirmed 2026-10-15) | 197493 | `LLS:FBGNTLEX` |
| Lexham Research Lexicon of the Septuagint (`lxlxxlex`; product title confirmed 2026-10-15) | 197497 | `LLS:FBLXXLEX` |
| A Greek and English Lexicon to the NT (`gelnt`) | 29722 | `LLS:GRKENGLXCNNTBLMSFIELD` |
| Cremer (`biblicotheolexicon`) | 15703 | `LLS:LEXNTGRKCREMER` |
| Lexham Analytical Lexicon of the Septuagint (`lexhamanalyticallxx`; the Swete edition) | 27295 | `LLS:LXGRKOTANLEX` |
| Abbott-Smith (`manualgreeklex`) | 31160 | `LLS:MNLGRKLXABBOTSMITH` |
| A Pocket Lexicon to the Greek NT (`pocketlex`) | 41596 | `LLS:PCKTLXCNGRKNWTS` |
| A Concise Dictionary ... (`concisedict`; "The New Strong's Concise Dictionary of the Words in the Greek Testament and The Hebrew Bible") | 10514 | `LLS:STRNGDICHEBGRK` |
| Thayer (`gelntthayer`) | 5682 | `LLS:THAYERGELEXNT` |

Each Resource ID above is the `resourceId` printed in its own product page (read 2026-10-15 for 4580, 197493 and 197497, whose names were raw codes on the tile until mw-5r3p30.148; the page's title is the lexicon's `name` here). The three codes `LXGRCANLEX`, `FBGNTLEX` and `FBLXXLEX` are never shown. If any opens the
wrong book, check the Information pane of that book in Logos. The id is confirmed by the product page; that the Logos app takes a full `LLS:` id in a `logosres:` link
(rather than only a short file name) is the Governor's check on his phone, see below.

**The key each lexicon is filed under (mw-5r3p30.131).** A lexicon is opened by the key it indexes, not by the Greek lemma for all. `LEXICONS` in `logos.ts` gives each a `key`
(default `lemma`); a tile is left out when Lampas has no such key for the word, never a guess. Sources: Logos' Personal Book Builder tutorial (https://www.logos.com/media/pbb/tutorial.html,
read 2026-10-09) names the reference data types `Bible`, `Topic` and `GreekStrongs` (`GreekStrongs:g3056`); the Logos Community wiki "Hyperlinks" and "About Personal Books" pages (403 to a
script; read through a search engine's excerpts, 2026-10-09) give `logosref:GreekStrongs.104` for a Greek Strong's number, `logosref:Hebrew.<lemma>` for a Hebrew headword, `[[Lemma:lbs/el/δοῦλος]]`
and the resource forms `https://ref.ly/logosres/dblgreek?hw=ἄνθρωπος` (headword) and `https://ref.ly/logosres/dblgreek?ref=DBLGreek.DBLG+476` (a resource's own index data type).

| key | `logos.ts` builds | lexicons | source of the key |
| --- | --- | --- | --- |
| Greek lemma | `logosres:<id>;hw=<lemma>` (https `ref.ly/logosres/<id>?hw=<lemma>`) | BDAG, Louw-Nida, DBL Greek, EDNT, Lexham Analytical Lexicon of the GNT, TDNTA, Vocab 3, Lexham Research Lexicon of the GNT and of the LXX, Cremer, Lexham LXX, Abbott-Smith, Pocket Lexicon, Thayer | the `hw=` headword form of the DBL Greek example above; each is a Greek-headword lexicon by its product page. **`hw=` itself and TDNTA, Louw-Nida (also keyed by Domain number) and Vocab 3 are UNVERIFIED on a device** |
| Greek lemma, common words only (`commonLemma`, mw-5r3p30.134) | `logosres:<id>;hw=<lemma>` as above, and **no tile when the lemma opens with a capital** (a proper name: Ἀβραάμ, Μελχισεδέκ, Παῦλος) | LEH LXX, Intermediate (LSJI), Greek-English NT (Bloomfield) | The Governor (2026-10-09, mw-5r3p30.134): these three opened a stale page, "Navigation failed", for Μελχισεδέκ (Hebrews 7:1, G3198). Cause: they have no entry for a biblical name, so the lookup finds nothing. Evidence, read 2026-10-09: **Bloomfield** (Internet Archive full text `greekenglishlexi00bloo`, the preface): "excluding all proper names"; its headwords are the usual accented lemmas (Ἱερεύς). **LEH**: a published review of the Lust-Eynikel-Hauspie revised edition (jbtc.org/v03/Lust-etal1998rev.html, as quoted by a search engine) says proper nouns are not included, except transliterated Hebrew common nouns. **Intermediate** (Internet Archive `intermediategree00lidd`, the OCR text): a Liddell-Scott abridgement of classical Greek; it has Ἀθῆναι, Ἀθήνη and Ἰουδαῖος, and no Μελχισεδέκ or Ἀβραάμ; its headwords are the usual lemmas (λόγος, ὁ) with the accents and breathings of the printed book. A common word keeps `hw=<lemma>` as before. A proper name is told by its capital initial, so a classical name the Intermediate does have (Κόρινθος, Αἴγυπτος) and a gentilic LEH may have (Ἰουδαῖος) also lose the tile: only a missing tile, never a wrong one. **UNVERIFIED on a device**: that `hw=` opens these three at a common word (λόγος) and that each lacks the name in Logos' own copy (the printed prefaces and the OCR are the evidence, not the Logos edition); that Logos' headwords carry the same accents as the printed book. LXGRCANLEX files the name as Μελχισεδέκ and opened it right (the Governor's list), so Logos matches a headword loosely on accent; the same is assumed here and not shown |
| Strong's number | `logosres:<id>;ref=GreekStrongs.11` or `ref=HebrewStrongs.539` (https `?ref=…`): the letter of the word's number picks Greek or Hebrew, the digits lose their padding | NASB Dictionaries, New Strong's, Concise Dictionary | the data type names `GreekStrongs` (PBB tutorial, wiki) and `HebrewStrongs`, in the `?ref=<DataType>.<key>` form of the DBL example. Greek and Hebrew numbers overlap (a bare `11` or `539` lands in the wrong language: NASB opened Hebrew 539 אָמַן for Ἀβραάμ), so the data type is always named. These three are filed by Strong's number per their product pages (the Concise Dictionary's title names both testaments). **The `logosres:` + `ref=GreekStrongs.n` pairing and `HebrewStrongs` are UNVERIFIED on a device**; no word has no number, and with no readable number there is no tile |
| English topic | `logosres:LLS:LXTHEOWRDBK;hw=<Topic>`, the topic capitalised (https `?hw=<Topic>`) | Lexham Theological Wordbook | it is headed by English topics (Condemnation), not Greek words, so the Greek lemma finds nothing (the Governor's screenshot, 2026-10-09: "Navigation failed" at Hebrew עָנָן). Lampas has no topic list: the word sheet offers the lexicon's gloss (`src/resources/topic.ts`) when it is a plain noun-like phrase (`condemnation`, not `to preach` or `implanted/ingrafted`), and without a topic there is no tile. **UNVERIFIED on a device**: that the wordbook takes `hw=` at all, and that a gloss is its topic (`condemnation` for κατάκριμα should land on Condemnation; a gloss that is not a topic will not). The tutor's chips (`wordChips`) carry no topic, so Lexham gives none there |

A Hebrew word is not yet shown in Lampas; the Hebrew form is built and tested for when it is.

**Not verified on a device (no phone with Logos or Accordance was available).** Unverified: that `logosres:<Resource ID>;hw=<lemma>`
opens that lexicon at the headword (the `hw` part, and the other keys in the table above), that `logos4:Guide;t=Bible%20Word%20Study;lemma=lbs%2Fel%2F...` opens the Bible
Word Study guide, that the Logos Android app claims `logosres:` and `logos4:` at all, and that the
Accordance `accord://search/<module>?<lemma>` form finds a word in a lexicon module. The https fallback is kept for all of them. If a link does not open the
entry, the fix is in that resource's file.

## Grammar books in Logos: Read more on an idea sheet (mw-5r3p30.381, PROVISIONAL, Governor to confirm)

With Logos on, Library > Grammars (Settings > Study resources > Logos > Your Logos library; since mw-rfjjzd.5 Settings has no Grammar books list) shows a control for each book of `GRAMMAR_BOOKS` in
`src/resources/grammarBooks.ts`, Black ticked until he changes it (the ticked ids are a JSON array in the settings store's `grammarBooks`,
`src/data/repositories/resources.ts` getGrammarBooks / setGrammarBooks; not in the settings registry, like the lexicons). An idea sheet
(`src/IdeaSheet.tsx` ReadMore) whose idea a ticked book teaches shows **Read more**, after the tables: one line a book (its `short` name over one
link per section that teaches the idea, such as `Lesson 4: Nouns of the Second Declension`), at most three books in view and the rest under
`More books (N)`; since mw-rfjjzd.16 the Pinned books come first, then the On ones (`shelvedBooks` reads the shelf's grammar rows, `readMoreFor`'s `pinned`), and a grammar the catalogue gives no sections table is no book. Logos off, no ticked book, or no section for the idea: no Read more. A book is a reference inside the learning, never a grammar
approach: the sheet is the same whichever approach's lesson opened it (the Lampas ladder, or the record of BMA Tutor's order, tests/support/fixture-path.ts).

A link is `logosres:<Resource ID>;ref=<reference>`, its https fallback `https://ref.ly/logosres/<Resource ID, colon encoded>?ref=<reference>` with the `_` of the reference written `+`, armed by `openApp.ts` as the lexicon links are.

| book (`id`) | Resource ID | reference | source of the sections |
| --- | --- | --- | --- |
| Learn to Read New Testament Greek, David Alan Black (`black`) | `LLS:LRNTOREADNTGRK` (his library list, vault `plans/lampas-logos-library-2026-10-08.csv`, and the product page https://www.logos.com/product/5196, `resourceId`, read 2026-10-17) | `Page.p_<page>`, the printed page a section starts on (`Page.p_26` in the scheme, `Page.p+26` in the https address) | the table of contents of the third edition (B&H, 2009, 258 pages) as Google Books lists it with pages (https://books.google.com/books/about/Learn_to_Read_New_Testament_Greek.html?id=41j7siCRS0QC, read 2026-10-17). Google prints the titles without commas; the lesson numbers are the order of the pages (Lessons 1-6 match the 1994 course list at https://saybro.com/aoal/Greek/ntgreekb/contents.html). Google lists twenty lessons to page 142 and then the appendix The Greek Accents (p. 216): the lessons between (pages 142-216) are not mapped |

**The page form (mw-5r3p30.618).** The Governor (2026-10-18): a tap on Black's Lesson 4 opened Logos at his open tab (Ps 19:13), not at the book. The resource ID was right; the reference was not. The first form, `logosres:LLS:LRNTOREADNTGRK;ref=Page.p+26`, used the `+` that means a space only in a web query string; in the `logosres:` scheme a space in a reference is written `_`, so the app read a plus it did not know and stayed where it was. The form now is `logosres:LLS:LRNTOREADNTGRK;ref=Page.p_26`; the https fallback keeps `?ref=Page.p+26`. Evidence, read 2026-10-18:

- ref.ly itself (curl): `https://ref.ly/logosres/LLS%3ALRNTOREADNTGRK?ref=Page.p+26` answers 301 to `https://app.logos.com/refly?uri=logosres%3ALLS%3ALRNTOREADNTGRK%3Bref%3DPage.p_26`; `?ref=Page.p26` is passed through unchanged, and `?ref=Page.p_26` is sent on as `Page.p%245F26` (a `_` typed in the query is escaped, so the https address must keep `+`). The resource ID reaches the book: the page for it is titled "Learn to Read New Testament Greek - Logos Bible Study".
- Logos Community forum, through a search engine's excerpts (the pages answer 403 to a script): the scheme form `logosres:jbl103;ref=Page.p_256` and `logosres:mtpserms17;ref=Page.pp_678-679;off=3177` (a range; `Page.p_` is Logos' own page milestone, `pp_` for several pages), and the web form `https://ref.ly/logosres/meetthepuritans?ref=Page.p+249`, which a commenter said worked. Logos' advice there: copy the location from the resource panel menu (Copy location as: URL) and adjust the `ref=`.

**UNVERIFIED on a device:** that `ref=Page.p_26` opens the Logos edition at printed page 26 in the Android app (the sources show the form, none tests it on this book; the cause above is inferred from ref.ly's own rewrite and the forum forms, not seen in the app); that the page numbers are the Logos edition's print pages (it is the 2009 print edition, but its Page milestones were not read); and that the Android app claims `logosres:` at all for a book (a lexicon `hw=` link does open there, the Governor's list). If this form still opens his tab, the fix is to make the tap use the ref.ly https link, which lands at the book (the 301 above). The library list gives the book its own reference type `ltrntg.1-187`, whose numbers are not known here, so it is not used. Which ideas each lesson teaches is read from the lesson's title, not from the book's pages (Lesson 1 maps the alphabet, the pairs of vowels and the breathings; Lesson 4 the noun, its cases, the masculine and neuter, number, stem and ending and the article). If a link opens the wrong place, the fix is that book's entry.

The other `ref=` links Lampas builds (swept in mw-5r3p30.618) name no space, so they are not this fault: the Bible links (`Bible.Ro8.31`, `src/resources/logosBible.ts`, `src/data/otBooks.ts`) and the Strong's links (`GreekStrongs.11`, `src/resources/logos.ts`) are a data type, a dot and a key. Their forms stay UNVERIFIED on a device as written elsewhere in this file.

**Adding a book** is one `ids` entry of the catalogue rules (`data/logos/catalogue-rules.json`, then `npm run logos:catalogue`; `GRAMMAR_BOOKS` is a view over the grammars that have a `sections` table) and nothing else: an `id` (kept in the store, never changed), `short`, `name`, the `resource` Logos lists, the `source`, and its `sections` `{title, ref, ideas}` (ladder ids; `tests/unit/grammar-books.test.ts` fails on an id the ladder lacks). For BDF, say:

```json
{"resource": "LLS:BDF", "kind": "grammar", "id": "bdf", "short": "BDF", "title": "A Greek Grammar of the New Testament (BDF)", "source": "…",
 "sections": [{"title": "§ 5. The aorist", "ref": "Page.p_5", "ideas": ["tense-aorist"]}]}
```

Add its row to the table above with its source.

## Old Testament chapters in Logos (mw-5r3p30.71)

Lampas holds no Old Testament text, so the Reader's chapter picker (`src/ChapterPicker.tsx`) lists the 39 Old Testament books in canon order before
Matthew, each marked `Opens in Logos ↗` (`OT_BOOKS`, `src/data/otBooks.ts`: our three-letter code, the name, the book's Logos abbreviation and its chapter count). Picking
a book shows its chapters; a tap on one opens no app (mw-5r3p30.496): a panel under the grid (`[data-ot-choice]`, `src/resources/oldTestamentChoices.ts`, kept in view at the foot of the box) offers one row for each study resource that is on, **Read in Logos** (the chapter's link, below) and **Listen in Audible** (`audibleListen`, the link made again at the tap, with the line `In Audible: Chapters > Judges 3` and the credit; Audio Bible off: no row), so a Word of Promise chapter of the Old Testament is a tap away. Read in Logos opens that chapter in his Logos library, in the **Bible in Logos** (Settings > Bible in Logos, the registry setting
`logosBible`, `LLS:LGCYSTNDRDBBLSB`, the Legacy Standard Bible, until he changes it; a short list of common Bibles, `COMMON_BIBLES` in `src/resources/logosBible.ts`,
or a typed Resource ID of the form `LLS:...`). The link is built by `chapterLink(book, chapter, resourceId)` in the same two forms as the lexicon links:

| | form | example (Genesis 1, the default) |
| --- | --- | --- |
| scheme, first | `logosres:<bible>;ref=Bible.<book><chapter>` | `logosres:lgcystndrdbblsb;ref=Bible.Ge1` |
| https, fallback | `https://ref.ly/logosres/<bible>?ref=Bible.<book><chapter>` | `https://ref.ly/logosres/lgcystndrdbblsb?ref=Bible.Ge1` |

`<bible>` is the Resource ID without `LLS:`, in lower case (the form the story gave: `lgcystndrdbblsb`). The scheme is the link's `href`; `openApp.ts armFallback` opens the
https address only when the page is still in front 1.5 s after the tap. Picking an Old Testament chapter opens no Lampas chapter and changes neither the address nor the
open chapter. With Logos off in Settings > Study resources the books still show; picking one says "Logos is off" and `Turn on Logos` switches it on in one tap (no app check, as
the link's own fallback covers a phone with no Logos). With Logos off and the Audio Bible on the grid shows and the panel has the Audible row only, under the same prompt; with both off the prompt adds one line naming Audio Bible in Settings and no grid is shown.

**Book abbreviations** (the `ref=Bible.<book><chapter>` part; `Bible.Ac6.3` is the form in the Logos forum post above). Each abbreviation is one on Logos' own list of Bible book
abbreviations (https://www.logos.com/bible-book-abbreviations, read 2026-10-08, which lists the spellings Logos accepts for each book), taking the two- or three-letter form where the list has one (also the form of the Logos COM API list,
https://community.logos.com/kb/articles/846, which answers 403 to a script): Ge, Ex, Le, Nu, De, Jos, Jdg, Ru, 1Sa, 2Sa, 1Ki, 2Ki, 1Ch, 2Ch, Ezr, Ne, Es, Job, Ps, Pr, Ec, So, Isa, Jer, La, Eze, Da, Ho, Joel, Am, Ob, Jon, Mic, Na, Hab, Zep, Hag, Zec, Mal.
`tests/unit/logos-bible.test.ts` holds the table and checks Genesis 1, Psalms 23 and Malachi 4. Joel is written `Joel`, as Logos lists it first (`Jl` is the other form); Judges is `Jdg`
(`Jud` is Jude).

**Not verified on a device.** Unverified: that the Logos app opens a Bible at a chapter from `logosres:<bible>;ref=Bible.Ge1` (the form is the story's, and the forum post's
`logosres:becnt65ac;ref=Bible.Ac6.3` has the same shape), that a Resource ID with digits such as `LLS:1.0.710` (ESV) becomes `1.0.710` in the scheme and not a short name such as
`esv` (the Resource IDs of the short list were read from the library listing, vault `plans/lampas-logos-library-2026-10-08.csv`; the LSB id is the Governor's own), and that every
abbreviation above is read by the Logos app's link handler as it is by its list. If a Bible does not open, its entry in `COMMON_BIBLES`, or the typed ID, is the thing to change.

## Devotionals: a Logos devotional at a date (mw-1fwagb.2, PROVISIONAL, Governor to confirm)

The Governor: "The Daily Devotional would open up to that logos resource for the current day". `devotionalLink(resourceId, date)` in `src/resources/logosDevotional.ts`
builds the link in the same two forms as the lexicon links, the Resource ID raw in the scheme and URI-encoded in the https path (no UI uses it yet):

| | form | example (`iv-tdg`, Oct 19) |
| --- | --- | --- |
| scheme, first | `logosres:<id>;ref=DayOfYear.<Mon>_<D>` | `logosres:iv-tdg;ref=DayOfYear.Oct_19` |
| https, fallback | `https://ref.ly/logosres/<id>?ref=DayOfYear.<Mon>+<D>` | `https://ref.ly/logosres/iv-tdg?ref=DayOfYear.Oct+19` |

`<Mon>` is the three-letter English month (Jan ... Dec) and `<D>` the day with no leading zero, both of the local date: Logos has no "today" keyword for a devotional, so Lampas
computes the date. The space of Logos' `DayOfYear.Nov 3` is `_` in the scheme and `+` in the https address, as for the page form above. Which devotional he owns is still being asked, so the id is a parameter.

**Not verified on a device.** Unverified: that the Logos app opens a calendar devotional at a day from `logosres:<id>;ref=DayOfYear.Oct_19` (the data type `DayOfYear` and the
`https://ref.ly/logosres/iv-tdg?ref=DayOfYear.Nov+3` form are the Mayor's, from mw-6ww.126), and that the https fallback is turned into the scheme form as the page link's is. This stays UNVERIFIED until the Governor taps one on his phone.

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

## Works he holds in Logos (mw-5r3p30.675, PROVISIONAL, Governor to confirm)

Lampas cannot read which books are in his Logos library, so **Library > Commentaries** (Settings > Study resources > Works in your Logos library until mw-rfjjzd.5, which took the list out of Settings) lists the works the tutor may link, each volume a control named by
its full title with its author (`WORKS` in `src/resources/works.ts`; all off; the ticked ids are a JSON array in the store key `works`, `getWorks` / `setWorks`). The tutor's request
carries the ticked ones as `works` (`{id, title, author, kind, covers?}`, `worksForTutor`; left out when none is ticked and in About) and its answer may carry `{kind: 'work', work: <id>, reference?}`
(`grinds/bible-talk.answer.schema.json`; the `work` enum is the ids of `WORKS`, held by `tests/unit/works.test.ts`). `src/TutorLinks.tsx` draws one **Open in Logos** chip named for the title
(`workChip`); a link to a work he did not tick, an unknown id, or a commentary with no reference or for a book it does not cover is dropped, not shown.

- A `commentary` opens at the passage: `logosres:<volume id>;ref=Bible.Jn3.16` (a chapter alone is `Bible.Ro8`), fallback `https://ref.ly/logosres/<volume id, the colon %3A>?ref=Bible.Jn3.16`. Calvin's commentaries are
  a volume for each book or group of books in Logos, so a work has `volumes`, each with the books it covers (our book codes), and `workLink` picks the volume that covers the passage's book.
- A `book` opens at its start: `logosres:LLS:ICRWJKC`, fallback `https://ref.ly/logosres/LLS%3AICRWJKC`, **unless the work has an `index` and the answer's `place` is one the book has** (mw-5r3p30.708, below).
- Every link is built by `src/resources/logosRes.ts` (`resourceLink`, `resourceStart`), the one place the scheme and its ref.ly fallback are put together; lexicons (`logos.ts`), Bible chapters and verses
  (`logosBible.ts`), devotionals, grammar books and works all use it. The Bible Word Study guide (`logos4:Guide...`) is another scheme and keeps its own builder.

### A place inside a book (mw-5r3p30.708, PROVISIONAL, UNVERIFIED on a device)

The Governor (2026-10-21): the tutor linked a book and it "just opened the book, not what was relevant". Until then a `book` link was `resourceStart` whatever the answer said. The form now:
`logosres:LLS:ICRWJKC;ref=CICR.3.24` (book 3, chapter 24 of the Institutes; `CICR.3.21.5` adds the section), fallback `https://ref.ly/logosres/LLS%3AICRWJKC?ref=CICR.3.24`. A work that has
this is one with `index` in `WORKS` (its data type `CICR`, the chapters of each of the four books: 18, 17, 25, 20); the answer's `work` link gains `place` (`3.24`, `3.21.5`), the request's `works`
entry gains `places` (a sentence telling the tutor how to write it), and `workLink(work, place, spot)` / `indexPlace` turn a valid place into the link. A `place` the book does not have (book 5, chapter 26
of book 3, any other shape) opens the book at its start, as before. A commentary ignores `place` and keeps the Bible reference.

Why this form (the evidence, read 2026-10-21; nothing here was opened in Logos on the Laptop, which has no Logos, or on a phone):
- His library listing (vault `plans/lampas-logos-library-2026-10-08.csv`, `ReferenceSupersets`) gives both Institutes the reference type `cicr.1-4.20.32` (book, chapter, section: books 1 to 4, last chapter 20, last section 32 of book 4), the way
  it gives a commentary `bible.66.1-66.16.27`. A Logos reference is `<data type>.<parts>` after `ref=` (`Bible.Ro8.28`, `GreekStrongs.11`, `Page.p_26`, `DayOfYear.Oct_19`), so `CICR.3.24` is that book's own address.
- A Logos employee on the Logos forum (a search engine's excerpt of the thread on the Institutes, the page itself answers 403 to a script) says the Institutes have milestones `n.n.n` (`4.2.1`), book.chapter.section.
- ref.ly accepts the form and passes it on unchanged: `curl https://ref.ly/logosres/LLS%3AICRWJKC?ref=CICR.3.21.5` answers 301 to `https://app.logos.com/refly?uri=logosres%3ALLS%3AICRWJKC%3Bref%3DCICR.3.21.5` (the target page then wants a Faithlife
  sign-in, so a script cannot see whether it opens the section).

Forms tried or weighed and not used:
- `ref=Bible.Ro8.28` on the Institutes: ref.ly passes it through, but a book opens at a Bible reference only if it is indexed to the Bible (the listing gives a commentary `bible.…` and the Institutes only `cicr.…`), and the Logos forum says a book that is not
  versified does not sync to the Bible text. It would open the start or stay at his open tab (the fault of `Page.p+26` above), so it is not used.
- `ref=Page.p_<n>`: the form works for Black's lessons (above) but needs the printed page, which neither the tutor nor Lampas knows for the Institutes; a guessed page is worse than a chapter.
- `art=`, a headword (`hw=`) and a Logos search link (`logos4:Search;...`) found no source naming them for a book of this kind, so none is used. The fallback if `CICR` does not open (the Governor's check): make the book's tile open a search for the topic
  in the book (a Logos search link is built from the question, not from a place), and change `WORKS[].index` to say so.

**UNVERIFIED on a device:** that the Logos app opens `logosres:LLS:ICRWJKC;ref=CICR.3.24` at that chapter (the data type name `CICR`, its case, and that a chapter without a section is accepted). If it opens the start or his open tab, the Governor says so on the bead.
The tutor names the place from what it knows of the Institutes; Lampas checks only that book and chapter exist, not that the chapter treats the question.

Sources. Every Resource ID and the books each commentary volume covers were read from his library listing of 2026-10-08 (vault `plans/lampas-logos-library-2026-10-08.csv`: the `ResourceId` and
`ReferenceSupersets` columns; Logos' book numbers 61 Matthew to 87 Revelation). An id that is not in a source is left out, never guessed.

| id | Title | Resource IDs |
| --- | --- | --- |
| `calvin-commentaries` | Calvin's Commentaries | `LLS:CALCOM61HRMEV` (Matthew, Mark, Luke: the Harmony), `LLS:CALCOM64JN` (John), `LLS:CALCOM65AC` (Acts), `LLS:CALCOM66RO` (Romans), `LLS:CALCOM67CO1` (1 and 2 Corinthians), `LLS:CALCOM69GA` (Galatians, Ephesians), `LLS:CALCOM71PHP` (Philippians, Colossians, 1 and 2 Thessalonians), `LLS:CALCOM75TI` (1 and 2 Timothy, Titus, Philemon), `LLS:CALCOM79HEB` (Hebrews), `LLS:CALCOM81CATHEP` (James, 1 and 2 Peter, 1 John, Jude) |
| `calvin-institutes-lcc` | Institutes of the Christian Religion (Library of Christian Classics) | `LLS:ICRWJKC` |
| `calvin-institutes-beveridge` | Institutes of the Christian Religion (Beveridge) | `LLS:ICRBEV` |

Left out: the Old Testament volumes of the commentaries (`CALCOM01GE` ... `CALCOM28HO`; Lampas holds the New Testament), the collection `LLS:CALCOMMHAR` (its listed ranges are patches, not one book), and `LLS:42.110.15`
(a third Institutes whose edition the listing does not name). **UNVERIFIED on a device:** that `logosres:LLS:...` opens a resource with no `ref`, and that a commentary volume opens at `Bible.<book><ch>.<v>`; the form
is the one the lexicon and Black links use. Adding a work is one `works` entry and its volumes' `ids` entries in the catalogue rules (and its id in the answer schema's `work` enum), the test fails until both agree; update this table.

## Greek or English: the dial and the lists (mw-5r3p30.710, PROVISIONAL, Governor to confirm)

His ask (2026-10-21): at Just English the Greek grammars and Greek Logos resources are things he "shouldn't really have to think about". Every `StudyResource`, `Work` and `GrammarBook` has a required
`lang` (`ResourceLang`, `src/resources/types.ts`), so the type refuses an entry that does not say which it is:

| `lang` | meaning | today |
|---|---|---|
| `'grc'` | a Greek resource: a Greek grammar or lexicon, the Greek number | Strong's, Black's grammar |
| `'en'` | an English resource | Calvin's commentaries and both Institutes |
| `'both'` | an app that opens Greek and English; the dial treats it as English | Logos, Accordance |

The one selector is `resourcesForLevel(list, level)` (`src/resources/resourcesForLevel.ts`); no list filters or orders a resource on its own. **Just English (0):** only `en` and `both`, in their own order.
**Curious to Reading in Greek (1 to 4):** `en` and `both` first, then `grc`, each side in its own order. **All in (5):** the list unchanged. An unplaced phone reads 5. The Mayor's cheap choice, not his word:
the Governor may change the rule in that one file. A resource the dial hides keeps its switch or tick (nothing is deleted): the lists draw fewer entries, and the stored ids are written over the whole list.

Who goes through it: Settings > Study resources (the switches: `orderResourceRows` in `src/settings/rows.ts` for the order, the row's `dependsOn` in `registry.ts` for hiding; the library row in
`src/settings/controls/resources.tsx`; Settings lists no book, so the dial's hiding of Greek books is a matter for the Library pages), the word sheet's Study row (`studyGroups` in `src/WordSheet.tsx`), the idea sheet's Read more (`readMoreFor`'s
`level`), and the tutor (`resourcesForTutor`, `worksForTutor`, `wordChips`, `verseChips`, `workChip`, each given the level; `src/useTalk.ts` and `src/TutorLinks.tsx` pass it, and a Greek work the dial hides is not
offered to the tutor and its link is dropped). Not through it, because they ask for one named resource and Logos is `both`: the Today, chapter picker and reference card Logos links, the English dictionary row, the
tutor's Settings list (the tutor is told every setting, shown or not) and the tips' count of switches on. **When a Logos work is added to `WORKS`, say whether it is Greek or English in `lang`.**
Not yet marked: the lexicons ticked inside Logos (BDAG, Louw-Nida ...) are Greek but are choices of the one `both` app, so they show at every step.

## The catalogue (mw-rfjjzd.2, PROVISIONAL; docs/design/library-at-scale.md 3.1)

The catalogue is what Lampas knows how to open in a Logos library, and where: one typed table, shipped with the app and grown by the factory, held in `src/resources/catalogue/<kind>.json`, one
generated file for each of seven kinds (`lexicon`, `grammar`, `greek-text`, `interlinear`, `commentary`, `bible`, `devotional`) and read through `src/resources/catalogue.ts` (`CATALOGUE`,
`entriesOf(kind)`, `WORK_GROUPS`, and `CATALOGUE_VERSION`, the one stamp in every file: a hash of all the entries, so a library kept on a phone can be re-matched when it changes).
An entry (`CatalogueEntry`) is a Logos resource by its true Resource ID, a kind, a `title` and `short`, where Lampas opens it (`opens`: a word, a parsing, a verse, a chapter, a day, its start, or a place in
its own index), one line of `value` (what it adds beyond Logos alone: an entry with none is not in the catalogue), `covers` (a commentary volume's or interlinear's books, read from the export's
ReferenceSupersets; absent means the whole New Testament), a grammar's `sections`, `starts` (`on` or `pinned`; Off is never a default) and `via` (`id`, `type` or `series`: how it joined).

**The rules** are `data/logos/catalogue-rules.json`, the factory's file: `values` (the value line a kind falls back on), `works` (the groups of volumes the tutor links to as one work), `ids` (a Resource ID, its kind
and every field the export cannot give, so an id is written from the rules alone and comes out the same whichever export is read), `types` (every row of the export of a Logos type joins: reverse interlinears
and English Bibles that cover some of the New Testament, calendar devotionals) and `series` (every volume of a series that covers some of the New Testament joins with its `covers`: Baker Exegetical, New International
Greek Testament, Pillar, Lenski's). **`npm run logos:catalogue -- <export.csv>`** (`scripts/logos-catalogue.ts`; a data tool, not in the gate, like `data:build`) writes the seven files from the rules and the export
(Library > Save as Spreadsheet; the vault's `plans/lampas-logos-library-2026-10-08.csv` to start; `--out <dir>` writes elsewhere); it is deterministic and a second run changes nothing. It prints a note for
each thing the rules and the export disagree on (an id the export lacks, a volume whose covers differ). The export is CRLF with RFC 4180 quoting and raw tabs, unquoted, inside the last cell; its parser
(`parseCsv`, `readExport`) keeps a cell whole until the next unquoted comma. The committed files are written from **`tests/fixtures/logos-export-head.csv`**, the first 60 rows of his export (titles only), so
they hold the ids the rules name and nothing from the rest of his library; run the tool on a whole export and commit the result only when a type or series rule should add its volumes.
**`npm run logos:fit -- <export.csv>`** (`scripts/logos-fit.ts`) prints the rows of an export the rules do not take, by the kind each would be, with the Logos type and the data types of its
ReferenceSupersets (`ltrntg`, `bdf`: the names a section link could use, docs/research/logos-section-refs.md), and counts the rest by type: the Mayor's reading of a list a reader sent.

**Today's lists are views over it** and keep their shapes, so no screen changes: `LEXICONS` (`logos.ts`: the lexicons), `GRAMMAR_BOOKS` (`grammarBooks.ts`: the grammars with a `sections` table; one without it is in the catalogue
for the tutor only, as it would open at its start), `WORKS` (`works.ts`: the `works` groups and the commentary entries that name them in `work`, the Institutes among them with their `index`), `COMMON_BIBLES` and
`DEFAULT_LOGOS_BIBLE` (`logosBible.ts`: the Bibles named by id, and the one that `starts` pinned) and `DEVOTIONALS` (`src/data/daily/devotionals.ts`: the devotionals named by id). An entry an export adds by a type or
series rule is in the catalogue and in none of these until the shelf (S2) and the Library screen (S3) read it. `tests/unit/catalogue.test.ts` fails on a duplicate Resource ID, an entry with no value, a `covers` code that is
no book, a grammar section idea that is not on the ladder, a rules file that lacks an id of the five lists, a committed file that is not what the tool makes, and on any of the five lists no longer equal to what it was
(`tests/fixtures/old-resource-exports.json`). Not in the catalogue, by the design's test of value over volume: the pronunciation datasets, the interactives (Morphology Charts among them, a research lead), and a book that opens only at its start.

## Share his Logos list to Lampas (mw-rfjjzd.7, PROVISIONAL, UNVERIFIED on a device; docs/design/library-at-scale.md 5.1)

Besides **Choose your Logos list** on Import your library, the list Logos saved as a spreadsheet can be shared to Lampas from Files, Drive or an email (the path for a phone with no computer to hand): the manifest's `share_target`
accepts `text/csv` and `.csv` as well as `image/*`, the worker parks the file as it parks a picture (`src/share/target.ts` `receiveShare`) and redirects to `#/library?import=<id>`, and Import your library reads the parked file
as if he had chosen it (the share is dropped when he taps Turn on N books). A shared picture still opens the talk chooser. A file counts as a CSV by its type (`text/csv`, `text/comma-separated-values`) or by a `.csv` name,
so Windows' `application/vnd.ms-excel` label still lands in the import. **UNVERIFIED on a device until he shares one:** that Chrome on his phone lists Lampas in the share sheet for a `.csv` file from Files or Drive (the
`accept` is the design's; Android may offer Lampas by extension only, or not for a type it does not know), and what type the shared file arrives with. A phone that installed Lampas before this version may need it removed and
installed again from Chrome before Lampas is offered for a CSV (the share sheet reads the manifest at install). The tests POST a form to the built worker; they do not prove what Android's share sheet offers.

## How to add a resource

1. Add `src/resources/<name>.ts` exporting a `StudyResource` (`src/resources/types.ts`): an `id` (kept in the store, so never
   changed), a `lang` (`'grc'`, `'en'` or `'both'`; the dial's rule is above), a `name` (the switch's label), a `kind`, one line `describe`, an optional `option` (a text field: label, default,
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
the verses as the Reader draws them now (English from the chapter file, the Majority Standard Bible, named on the card; the Weave with his weave settings; or Greek, named
Robinson-Pierpont Greek: mw-5r3p30.697) and **Open**, which closes the Talk sheet if it is the one showing and opens the Reader on the chapter with the first verse brought to the top
as a new Back step (`nav/readerRequest.ts` `openAtVerse`; never the one-verse Verse view). A tap outside the card, Close, Escape or Back (the card is a `useSheetBack` sheet)
closes it and nothing moves (and stops what Play was reading); its foot has **Play** (mw-9q8wp1.4: it says the reference first, in English, then reads the passage aloud in the Reader's language, `speech/passagePlayer.ts`, turning into Pause or Resume and Stop; an Old Testament card's Play says `<reference>: skipping, no Old Testament present`) beside Open; it stands below the words tapped, or above them when there is no room, and its text scrolls when it is longer than the room. A book of the
Old Testament has a card too, headed `Psalm 110`, saying `Not in Lampas yet`, with no Open for the reader (mw-5r3p30.345): with Logos switched on it has `Open in Logos`, a link (`logosBible.ts` `verseLink`, the verse, a whole chapter at its first verse, in his Bible in Logos) and with Logos off the line `Not in Lampas yet. Link Logos in Settings to open it there.`, whose link opens `#/settings?section=resources` (Settings scrolled to Study resources); its jumping-off chips stay under the answer. The book and numbers are
read by `nav/links.ts` and `resources/tutorLinks.ts` `placeOf` (no second parser). A name needs a capital letter (`a 7:2 ratio` is not a reference), and one that names no
book or a chapter or verse the book lacks is plain text. The instructions of both talk grinds say to answer a question about another passage there and then
and to name its verse this way, never to send him to ask elsewhere.

## Audio Bible: Listen in Audible (mw-5r3p30.390, mw-5r3p30.451)

Settings > Study resources > Audio Bible is `Off` or `The Word of Promise (NKJV), in Audible` (the setting `audioBible`, `src/settings/definitions/audioBible.ts`;
the list of audio Bibles is `AUDIO_BIBLES` in `src/resources/audioBible.ts`, so a second one slots in later). With it on, the Verse view's Listen shows a
`Listen in Audible` link, the line `In Audible: Chapters > Luke 15` and the credit. No licence is needed.

**The link** is Audible's own smart link, made by `audibleLink` in [audible-kit](https://github.com/Jonathan-A-White/audible-kit) (pinned by commit in `package.json`):
`https://audible.smart.link/aexglzp2n?annotation_time_utc=<now ms>&asin=B003UC45I8&autoplay=true&content_delivery_type=MultiPartBook&device_id=device_id&marketplace_domain=.com&position_from_start=<ms>&site_id=1&source_code=Deep-link_Banner`.
It opens the Audible app and plays The Word of Promise from that position; a phone without the app is sent to the app's store page by Audible itself, so Lampas arms no
fallback page of its own for it. Audible wants `annotation_time_utc` to be the time of the tap, so `VerseView.tsx` makes the link again in the tap's `onClick`
(`audibleListen(bible, book, chapter, now)`). It was proved on the Governor's phone (Luke 14 at 4:07, mw-5r3p30.451), but it is Audible's own link shape, not a documented
API: if Audible changes it, `audible-kit` is the one place to change.

**The start times** are in `src/resources/audibleStarts.json`, keyed by Lampas's book code and chapter (`luk.15`), for all 1,189 chapters of the Bible (the Old Testament is
there for Psalm 23 and the rest, for when Lampas has the text). They are read from the live catalogue
`https://api.audible.com/1.0/content/B003UC45I8/metadata?response_groups=chapter_info` (no login; `start_offset_ms`, chapters nested) once, by `npm run audible:build`
(`scripts/audible-build.ts`, network, not in the gate; a second run changes nothing unless Audible changed its catalogue). The script reads the catalogue with audible-kit's
`fetchChapterStarts`, maps Audible's titles with `wordOfPromiseChapters`, and fails if any chapter has no start or if `audibleChapterLabel` is not a title Audible really has.
`tests/unit/audio-bible.test.ts` holds the file to audible-kit's own Word of Promise data for every chapter, to Luke 15 = 300423039 ms, and to a start for each of Lampas's 260
New Testament chapters.

**Why not the research's numbers.** `docs/research/audible-addon-seek.md` (mw-5r3p30.412) gave Luke 15 = 300,366,317 ms, 57 s early: it read the chapter list from the
Audnexus mirror (`api.audnex.us`), which still holds an older timing of the title (Genesis 1 at 16,970 ms where Audible's live catalogue says 17,040, brand intro 3,970 ms where
it says 4,040, the gap growing through the book). The Governor's phone played the live catalogue's number at the right place. Use Audible's own API, never the mirror.

**The label** (`audibleChapterLabel`) is Audible's own title for the chapter, since the line tells him where it is in Audible's list: `Luke 15`, but `Psalm 23`, `Revelations 22`
and, for the five one-chapter books, `The Book of Obadiah`, `The Epistle of Paul the Apostle to Philemon`, `The Second Epistle of John`, `The Third Epistle of John` and
`The Epistle of Jude`.

A chapter with no start known (none today) falls back to the older link: an Android intent (`MEDIA_PLAY_FROM_SEARCH`, package `com.audible.application`, query
`The Word of Promise Audio Bible`, `browser_fallback_url` the book's page `https://www.audible.com/pd/B003UC45I8`) with `openApp.ts` `armFallback` opening the book's page only
when the page stays in front 1.5 s after the tap. **A verse is not a place:** Audible is only timed per chapter, so a verse-level link would be an estimate within the chapter
(a later step).
