# The lxx-morph probe: build or take it?

Story mw-u2w5klk.21, 2026-11-02. The Governor asked whether an open dataset already does what the Septuagint model stories are about to do (178 batches of
about 700 pending words, card direct:13dfa0da...d2f7). The lead is [OpenScriptorium/lxx-morph](https://github.com/OpenScriptorium/lxx-morph): a lemma
and a parsing for every word of Rahlfs's Septuagint (1935), 59 books, data under CC BY 4.0. This page measures how many of the 178 batches it would save,
how accurate it is on the words Lampas already has an answer for, and whether its provenance fits. **It changes no bar, no pipeline and no data the app
reads, and nothing of lxx-morph is committed** (`data/raw/` is git-ignored). Readings of licences are marked *my reading, not legal advice*: the
decision is the Governor's.

<!-- toc -->

- [The answer](#the-answer)
- [What was read, and how to repeat it](#what-was-read-and-how-to-repeat-it)
- [How a Swete word is matched to a Rahlfs word](#how-a-swete-word-is-matched-to-a-rahlfs-word)
- [Coverage of the pending words](#coverage-of-the-pending-words)
- [Accuracy where Lampas has an answer](#accuracy-where-lampas-has-an-answer)
  - [Thirty contradictions read by hand](#thirty-contradictions-read-by-hand)
  - [The lemma](#the-lemma)
  - [The known-answer runs](#the-known-answer-runs)
- [The saving](#the-saving)
- [What it is good for: a second opinion on our own answers](#what-it-is-good-for-a-second-opinion-on-our-own-answers)
- [Licence and provenance](#licence-and-provenance)
- [Does it lock Lampas in?](#does-it-lock-lampas-in)

<!-- /toc -->

## The answer

**It saves little, and what it saves is not good enough.** Taken as answers, lxx-morph's readings would settle 12.7% to 24.8% of the 112,256 pending
words, **19 to 40 of the 178 batches**, but on the one batch a model has done (M1, `data/lxx/choices/gen-01.tsv`) about **9 in 100 of the readings
those rules take are wrong in their parsing** (the bar asks 98 in 100 right). Its errors are the hard part of the job: a neuter read as masculine where
the form is the same (`τούτου μόνου` of the tree, `ἐκ πλαγίων`, `δύο δύο ἀπὸ πάντων`), the person of `ἔφαγον` ("I ate" read as "they ate"). The one
rule that made no mistake on M1's words (lxx-morph chooses only between different words, never a case or gender of one) saves **6 batches**.

What it is good for is the other way round: where it disagrees with an answer Lampas's own layers already settled, **lxx-morph was right in 10 of 16
read by hand and Lampas in none** (4 were neither, 2 a convention): `Σειών` (Zion) read by our parser as a participle of σείω (129 words), `Εἰού` (Jehu) as an
imperative of εἴλω, `κρίσεις` after `εἰς` as a nominative. It flags 4,639 of our 364,124 settled words, about 7 batches' worth, as a list to recheck.

Its provenance is not clean: its Greek text comes from eliranwong's Rahlfs (CC BY-NC-SA, CATSS/CCAT terms), and its pipeline wrote **CATSS
morphology into its lemmas and parsings** by an audit overlay whose tokens are not marked. Using it as a list of where to look ships nothing of it.

## What was read, and how to repeat it

- **lxx-morph** at commit `c91f6b1e8fb3ba37df701e6ae31f675ace71a2b2` (2026-08-21, "Add word-level MT<->LXX alignment with annotated evaluation set";
  the repository was created on GitHub 2026-08-27, five commits, the first 2026-06-01). Read: `db/seeds/lxx_morph/<book>.json` for the 41 book files
  of the 39 books (`BOOKS` in the script: both of Rahlfs's Joshua, Judges and Daniel are offered; Ezra and Nehemiah are both 2 Esdras), and for
  provenance `README.md`, `LICENSE`, `LICENSE-DATA`, `lib/tasks/*.rake`, `app/services/lxx_morph/*.rb`, `scripts/lxx_morph/README.md` and the batch files.
- **eliranwong/LXX-Rahlfs-1935** `README.md` at commit `a1b5ff1c739f93cdd18dbab4c9e3fc6b1043141c` (2020-01-25), for its terms.
- **Lampas's derivation** as `npm run lxx:derive -- --all` wrote it on 2026-11-02 at `e4cfd1c0` (0.7.79), with the Morpheus cache
  (`sg docker -c 'npm run lxx:derive -- --all'`, 60 books; `npm run lxx:batches -- --all` then reads Job's no-candidate row at 1.24%), and M1's
  `data/lxx/choices/gen-01.tsv` (704 choices).

```bash
npm ci
sg docker -c 'npm run lxx:derive -- --all'       # data/lxx/derived, data/lxx/pending and the Morpheus cache
npx tsx scripts/lxx-morph-probe.mjs               # fetches lxx-morph pinned into data/raw/lxx, prints every table below (about 70 s)
```

`scripts/lxx-morph-probe.mjs` imports `scripts/lxx/` (Swete's tokens, the batch cut, the agreement links, the derivation) and changes none of it. It writes
under `data/raw/lxx-morph-probe/` (git-ignored): `contradictions.tsv` and `lemma-differ.tsv` (every word where lxx-morph contradicts a settled answer),
`sample.txt` (the thirty read by hand, with Swete's verse) and `m1-differ-<rule>.txt` (each rule's disagreements with M1).

## How a Swete word is matched to a Rahlfs word

lxx-morph tags Rahlfs; Lampas tags Swete. The two print mostly the same Greek but not always the same words, verse numbers or order.

1. **Swete's words are numbered as `scripts/lxx/swete.ts` numbers them** (`sweteTokens`: the editor's signs are not words), so a reference is the
   derivation's own (`Gen.1:14#37`).
2. **The verse.** Each Swete verse is matched to a Rahlfs verse by its words, not by its number: first the same chapter and verse, taken when at least half
   the words agree (Dice on the words without marks); else the verse of the book's files that shares the most of its rarer words; else, for a long Swete
   verse that Rahlfs cuts into several (Esther's additions), the run of Rahlfs verses around the best one each mostly inside the Swete
   verse, joined. This covers TVTMS's differences (Psalms 9-10, Jeremiah 25-51, Exodus 35-40) without TVTMS, which has no Swete column and no Rahlfs
   additions. Of 22,955 Swete verses: 21,060 by the same number, 1,821 found elsewhere (353 of Nehemiah's 378, which is Rahlfs's 2 Esdras 11-23; Proverbs 262;
   Exodus 172), 14 joined, 60 not matched.
3. **The word.** Its look-up key (`keyOf`), then without marks (`bareOf`), then with ει read as ι and a final ν dropped; the k-th time a form stands in
   Swete's verse is the k-th in Rahlfs's when both have it as often, else a reading is taken only when every occurrence in Rahlfs's verse has the same
   one. A word not in the matched verse is looked for once in the verse before and after.
4. **One form of parsing.** TAGNT's code and lxx-morph's words (`masc nom sg`, `aor ind act 3rd sg`) are both read as case, number, gender, person, tense,
   voice, mood and a class (verb, nominal, uninflected). A reading **agrees** when each feature of ours is one it gives; **left open** when one of ours is
   one of its slash (`nom/voc/acc`) or missing; **empty** when its parsing is empty (a name or an indeclinable: lemma only); **contradicted** when a feature
   does not meet or the class differs. TAGNT's deponent voices (`V-FDI`) are compared as any voice: lxx-morph writes `ἔσται` active ("`εἰμί` has no middle
   voice", its README), which made about 1,600 false contradictions before.

The Mayor's rough look took the word at a ref from early in some verses (`Gen.1:14#37` read as `εἰς` for `σημεῖον`); numbering by `sweteTokens` and
matching by form in the verse removes that.

## Coverage of the pending words

Against `data/lxx/pending/<book>.tsv` of the 39 books (112,256 words). **One reading**: lxx-morph gives one reading for that form in that verse.
**Settled**: no slash, not empty (or a word that does not inflect). **Settled and among our candidates**: settled, and one of our candidates agrees with it
in lemma and every feature. **Leaves at least one candidate**: at least one of our candidates is not contradicted by it.

| book | pending | one reading | several readings | form not in the verse | verse not matched | settled | left open (slash) | of which only nom/voc | empty | settled and among our candidates | leaves at least one candidate | no candidate | no candidate: answered | no candidate: settled answer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gen | 7,938 | 7,758 (97.7%) | 1 | 179 | 0 | 2,729 | 3,120 | 46 | 1,909 | 1,363 | 7,182 | 250 | 210 | 89 |
| exo | 6,112 | 5,955 (97.4%) | 0 | 152 | 5 | 2,363 | 2,953 | 31 | 639 | 1,423 | 5,582 | 257 | 184 | 75 |
| lev | 4,607 | 4,525 (98.2%) | 0 | 82 | 0 | 1,844 | 2,512 | 20 | 169 | 1,043 | 4,351 | 108 | 54 | 19 |
| num | 6,281 | 6,112 (97.3%) | 0 | 165 | 4 | 2,291 | 2,465 | 64 | 1,356 | 1,263 | 5,592 | 194 | 153 | 48 |
| deu | 4,423 | 4,302 (97.3%) | 1 | 120 | 0 | 1,903 | 2,058 | 10 | 341 | 1,107 | 4,046 | 129 | 102 | 64 |
| jos | 3,456 | 3,293 (95.3%) | 1 | 162 | 0 | 1,066 | 1,166 | 12 | 1,061 | 599 | 2,907 | 227 | 181 | 58 |
| jdg | 3,467 | 3,402 (98.1%) | 0 | 65 | 0 | 1,353 | 1,065 | 46 | 984 | 705 | 3,008 | 180 | 162 | 57 |
| rut | 437 | 430 (98.4%) | 0 | 7 | 0 | 163 | 173 | 4 | 94 | 101 | 376 | 38 | 36 | 11 |
| 1sa | 4,810 | 4,677 (97.2%) | 0 | 133 | 0 | 1,781 | 1,601 | 29 | 1,295 | 989 | 4,102 | 223 | 186 | 78 |
| 2sa | 4,129 | 3,969 (96.1%) | 0 | 148 | 12 | 1,359 | 1,278 | 28 | 1,332 | 711 | 3,293 | 213 | 175 | 60 |
| 1ki | 4,960 | 4,604 (92.8%) | 2 | 262 | 92 | 1,583 | 1,848 | 20 | 1,173 | 805 | 4,104 | 274 | 170 | 83 |
| 2ki | 4,342 | 4,137 (95.3%) | 0 | 205 | 0 | 1,504 | 1,665 | 17 | 968 | 765 | 3,652 | 351 | 296 | 96 |
| 1ch | 5,084 | 4,317 (84.9%) | 1 | 726 | 40 | 1,402 | 1,103 | 43 | 1,812 | 701 | 3,481 | 386 | 235 | 34 |
| 2ch | 4,849 | 4,591 (94.7%) | 0 | 256 | 2 | 1,775 | 1,742 | 18 | 1,074 | 900 | 4,117 | 243 | 171 | 87 |
| ezr | 1,462 | 1,231 (84.2%) | 0 | 228 | 3 | 462 | 455 | 17 | 314 | 281 | 1,103 | 92 | 34 | 12 |
| neh | 1,774 | 1,551 (87.4%) | 0 | 167 | 56 | 643 | 524 | 24 | 384 | 347 | 1,359 | 119 | 70 | 22 |
| est | 1,517 | 1,391 (91.7%) | 0 | 126 | 0 | 633 | 642 | 11 | 116 | 421 | 1,251 | 181 | 67 | 27 |
| job | 3,479 | 3,375 (97.0%) | 1 | 103 | 0 | 1,870 | 1,451 | 36 | 54 | 1,181 | 3,105 | 167 | 144 | 94 |
| psa | 7,635 | 7,428 (97.3%) | 0 | 207 | 0 | 3,425 | 3,644 | 36 | 359 | 1,971 | 6,938 | 196 | 147 | 99 |
| pro | 3,055 | 2,858 (93.6%) | 0 | 197 | 0 | 1,612 | 1,242 | 49 | 4 | 1,220 | 2,689 | 92 | 41 | 22 |
| ecc | 1,113 | 1,066 (95.8%) | 0 | 47 | 0 | 489 | 569 | 4 | 8 | 315 | 1,028 | 8 | 7 | 5 |
| sol | 464 | 449 (96.8%) | 0 | 15 | 0 | 233 | 187 | 26 | 29 | 176 | 417 | 17 | 14 | 5 |
| isa | 5,939 | 5,720 (96.3%) | 0 | 219 | 0 | 2,342 | 3,009 | 78 | 369 | 1,601 | 5,368 | 194 | 158 | 71 |
| jer | 5,897 | 5,705 (96.7%) | 0 | 192 | 0 | 2,585 | 2,431 | 43 | 689 | 1,522 | 5,310 | 262 | 204 | 108 |
| lam | 593 | 508 (85.7%) | 0 | 85 | 0 | 260 | 229 | 12 | 19 | 159 | 483 | 74 | 7 | 3 |
| eze | 6,826 | 6,671 (97.7%) | 3 | 151 | 1 | 2,669 | 3,509 | 45 | 493 | 1,652 | 6,321 | 190 | 149 | 61 |
| dan | 2,405 | 2,274 (94.6%) | 0 | 104 | 27 | 1,019 | 1,073 | 20 | 182 | 609 | 2,138 | 66 | 50 | 34 |
| hos | 929 | 906 (97.5%) | 0 | 23 | 0 | 437 | 344 | 8 | 125 | 227 | 858 | 26 | 20 | 8 |
| joe | 340 | 330 (97.1%) | 0 | 10 | 0 | 145 | 167 | 5 | 18 | 87 | 322 | 6 | 5 | 4 |
| amo | 678 | 654 (96.5%) | 0 | 24 | 0 | 277 | 292 | 5 | 85 | 194 | 626 | 16 | 12 | 6 |
| oba | 114 | 108 (94.7%) | 0 | 6 | 0 | 49 | 38 | 2 | 21 | 31 | 102 | 4 | 3 | 1 |
| jon | 174 | 170 (97.7%) | 0 | 4 | 0 | 94 | 65 | 0 | 11 | 56 | 153 | 3 | 3 | 1 |
| mic | 583 | 562 (96.4%) | 0 | 21 | 0 | 250 | 253 | 4 | 59 | 156 | 531 | 17 | 14 | 8 |
| nah | 225 | 216 (96.0%) | 0 | 8 | 1 | 114 | 95 | 2 | 7 | 78 | 206 | 5 | 3 | 2 |
| hab | 293 | 285 (97.3%) | 0 | 8 | 0 | 130 | 151 | 2 | 4 | 71 | 267 | 7 | 7 | 5 |
| zep | 252 | 248 (98.4%) | 0 | 4 | 0 | 125 | 106 | 5 | 17 | 86 | 229 | 12 | 10 | 2 |
| hag | 194 | 192 (99.0%) | 0 | 2 | 0 | 82 | 89 | 0 | 21 | 48 | 174 | 14 | 12 | 12 |
| zec | 1,113 | 1,078 (96.9%) | 0 | 35 | 0 | 502 | 497 | 13 | 79 | 331 | 1,026 | 26 | 23 | 15 |
| mal | 307 | 291 (94.8%) | 0 | 16 | 0 | 133 | 145 | 1 | 13 | 90 | 280 | 16 | 6 | 1 |
| total | 112,256 | 107,339 (95.6%) | 10 | 4,664 | 243 | 43,696 | 45,956 | 836 | 17,687 | 25,385 | 98,077 | 4,883 | 3,525 | 1,487 |

So: lxx-morph has a reading for 95.6% of the pending words, but only **43,696 (39%) are settled**, 45,956 leave case, gender or voice open with a slash
(`neut nom/voc/acc sg`: exactly what the agreement check could not settle either), and 17,687 are lemma-only (names, `lemma = surface, parsing = ""`).
**25,385 settled readings agree with one of our candidates.** The "form not in the verse" words are where Swete's manuscript and Rahlfs's text differ
(1 Chronicles' names, 726).

**No-candidate words** (the 4,883 the bar counts as guesses): lxx-morph answers 3,525 with a lemma, 1,487 with a settled parsing. **Esther** has 181 and
it answers 67 (27 settled); **Lamentations** has 74 and it answers 7 (3). Neither book's no-candidate words are mostly Greek words: 106 of Esther's are the
verse numbers Swete's file prints inside the additions (`⸂[1] ΕΤΟΥΣ`, read by `sweteTokens` as the word `1`), and Lamentations' are the Hebrew letter
names of the acrostic (`Ἄλεφ`, `Βήθ`, `Γίμελ` ... 4 each), which Rahlfs does not print. lxx-morph cannot clear those two books.

## Accuracy where Lampas has an answer

Every word that layers 1, 2 and the agreement check (2a) settled in the 39 books (`data/lxx/derived/<book>.tsv`, 359,096 of 364,124 read), and M1's 704
choices (695 read), against lxx-morph by its `confidence` and `source`. **Same word by convention**: a dictionary's other headword for it (`πορεύω` and
`πορεύομαι`, `ἔπω` and `λέγω`, `εἴδω` and `ὁράω`, `δεικνύω` and `δείκνυμι`, `οὕτω` and `οὕτως`: `CONVENTION` and `sameByConvention` in the script).
**Settled readings, contradicted**: of lxx-morph's settled readings, those whose lemma differs (not by convention) or whose parsing contradicts ours.

| set | confidence | source | words | same lemma | same letters | same word by convention | parsing agreed | left open | empty | contradicted | lemma and parsing agreed | settled readings | of those, lemma or parsing contradicted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| layer 1 | all | all | 306,830 | 97.0% | 97.4% | 99.7% | 95.4% | 4.0% | 0.2% | 1,146 (0.4%) | 95.3% | 294,456 | 1,335 (0.5%) |
| layer 1 | high | context_resolved | 118,316 | 95.9% | 96.2% | 99.7% | 98.3% | 1.3% | 0.0% | 552 (0.5%) | 98.1% | 116,003 | 582 (0.5%) |
| layer 1 | high | morpheus | 98,251 | 97.4% | 97.8% | 99.8% | 93.9% | 5.9% | 0.0% | 112 (0.1%) | 93.8% | 90,912 | 271 (0.3%) |
| layer 1 | low | augmented | 49 | 75.5% | 75.5% | 93.9% | 93.9% | 0.0% | 0.0% | 3 (6.1%) | 93.9% | 48 | 2 (4.2%) |
| layer 1 | low | context_resolved | 127 | 81.1% | 81.1% | 98.4% | 95.3% | 0.8% | 0.0% | 5 (3.9%) | 95.3% | 126 | 5 (4.0%) |
| layer 1 | low | first_candidate | 1 | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% | 0.0% | 0 (0.0%) | 100.0% | 1 | 0 (0.0%) |
| layer 1 | low | morpheus | 72 | 95.8% | 95.8% | 95.8% | 100.0% | 0.0% | 0.0% | 0 (0.0%) | 95.8% | 72 | 3 (4.2%) |
| layer 1 | low | post_processed | 1 | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% | 0.0% | 0 (0.0%) | 100.0% | 1 | 0 (0.0%) |
| layer 1 | medium | augmented | 60,905 | 97.8% | 98.9% | 99.6% | 91.9% | 6.8% | 0.8% | 343 (0.6%) | 91.8% | 58,638 | 337 (0.6%) |
| layer 1 | medium | context_resolved | 35 | 97.1% | 97.1% | 100.0% | 82.9% | 0.0% | 0.0% | 6 (17.1%) | 82.9% | 35 | 6 (17.1%) |
| layer 1 | medium | explicitly_specified | 306 | 95.8% | 99.0% | 99.0% | 94.4% | 3.3% | 1.0% | 4 (1.3%) | 94.1% | 292 | 4 (1.4%) |
| layer 1 | medium | first_candidate | 19,296 | 98.0% | 98.1% | 100.0% | 98.3% | 1.5% | 0.0% | 46 (0.2%) | 98.3% | 18,935 | 38 (0.2%) |
| layer 1 | medium | post_processed | 9,471 | 98.4% | 98.4% | 99.8% | 92.6% | 6.6% | 0.0% | 75 (0.8%) | 92.3% | 9,393 | 87 (0.9%) |
| layer 2 | all | all | 29,598 | 92.4% | 93.3% | 95.0% | 86.7% | 6.7% | 1.1% | 1,625 (5.5%) | 85.3% | 25,990 | 1,541 (5.9%) |
| layer 2 | high | context_resolved | 8,111 | 92.3% | 93.3% | 95.4% | 89.8% | 2.7% | 0.0% | 607 (7.5%) | 87.6% | 7,584 | 693 (9.1%) |
| layer 2 | high | morpheus | 12,991 | 95.2% | 95.9% | 97.7% | 87.1% | 10.6% | 0.0% | 298 (2.3%) | 85.8% | 11,074 | 394 (3.6%) |
| layer 2 | low | augmented | 68 | 63.2% | 63.2% | 98.5% | 83.8% | 0.0% | 0.0% | 11 (16.2%) | 83.8% | 68 | 11 (16.2%) |
| layer 2 | low | context_resolved | 161 | 99.4% | 99.4% | 99.4% | 91.9% | 0.0% | 0.0% | 13 (8.1%) | 91.3% | 161 | 14 (8.7%) |
| layer 2 | low | explicitly_specified | 2 | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% | 0.0% | 0 (0.0%) | 100.0% | 2 | 0 (0.0%) |
| layer 2 | low | first_candidate | 10 | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% | 0.0% | 0 (0.0%) | 100.0% | 10 | 0 (0.0%) |
| layer 2 | low | morpheus | 234 | 98.7% | 98.7% | 99.1% | 99.1% | 0.0% | 0.0% | 2 (0.9%) | 99.1% | 233 | 2 (0.9%) |
| layer 2 | low | post_processed | 5 | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% | 0.0% | 0 (0.0%) | 100.0% | 5 | 0 (0.0%) |
| layer 2 | medium | augmented | 6,480 | 86.2% | 87.6% | 88.3% | 80.5% | 5.1% | 4.9% | 615 (9.5%) | 79.4% | 5,423 | 346 (6.4%) |
| layer 2 | medium | explicitly_specified | 58 | 74.1% | 86.2% | 86.2% | 77.6% | 5.2% | 1.7% | 9 (15.5%) | 77.6% | 50 | 5 (10.0%) |
| layer 2 | medium | first_candidate | 532 | 94.9% | 95.9% | 98.3% | 86.1% | 7.0% | 0.0% | 37 (7.0%) | 85.3% | 476 | 34 (7.1%) |
| layer 2 | medium | post_processed | 946 | 95.8% | 95.9% | 97.4% | 95.3% | 1.2% | 0.0% | 33 (3.5%) | 94.0% | 904 | 42 (4.6%) |
| layer 2a | all | all | 22,668 | 94.1% | 98.6% | 98.7% | 23.2% | 71.0% | 5.0% | 174 (0.8%) | 22.8% | 5,366 | 198 (3.7%) |
| layer 2a | high | context_resolved | 12,653 | 99.6% | 99.7% | 99.7% | 12.6% | 86.7% | 0.0% | 89 (0.7%) | 12.5% | 1,648 | 81 (4.9%) |
| layer 2a | high | morpheus | 2,423 | 98.1% | 98.3% | 98.8% | 11.6% | 87.8% | 0.0% | 15 (0.6%) | 11.1% | 292 | 23 (7.9%) |
| layer 2a | low | augmented | 1 | 0.0% | 0.0% | 0.0% | 100.0% | 0.0% | 0.0% | 0 (0.0%) | 0.0% | 1 | 1 (100.0%) |
| layer 2a | medium | augmented | 4,046 | 69.8% | 94.3% | 94.5% | 66.8% | 4.4% | 27.7% | 44 (1.1%) | 65.8% | 2,737 | 70 (2.6%) |
| layer 2a | medium | explicitly_specified | 20 | 50.0% | 90.0% | 90.0% | 40.0% | 0.0% | 55.0% | 1 (5.0%) | 40.0% | 8 | 0 (0.0%) |
| layer 2a | medium | first_candidate | 3,036 | 100.0% | 100.0% | 100.0% | 6.4% | 93.0% | 0.0% | 18 (0.6%) | 6.4% | 200 | 10 (5.0%) |
| layer 2a | medium | post_processed | 489 | 97.1% | 98.2% | 98.8% | 96.7% | 1.8% | 0.0% | 7 (1.4%) | 95.5% | 480 | 13 (2.7%) |
| M1 gen-01 | all | all | 695 | 82.7% | 96.0% | 97.4% | 21.3% | 63.3% | 13.4% | 14 (2.0%) | 21.0% | 233 | 16 (6.9%) |
| M1 gen-01 | high | context_resolved | 296 | 95.9% | 96.3% | 98.6% | 21.3% | 75.3% | 0.0% | 10 (3.4%) | 21.3% | 145 | 10 (6.9%) |
| M1 gen-01 | high | morpheus | 104 | 88.5% | 88.5% | 91.3% | 49.0% | 50.0% | 0.0% | 1 (1.0%) | 48.1% | 47 | 2 (4.3%) |
| M1 gen-01 | low | augmented | 2 | 50.0% | 50.0% | 50.0% | 100.0% | 0.0% | 0.0% | 0 (0.0%) | 50.0% | 2 | 1 (50.0%) |
| M1 gen-01 | low | context_resolved | 2 | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% | 0.0% | 0 (0.0%) | 100.0% | 2 | 0 (0.0%) |
| M1 gen-01 | medium | augmented | 290 | 67.2% | 98.6% | 98.6% | 10.0% | 56.9% | 32.1% | 3 (1.0%) | 10.0% | 36 | 3 (8.3%) |
| M1 gen-01 | medium | context_resolved | 1 | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% | 0.0% | 0 (0.0%) | 100.0% | 1 | 0 (0.0%) |

What the fields mean, from its pipeline (`lib/tasks/lxx_morph_neutralize_attribution.rake` renamed them; the old names are in the task):
`morpheus` (Morpheus gave one parse), `context_resolved` (was `disambiguator`: a batch choice among Morpheus's parses, with a one-line reasoning),
`augmented` (was `fallback`, reason `fallback_agent`), `first_candidate` (was `disambiguator_fill`, reason `candidate_one_fallback`: the first of Morpheus's
parses taken with no choice), `explicitly_specified` (was `disambiguator_override`, reason `llm_override`), `post_processed` (was `missing`). Read: on the
easy words (layer 1) lxx-morph and Lampas agree on 99.7% of headwords and contradict on 0.4% of parsings; on M1's hard words lxx-morph **leaves 63% open
and 13% empty**, agrees on only 21%. Layer 2's medium/augmented words are contradicted 9.5% of the time, but (below) mostly because we are wrong.

### Thirty contradictions read by hand

All 14 of M1's contradictions and 16 of the layers', in a seeded order (`sample.txt`). Who is right is read from Swete's verse.

| # | ref | word | Lampas | lxx-morph (confidence, source) | right | why |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Gen.3:22#22 | ἐκτείνῃ | V-PAS-3S (M1) | aor subj act 3rd sg (high, context_resolved) | lxx-morph, likely | the form is both; aorist beside λάβῃ and φάγῃ |
| 2 | Gen.4:4#8 | πρωτοτόκων | A-GPN (M1) | masc gen pl (high, context_resolved) | M1 | the firstlings of his sheep, πρόβατα, neuter |
| 3 | Gen.3:11#19 | μόνου | A-GSN (M1) | masc gen sg (high, context_resolved) | M1 | τοῦ ξύλου ... τούτου μόνου: the tree, neuter |
| 4 | Gen.2:9#15 | καλὸν | A-ASN (M1) | masc acc sg (medium, augmented) | M1 | πᾶν ξύλον ... καλὸν εἰς βρῶσιν |
| 5 | Gen.6:16#18 | πλαγίων | A-GPN (M1) | masc gen pl (high, context_resolved) | M1 | ἐκ πλαγίων, from the sides (τὰ πλάγια) |
| 6 | Gen.1:2#5 | ἀόρατος | A-NSF (M1) | masc nom sg (medium, augmented) | M1 | ἡ δὲ γῆ ἦν ἀόρατος: γῆ is feminine |
| 7 | Gen.1:2#7 | ἀκατασκεύαστος | A-NSF (M1) | masc nom sg (medium, augmented) | M1 | the same |
| 8 | Gen.6:20#32 | πάντων | A-GPN (M1) | masc gen pl (high, context_resolved) | M1 | δύο δύο ἀπὸ πάντων: the birds, cattle, creeping things, all neuter |
| 9 | Gen.3:12#18 | ἔφαγον | V-AAI-1S (M1) | aor ind act 3rd pl (high, context_resolved) | M1 | Adam: "and I ate" |
| 10 | Gen.2:9#24 | μέσῳ | A-DSM (M1) | neut dat sg (high, morpheus) | M1 for Swete | Swete reads ἐν μέσῳ τῷ παραδείσῳ (μέσος agrees with the garden), Rahlfs ἐν μέσῳ τοῦ παραδείσου: a reading right for Rahlfs's text is wrong for Swete's |
| 11 | Gen.3:13#20 | ἔφαγον | V-AAI-1S (M1) | aor ind act 3rd pl (high, context_resolved) | M1 | the woman: "and I ate" |
| 12 | Gen.6:19#23 | πάντων | A-GPN (M1) | masc gen pl (high, context_resolved) | M1 | as 8 |
| 13 | Gen.2:9#33 | καλοῦ | A-GSN (M1) | masc gen sg (high, context_resolved) | M1 | γνωστὸν καλοῦ καὶ πονηροῦ: good and evil, neuter |
| 14 | Gen.3:17#21 | μόνου | A-GSN (M1) | masc gen sg (high, context_resolved) | M1 | as 3 |
| 15 | 1Ch.13:6#24 | καθημένου | V-PNP-GSM (2a) | perf ptc mid masc/neut gen sg (high, morpheus) | convention | κάθημαι: a present in TAGNT, a perfect in form in Morpheus |
| 16 | Num.7:38#5 | πλήρη | A-ASM (1) | neut nom/voc/acc pl (high, context_resolved) | neither | θυίσκην μίαν ... πλήρη: feminine accusative singular |
| 17 | Job.7:13#12 | ἰδίᾳ | A-DSF (1) | adverb (medium, augmented) | convention | an adverbial dative, "privately" |
| 18 | Lev.4:30#25 | ἐκχεεῖ | V-PAI-3S (2) | fut ind act 3rd sg (high, context_resolved) | lxx-morph | the uncontracted future, among λήμψεται and ἐπιθήσει |
| 19 | Jos.9:7#17 | κατάρας | N-GSF (1) | fem acc pl (medium, augmented) | lxx-morph | τὰς εὐλογίας καὶ τὰς κατάρας |
| 20 | Deu.12:22#9 | φάγῃ | V-AAS-3S (1) | aor subj mid/pass 2nd sg (high, context_resolved) | neither | οὕτως φάγῃ αὐτό: "so you shall eat it", the future middle, 2nd singular |
| 21 | Isa.58:4#3 | κρίσεις | N-NPF (1) | fem acc pl (high, context_resolved) | lxx-morph | εἰς κρίσεις |
| 22 | 2Sa.19:11#22 | γίνεσθε | V-PNM-2P (1) | pres ind mid/pass 2nd pl (high, context_resolved) | lxx-morph | ἵνα τί γίνεσθε ἔσχατοι: a question, the indicative |
| 23 | Num.7:74#5 | πλήρη | A-ASM (1) | neut nom/voc/acc pl (high, context_resolved) | neither | as 16 |
| 24 | Pro.1:32#9 | ἀσεβεῖς | A-NPM (1) | masc acc pl (high, context_resolved) | lxx-morph | ἐξετασμὸς ἀσεβεῖς ὀλεῖ: the object |
| 25 | Deu.28:9#1 | ἀναστήσαι | V-2AAN (2) | aor opt act 3rd sg (medium, augmented) | lxx-morph | the accent: "may the Lord raise you", not the infinitive ἀναστῆσαι |
| 26 | Jdg.21:15#11 | διακοπὴν | V-PAP-NSM (2) | fem acc sg noun (medium, augmented) | lxx-morph | ἐποίησεν Κύριος διακοπήν, a breach |
| 27 | Eze.16:51#14 | ἀνομίας | N-GSF (1) | fem acc pl (medium, post_processed) | lxx-morph | ἐπλήθυνας τὰς ἀνομίας σου |
| 28 | Jdg.5:17#16 | παραλίαν | παρά PREP + G3029 (2) | παράλιος fem acc sg (medium, augmented) | lxx-morph | ἐκάθισεν παραλίαν θαλασσῶν, by the coast |
| 29 | 2Ch.13:14#11 | ἔμπροσθεν | PREP (1) | neut gen pl noun (high, morpheus) | neither | ἐκ τῶν ἔμπροσθεν: an adverb used as a noun (ADV) |
| 30 | 2Ki.9:24#3 | Εἰοὺ | εἴλω V-2AMM-2S (2) | Ιου proper noun (medium, augmented) | lxx-morph | Jehu |

**Tally.** M1's 14: M1 right in 13, lxx-morph in 1 (and that one, ἐκτείνῃ, is the same form in both tenses). The layers' 16: lxx-morph right in 10,
Lampas in 0, neither in 4, a convention in 2. **Its errors fall on the hard words, ours on the words we called easy.**

### The lemma

The commonest differences that are not a convention (ours, theirs, words): `σείω`/`Σιων` 129, `ἄμμος`/`Αμμων` 100, `εἴλω`/`Ιου` 51, `ἀμάω`/`Αμαν` 48,
`κάδος`/`Καδης` 35, `σής`/`Σηων` 35, `ἀλέω`/`Ηλι` 35, `πλέω`/`πίμπλημι` 31, `ἀμνός`/`Αμνων` 30: **every one of these is our error** (Zion, Ammon, Jehu,
Haman, Kadesh, Sihon, Eli, ἔπλησεν "filled", Amnon), a name read as a common word that happens to share its letters. Others are conventions (`κἀγώ`/`ἐγώ`
70, `Ἰούδας`/`Ιουδα` 54, `Βοόζ`/`Βοος` 28, `οὐ + ἔτι`/`οὐκέτι` 87) or a text difference (`αὕτη` in Swete, `αὐτή` in Rahlfs). lxx-morph's own lemmas of
Hebrew names are the unaccented surface (`Ιου`, `Σιων`), its convention, not a dictionary form.

### The known-answer runs

**It cannot be measured against the bar's known-answer runs.** Those runs (`npm run lxx:known`, John 1 and Romans 8) score New Testament chapters
against TAGNT with the book hidden; lxx-morph tags only the Septuagint, so it has no reading for any of their words. The nearest thing is M1's batch
above (the only pending words with a model's answer), read by hand where the two disagree.

## The saving

Each rule takes lxx-morph's reading for a pending word that has candidates, as one of those candidates; the words it takes leave the batches, which are
cut again as `scripts/lxx/batches.ts` cuts them (about 700, at a chapter boundary; **178 today**). The rules:

- **strict**: a settled reading (no slash, not empty), confidence `high`, and exactly one candidate agrees with it in lemma (or convention) and every feature.
- **strict, medium too**: the same, `medium` confidence too.
- **strict, between lemmas only**: strict, and no other candidate has the same lemma: lxx-morph only chooses the word, never a case, gender or person of it.
- **loose**: any one reading, any confidence, when it contradicts all of our candidates but one (a left-open `nom/voc/acc` against `N-NSN` and `N-DSN` keeps
  `N-NSN`).
- **loose and the agreement check**: each pending word's candidates narrowed to those lxx-morph leaves (taken where one is left), then the agreement links
  run again over the book (`agree` of `scripts/lxx/agreement.ts`; the name and shared-ending rules have run already). The links found 126 breaks, which
  send both words back.

| rule | pending words taken | share | pending left | batches left | batches saved | M1's choice: same lemma | M1's choice: same lemma and parsing | wrong on M1's words, read by hand |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| strict | 14,268 | 12.7% | 97,988 | 159 | 19 | 107/108 (99.1%) | 97/108 (89.8%) | 10 of 108 (9.3%) |
| strict, medium too | 22,965 | 20.5% | 89,291 | 147 | 31 | 127/128 (99.2%) | 116/128 (90.6%) | 11 of 128 (8.6%) |
| strict, between lemmas only | 3,571 | 3.2% | 108,685 | 172 | 6 | 22/23 (95.7%) | 22/23 (95.7%) | 0 of 23 |
| loose | 25,816 | 23.0% | 86,440 | 145 | 33 | 144/146 (98.6%) | 133/146 (91.1%) | 11 of 146 (7.5%) |
| loose and the agreement check | 27,828 | 24.8% | 84,428 | 138 | 40 | 159/161 (98.8%) | 147/161 (91.3%) | 12 of 161 (7.5%) |

**Wrong on M1's words, read by hand**: each rule's disagreements with M1 (`m1-differ-<rule>.txt`) are the words of the table above: 2, 3, 4, 5, 8, 9, 10,
11, 12, 13, 14, and `τῶν` (Gen 4:4, the article the agreement check then chose from the wrong `πρωτοτόκων`); `φαγόμεθα` (`φαγεῖν V-FDI-1P` against
`ἐσθίω V-FMI-1P`) and `Ἀσσυρίων` (`Ἀσσύριος`, `Ἀσσύριοι`) are a convention, not an error. **The lemma is wrong on none.**

**Beside the bar** (99 in 100 lemma, 98 in 100 lemma and full parsing): every rule that saves more than 6 batches is **about 91 to 93 in 100** on the full
parsing of M1's words, five to seven times the errors the bar allows; at M1's rate the strict rule's 14,268 words would bring about 1,300 wrong
parsings, mostly a neuter written masculine. The rule that made no error saves 6 batches, and 0 of 23 cannot show a rate under 2 in 100 (the 95% bound
of 0 in 23 is about 12 in 100). One batch is a small sample from one part of one book; the shape of the errors (lxx-morph's masculine default where two
genders share an ending) is what to expect everywhere. **So it saves little: at most 6 of 178 batches at the bar's quality.**

## What it is good for: a second opinion on our own answers

The table above shows the other use. Where lxx-morph contradicts an answer layers 1, 2 or 2a already settled (4,639 words of 364,124: 2,945 parsings,
the rest lemmas, not counting conventions), it was right in 10 of the 16 read and Lampas in none. Layer 2 is contradicted on 5.5% of its parsings
and 5% of its lemmas, layer 1 on 0.4% and 0.3%. The known-answer runs (John 1: 99.9%) cannot see this: there layer 1 has the New Testament's own
analyses, and the Septuagint's names that share letters with a Greek word (`Σειών`, `Ἁμάν`, `Εἰού`) do not occur. **A list of those 4,639 words, sent
to the model as a recheck (about 7 batches), would find most of our own settled errors before the bar is judged.** The list is where to look, not an
answer: the model reads the verse and chooses among our candidates, and no reading of lxx-morph's enters the data (my reading, not legal advice).

## Licence and provenance

**lxx-morph's own terms** (at `c91f6b1`). `LICENSE-DATA`: "The morphology data under db/seeds/lxx_morph/ is licensed under the Creative Commons
Attribution 4.0 International License (CC BY 4.0)." and "Attribution suggestion: \"LXX morphology data by Seth Kushniryk, CC BY 4.0, derived from Rahlfs
Septuagint (Eliran Wong digital edition).\" Underlying source text: The Rahlfs Septuagint (1935) is in the public domain." `LICENSE`: ISC, "Copyright (c)
2026 Seth Kushniryk", for app/, lib/ and scripts/. `README.md`: "## Source text  Diplomatic Greek transcription derived from the Eliran Wong public-domain
digital edition of Rahlfs (1935)." The first commit (2026-06-01) says "Source text: Rahlfs Septuagint, public domain in Canada/EU."

**Where its text comes from.** eliranwong/LXX-Rahlfs-1935 `README.md` at `a1b5ff1`: "LXX-Rahlfs-1935 by Copyright 2017 Eliran Wong is licensed under a
Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. Based on a work at
http://ccat.sas.upenn.edu/gopher/text/religion/biblical/lxxmorph/." and "A derivative work based on CCAT data: main text used in this project is a
derivative work sourced from website below" ... "As a measure to control access of data related to CCAT materials, readers have to agree sending CCAT user
declaration before downloading any data from this repository. Please do not download if you do not agree." So **lxx-morph's surface text traces to CCAT's
(CATSS's) LXX through an edition that is not public domain**: CC BY-NC-SA, with CCAT's registration and no-commercial-use terms (quoted in
`docs/sources/septuagint-and-webster.md`, 'The CCAT question'). Calling it "the Eliran Wong public-domain digital edition" is lxx-morph's claim, not
eliranwong's. Rahlfs's 1935 text is out of copyright in some countries (as lxx-morph says, "Canada/EU"); the digital transcription is what carries terms.

**Whether CATSS morphology reaches its lemmas and parsings: yes.** `lib/tasks/lxx_morph_catss_overlay.rake`: "Apply CATSS_RIGHT audit verdicts as a FINAL
overlay (run after LC). Reverts only the tokens that would trip hard invariants; everything else from the audit becomes authoritative." It reads
`/tmp/catss_apply_corrections.tsv` (not in the repository) and writes each row's `new_value` into `lemma`, `pos` or `parsing` where the audit's verdict is
`CATSS_RIGHT`. `lxx_morph_demote_ambiguous.rake` lowers confidence from `/tmp/catss_ambig_residue.tsv`. `app/services/lxx_morph/lexical_corrections.rb`
names CATSS on 31 lines as the source of rules: "typo lemmas from CATSS comparison", "concrete fixes from CATSS-comparison disagreements (worst books)",
"declined proper-noun parsing fill. CATSS supplies parsing for declined Greek-form proper nouns where we left it empty", "the CATSS lemma audit". The
tokens the overlay changed are **not marked** in the data (no `source` or `confidence_reason` says CATSS), and the audit files are not published, so
they cannot be counted or taken out. (`lxx_morph_confidence.rake` says "No external corpora", of the confidence score only.)

**Which model made its choices: not said.** The batch files (`db/seeds/lxx_morph/<book>.batch_out/`) hold a model's choices among Morpheus's parses with
a one-line reasoning each ("genitive after ἀνὰ μέσον τοῦ, σκότος neut gen sg"); `lxx_morph_neutralize_attribution.rake` ("rename source and
confidence_reason values across all seed files to neutral, attribution-free terms") renamed `llm_override` to `explicitly_specified` and `fallback_agent`
to `augmented`. No file at this commit names the model or its maker (searched for Claude, Anthropic, OpenAI, GPT, Gemini, Sonnet, Opus, Haiku). The
history before 2026-06-01 is not published. Its Morpheus is the AmbroseCavalier fork, which `scripts/lxx_morph/README.md` says is "CC BY-SA 3.0 US" (Lampas
reads perseids-tools/morpheus as MPL-2.0, `docs/lxx-derivation.md`).

**What an MIT Lampas dataset would need if it took lxx-morph's readings** (my reading, not legal advice). CC BY 4.0 lets the readings be mixed into
data released under MIT, as TAGNT's are, with: the credit ("LXX morphology data by Seth Kushniryk"), a link to the licence, a link to the source at its
commit, and a note of the changes (mapped to TAGNT's codes, matched to Swete's words, only where a rule took it); in `data/lxx/LICENSE` and
`data/lxx/README.md` beside STEPBible's line, and an `ATTRIBUTION.md` entry. That is no more than TAGNT asks. **But CC BY from lxx-morph cannot grant
more than lxx-morph received**: where CATSS's lemma or parsing was written in by the overlay, CCAT's terms (no commercial use, every recipient
registered) may still reach it, as they reach CenterBLC's MIT data (`septuagint-and-webster.md`). Taking lxx-morph's readings into Lampas's MIT
annotations would carry an unmarked share of CATSS-derived values that could not be found and removed later.

## Does it lock Lampas in?

- **Used as a list of words to recheck** (the model chooses from the verse among our candidates): **no.** Nothing of lxx-morph enters Lampas's data or
  app; no credit is owed for a list of where to look (my reading); it can be dropped at any time and the data stays as it is.
- **Taken as answers**: no licence change (a credit line, as TAGNT), but the words it answered would carry its errors (about 9 in 100 parsings on hard
  words) and an unmarked CATSS share. If the CCAT question ever had to be answered by removal, every word it answered would have to be done again, and
  which they are would be known only from our own record of taking them. That is the lock-in to avoid.
