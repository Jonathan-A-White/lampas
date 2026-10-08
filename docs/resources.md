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
| `logos` | Logos | `Open in Logos: <lexicon>` per ticked lexicon: `logosres:<Resource ID>;hw=<lemma>`; and `Bible Word Study in Logos`: `logos4:Guide;t=Bible%20Word%20Study;lemma=lbs%2Fel%2F<lemma>;ref=Bible.<book><ch>.<v>` | `logosres:` form: Logos forum post pairing `logosres:becnt65ac;ref=Bible.Ac6.3;off=114` with `https://ref.ly/logosres/becnt65ac?ref=Bible.Ac6.3&off=114` (the `Bible.Ac6.3` reference form is from it); `logos4:` is Logos' older scheme, which its release notes say still works. `hw=` is **UNVERIFIED** (below); the Guide's `lbs%2Fel%2F<lemma>` form is Logos' own, see "Bible Word Study's lemma" below |
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
`Bible Word Study in Logos` link (at the verse, `ref=Bible.Ro8.28`, when the sheet knows it) always comes with Logos.

**The scheme first, https only as the fallback.** A link's `href` is the app's own scheme (`logosres:`, `logos4:`); on a phone
with Logos the tap hands it to the app. A phone with no app for the scheme does nothing on its own, so the tap also starts a
timer (`src/resources/openApp.ts`): if the page is still in front 1.5 s later (not hidden, blurred or left), the link's https
`ref.ly` address is opened instead. Each Logos link carries it (`data-fallback`). Accordance has no web page for its lexicons, so
its link has no fallback: the word sheet then opens a small sheet over itself, "<App> isn't on this phone", with `Get <App>` (the
store search of `src/resources/appStore.ts`: the Play Store, or the App Store on an iPhone or iPad; UNVERIFIED that either finds the app,
and Accordance may have no Android app) and `Turn off <App>` (the resource goes off in Settings at once). Any new resource of kind
`'app'` gets this sheet for a link with no `fallback`.

**The Study row's grid.** The links are equal tiles, two to a row, under the app's name for a resource of kind `'app'`. A link's `label`
is its accessible name ('Open in Logos: BDAG'); its optional `tile` is the short text on the tile ('BDAG', 'Word Study'; a Logos lexicon's
is its `short` in `LEXICONS`). A tile never wraps at 360 px: keep a `tile` to about 16 characters.

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

**Not verified on a device (no phone with Logos or Accordance was available).** Unverified: that `logosres:<Resource ID>;hw=<lemma>`
opens that lexicon at the headword (the `hw` part), that `logos4:Guide;t=Bible%20Word%20Study;lemma=...;ref=...` opens the Bible
Word Study guide, that the Logos Android app claims `logosres:` and `logos4:` at all, and that the
Accordance `accord://search/<module>?<lemma>` form finds a word in a lexicon module. The https fallback is kept for all of them. If a link does not open the
entry, the fix is in that resource's file.

## Bible Word Study's lemma

Logos names a Greek lemma `lbs/el/<lemma>` (Hebrew `lbs/he/…`, English `lbs/en/…`), and in a link its slashes must be escaped as `%2F`
(a literal slash is silently rejected). With a bare `lemma=Ἰησοῦς` the Logos app opened Bible Word Study with a search `lemma.ιησουσ`
and empty Definition, Hebrew words and Greek words (the Governor's phone, 2026-10-08), so the link now names `lbs%2Fel%2F<lemma>`, the lemma
in NFC and percent-encoded. Source: the pull request "Fix UI navigation: use documented L4 link syntax for logos4:/logosref: URLs"
(https://github.com/robrawks/LogosBibleSoftwareMCP/pull/8), whose form was rewritten to match what Logos emits via Copy location and checked
in the Windows app: `logos4:Guide;t=Bible%20Word%20Study;lemma=lbs%2Fen%2Flove`. The `lbs/el/λόγος` Greek form is also Logos' search syntax
(`<Lemma = lbs/el/λόγος>`). The `;ref=` part is kept on the Greek link (not in that source; **UNVERIFIED** whether Logos uses or ignores it).

## How to add a resource

1. Add `src/resources/<name>.ts` exporting a `StudyResource` (`src/resources/types.ts`): an `id` (kept in the store, so never
   changed), a `name` (the switch's label), a `kind`, one line `describe`, an optional `option` (a text field: label, default,
   hint) and `linksFor(word, option)`, which returns `[{ label, url, fallback? }]` for a `StudyWord` `{ form, lemma, strongs, ref? }`; a resource with a list to tick gives `choices` instead of `option`.
2. Add it to `RESOURCES` in `src/resources/index.ts`. Settings and the word sheet draw from that list and need no change.
3. URLs are `https:` or the app's own scheme, with the lemma passed through `encodeURIComponent`; never put lexicon text in one. A scheme link may carry an https `fallback`.
4. Add its row to the table above and to the unit test's expected ids (`tests/unit/resources.test.ts`).
