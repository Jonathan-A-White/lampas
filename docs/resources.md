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
| `logos` | Logos | `Open in Logos`: `https://ref.ly/logosres/<resource>?hw=<lemma>` | Logos' hyperlink documentation (Logos wiki "Hyperlinks": `ref.ly/logosres/<resource>` opens a resource in Logos; `hw` names the headword) |
| `accordance` | Accordance | `Open in Accordance`: `accord://search/<module>?<lemma>` | Accordance's help topic "Using Links for Common Tasks": `accord://search/[module];[field]?[query]` |

STEPBible was chosen over Blue Letter Bible because Lampas already takes its lexicon from STEPBible, so the number and the
entry agree. The number is written with four digits (`G25` becomes `G0025`), as STEPBible writes it.

Logos and Accordance each ask for a text field in Settings: the lexicon as that app names it (Logos: `bdag`; Accordance:
`BDAG`). Empty means the default. The lemma is percent-encoded UTF-8, in NFC.

**Not verified on a device.** Logos' pages could not be fetched when this was written (they answered 403), so the `hw`
headword form of `ref.ly/logosres` is taken from Logos' forum answers and should be tried on a phone with Logos installed; the Accordance
form follows its help page for searching a module, which gives no lexicon-specific example. If either does not open the
entry, the fix is the one line in that resource's file (`linksFor`).

## How to add a resource

1. Add `src/resources/<name>.ts` exporting a `StudyResource` (`src/resources/types.ts`): an `id` (kept in the store, so never
   changed), a `name` (the switch's label), a `kind`, one line `describe`, an optional `option` (a text field: label, default,
   hint) and `linksFor(word, option)`, which returns `[{ label, url }]` for a `StudyWord` `{ form, lemma, strongs }`.
2. Add it to `RESOURCES` in `src/resources/index.ts`. Settings and the word sheet draw from that list and need no change.
3. URLs are `https:` or the app's own scheme, with the lemma passed through `encodeURIComponent`; never put lexicon text in one.
4. Add its row to the table above and to the unit test's expected ids (`tests/unit/resources.test.ts`).
