# Research: Logos's Factbook at a proper name

Story mw-rfjjzd.18 (design: docs/design/library-at-scale.md section 10 lead 2; the Governor's choice 4, A). Written 2026-10-23. Research only: no app code changed.
Read from one Logos support excerpt, one third-party repository's pull request that tested the form on Verbum (fetched 2026-10-23), `curl` against ref.ly on 2026-10-23, and the
counts of Lampas's own data (`public/data/frequency.json`, `lexicon.json`, the chapter files). The Logos support and community pages answer 403 to a script, as docs/resources.md says.
**Nothing here was opened in Logos: the Laptop has none. Every link below is UNVERIFIED on a device until the Governor taps the one link in HOW TO CHECK IT.**

<!-- toc -->

- [The link form, and its source](#the-link-form-and-its-source)
- [The built links](#the-built-links)
- [How a word sheet would know a proper name](#how-a-word-sheet-would-know-a-proper-name)
- [Sweep: the proper names of 2 John and Romans 16, the first screens it would show on](#sweep-the-proper-names-of-2-john-and-romans-16-the-first-screens-it-would-show-on)
- [HOW TO CHECK IT, for the Governor](#how-to-check-it-for-the-governor)

<!-- /toc -->

## The link form, and its source

* **Logos's own page (a search excerpt, not the page).** Logos Support, "Logos Links Guide" (https://support.logos.com/hc/en-us/articles/46165718176397-Logos-Links-Guide , 403 to a script; read in the
  search engine's excerpt, 2026-10-23): a Factbook location is made in the desktop app with the Factbook's menu and Copy location, and the https form is `https://ref.ly/logos4/Factbook?id=…`
  (the excerpt shows the shape `?id=ref%3abk.%25…`); "a general link to the Factbook in any app" is `https://ref.ly/logos4/Factbook`. The excerpt stopped before the example's full text,
  so Logos's own page is the source for the *shape* and for the start link, not for a name's key.
* **The full form with a key, tested by a third party.** robrawks/LogosBibleSoftwareMCP, pull request #8 by droza123, 2026-08-26 (https://github.com/robrawks/LogosBibleSoftwareMCP/pull/8 , fetched 2026-10-23).
  Quoted: "open_factbook | `logos4:Factbook;id=ref%3Abk.%23Moses;lens=all`"; "Rewrote the URL builders to the syntax Logos itself emits via Copy location … each form verified live against Windows Verbum
  by dispatching candidate URLs and observing the app"; "Factbook keys carry an entity-kind sigil (`#`=person, `@`=place, `%`=event, `$`=thing); an unprefixed key opens an empty Factbook panel";
  "values need ref.ly query encoding — %20 for spaces, percent-escapes for `/`, `:` and non-ASCII"; and, of a key it cannot find, "an unresolvable bk. key does not blank the Factbook panel or show an error … the panel keeps its previous entry".
  Its other example is a disambiguated place, "`@BethlehemOfJudah` for 'Bethlehem (of Judah)'". That is a stranger's test on Verbum for Windows, not Logos's word, and it is the only place I found a key written out.
* **The same pair of schemes as the links Lampas already builds.** `logos4:<Guide or Factbook>;<name>=<value>` and its `https://ref.ly/logos4/…` fallback are the shape of `Bible Word Study in Logos` (src/resources/logos.ts `study`, docs/resources.md),
  which is sourced. In the scheme the parameters are separated by `;`; in the https address the first is `?` and the next `&` (the Links Guide's `?id=`; `lens=all` after it is by analogy, from the pull request).

So the form is: `logos4:Factbook;id=` + `encodeURIComponent('ref:bk.' + sigil + key)` + `;lens=all`, and its fallback `https://ref.ly/logos4/Factbook?id=` + the same + `&lens=all`.
The key is the entry's English name written without spaces (`Moses`, `BethlehemOfJudah`), a person with `#`, a place with `@`.

## The built links

Built the way `resourceLink` in src/resources/logosRes.ts builds one and the way `study` in src/resources/logos.ts builds a `logos4:` link (scheme first, ref.ly as the fallback).
The key is the lexicon gloss of the lemma (`lexicon.json`: Μελχισεδέκ `g: "Melchizedek"`, Ἔφεσος `g: "Ephesus"`), a person's with `#` and a place's with `@`.

| Lemma | Is | scheme | https |
| --- | --- | --- | --- |
| Μελχισεδέκ (G3198) | person | `logos4:Factbook;id=ref%3Abk.%23Melchizedek;lens=all` | `https://ref.ly/logos4/Factbook?id=ref%3Abk.%23Melchizedek&lens=all` |
| Ἔφεσος (G2181) | place | `logos4:Factbook;id=ref%3Abk.%40Ephesus;lens=all` | `https://ref.ly/logos4/Factbook?id=ref%3Abk.%40Ephesus&lens=all` |
| (no name: the Factbook's start) | | `logos4:Factbook` | `https://ref.ly/logos4/Factbook` |
| Moses (the pull request's own tested key, for the Governor to compare) | person | `logos4:Factbook;id=ref%3Abk.%23Moses;lens=all` | `https://ref.ly/logos4/Factbook?id=ref%3Abk.%23Moses&lens=all` |

The lemma in the data is Ἔφεσος (smooth breathing and acute), not the story's unaccented Ἐφεσος; the link carries the English key, so the Greek spelling does not enter it.
**The keys `Melchizedek` and `Ephesus` are my guess from the pull request's two examples; no source lists either.** The Factbook is built from his whole library and the Lexham Bible Dictionary,
whose own ids (`%AlphaAndOmega_Deity` in a forum post, as the search excerpt shows) show a key can carry a disambiguator or an underscore. If the guess is wrong the panel stays empty or on its last entry.

ref.ly was asked on 2026-10-23 and accepts all three, passing them on unchanged except that it rewrites its own `#` (as `$23`, the way it already rewrote the lemma's bytes for the morphology note):

```
curl -I 'https://ref.ly/logos4/Factbook?id=ref%3Abk.%23Melchizedek&lens=all'
  301 -> https://app.logos.com/refly?uri=logos4%3AFactbook%3Bid%3Dref%3Abk.%2423Melchizedek%3Blens%3Dall
curl -I 'https://ref.ly/logos4/Factbook?id=ref%3Abk.%40Ephesus&lens=all'
  301 -> https://app.logos.com/refly?uri=logos4%3AFactbook%3Bid%3Dref%3Abk.%40Ephesus%3Blens%3Dall
curl -I 'https://ref.ly/logos4/Factbook'
  301 -> https://app.logos.com/refly?uri=logos4%3AFactbook
```

That shows the address is well formed; the target page wants a Faithlife sign-in, so it cannot show what the app does with it.

## How a word sheet would know a proper name

Lampas has three signs already, none of them says person or place:

1. **The parse code.** `N-PRI` is the Robinson-Pierpont code for an indeclinable proper noun (Ἀβραάμ, Μαριάμ). It is too narrow alone: a declined name is coded as a plain noun (`N-ASF`, `N-NSM`), so Μελχισεδέκ
   (indeclinable, but coded by its use) and Ἔφεσος (`N-ASF`, `N-DSF`) are not `N-PRI` (docs/data.md 'The proper-noun rule'). In the 27 books only 1 of the 51 proper tokens of Romans 16 (Μαριάμ at 16:6) is `N-PRI`.
2. **The lemma list.** `public/data/frequency.json` has `proper` per Strong's number (`isProperNoun(strongs)`, src/data/frequency.ts): true when a use is `N-PRI`, or a use is a noun and the lexicon's lemma opens with a capital.
   It holds **545 of the 5,380** lemmas, every one with a `lexicon.json` entry and so a gloss. Both lemmas of the table above are in it (Μελχισεδέκ 9 uses, 3 chapters; Ἔφεσος 16 uses, 11 chapters).
   The word sheet needs only the lemma and the Strong's number it already has; the list is a fetch the frontier already makes.
3. **The capital in the lemma.** src/resources/logos.ts `isProperName(lemma)` is that capital test without a fetch. It also catches 33 capitalised lexicon entries the list leaves out: gentilic adjectives and adverbs
   (Ἰουδαῖος, Ῥωμαῖος, Ἑβραϊστί, Ἐφέσιος), `ᾍδης` (a noun) and Ἰουδαΐζω (a verb). Over 2 John and Romans 16 the two agree exactly (checked in the sweep below), so the list is the cleaner rule and the capital the cheap fallback.

**What none of them knows:** whether a name is a person, a place or a people (the sigil `#`, `@`, ...), and the Factbook's key. A wrong sigil gives an empty panel, silently. So a door built on this needs one new small table:
`lemma -> {sigil, key}` for the names whose key is checked (people by default, places and the peoples by hand); a name not in the table gets no tile (as `keyQuery` already leaves a lexicon tile out when Lampas has no key, "never a guess").
The gloss is a fair first key for most names, but 14 glosses are shared by more than one lemma (John = Ἰωάννης/Ἰωνᾶς, Jerusalem = three lemmas, Joseph, Saul, Tyre, Cyprus ...) and the common names have many people
(Μαρία "Mary", Ἰωάννης, Ἰάκωβος, Σίμων, Ἰούδας): a Factbook key for them carries a disambiguator the gloss does not (`@BethlehemOfJudah`), so those names are the ones the table must spell out or leave out.
The table is generated by script from the 545 and checked by hand in Logos; nothing in this note can fill it.

**Where the door would go.** The Study row of `src/WordSheet.tsx`, in the Logos group (`logosStudy`, src/resources/logos.ts) after Bible Word Study: one tile **Melchizedek in Factbook** (the gloss, then " in Factbook"),
shown only when Logos is a study resource and the lemma is in the table. It needs no resource id (the Factbook is a tool in the app, not a book in the library), so it does not depend on the shelf. The word sheet is already full
(docs/layout/words.md, the height proofs in tests/e2e/reader.spec.ts): a tile is one more cell of the two-column grid, and a proper noun's sheet has no lexicon `commonLemma` tiles to spare it (logos.ts line 66 drops them).

## Sweep: the proper names of 2 John and Romans 16, the first screens it would show on

Counted from `public/data/2jn/1.json` and `public/data/rom/16.json` against `frequency.json`'s `proper` (script not committed). Every one is a lemma whose word sheet would offer the tile.

| Passage | Verses | Proper tokens | Distinct lemmas | People | Places | Coded `N-PRI` |
| --- | --- | --- | --- | --- | --- | --- |
| 2 John | 13 | 8 | 3 | 2 (Ἰησοῦς ×2, Χριστός ×4) | 0 | 0 |
| Romans 16 | 24 | 51 | 40 | 38 | 2 (Κεγχρεαί, Ἀχαΐα) | 1 (Μαριάμ, 16:6) |

* **2 John (3 lemmas):** Ἰησοῦς "Jesus", Χριστός "Christ", Κυρία "lady". Κυρία (2 John 1 and 5, `N-DSF` and `N-VSF`) is a **false name**: the list marks it because the lexicon prints the lemma with a capital, but
  "the elect lady" is a title or a woman unnamed; a Factbook door on it would open nothing right. A name in the table is what keeps it off, which is the case for the table over the rule alone.
  Ἰησοῦς and Χριστός are the Factbook's most-linked names; their keys are a case where the disambiguator is a risk (`#Jesus` or a longer one), so the guess above is weakest here.
* **Romans 16 (40 lemmas, 51 tokens):** Φοίβη Phoebe, Πρίσκα Prisca, Ἀκύλας Aquila, Ἐπαίνετος Epaenetus, Μαρία Mary, Ἀνδρόνικος Andronicus, Ἰουνιᾶς Junia, Ἀμπλίας Ampliatus, Οὐρβανός Urbanus, Στάχυς Stachys,
  Ἀπελλῆς Apelles, Ἀριστόβουλος Aristobulus, Ἡρωδίων Herodion, Νάρκισσος Narcissus, Τρύφαινα Tryphaena, Τρυφῶσα Tryphosa, Περσίς Persis, Ῥοῦφος Rufus, Ἀσύγκριτος Asyncritus, Φλέγων Phlegon, Ἑρμᾶς Hermas,
  Πατροβᾶς Patrobas, Ἑρμῆς Hermes, Φιλόλογος Philologus, Ἰουλία Julia, Νηρεύς Nereus, Ὀλυμπᾶς Olympas, Τιμόθεος Timothy, Λούκιος Lucius, Ἰάσων Jason, Σωσίπατρος Sosipater, Τέρτιος Tertius, Γάϊος Gaius, Ἔραστος Erastus,
  Κούαρτος Quartus, Σατανᾶς Satan (a being, `#` by guess), Ἰησοῦς, Χριστός; and two places, Κεγχρεαί Cenchreae and Ἀχαΐα Achaia (`@`).
  Ἰησοῦς is 4 of the 51 tokens and Χριστός 9. A minor name here (Ἀσύγκριτος, Φλέγων, Πατροβᾶς) is the likeliest to have no entry, and then the Factbook shows an empty report. That is a limit of the Factbook, not of the link.
* **Agreement of the rules.** Every proper token in both passages is in the list and no capitalised lemma in them is outside it, so the list and the capital test give the same 3 and 40 lemmas. Over all 27 books they differ by 33 lexicon entries
  (the gentilic adjectives and adverbs above, `ᾍδης`, Ἰουδαΐζω).
* **Cost on a screen.** The two passages hold 41 distinct names (Ἰησοῦς and Χριστός stand in both), each one tile. 39 are people on the default sigil `#` (Satan among them, by guess, and Κυρία, which is no person) and 2 are places, `@`, which must be marked by hand.
  Μαρία is ambiguous in the Factbook (many Marys) and Κυρία is no name, so they should have no tile until the table says so: 39 tiles (37 people, 2 places), not 41.

## HOW TO CHECK IT, for the Governor

On the phone or the Laptop that has the Logos app signed in to his library:

1. Open this link (paste it in a message to yourself or the browser's address bar): `https://ref.ly/logos4/Factbook?id=ref%3Abk.%23Melchizedek&lens=all`
2. Choose to open it in Logos if it asks.
3. Right looks like: Logos opens the **Factbook** at **Melchizedek**, the report of the person, with the headings of his library's books on him.
4. Half right: the Factbook opens but empty or on the last thing you looked at. Then the Factbook opens from a link but my key is not the entry's; say "opens, empty" on mw-rfjjzd.18, and, if you are at the Factbook already, search Melchizedek and use Copy location so the real key is read.
5. Wrong: nothing opens, or the tab you already had stays on screen. Then the Factbook cannot be opened from a link here and the door is not built; say "nothing" on mw-rfjjzd.18.
6. Optional, the place: `https://ref.ly/logos4/Factbook?id=ref%3Abk.%40Ephesus&lens=all` should open **Ephesus** the city.

**UNVERIFIED** until he does this: that the Logos app opens the Factbook from `logos4:`/ref.ly at all on his devices; that `ref:bk.` + sigil + `Melchizedek` / `Ephesus` is the entry's key (guessed from one stranger's two examples);
that `lens=all` is wanted; that Factbook is on in his Logos (it is part of the app, not a book); and the person/place sigil convention (a stranger's claim, not Logos's).
The sources for the form are Logos Support's page (as a search excerpt) and one pull request on GitHub; the tested form is the pull request's, on Verbum for Windows, not on his phone.
