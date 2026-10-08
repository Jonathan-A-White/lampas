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
| `logos` | Logos | `Open in Logos: <lexicon>` per ticked lexicon: `logosres:<resource>;hw=<lemma>`; and `Bible Word Study in Logos`: `logos4:Guide;t=Bible%20Word%20Study;lemma=<lemma>;ref=Bible.<book><ch>.<v>` | `logosres:` form: Logos forum post pairing `logosres:becnt65ac;ref=Bible.Ac6.3;off=114` with `https://ref.ly/logosres/becnt65ac?ref=Bible.Ac6.3&off=114` (the `Bible.Ac6.3` reference form is from it); `logos4:` is Logos' older scheme, which its release notes say still works. `hw=` and the Guide form are **UNVERIFIED** (below) |
| `accordance` | Accordance | `Open in Accordance`: `accord://search/<module>?<lemma>` | Accordance's help topic "Using Links for Common Tasks": `accord://search/[module];[field]?[query]` |

STEPBible was chosen over Blue Letter Bible because Lampas already takes its lexicon from STEPBible, so the number and the
entry agree. The number is written with four digits (`G25` becomes `G0025`), as STEPBible writes it. With Strong's on, the word sheet's plain
`Strong's` fact is hidden so the number shows once, as the link.

Accordance asks for a text field in Settings: the module as Accordance names it (`BDAG`; empty means BDAG). The lemma is
percent-encoded UTF-8, in NFC.

## Logos: his lexicons, the scheme and the fallback

With Logos on, Settings shows his Logos lexicons as a ticked list (BDAG ticked until he changes it; the ticked ids are a JSON
array in `resourceOption.logos`). The list is data: `LEXICONS` in `src/resources/logos.ts`, in the order Logos' Bible Word Study
shows them; adding a lexicon is one line there. Each ticked one gives `Open in Logos: <name>` on the word sheet, and one
`Bible Word Study in Logos` link (at the verse, `ref=Bible.Ro8.28`, when the sheet knows it) always comes with Logos.

**The scheme first, https only as the fallback.** A link's `href` is the app's own scheme (`logosres:`, `logos4:`); on a phone
with Logos the tap hands it to the app. A phone with no app for the scheme does nothing on its own, so the tap also starts a
timer (`src/resources/openApp.ts`): if the page is still in front 1.8 s later (not hidden, blurred or left), the link's https
`ref.ly` address is opened instead. Each Logos link carries it (`data-fallback`). Accordance has no web page for its lexicons, so
its link has no fallback.

**Resource ids.** The `resource` of each lexicon is the id the link names. NONE of these ids could be confirmed (Logos' pages
answer 403; the Logos wiki and forum could not be read); every one is **UNVERIFIED**: `bdag`, `louwnida`, `lexhamtheolwordbk`,
`dblgreek`, `ednt`, `nasbdictionaries`, `lehlxx`, `liddellscott` (An Intermediate Greek-English Lexicon), `lxgrcanlex`,
`newstrongsdict`, `tdnta`, `buildingntvocab3`, `lxgntlex`, `lxlxxlex`, `greekenglishlexnt`, `cremerlexicon`,
`lexhamanalyticallxx`, `abbottsmithmanual`, `pocketlexgnt`, `concisedict`, `thayerlexicon`. Logos names a resource also by its
`LLS:` code (a forum user reports `LLS:46.30.18` for BDAG, unconfirmed); the Information pane of a resource in Logos shows its true id, and
the fix for a wrong one is its `resource` in `LEXICONS`.

**Not verified on a device (no phone with Logos or Accordance was available).** Unverified: that `logosres:<id>;hw=<lemma>`
opens that lexicon at the headword (the `hw` part), that `logos4:Guide;t=Bible%20Word%20Study;lemma=...;ref=...` opens the Bible
Word Study guide, that the Logos Android app claims `logosres:` and `logos4:` at all, every resource id above, and that the
Accordance `accord://search/<module>?<lemma>` form finds a word in a lexicon module. The https fallback is kept for all of them. If a link does not open the
entry, the fix is in that resource's file.

## How to add a resource

1. Add `src/resources/<name>.ts` exporting a `StudyResource` (`src/resources/types.ts`): an `id` (kept in the store, so never
   changed), a `name` (the switch's label), a `kind`, one line `describe`, an optional `option` (a text field: label, default,
   hint) and `linksFor(word, option)`, which returns `[{ label, url, fallback? }]` for a `StudyWord` `{ form, lemma, strongs, ref? }`; a resource with a list to tick gives `choices` instead of `option`.
2. Add it to `RESOURCES` in `src/resources/index.ts`. Settings and the word sheet draw from that list and need no change.
3. URLs are `https:` or the app's own scheme, with the lemma passed through `encodeURIComponent`; never put lexicon text in one. A scheme link may carry an https `fallback`.
4. Add its row to the table above and to the unit test's expected ids (`tests/unit/resources.test.ts`).
