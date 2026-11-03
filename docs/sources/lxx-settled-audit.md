# The Septuagint's settled words: a hand audit of a random sample

Story mw-u2w5klk.24, 2026-11-03. The Governor asked (mw-u2w5klk, 2026-11-03) that "our results use the data/methods we decided on". This file measures how often
the words that layers 1 and 2 and the agreement check settle **without a model** are right. It reads a plain random sample of them, each word in its verse, using only
the sources `docs/lxx-derivation.md` names ('The sources', 'Morpheus, the second method'), Swete's Greek and Brenton's English. It measures. It fixes nothing.

<!-- toc -->

- [What was sampled](#what-was-sampled)
- [How a word was judged](#how-a-word-was-judged)
- [The counts](#the-counts)
  - [The whole word (lemma and parsing both right)](#the-whole-word-lemma-and-parsing-both-right)
  - [The lemma alone](#the-lemma-alone)
  - [The parsing alone](#the-parsing-alone)
  - [By book (the whole word)](#by-book-the-whole-word)
- [Against the bar](#against-the-bar)
- [What was wrong, by cause](#what-was-wrong-by-cause)
- [What this does not say](#what-this-does-not-say)
- [The pools](#the-pools)
- [The words](#the-words)

<!-- /toc -->

## What was sampled

- **The settled words** are the words `deriveBook` (`scripts/lxx/derive.ts`) gives a layer of 1, 2 or 2a (the agreement check). The derivation is the one a fresh checkout makes
  at commit `b9798a6c`: the pinned Swete, TAGNT and TBESG, **no Morpheus cache** (`data/lxx/morpheus/` is git-ignored, so a word settled through it would not be the same on every
  checkout) and **no choices file** (a choice is layer 3, which is not sampled). Of the 39 books' words, 310,457 are settled by layer 1 and 52,784 by layer 2 or 2a.
- **Two pools a book**: the words layer 1 settled, and the words layer 2 or the agreement check settled. From each pool of each of the 39 books, **6 words uniformly at random**,
  without replacement and with no other filter or weighting: 468 words. No book is short of either kind, so every book gives 12.
- **The draw** is `scripts/lxx/audit-sample.ts`. It uses mulberry32 seeded with **20261103** and the first six steps of a Fisher-Yates shuffle over the pool in the text's order.
  It draws the books in the order of `OLD_TESTAMENT` (`scripts/lxx/report.ts`), layer 1 before layer 2 or 2a, from one generator. Two runs print the same bytes.

```bash
npx tsx scripts/lxx/audit-sample.ts                    # the sample: each word with its candidates, notes, verse in Swete and verse in Brenton
npx tsx scripts/lxx/audit-sample.ts --book Nah         # one book's twelve (the draw is the same: every book is drawn in order)
npx tsx scripts/lxx/audit-sample.ts --morpheus         # with Morpheus's readings of each form; needs Docker and the lampas-morpheus image
npx tsx scripts/lxx/audit-sample.ts --count docs/sources/lxx-settled-audit.md   # the counts below, from this file's rows
```

## How a word was judged

- **Read in its verse.** For each word I read Swete's verse (the script prints ten words each side of it) and Brenton's English of the same verse (LXX2012, the file
  `npm run lxx:english` reads; the Greek numbering, Daniel 3 moved as `carriedAsGreek` moves it). The lemma and the parsing get a verdict each: **right**, **wrong** or **unsure**.
  A word is right only when both are.
- **Right means what TAGNT would write.** The derivation's lemmas and codes are TAGNT's, so its conventions are the standard: `ὅς, ἥ` and `τρεῖς, τρία` as lemmas,
  `ἔννατος` (TAGNT's lemma at Mat 20:5), `φαγεῖν` and `εἴδω`, D, N and O for a deponent's voice, INJ for ἰδού, PREP for every ἔμπροσθεν and ὡσεί, COND for every εἰ.
  Where a convention decided a verdict I read TAGNT's own rows: the address `αἰνεῖτε … πάντες οἱ δοῦλοι αὐτοῦ` is `A-VPM T-VPM N-VPM` (Rev 19:5; also Rev 12:12),
  and ἔμπροσθεν is PREP even as an adverb (Php 3:13, Rev 4:6). A lemma from TBESG is right when TBESG writes it so (`ῥίν`, G9027). A name read as its own form
  ('Names no lexicon has') is right when the case and gender are.
- **Wrong** means the verse rules the answer out. **Unsure** means the verse leaves it open, or TAGNT's convention for the word cannot be told from its data.
- **Morpheus** (the pinned image `lampas-morpheus`, commit `ab6898ff`) was run on **every** sampled form, not only those whose reading was not plain, with
  `--morpheus`: its mapped readings, and what the mapping leaves out as Morpheus printed it. The evidence column cites it where it bore on the verdict; where it says
  'Morpheus the same', its mapped readings hold the derived lemma and parsing. Morpheus settles nothing here: it is a second reading, as in the derivation.
- No other source was read: no other tagged Septuagint, no web search, not lxx-morph.

## The counts

`npx tsx scripts/lxx/audit-sample.ts --count docs/sources/lxx-settled-audit.md` prints these from the rows below. The interval is Wilson's, at 95%.
'Right of those judged' leaves the unsure out. 'Right of all' counts an unsure word as not right.

### The whole word (lemma and parsing both right)

| | words | right | wrong | unsure | right of those judged (95% interval) | right of all, unsure as not right (95% interval) |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| all | 468 | 460 | 7 | 1 | 98.5% (96.9% to 99.3%) | 98.3% (96.7% to 99.1%) |
| layer 1 | 234 | 231 | 3 | 0 | 98.7% (96.3% to 99.6%) | 98.7% (96.3% to 99.6%) |
| layer 2 or 2a | 234 | 229 | 4 | 1 | 98.3% (95.7% to 99.3%) | 97.9% (95.1% to 99.1%) |
| of which layer 2 | 139 | 134 | 4 | 1 | 97.1% (92.8% to 98.9%) | 96.4% (91.9% to 98.5%) |
| of which layer 2a | 95 | 95 | 0 | 0 | 100.0% (96.1% to 100.0%) | 100.0% (96.1% to 100.0%) |

### The lemma alone

| | words | right | wrong | unsure | right of those judged (95% interval) | right of all, unsure as not right (95% interval) |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| all | 468 | 466 | 2 | 0 | 99.6% (98.5% to 99.9%) | 99.6% (98.5% to 99.9%) |
| layer 1 | 234 | 234 | 0 | 0 | 100.0% (98.4% to 100.0%) | 100.0% (98.4% to 100.0%) |
| layer 2 or 2a | 234 | 232 | 2 | 0 | 99.1% (96.9% to 99.8%) | 99.1% (96.9% to 99.8%) |
| of which layer 2 | 139 | 137 | 2 | 0 | 98.6% (94.9% to 99.6%) | 98.6% (94.9% to 99.6%) |
| of which layer 2a | 95 | 95 | 0 | 0 | 100.0% (96.1% to 100.0%) | 100.0% (96.1% to 100.0%) |

### The parsing alone

| | words | right | wrong | unsure | right of those judged (95% interval) | right of all, unsure as not right (95% interval) |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| all | 468 | 460 | 7 | 1 | 98.5% (96.9% to 99.3%) | 98.3% (96.7% to 99.1%) |
| layer 1 | 234 | 231 | 3 | 0 | 98.7% (96.3% to 99.6%) | 98.7% (96.3% to 99.6%) |
| layer 2 or 2a | 234 | 229 | 4 | 1 | 98.3% (95.7% to 99.3%) | 97.9% (95.1% to 99.1%) |
| of which layer 2 | 139 | 134 | 4 | 1 | 97.1% (92.8% to 98.9%) | 96.4% (91.9% to 98.5%) |
| of which layer 2a | 95 | 95 | 0 | 0 | 100.0% (96.1% to 100.0%) | 100.0% (96.1% to 100.0%) |

### By book (the whole word)

| book | layer 1: right / wrong / unsure | layer 2 or 2a: right / wrong / unsure |
| --- | --- | --- |
| Gen | 6 / 0 / 0 | 6 / 0 / 0 |
| Exo | 6 / 0 / 0 | 6 / 0 / 0 |
| Lev | 6 / 0 / 0 | 6 / 0 / 0 |
| Num | 6 / 0 / 0 | 6 / 0 / 0 |
| Deu | 6 / 0 / 0 | 6 / 0 / 0 |
| Jos | 6 / 0 / 0 | 6 / 0 / 0 |
| Jdg | 6 / 0 / 0 | 6 / 0 / 0 |
| Rut | 6 / 0 / 0 | 6 / 0 / 0 |
| 1Sa | 6 / 0 / 0 | 6 / 0 / 0 |
| 2Sa | 5 / 1 / 0 | 6 / 0 / 0 |
| 1Ki | 6 / 0 / 0 | 5 / 0 / 1 |
| 2Ki | 6 / 0 / 0 | 6 / 0 / 0 |
| 1Ch | 6 / 0 / 0 | 6 / 0 / 0 |
| 2Ch | 6 / 0 / 0 | 6 / 0 / 0 |
| Ezr | 6 / 0 / 0 | 6 / 0 / 0 |
| Neh | 6 / 0 / 0 | 6 / 0 / 0 |
| Est | 6 / 0 / 0 | 6 / 0 / 0 |
| Job | 6 / 0 / 0 | 5 / 1 / 0 |
| Psa | 5 / 1 / 0 | 6 / 0 / 0 |
| Pro | 6 / 0 / 0 | 5 / 1 / 0 |
| Ecc | 6 / 0 / 0 | 5 / 1 / 0 |
| Sol | 6 / 0 / 0 | 6 / 0 / 0 |
| Isa | 6 / 0 / 0 | 6 / 0 / 0 |
| Jer | 6 / 0 / 0 | 6 / 0 / 0 |
| Lam | 6 / 0 / 0 | 6 / 0 / 0 |
| Eze | 6 / 0 / 0 | 6 / 0 / 0 |
| Dan | 6 / 0 / 0 | 6 / 0 / 0 |
| Hos | 6 / 0 / 0 | 6 / 0 / 0 |
| Joe | 5 / 1 / 0 | 6 / 0 / 0 |
| Amo | 6 / 0 / 0 | 6 / 0 / 0 |
| Oba | 6 / 0 / 0 | 6 / 0 / 0 |
| Jon | 6 / 0 / 0 | 6 / 0 / 0 |
| Mic | 6 / 0 / 0 | 6 / 0 / 0 |
| Nah | 6 / 0 / 0 | 5 / 1 / 0 |
| Hab | 6 / 0 / 0 | 6 / 0 / 0 |
| Zep | 6 / 0 / 0 | 6 / 0 / 0 |
| Hag | 6 / 0 / 0 | 6 / 0 / 0 |
| Zec | 6 / 0 / 0 | 6 / 0 / 0 |
| Mal | 6 / 0 / 0 | 6 / 0 / 0 |

## Against the bar

`docs/lxx-derivation.md` 'The bar' holds a book to **at least 98 words in 100 with the lemma and the whole parsing right**, and 99 in 100 for the lemma. It measures
both on known-answer New Testament chapters. Here the same two numbers are set beside the sample:

- **The whole word: 460 of the 467 judged, 98.5%, with an interval of 96.9% to 99.3%.** The interval holds 98%, so this sample cannot say whether the settled words are
  above or below 98 in 100. Its estimate is above. At this rate, an interval whose lower end clears 98% would need a sample of roughly 2,300 words.
- **The lemma alone: 466 of 468, 99.6% (98.5% to 99.9%).** That interval holds 99% too.
- **By layer.** Layer 1: 231 of 234, 98.7% (96.3% to 99.6%). Layer 2 or 2a: 229 of 233 judged, 98.3% (95.7% to 99.3%). Inside that pool, layer 2 alone gave 134 of 138 judged,
  97.1% (92.8% to 98.9%). Its estimate is under 98%, and all four of the pool's wrong words are layer 2's. The agreement check (2a) gave 95 of 95.
- **Three of the seven wrong words are a convention.** They are an address that TAGNT tags vocative and the derivation calls nominative on purpose (cause A below). If the vocative
  is taken as the nominative put to that use, as `agreement.ts` takes it, the whole word is 463 of 467, 99.1%.

## What was wrong, by cause

Seven words wrong and one unsure; the row of each, below, gives the evidence. Grouped by what made the answer, with the file and function behind it.

**A. An address settled as a nominative: 3 words, all layer 1, parsing only.**

| Word | Settled | The verse needs |
| --- | --- | --- |
| 2Sa.13:20#19 ἀδελφή | ἀδελφή N-NSF | N-VSF: καὶ νῦν, ἀδελφή μου, κώφευσον |
| Psa.148:2#5 ἄγγελοι | ἄγγελος N-NPM | N-VPM: αἰνεῖτε αὐτόν, πάντες οἱ ἄγγελοι αὐτοῦ |
| Joe.1:5#10 πάντες | πᾶς A-NPM | A-VPM: θρηνήσατε, πάντες οἱ πίνοντες οἶνον |

Cause: layer 1 takes the New Testament's analyses of the form (`settle`, `scripts/lxx/tagnt.ts`). The New Testament never has ἀδελφή or ἄγγελοι as a vocative, so the vocative is no
candidate. πάντες has A-VPM 7 times in 179, and the 95%-of-20 rule takes A-NPM. The agreement check does not reopen them. Its shared-ending rule leaves the vocative out on purpose
(`TAGNT_EVIDENCE` in `scripts/lxx/agreement.ts`: "A vocative is not counted: ὁ θεός as an address is the nominative put to that use"). TAGNT itself tags this very construction vocative
(Rev 19:5 `πάντες οἱ δοῦλοι αὐτοῦ`, A-VPM T-VPM N-VPM). So these are wrong against the standard the bar measures by, and right by the derivation's own stated choice. Which one Lampas
wants is a decision, not a bug to fix in passing.

**B. The rule with more New Testament lemmas behind it beat the reading the verse needs: 2 words, layer 2.**

| Word | Settled | The verse needs |
| --- | --- | --- |
| Job.18:10#12 τρίβων | τρίβω V-PAP-NSM (support 123 of 133) | τρίβος N-GPF (support 3): ἐπὶ τρίβων, 'by the path' |
| Pro.11:22#4 ῥινὶ | ῥίν N-NPF (support 42 of 45) | ῥίν N-DSF (support 3): ἐν ῥινὶ ὑός, 'in a swine's snout' |

Cause: `settleParsed` (`scripts/lxx/parser.ts`) takes a candidate with 90% of the support. The support is the number of New Testament lemmas behind the rule (`parse`,
`trainRules`), and nothing of the verse. In both words the right reading was among the candidates, and the preposition just before (ἐπί, ἐν) names the case the winner lacks.
No check reads a preposition's case. In ῥινί the winning rule, 'ριν-ι as ριν-' (an ι added to the lemma), is the first declension's nominative plural (ἡμέρα, ἡμέραι) put on a
third-declension noun.

**C. A lone candidate taken whatever its support: 2 words, layer 2.**

| Word | Settled | The verse needs |
| --- | --- | --- |
| Ecc.2:16#9 ἄφρονος | ἄφρων A-GSF-C (one rule, seen on one lemma) | ἄφρων A-GSM: μετὰ τοῦ ἄφρονος, 'with the fool' |
| Nah.2:1#2 ἐξῆρται | ἐξαρτάω V-IAI-3S | ἐξαίρω V-RPI-3S: Συντετέλεσται, ἐξῆρται, 'it is all over, he has been removed' |

Cause: `settleParsed` (`scripts/lxx/parser.ts`) takes a candidate when it is the only one, however thin its support. 'Layer 2 in detail' calls this 'one candidate is left'. In
Ecclesiastes the one rule, 'αφρ-ονοσ as αφρ-ων', came from a comparative (the -C of A-GSF-C) and was put on a positive adjective. The article before it, τοῦ, is masculine or
neuter. The agreement check (`scripts/lxx/agreement.ts`) leaves that article pending and does not count it a break, so nothing doubts the feminine. In Nahum, `unaugment` and the
rules never reach the perfect of ἐξαίρω. The rule 'εξαρτα-ι as εξαρτα-ω, augment undone' read -ται as a stem in -τα. Morpheus knows the form ('ἐξαίρω perf ind mp 3rd sg'), but
its perfects are unmapped (`mapAnalysis`, `scripts/lxx/morpheus.ts`), and it is asked only of forms with no candidate.

**Unsure: 1 word.** 1Ki.11:27#6 ἐπήρατο, ἐπαίρω V-ADI-3S: aorist middle indicative third singular is right. Whether TAGNT would write D or M, its data cannot settle. It writes this verb's
present middle M (V-PMI-3S, V-PMP-ASN), but the aorist middle of ἀπωθέω, also not deponent, D (Acts 7:27 ἀπώσατο, V-ADI-3S). The New Testament has no aorist middle of ἐπαίρω.

## What this does not say

- **It is the rate of this sample, not of the 39 books.** Each book gives 12 words and each pool 6, whatever its size. So Obadiah weighs as much as the Psalms. Layer 2 and 2a
  are half the sample but 14.5% of the settled words (52,784 of 363,241). The 'all' line is not an estimate for the books' settled words as a whole, and no weighting was done.
- **Per book, 6 words a pool say little.** A book's row is for finding where the wrong words fell, not for ranking books.
- **It says nothing of the words left pending,** of the model's choices (layer 3) or of the words a Morpheus cache would settle through the agreement check.
- **Twelve words a book is not enough to see rare causes.** The three causes above are what 468 words showed. A rarer cause would need a larger sample.

## The pools

The settled words of each book that the draw took from (printed by the script at the head of each book).

| Book | Layer 1 | Layer 2 or 2a |
| --- | ---: | ---: |
| Gen | 21,622 | 3,041 |
| Exo | 15,459 | 3,064 |
| Lev | 11,836 | 2,588 |
| Num | 15,594 | 3,058 |
| Deu | 15,661 | 2,383 |
| Jos | 9,604 | 1,696 |
| Jdg | 10,557 | 1,491 |
| Rut | 1,423 | 206 |
| 1Sa | 13,339 | 1,856 |
| 2Sa | 11,971 | 1,740 |
| 1Ki | 13,358 | 2,142 |
| 2Ki | 12,223 | 1,981 |
| 1Ch | 9,238 | 1,599 |
| 2Ch | 13,767 | 2,428 |
| Ezr | 3,270 | 597 |
| Neh | 4,723 | 830 |
| Est | 3,661 | 689 |
| Job | 8,606 | 1,428 |
| Psa | 22,714 | 4,247 |
| Pro | 6,773 | 1,296 |
| Ecc | 2,938 | 464 |
| Sol | 1,210 | 320 |
| Isa | 18,055 | 2,893 |
| Jer | 19,794 | 3,035 |
| Lam | 1,549 | 301 |
| Eze | 19,148 | 3,364 |
| Dan | 7,178 | 1,354 |
| Hos | 2,522 | 463 |
| Joe | 1,022 | 204 |
| Amo | 2,130 | 386 |
| Oba | 292 | 48 |
| Jon | 794 | 112 |
| Mic | 1,494 | 256 |
| Nah | 564 | 138 |
| Hab | 655 | 142 |
| Zep | 816 | 150 |
| Hag | 623 | 131 |
| Zec | 3,316 | 520 |
| Mal | 958 | 143 |

## The words

One row a sampled word, in the order of the draw (each book: its six of layer 1, then its six of layer 2 or 2a, each six in the text's order). `form` is Swete's word with its
punctuation dropped (his brackets kept); `lemma` and `parsing` are what the derivation settled; `layer` is 1, 2 or 2a; the two verdicts are for the lemma and the parsing; `evidence` is
what was read: the words of the verse that decide it, Brenton's English where it helps (in quotes), TAGNT's rows where a convention decided, and Morpheus's reading.

| ref | form | lemma | parsing | layer | lemma | parsing | evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gen.15:18#15 | ταύτην | οὗτος | D-ASF | 1 | right | right | τὴν γῆν ταύτην; Brenton 'this land' |
| Gen.26:31#19 | σωτηρίας | σωτηρία | N-GSF | 1 | right | right | μετὰ σωτηρίας, 'in safety' |
| Gen.27:19#29 | ἡ | ὁ | T-NSF | 1 | right | right | ἡ ψυχή σου, subject of εὐλογήσῃ |
| Gen.29:28#5 | καὶ | καί | CONJ | 1 | right | right | verse |
| Gen.41:2#2 | ἰδοὺ | ἰδού | INJ | 1 | right | right | καὶ ἰδού, 'and behold' (TAGNT writes INJ) |
| Gen.44:11#12 | καὶ | καί | CONJ | 1 | right | right | verse |
| Gen.1:30#3 | [τοῖ]ς | ὁ | T-DPN | 2a | right | right | τοῖς θηρίοις, neuter dative plural |
| Gen.4:5#10 | προσέσχεν | προσέχω | V-2AAI-3S | 2 | right | right | οὐ προσέσχεν, 'regarded not'; Morpheus the same |
| Gen.26:18#14 | τοῦ | ὁ | T-GSM | 2a | right | right | Ἀβραὰμ τοῦ πατρὸς αὐτοῦ |
| Gen.28:11#2 | ἀπήντησεν | ἀπαντάω | V-AAI-3S | 2 | right | right | ἀπήντησεν τόπῳ, 'came to a place'; Morpheus the same |
| Gen.39:5#40 | τῷ | ὁ | T-DSM | 2a | right | right | ἐν τῷ ἀγρῷ |
| Gen.46:5#19 | ἀποσκευὴν | ἀποσκευή | N-ASF | 2 | right | right | τὴν ἀποσκευήν, 'the baggage'; Morpheus the same |
| Exo.4:31#7 | ὅτι | ὅτι | CONJ | 1 | right | right | ἐχάρη ὅτι ἐπεσκέψατο, 'because' |
| Exo.9:6#8 | ἐπαύριον | ἐπαύριον | ADV | 1 | right | right | τῇ ἐπαύριον, 'on the next day' |
| Exo.16:28#2 | δὲ | δέ | CONJ | 1 | right | right | εἶπεν δέ |
| Exo.30:36#23 | ἔσται | εἰμί | V-FDI-3S | 1 | right | right | ἅγιον τῶν ἁγίων ἔσται ὑμῖν; Morpheus fut ind mid (TAGNT writes D) |
| Exo.32:27#1 | καὶ | καί | CONJ | 1 | right | right | verse |
| Exo.40:1#6 | λέγων | λέγω | V-PAP-NSM | 1 | right | right | ἐλάλησεν Κύριος … λέγων |
| Exo.2:23#31 | τῶν | ὁ | T-GPN | 2a | right | right | ἀπὸ τῶν ἔργων |
| Exo.14:30#5 | Ἰσραὴλ | Ἰσραήλ | N-ASM | 2a | right | right | ἐρρύσατο … τὸν Ἰσραήλ, object |
| Exo.21:34#3 | τοῦ | ὁ | T-GSM | 2a | right | right | ὁ κύριος τοῦ λάκκου |
| Exo.22:3#16 | πραθήτω | πιπράσκω | V-APM-3S | 2 | right | right | 'let him be sold'; Morpheus aor imperat pass 3rd sg |
| Exo.26:37#6 | στύλους | στῦλος | N-APM | 2 | right | right | πέντε στύλους, 'five posts'; Morpheus the same |
| Exo.29:5#17 | ἐπωμίδα | ἐπωμίς | N-ASF | 2 | right | right | τὴν ἐπωμίδα, 'the ephod'; Morpheus the same |
| Lev.7:2#28 | ἐν | ἐν | PREP | 1 | right | right | πεφυραμένην ἐν ἐλαίῳ |
| Lev.9:22#16 | τῆς | ὁ | T-GSF | 1 | right | right | τὸ περὶ τῆς ἁμαρτίας |
| Lev.13:39#23 | τῆς | ὁ | T-GSF | 1 | right | right | ἐν τῷ δέρματι τῆς σαρκός |
| Lev.14:7#4 | τὸν | ὁ | T-ASM | 1 | right | right | ἐπὶ τὸν καθαρισθέντα |
| Lev.19:33#9 | γῇ | γῆ | N-DSF | 1 | right | right | ἐν τῇ γῇ ὑμῶν |
| Lev.21:5#3 | οὐ | οὐ | PRT-N | 1 | right | right | οὐ ξυρηθήσεσθε |
| Lev.2:2#40 | τῷ | ὁ | T-DSM | 2a | right | right | ὀσμὴ εὐωδίας τῷ κυρίῳ |
| Lev.2:9#6 | θυσίας | θυσία | N-GSF | 2a | right | right | ἀπὸ τῆς θυσίας, 'from the sacrifice' |
| Lev.2:13#22 | τῷ | ὁ | T-DSM | 2a | right | right | Κυρίῳ τῷ θεῷ ὑμῶν |
| Lev.16:14#4 | τοῦ | ὁ | T-GSN | 2a | right | right | ἀπὸ τοῦ αἵματος |
| Lev.22:18#50 | τῷ | ὁ | T-DSM | 2a | right | right | προσενέγκωσιν τῷ θεῷ |
| Lev.26:21#18 | ἁμαρτίας | ἁμαρτία | N-APF | 2a | right | right | κατὰ τὰς ἁμαρτίας ὑμῶν, 'according to your sins' |
| Num.6:26#6 | ἐπὶ | ἐπί | PREP | 1 | right | right | ἐπὶ σέ, 'upon you' |
| Num.7:85#14 | ἡ | ὁ | T-NSF | 1 | right | right | ἡ φιάλη ἡ μία |
| Num.16:3#20 | καὶ | καί | CONJ | 1 | right | right | καὶ διὰ τί |
| Num.29:11#19 | ἡ | ὁ | T-NSF | 1 | right | right | ἡ ὁλοκαύτωσις |
| Num.30:10#7 | ἂν | ἄν | PRT | 1 | right | right | ὅσα ἂν εὔξηται |
| Num.35:13#4 | ἃς | ὅς, ἥ | R-APF | 1 | right | right | αἱ πόλεις ἃς δώσετε (TAGNT's lemma 'ὅς, ἥ') |
| Num.3:30#7 | δήμων | δῆμος | N-GPM | 2 | right | right | τῶν δήμων, 'of the divisions'; Morpheus the same |
| Num.3:35#7 | δήμου | δῆμος | N-GSM | 2 | right | right | τοῦ δήμου τοῦ Μεραρεί; Morpheus the same |
| Num.9:13#20 | ψυχὴ | ψυχή | N-NSF | 2a | right | right | ἐξολεθρευθήσεται ἡ ψυχὴ ἐκείνη, subject |
| Num.22:6#29 | εὐλογήσῃς | εὐλογέω | V-AAS-2S | 2 | right | right | οὓς ἐὰν εὐλογήσῃς σύ; Morpheus the same |
| Num.28:6#6 | τῷ | ὁ | T-DSN | 2a | right | right | ἐν τῷ ὄρει |
| Num.33:4#8 | τεθνηκότας | θνῄσκω | V-RAP-APM | 2 | right | right | τοὺς τεθνηκότας, 'those that died'; Morpheus perf part act masc acc pl |
| Deu.8:6#14 | φοβεῖσθαι | φοβέω | V-PNN | 1 | right | right | καὶ φοβεῖσθαι αὐτόν, 'to fear him' (TAGNT's N for the middle-passive deponent) |
| Deu.19:17#13 | καὶ | καί | CONJ | 1 | right | right | ἔναντι Κυρίου καὶ ἔναντι |
| Deu.27:23#3 | κοιμώμενος | κοιμάω | V-PMP-NSM | 1 | right | right | ὁ κοιμώμενος μετὰ νύμφης, 'he that lies with'; Morpheus pres mid or pass |
| Deu.27:23#16 | μετὰ | μετά | PREP | 1 | right | right | μετὰ ἀδελφῆς |
| Deu.28:53#25 | σου | σύ | P-2GS | 1 | right | right | ἐν τῇ θλίψει σου |
| Deu.34:7#8 | ἐν | ἐν | PREP | 1 | right | right | ἐν τῷ τελευτᾶν αὐτόν |
| Deu.6:11#22 | ἐμπλησθεὶς | ἐμπίμπλημι | V-APP-NSM | 2 | right | right | φαγὼν καὶ ἐμπλησθείς, 'been filled'; Morpheus the same (LSJ's spelling ἐμπίπλημι) |
| Deu.12:1#9 | φυλάξετε | φυλάσσω | V-FAI-2P | 2 | right | right | ἃς φυλάξετε τοῦ ποιεῖν, 'you shall observe'; Morpheus fut or aor subj |
| Deu.15:14#2 | ἐφοδιάσεις | ἐφοδιάζω | V-FAI-2S | 2 | right | right | ἐφόδιον ἐφοδιάσεις αὐτόν, 'you shall give him provision'; Morpheus the same |
| Deu.17:12#16 | λειτουργεῖν | λειτουργέω | V-PAN | 2 | right | right | τοῦ παρεστηκότος λειτουργεῖν, 'to minister'; Morpheus the same |
| Deu.22:18#4 | γερουσία | γερουσία | N-NSF | 2a | right | right | λήμψεται ἡ γερουσία, subject; Morpheus nom or voc |
| Deu.28:67#28 | τῶν | ὁ | T-GPM | 2a | right | right | τῶν ὀφθαλμῶν σου |
| Jos.3:15#19 | ἱερέων | ἱερεύς | N-GPM | 1 | right | right | οἱ πόδες τῶν ἱερέων, 'the feet of the priests' |
| Jos.6:11#15 | ἐκοιμήθη | κοιμάω | V-API-3S | 1 | right | right | καὶ ἐκοιμήθη ἐκεῖ, 'lodged there' |
| Jos.8:3#8 | ὁ | ὁ | T-NSM | 1 | right | right | πᾶς ὁ λαὸς ὁ πολεμιστής |
| Jos.13:21#31 | τὸν | ὁ | T-ASM | 1 | right | right | καὶ τὸν Σούρ |
| Jos.15:13#17 | ἔδωκεν | δίδωμι | V-AAI-3S | 1 | right | right | ἔδωκεν αὐτῷ Ἰησοῦς |
| Jos.24:4#22 | υἱοὶ | υἱός | N-NPM | 1 | right | right | οἱ υἱοὶ αὐτοῦ κατέβησαν, subject |
| Jos.3:15#20 | τῶν | ὁ | T-GPM | 2a | right | right | τῶν ἱερέων τῶν αἰρόντων |
| Jos.5:15#4 | ἀρχιστράτηγος | ἀρχιστράτηγος | N-NSM | 2a | right | right | λέγει ὁ ἀρχιστράτηγος Κυρίου; Morpheus the same |
| Jos.10:4#9 | ἐκπολεμήσωμεν | ἐκπολεμέω | V-AAS-1P | 2 | right | right | καὶ ἐκπολεμήσωμεν Γαβαών, 'let us take'; Morpheus the same |
| Jos.14:6#30 | τοῦ | ὁ | T-GSM | 2a | right | right | ἄνθρωπον τοῦ θεοῦ |
| Jos.15:11#29 | τῶν | ὁ | T-GPN | 2a | right | right | ἡ διέξοδος τῶν ὁρίων (ὅριον, neuter) |
| Jos.24:7#2 | ἀνεβοήσαμεν | ἀναβοάω | V-AAI-1P | 2 | right | right | 'we cried aloud'; Morpheus the same |
| Jdg.1:35#28 | χεὶρ | χείρ | N-NSF | 1 | right | right | ἐβαρύνθη χεὶρ οἴκου Ἰωσήφ, subject |
| Jdg.6:17#16 | σήμερον | σήμερον | ADV | 1 | right | right | ποιήσεις μοι σήμερον, 'this day' |
| Jdg.15:2#17 | ἐκ | ἐκ | PREP | 1 | right | right | ἑνὶ τῶν ἐκ τῶν φίλων σου |
| Jdg.15:17#11 | τῆς | ὁ | T-GSF | 1 | right | right | ἐκ τῆς χειρὸς αὐτοῦ |
| Jdg.19:27#34 | καὶ | καί | CONJ | 1 | right | right | καὶ αἱ χεῖρες αὐτῆς |
| Jdg.20:33#11 | ἐν | ἐν | PREP | 1 | right | right | συνῆψαν ἐν Βάαλ Θαμάρ |
| Jdg.1:14#11 | τοῦ | ὁ | T-GSN | 2a | right | right | τοῦ αἰτῆσαι, the article of an infinitive |
| Jdg.7:3#17 | ἐκχωρείτω | ἐκχωρέω | V-PAM-3S | 2 | right | right | ἐπιστρεφέτω καὶ ἐκχωρείτω, 'let him depart'; Morpheus the same |
| Jdg.9:32#15 | τῷ | ὁ | T-DSM | 2a | right | right | ἐν τῷ ἀγρῷ |
| Jdg.13:5#30 | τοῦ | ὁ | T-GSN | 2a | right | right | ἄρξεται τοῦ σῶσαι, the article of an infinitive |
| Jdg.13:9#2 | εἰσήκουσεν | εἰσακούω | V-AAI-3S | 2 | right | right | εἰσήκουσεν ὁ θεὸς τῆς φωνῆς, 'heard'; Morpheus the same |
| Jdg.16:9#8 | ταμείῳ | ταμεῖον | N-DSN | 2 | right | right | ἐν τῷ ταμείῳ, 'in the chamber'; Morpheus the same |
| Rut.1:20#10 | καλέσατέ | καλέω | V-AAM-2P | 1 | right | right | μὴ καλεῖτέ με … καλέσατέ με Πικράν, 'call me Bitter' |
| Rut.3:3#11 | ἐπὶ | ἐπί | PREP | 1 | right | right | περιθήσεις τὸν ἱματισμόν σου ἐπὶ σέ |
| Rut.3:9#13 | δούλη | δούλη | N-NSF | 1 | right | right | ἐγώ εἰμι Ῥοὺθ ἡ δούλη σου, nominative |
| Rut.3:12#5 | ἐγώ | ἐγώ | P-1NS | 1 | right | right | ἀγχιστεὺς ἐγώ εἰμι |
| Rut.3:14#27 | τὴν | ὁ | T-ASF | 1 | right | right | εἰς τὴν ἅλωνα |
| Rut.4:13#4 | τὴν | ὁ | T-ASF | 1 | right | right | ἔλαβεν Βόος τὴν Ῥούθ |
| Rut.1:1#22 | παροικῆσαι | παροικέω | V-AAN | 2 | right | right | τοῦ παροικῆσαι, 'to sojourn'; Morpheus the same |
| Rut.2:3#8 | κατόπισθεν | κατόπισθεν | PREP | 2 | right | right | κατόπισθεν τῶν θεριζόντων, 'behind the reapers', with a genitive; Morpheus ADV |
| Rut.2:21#16 | παιδαρίων | παιδάριον | N-GPN | 2 | right | right | μετὰ τῶν παιδαρίων μου; Morpheus neut gen pl |
| Rut.2:23#5 | κορασίοις | κοράσιον | N-DPN | 2 | right | right | προσεκολλήθη … τοῖς κορασίοις, 'joined herself to the damsels'; Morpheus neut dat pl |
| Rut.4:1#14 | παρεπορεύετο | παραπορεύομαι | V-INI-3S | 2 | right | right | ὁ ἀγχιστευτὴς παρεπορεύετο, 'passed by'; Morpheus the same |
| Rut.4:3#5 | ἀγχιστεῖ | ἀγχιστεύς | N-DSM | 2 | right | right | εἶπεν Βόος τῷ ἀγχιστεῖ, 'to the relative'; Morpheus the same |
| 1Sa.1:20#20 | Ὅτι | ὅτι | CONJ | 1 | right | right | εἶπεν Ὅτι παρὰ Κυρίου … ᾐτησάμην αὐτόν, 'Because I asked him' |
| 1Sa.6:5#29 | καὶ | καί | CONJ | 1 | right | right | καὶ ἀπὸ τῆς γῆς ὑμῶν |
| 1Sa.13:7#1 | καὶ | καί | CONJ | 1 | right | right | verse |
| 1Sa.16:20#8 | οἴνου | οἶνος | N-GSM | 1 | right | right | ἀσκὸν οἴνου, 'a bottle of wine' |
| 1Sa.20:24#18 | φαγεῖν | φαγεῖν | V-AAN | 1 | right | right | ἐπὶ τὴν τράπεζαν τοῦ φαγεῖν, 'to eat' (TAGNT's lemma and code; Morpheus ἐσθίω 2nd aor inf) |
| 1Sa.21:3#11 | εἰς | εἰς | PREP | 1 | right | right | δὸς εἰς χεῖρά μου |
| 1Sa.8:15#13 | εὐνούχοις | εὐνοῦχος | N-DPM | 2 | right | right | δώσει τοῖς εὐνούχοις αὐτοῦ, 'to his eunuchs'; Morpheus the same |
| 1Sa.14:15#34 | Κύριου | κύριος | N-GSM | 2 | right | right | ἔκστασις παρὰ Κυρίου, 'from the Lord' (the print's accent); unknown to Morpheus as printed |
| 1Sa.17:32#20 | πολεμήσει | πολεμέω | V-FAI-3S | 2 | right | right | πορεύσεται καὶ πολεμήσει, 'will go and fight'; Morpheus the same |
| 1Sa.17:38#6 | μανδύαν | μανδύας | N-ASM | 2 | right | right | ἐνέδυσεν … τὸν Δαυεὶδ μανδύαν, 'a military coat'; unknown to Morpheus |
| 1Sa.20:15#10 | τοῦ | ὁ | T-GSM | 2a | right | right | ἕως τοῦ αἰῶνος |
| 1Sa.25:2#29 | τῷ | ὁ | T-DSN | 2a | right | right | ἐν τῷ κείρειν, the article of an infinitive |
| 2Sa.2:23#20 | ἐν | ἐν | PREP | 1 | right | right | τύπτει αὐτὸν … ἐν τῷ ὀπίσω τοῦ δόρατος |
| 2Sa.4:5#17 | εἰς | εἰς | PREP | 1 | right | right | εἰσῆλθον … εἰς οἶκον |
| 2Sa.8:11#18 | πασῶν | πᾶς | A-GPF | 1 | right | right | ἐκ πασῶν τῶν πόλεων |
| 2Sa.13:20#19 | ἀδελφή | ἀδελφή | N-NSF | 1 | right | wrong | καὶ νῦν, ἀδελφή μου, κώφευσον, 'now then, my sister, be silent': an address, N-VSF; the New Testament has the form only as N-NSF (8), so layer 1 had no other analysis; Morpheus nom or voc |
| 2Sa.15:2#7 | χεῖρα | χείρ | N-ASF | 1 | right | right | ἀνὰ χεῖρα τῆς ὁδοῦ, 'by the side of the way' |
| 2Sa.15:25#18 | ἐν | ἐν | PREP | 1 | right | right | ἐν ὀφθαλμοῖς Κυρίου |
| 2Sa.1:22#10 | ἀπεστράφη | ἀποστρέφω | V-2API-3S | 2 | right | right | τόξον … οὐκ ἀπεστράφη κενόν, 'returned not empty'; Morpheus the same |
| 2Sa.7:25#28 | ἐλάλησας | λαλέω | V-AAI-2S | 2 | right | right | καθὼς ἐλάλησας, 'as you have said'; Morpheus the same |
| 2Sa.16:19#9 | τοῦ | ὁ | T-GSM | 2a | right | right | ἐνώπιον τοῦ υἱοῦ αὐτοῦ |
| 2Sa.18:29#18 | τοῦ | ὁ | T-GSN | 2a | right | right | τοῦ ἀποστεῖλαι, the article of an infinitive |
| 2Sa.24:13#26 | τρεῖς | τρεῖς, τρία | A-APM | 2a | right | right | τρεῖς μῆνας φεύγειν σε, 'three months' |
| 2Sa.24:15#25 | θραῦσις | θραῦσις | N-NSF | 2a | right | right | ἤρξατο ἡ θραῦσις, 'the plague began'; Morpheus the same |
| 1Ki.1:24#18 | θρόνου | θρόνος | N-GSM | 1 | right | right | ἐπὶ τοῦ θρόνου μου |
| 1Ki.8:5#4 | καὶ | καί | CONJ | 1 | right | right | ὁ βασιλεὺς καὶ πᾶς Ἰσραήλ |
| 1Ki.8:36#1 | καὶ | καί | CONJ | 1 | right | right | verse |
| 1Ki.12:24#433 | τὸν | ὁ | T-ASM | 1 | right | right | πρὸς Ἀχειὰ τὸν Σηλωνείτην |
| 1Ki.21:3#10 | καὶ | καί | CONJ | 1 | right | right | καὶ αἱ γυναῖκές σου |
| 1Ki.22:8#15 | κύριον | κύριος | N-ASM | 1 | right | right | ἐπερωτῆσαι τὸν κύριον, 'enquire of the Lord' |
| 1Ki.1:47#7 | εὐλογῆσαι | εὐλογέω | V-AAN | 2 | right | right | εἰσῆλθον … εὐλογῆσαι τὸν κύριον ἡμῶν, 'to bless'; Morpheus the same |
| 1Ki.6:12#3 | οἶκος | οἶκος | N-NSM | 2a | right | right | ὁ οἶκος … ᾠκοδομήθη, subject |
| 1Ki.8:53#52 | γνόφου | γνόφος | N-GSM | 2 | right | right | κατοικεῖν ἐκ γνόφου, 'dwell in darkness'; Morpheus the same |
| 1Ki.10:26#7 | βασιλεῖς | βασιλεύς | N-APM | 2a | right | right | ὑπὲρ πάντας τοὺς βασιλεῖς; Morpheus masc acc pl |
| 1Ki.11:27#6 | ἐπήρατο | ἐπαίρω | V-ADI-3S | 2 | right | unsure | ὡς ἐπήρατο χεῖρας, 'his lifting up his hands': aorist middle indicative 3S is right; whether TAGNT would write D or M its data cannot settle: it writes this verb's present middle M (V-PMI-3S, V-PMP-ASN) but the aorist middle of ἀπωθέω D (Acts 7:27 ἀπώσατο), and has no aorist middle of ἐπαίρω; Morpheus aor ind mid (V-AMI-3S) |
| 1Ki.11:36#1 | τῷ | ὁ | T-DSM | 2a | right | right | τῷ δὲ υἱῷ αὐτοῦ |
| 2Ki.1:18#48 | οἱ | ὁ | T-NPM | 1 | right | right | ὡς οἱ ἀδελφοὶ αὐτοῦ |
| 2Ki.4:23#17 | Εἰρήνη | εἰρήνη | N-NSF | 1 | right | right | ἡ δὲ εἶπεν Εἰρήνη, 'It is well', a nominative standing alone |
| 2Ki.6:24#11 | πᾶσαν | πᾶς | A-ASF | 1 | right | right | ἤθροισεν … πᾶσαν τὴν παρεμβολήν |
| 2Ki.9:25#11 | τῇ | ὁ | T-DSF | 1 | right | right | ἐν τῇ μερίδι |
| 2Ki.11:7#5 | ὑμῖν | σύ | P-2DP | 1 | right | right | ἐν ὑμῖν, 'among you' |
| 2Ki.13:3#10 | αὐτοὺς | αὐτός | P-APM | 1 | right | right | ἔδωκεν αὐτούς, 'delivered them' |
| 2Ki.4:26#19 | παιδαρίῳ | παιδάριον | N-DSN | 2 | right | right | εἰρήνη τῷ παιδαρίῳ, 'well with the child'; Morpheus neut dat sg |
| 2Ki.5:7#27 | ἀποσυνάξαι | ἀποσυνάγω | V-AAN | 2 | right | right | ἀποστέλλει πρὸς μὲ ἀποσυνάξαι ἄνδρα, 'to recover a man'; Morpheus aor inf |
| 2Ki.10:27#4 | στήλας | στήλη | N-APF | 2 | right | right | κατέσπασαν τὰς στήλας, 'tore down the pillars'; Morpheus the same |
| 2Ki.22:6#1 | τοῖς | ὁ | T-DPM | 2a | right | right | τοῖς τέκτοσιν |
| 2Ki.25:1#7 | ἐνάτῳ | ἔννατος | A-DSN | 2a | right | right | ἐν τῷ ἔτει τῷ ἐνάτῳ (ἔτος, neuter); TAGNT's lemma is ἔννατος (Mat 20:5) |
| 2Ki.25:2#9 | ἑνδεκάτου | ἑνδέκατος | A-GSN | 2a | right | right | ἕως τοῦ ἑνδεκάτου ἔτους |
| 1Ch.1:51#24 | καὶ | καί | CONJ | 1 | right | right | καὶ ἀπέθανεν Σαούλ |
| 1Ch.4:2#15 | καὶ | καί | CONJ | 1 | right | right | τὸν Ἀχειμεὶ καὶ τὸν Λάαθ |
| 1Ch.6:8#6 | καὶ | καί | CONJ | 1 | right | right | verse |
| 1Ch.23:25#6 | ὁ | ὁ | T-NSM | 1 | right | right | Κύριος ὁ θεὸς Ἰσραήλ, subject |
| 1Ch.24:5#6 | τούτους | οὗτος | D-APM | 1 | right | right | κατὰ κλήρους τούτους πρὸς τούτους |
| 1Ch.24:30#6 | καὶ | καί | CONJ | 1 | right | right | Μοολλεὶ καὶ Ἠλά |
| 1Ch.6:72#20 | Δαβὼρ | Δαβώρ | N-ASF | 2a | right | right | καὶ τὴν Δαβὼρ καὶ τὰ περισπόρια αὐτῆς, a town (feminine, by τήν and αὐτῆς); lemma the form itself ('Names no lexicon has'); unknown to Morpheus |
| 1Ch.8:32#5 | Σεμαά | Σεμαά | N-ASM | 2a | right | right | Μακαλὼθ ἐγέννησεν τὸν Σεμαά, 'begot Samaa'; lemma the form itself; unknown to Morpheus |
| 1Ch.12:15#9 | τῷ | ὁ | T-DSM | 2a | right | right | ἐν τῷ μηνὶ τῷ πρώτῳ |
| 1Ch.19:10#7 | τοῦ | ὁ | T-GSN | 2a | right | right | τοῦ πολεμεῖν, the article of an infinitive |
| 1Ch.23:32#2 | φυλάξουσιν | φυλάσσω | V-FAI-3P | 2 | right | right | καὶ φυλάξουσιν τὰς φυλακάς, 'they are to keep the charge'; Morpheus fut ind act 3P among others |
| 1Ch.24:31#35 | νεώτεροι | νέος | A-NPM-C | 2a | right | right | οἱ ἀδελφοὶ αὐτοῦ οἱ νεώτεροι, 'their younger brethren' |
| 2Ch.6:34#23 | τὴν | ὁ | T-ASF | 1 | right | right | κατὰ τὴν ὁδόν |
| 2Ch.7:6#10 | οἱ | ὁ | T-NPM | 1 | right | right | καὶ οἱ Λευεῖται, subject |
| 2Ch.8:12#7 | ἐπὶ | ἐπί | PREP | 1 | right | right | ἐπὶ τὸ θυσιαστήριον |
| 2Ch.10:10#16 | πρὸς | πρός | PREP | 1 | right | right | τῷ λαλήσαντι πρὸς σέ |
| 2Ch.17:4#14 | πατρὸς | πατήρ | N-GSM | 1 | right | right | ἐν ταῖς ἐντολαῖς τοῦ πατρὸς αὐτοῦ |
| 2Ch.32:23#2 | πολλοὶ | πολύς | A-NPM | 1 | right | right | καὶ πολλοὶ ἔφερον δῶρα, 'many brought gifts' |
| 2Ch.1:2#13 | τοῖς | ὁ | T-DPM | 2a | right | right | καὶ τοῖς κριταῖς |
| 2Ch.2:7#24 | σιδήρῳ | σίδηρος | N-DSM | 2 | right | right | ἐν τῷ σιδήρῳ, 'in iron'; Morpheus the same |
| 2Ch.3:11#23 | πτέρυξ | πτέρυξ | N-NSF | 2a | right | right | καὶ ἡ πτέρυξ ἡ ἑτέρα … ἁπτομένη, subject; Morpheus nom or voc |
| 2Ch.16:5#7 | ἀπέλιπεν | ἀπολείπω | V-2AAI-3S | 2 | right | right | ἀπέλιπεν τοῦ μηκέτι οἰκοδομεῖν, 'he left off building'; Morpheus 2nd aor of ἀπολιμπάνω, the same verb |
| 2Ch.32:26#8 | καρδίας | καρδία | N-GSF | 2a | right | right | ἀπὸ τοῦ ὕψους τῆς καρδίας αὐτοῦ |
| 2Ch.34:8#38 | τοῦ | ὁ | T-GSM | 2a | right | right | Κυρίου τοῦ θεοῦ αὐτοῦ |
| Ezr.3:1#13 | καὶ | καί | CONJ | 1 | right | right | καὶ συνήχθη ὁ λαός |
| Ezr.5:14#15 | οἴκου | οἶκος | N-GSM | 1 | right | right | ἀπὸ οἴκου τοῦ ἐν Ἰερουσαλήμ |
| Ezr.5:14#23 | ναὸν | ναός | N-ASM | 1 | right | right | εἰς ναὸν τοῦ βασιλέως |
| Ezr.9:12#20 | καὶ | καί | CONJ | 1 | right | right | καὶ οὐκ ἐκζητήσετε |
| Ezr.10:2#16 | θεῷ | θεός | N-DSM | 1 | right | right | ἠσυνθετήσαμεν τῷ θεῷ ἡμῶν |
| Ezr.10:4#2 | ὅτι | ὅτι | CONJ | 1 | right | right | ἀνάστα, ὅτι ἐπὶ σὲ τὸ ῥῆμα, 'for the matter is upon you' |
| Ezr.1:4#7 | τῶν | ὁ | T-GPM | 2a | right | right | ἀπὸ πάντων τῶν τόπων |
| Ezr.1:5#6 | τῷ | ὁ | T-DSM | 2a | right | right | τῷ Ἰούδᾳ, the dative of Ἰούδας |
| Ezr.2:70#7 | Λευεῖται | Λευΐτης | N-NPM | 2a | right | right | ἐκάθισαν … οἱ Λευεῖται, subject; Morpheus nom or voc pl |
| Ezr.4:1#12 | ἀποικίας | ἀποικία | N-GSF | 2a | right | right | οἱ υἱοὶ τῆς ἀποικίας, 'the children of the captivity'; Morpheus the same |
| Ezr.4:15#6 | τῶν | ὁ | T-GPM | 2a | right | right | ὑπομνηματισμοῦ τῶν πατέρων σου |
| Ezr.7:18#15 | τοῦ | ὁ | T-GSN | 2a | right | right | τοῦ ἀργυρίου καὶ τοῦ χρυσίου |
| Neh.2:9#16 | καὶ | καί | CONJ | 1 | right | right | καὶ ἀπέστειλεν μετ᾽ ἐμοῦ ὁ βασιλεύς |
| Neh.6:9#4 | ἡμᾶς | ἐγώ | P-1AP | 1 | right | right | φοβερίζουσιν ἡμᾶς, 'alarm us' |
| Neh.7:39#3 | υἱοὶ | υἱός | N-NPM | 1 | right | right | οἱ ἱερεῖς, υἱοὶ Ἰωδᾶε, a list's heading in the nominative |
| Neh.9:28#15 | ἐχθρῶν | ἐχθρός | N-GPM | 1 | right | right | εἰς χεῖρας ἐχθρῶν αὐτῶν, 'into the hands of their enemies' (TAGNT writes the noun) |
| Neh.9:28#28 | ἐξ | ἐκ | PREP | 1 | right | right | ἐξ οὐρανοῦ εἰσήκουσας |
| Neh.10:9#5 | υἱὸς | υἱός | N-NSM | 1 | right | right | Ἰησοῦς υἱὸς Ἀζανειά |
| Neh.1:2#20 | κατελίπησαν | καταλείπω | V-2API-3P | 2 | right | right | οἳ κατελίπησαν ἀπὸ τῆς αἰχμαλωσίας, 'who had been left'; Morpheus gave other verbs only (κατά-λίπτομαι, κατά-λιπάω) |
| Neh.3:6#24 | μοχλοὺς | μοχλός | N-APM | 2 | right | right | ἔστησαν … μοχλοὺς αὐτῆς, 'its bars'; Morpheus the same |
| Neh.3:15#5 | τῶν | ὁ | T-GPN | 2a | right | right | κολυμβήθρας τῶν κωδίων (κώδιον, neuter), 'the pool of the skins' |
| Neh.9:22#6 | λαούς | λαός | N-APM | 2 | right | right | ἔδωκας αὐτοῖς βασιλέας καὶ λαούς; Morpheus the same |
| Neh.9:25#13 | ἀμπελῶνας | ἀμπελών | N-APM | 2 | right | right | ἐκληρονόμησαν … ἀμπελῶνας, 'vineyards'; Morpheus the same |
| Neh.10:39#13 | τοῦ | ὁ | T-GSM | 2a | right | right | ἀπαρχὰς τοῦ σίτου |
| Est.2:22#15 | τῆς | ὁ | T-GSF | 1 | right | right | τὰ τῆς ἐπιβουλῆς, 'the matter of the conspiracy' |
| Est.4:8#61 | καὶ | καί | CONJ | 1 | right | right | λάλησον … καὶ ῥῦσαι ἡμᾶς |
| Est.4:17#284 | μὴ | μή | PRT-N | 1 | right | right | βοηθὸν εἰ μὴ σέ, 'no helper but you' |
| Est.5:13#3 | μοι | ἐγώ | P-1DS | 1 | right | right | ταῦτά μοι οὐκ ἀρέσκει, 'please me not' |
| Est.8:5#27 | βασιλείᾳ | βασιλεία | N-DSF | 1 | right | right | ἐν τῇ βασιλείᾳ σου, 'in your kingdom' |
| Est.8:12#105 | πολλοὺς | πολύς | A-APM | 1 | right | right | πολλάκις δὲ καὶ πολλοὺς τῶν ἐπ᾽ ἐξουσίαις, object |
| Est.1:1#297 | εὐνούχων | εὐνοῦχος | N-GPM | 2 | right | right | ὑπὲρ τῶν δύο εὐνούχων; Morpheus the same |
| Est.1:6#24 | ἀργυραῖ | ἀργύρεος | A-NPF | 2 | right | right | κλίναι χρυσαῖ καὶ ἀργυραῖ, 'silver couches' (TAGNT's lemma ἀργύρεος); Morpheus nom pl fem |
| Est.4:17#555 | σπονδῶν | σπονδή | N-GPF | 2 | right | right | ἔπιον οἶνον σπονδῶν, 'wine of drink-offerings'; Morpheus the same |
| Est.5:14#26 | τοῦ | ὁ | T-GSN | 2a | right | right | ἐπὶ τοῦ ξύλου |
| Est.8:4#10 | ἐξηγέρθη | ἐξεγείρω | V-API-3S | 2 | right | right | ἐξηγέρθη δὲ Ἐσθήρ, 'Esther arose'; Morpheus the same |
| Est.9:10#7 | τοῦ | ὁ | T-GSM | 2a | right | right | Βουγαίου τοῦ ἐχθροῦ τῶν Ἰουδαίων |
| Job.17:3#10 | τῇ | ὁ | T-DSF | 1 | right | right | τῇ χειρί μου συνδεθήτω |
| Job.22:17#10 | ἡμῖν | ἐγώ | P-1DP | 1 | right | right | τί ἐπάξεται ἡμῖν, 'bring upon us' |
| Job.23:16#6 | μου | ἐγώ | P-1GS | 1 | right | right | τὴν καρδίαν μου |
| Job.24:13#13 | καὶ | καί | CONJ | 1 | right | right | ἐπὶ γῆς ὄντων αὐτῶν καὶ οὐκ ἐπέγνωσαν |
| Job.30:1#19 | ἀξίους | ἄξιος | A-APM | 1 | right | right | οὓς οὐχ ἡγησάμην ἀξίους, 'whom I did not deem worthy' |
| Job.31:9#15 | αὐτῆς | αὐτός | P-GSF | 1 | right | right | ἐπὶ θύραις αὐτῆς, 'at her doors' |
| Job.3:14#6 | ἠγαυριῶντο | ἀγαυριάομαι | V-INI-3P | 2 | right | right | οἳ ἠγαυριῶντο ἐπὶ ξίφεσιν, 'who gloried in their swords'; Morpheus the same |
| Job.18:10#12 | τρίβων | τρίβω | V-PAP-NSM | 2 | wrong | wrong | ἡ σύλλημψις αὐτοῦ ἐπὶ τρίβων, 'that which shall take him is by the path': τρίβος N-GPF after ἐπί, not a participle of τρίβω 'rub'; the parser's candidates held τρίβος/N-GPF (support 3) but τρίβω/V-PAP-NSM had 123 of 133 (92%), over the 90% rule; Morpheus offers τρίβος/N-GPF |
| Job.23:17#12 | ἐκάλυψεν | καλύπτω | V-AAI-3S | 2 | right | right | ἐκάλυψεν γνόφος, 'thick darkness has covered'; Morpheus the same |
| Job.24:15#3 | μοιχοῦ | μοιχός | N-GSM | 2 | right | right | ὀφθαλμὸς μοιχοῦ, 'the eye of the adulterer'; Morpheus the same among others |
| Job.28:4#12 | βροτῶν | βροτός | N-GPM | 2 | right | right | ἠσθένησαν ἐκ βροτῶν, 'removed from among men'; Morpheus the same |
| Job.31:18#13 | ὡδήγησα | ὁδηγέω | V-AAI-1S | 2 | right | right | ἐκ γαστρὸς μητρός μου ὡδήγησα, 'guided them'; Morpheus the same |
| Psa.18:10#7 | αἰῶνα | αἰών | N-ASM | 1 | right | right | διαμένων εἰς αἰῶνα αἰῶνος |
| Psa.37:3#4 | σου | σύ | P-2GS | 1 | right | right | τὰ βέλη σου, 'your arrows' |
| Psa.50:9#4 | καὶ | καί | CONJ | 1 | right | right | ῥαντιεῖς με ὑσσώπῳ καὶ καθαρισθήσομαι |
| Psa.98:7#5 | πρὸς | πρός | PREP | 1 | right | right | ἐλάλει πρὸς αὐτούς |
| Psa.118:37#7 | ἰδεῖν | εἴδω | V-2AAN | 1 | right | right | τοῦ μὴ ἰδεῖν ματαιότητα, 'that I may not behold' (TAGNT's lemma εἴδω) |
| Psa.148:2#5 | ἄγγελοι | ἄγγελος | N-NPM | 1 | right | wrong | αἰνεῖτε αὐτόν, πάντες οἱ ἄγγελοι αὐτοῦ, 'praise him, all his angels': an address, which TAGNT tags N-VPM in the same construction (Rev 19:5 αἰνεῖτε … πάντες οἱ δοῦλοι αὐτοῦ, N-VPM); the New Testament has ἄγγελοι only as N-NPM (23), so layer 1 had no other analysis; Morpheus nom or voc |
| Psa.29:12#15 | εὐφροσύνην | εὐφροσύνη | N-ASF | 2 | right | right | περιέζωσάς με εὐφροσύνην, 'girded me with gladness'; Morpheus the same |
| Psa.36:32#1 | κατανοήσει | κατανοέω | V-FAI-3S | 2 | right | right | κατανοήσει ὁ ἁμαρτωλὸς τὸν δίκαιον, 'the sinner watches'; Morpheus the same among others |
| Psa.37:4#22 | τῶν | ὁ | T-GPF | 2a | right | right | ἀπὸ προσώπου τῶν ἁμαρτιῶν μου |
| Psa.45:5#8 | τοῦ | ὁ | T-GSM | 2a | right | right | τὴν πόλιν τοῦ θεοῦ |
| Psa.95:1#12 | τῷ | ὁ | T-DSM | 2a | right | right | ᾌσατε τῷ κυρίῳ |
| Psa.105:13#3 | τῶν | ὁ | T-GPN | 2a | right | right | ἐπελάθοντο τῶν ἔργων αὐτοῦ |
| Pro.2:3#10 | φωνήν | φωνή | N-ASF | 1 | right | right | δῷς φωνήν σου, 'utter your voice' |
| Pro.3:22#7 | χάρις | χάρις | N-NSF | 1 | right | right | καὶ χάρις ᾖ περὶ σῷ τραχήλῳ, subject |
| Pro.4:21#2 | μὴ | μή | PRT-N | 1 | right | right | ὅπως μὴ ἐκλίπωσίν σε |
| Pro.5:6#3 | ζωῆς | ζωή | N-GSF | 1 | right | right | ὁδοὺς γὰρ ζωῆς, 'the paths of life' |
| Pro.24:35#8 | ἔξοδον | ἔξοδος | N-ASF | 1 | right | right | τὴν δὲ ἔξοδον αὐτοῦ οὐκ ἀπένιψεν (Brenton has no verse 24:35) |
| Pro.25:10#2 | σε | σύ | P-2AS | 1 | right | right | μή σε ὀνειδίσῃ, 'lest … reproach you' |
| Pro.7:23#9 | σπεύδει | σπεύδω | V-PAI-3S | 2 | right | right | σπεύδει δὲ ὥσπερ ὄρνεον, 'he hastens as a bird'; Morpheus the same |
| Pro.9:7#11 | μωμήσεται | μωμάομαι | V-FDI-3S | 2 | right | right | μωμήσεται ἑαυτόν, 'shall disgrace himself'; Morpheus fut or aor subj mid |
| Pro.9:18#47 | ζήσῃς | ζάω | V-AAS-2S | 2 | right | right | ἵνα πολὺν ζήσῃς χρόνον, 'that you may live long'; Morpheus the same |
| Pro.11:22#4 | ῥινὶ | ῥίν | N-NPF | 2 | right | wrong | ὥσπερ ἐνώτιον ἐν ῥινὶ ὑός, 'an ornament in a swine's snout': dative singular after ἐν, N-DSF; the lemma is TBESG's (ῥίν, G9027); the rule 'ριν-ι as ριν-' gave N-NPF 42 lemmas' weight to N-DSF's 3 (93%); Morpheus ῥίς/N-DSF |
| Pro.28:4#3 | ἐγκαταλιπόντες | ἐγκαταλείπω | V-2AAP-NPM | 2 | right | right | οἱ ἐγκαταλιπόντες τὸν νόμον, 'they that forsake the law'; Morpheus the same |
| Pro.29:15#9 | αἰσχύνει | αἰσχύνω | V-PAI-3S | 2 | right | right | παῖς … αἰσχύνει γονεῖς αὐτοῦ, 'disgraces his parents'; Morpheus the same |
| Ecc.2:26#22 | καὶ | καί | CONJ | 1 | right | right | τοῦ προσθεῖναι καὶ τοῦ συναγαγεῖν |
| Ecc.2:26#33 | ὅτι | ὅτι | CONJ | 1 | right | right | ὅτι καί γε τοῦτο ματαιότης, 'for this is also vanity' |
| Ecc.7:1#26 | ἀπαγγελεῖ | ἀπαγγέλλω | V-FAI-3S | 1 | right | right | τίς ἀπαγγελεῖ τῷ ἀνθρώπῳ, 'who shall tell a man' |
| Ecc.7:7#11 | καί | καί | CONJ | 1 | right | right | καί γε τοῦτο ματαιότης |
| Ecc.7:12#4 | κληρονομίας | κληρονομία | N-GSF | 1 | right | right | ἀγαθὴ σοφία μετὰ κληρονομίας, 'with an inheritance' |
| Ecc.12:11#1 | Λόγοι | λόγος | N-NPM | 1 | right | right | Λόγοι σοφῶν ὡς τὰ βούκεντρα, subject |
| Ecc.2:16#9 | ἄφρονος | ἄφρων | A-GSF-C | 2 | right | wrong | μετὰ τοῦ ἄφρονος, 'with the fool': masculine (τοῦ) and not a comparative, A-GSM; the only candidate came from one rule seen on one lemma, 'αφρ-ονοσ as αφρ-ων', a comparative's ending (A-GSF-C) put on a positive adjective; its article τοῦ is left pending, not counted a break; Morpheus ἄφρων gen sg (unmapped) |
| Ecc.4:15#2 | σύμπαντας | σύμπας | A-APM | 2 | right | right | ἴδον σύμπαντας τοὺς ζῶντας, 'I saw all the living'; Morpheus the same |
| Ecc.5:1#12 | ἐξενέγκαι | ἐκφέρω | V-AAN | 2 | right | right | μὴ ταχυνάτω τοῦ ἐξενέγκαι λόγον, 'to utter'; Morpheus the same |
| Ecc.6:8#10 | πένης | πένης | N-NSM | 2a | right | right | ὁ πένης οἶδεν, 'the poor knows'; Morpheus the same |
| Ecc.7:3#19 | ζῶν | ζάω | V-PAP-NSM | 2a | right | right | ὁ ζῶν δώσει, 'the living man will apply' |
| Ecc.7:18#2 | ἀσεβήσῃς | ἀσεβέω | V-AAS-2S | 2 | right | right | μὴ ἀσεβήσῃς πολύ, 'be not very wicked'; Morpheus the same |
| Sol.3:7#7 | δυνατοὶ | δυνατός | A-NPM | 1 | right | right | ἑξήκοντα δυνατοὶ κύκλῳ αὐτῆς, 'sixty mighty men' |
| Sol.3:11#6 | βασιλεῖ | βασιλεύς | N-DSM | 1 | right | right | ἐν τῷ βασιλεῖ Σαλωμών |
| Sol.5:3#3 | χιτῶνά | χιτών | N-ASM | 1 | right | right | ἐξεδυσάμην τὸν χιτῶνά μου, 'I have put off my coat' |
| Sol.5:16#5 | ὅλος | ὅλος | A-NSM | 1 | right | right | καὶ ὅλος ἐπιθυμία, 'altogether desirable' |
| Sol.6:1#1 | Ἀδελφός | ἀδελφός | N-NSM | 1 | right | right | Ἀδελφός μου κατέβη, subject |
| Sol.6:9#5 | ὡσεὶ | ὡσεί | PREP | 1 | right | right | ἡ ἐκκύπτουσα ὡσεὶ ὄρθρος, 'as the morning' (TAGNT writes PREP) |
| Sol.3:11#12 | ἐστεφάνωσεν | στεφανόω | V-AAI-3S | 2 | right | right | ᾧ ἐστεφάνωσεν αὐτὸν ἡ μήτηρ, 'wherewith his mother crowned him'; Morpheus the same |
| Sol.4:6#7 | κινηθῶσιν | κινέω | V-APS-3P | 2 | right | right | ἕως οὗ … κινηθῶσιν αἱ σκιαί, 'until the shadows depart'; Morpheus the same |
| Sol.4:9#6 | ἐκαρδίωσας | καρδιόω | V-AAI-2S | 2 | right | right | ἐκαρδίωσας ἡμᾶς, 'you have ravished my heart'; Morpheus the same |
| Sol.5:8#17 | ἀδελφιδόν | ἀδελφιδός | N-ASM | 2 | right | right | ἐὰν εὕρητε τὸν ἀδελφιδόν μου, 'if you find my kinsman'; unknown to Morpheus |
| Sol.5:9#17 | ὥρκισας | ὁρκίζω | V-AAI-2S | 2 | right | right | οὕτως ὥρκισας ἡμᾶς, 'you have so charged us'; Morpheus the same |
| Sol.8:9#17 | κεδρίνην | κέδρινος | A-ASF | 2 | right | right | σανίδα κεδρίνην, 'cedar panels'; Morpheus the same |
| Isa.40:22#11 | αὐτῇ | αὐτός | P-DSF | 1 | right | right | οἱ ἐνοικοῦντες ἐν αὐτῇ, 'the inhabitants in it' (ἡ γῆ) |
| Isa.54:5#5 | σε | σύ | P-2AS | 1 | right | right | ὁ ποιῶν σε, 'that made you' |
| Isa.58:7#11 | τὸν | ὁ | T-ASM | 1 | right | right | εἰς τὸν οἶκόν σου |
| Isa.62:4#27 | σοί | σύ | P-2DS | 1 | right | right | εὐδόκησεν Κύριος ἐν σοί |
| Isa.65:2#3 | χεῖράς | χείρ | N-APF | 1 | right | right | ἐξεπέτασα τὰς χεῖράς μου |
| Isa.65:20#3 | μὴ | μή | PRT-N | 1 | right | right | οὐδ᾽ οὐ μὴ γένηται |
| Isa.22:5#14 | φάραγγι | φάραγξ | N-DSF | 2 | right | right | ἐν φάραγγι Σειών, 'in the valley of Sion'; Morpheus the same |
| Isa.31:2#16 | ἐπαναστήσεται | ἐπανίστημι | V-FMI-3S | 2 | right | right | ἐπαναστήσεται ἐπ᾽ οἴκους, 'he shall rise up against the houses'; Morpheus the same |
| Isa.33:4#15 | ἀκρίδα | ἀκρίς | N-ASF | 2 | right | right | ἐάν τις συναγάγῃ ἀκρίδα, 'gather locusts'; Morpheus the same |
| Isa.50:2#20 | τοῦ | ὁ | T-GSN | 2a | right | right | ἰσχύει ἡ χείρ μου τοῦ ῥύσασθαι, the article of an infinitive |
| Isa.58:7#9 | εἴσαγε | εἰσάγω | V-PAM-2S | 2 | right | right | πτωχοὺς … εἴσαγε εἰς τὸν οἶκόν σου, 'lead the poor to your house'; Morpheus the same |
| Isa.59:5#15 | συντρίψας | συντρίβω | V-AAP-NSM | 2 | right | right | ὁ μέλλων … φαγεῖν, συντρίψας οὔριον εὗρεν, 'having crushed'; Morpheus the same |
| Jer.3:25#26 | ἕως | ἕως | PREP | 1 | right | right | ἕως τῆς ἡμέρας ταύτης, 'until this day' |
| Jer.14:4#9 | ἦν | εἰμί | V-IAI-3S | 1 | right | right | ὅτι οὐκ ἦν ὑετός, 'there was no rain' |
| Jer.27:28#15 | Κυρίου | κύριος | N-GSM | 1 | right | right | παρὰ Κυρίου θεοῦ ἡμῶν |
| Jer.28:6#12 | μὴ | μή | PRT-N | 1 | right | right | καὶ μὴ ἀποριφῆτε |
| Jer.38:39#11 | καὶ | καί | CONJ | 1 | right | right | καὶ περικυκλωθήσεται |
| Jer.48:18#17 | βασιλεὺς | βασιλεύς | N-NSM | 1 | right | right | ὃν κατέστησεν βασιλεὺς Βαβυλῶνος, subject |
| Jer.9:9#16 | ψυχή | ψυχή | N-NSF | 2a | right | right | οὐκ ἐκδικήσει ἡ ψυχή μου, subject |
| Jer.17:24#21 | τῶν | ὁ | T-GPN | 2a | right | right | ἐν τῇ ἡμέρᾳ τῶν σαββάτων |
| Jer.22:6#6 | τοῦ | ὁ | T-GSM | 2a | right | right | κατὰ τοῦ οἴκου |
| Jer.38:31#12 | τῷ | ὁ | T-DSM | 2a | right | right | καὶ τῷ οἴκῳ Ἰούδα |
| Jer.41:7#22 | κατελείφθησαν | καταλείπω | V-API-3P | 2 | right | right | αὗται κατελείφθησαν, 'these were left'; Morpheus aor pass of καταλιμπάνω, the same verb |
| Jer.51:35#7 | ζητήσῃς | ζητέω | V-AAS-2S | 2 | right | right | μὴ ζητήσῃς, 'seek them not'; Morpheus the same |
| Lam.2:11#15 | γῆν | γῆ | N-ASF | 1 | right | right | ἐξεχύθη εἰς τὴν γῆν, 'cast down to the ground' |
| Lam.3:6#6 | νεκροὺς | νεκρός | A-APM | 1 | right | right | ἐκάθισέν με ὡς νεκροὺς αἰῶνος, 'as them that have long been dead' |
| Lam.3:16#2 | ἐξέβαλεν | ἐκβάλλω | V-2AAI-3S | 1 | right | right | ἐξέβαλεν ψήφῳ ὀδόντας μου, 'dashed out my teeth' |
| Lam.3:56#9 | εἰς | εἰς | PREP | 1 | right | right | εἰς τὴν δέησίν μου |
| Lam.5:20#8 | ἡμᾶς | ἐγώ | P-1AP | 1 | right | right | καταλείψεις ἡμᾶς, 'abandon us' |
| Lam.5:21#8 | καὶ | καί | CONJ | 1 | right | right | καὶ ἀνακαίνισον |
| Lam.1:8#8 | σάλον | σάλος | N-ASM | 2 | right | right | εἰς σάλον ἐγένετο, 'come into tribulation'; Morpheus the same |
| Lam.2:21#27 | ἐμαγείρευσας | μαγειρεύω | V-AAI-2S | 2 | right | right | ἐν ἡμέρᾳ ὀργῆς σου ἐμαγείρευσας, 'you have mangled them'; Morpheus the same |
| Lam.3:15#2 | Ἐχόρτασέν | χορτάζω | V-AAI-3S | 2 | right | right | Ἐχόρτασέν με πικρίας, 'he has filled me with bitterness'; Morpheus the same |
| Lam.3:41#1 | ἀναλάβωμεν | ἀναλαμβάνω | V-2AAS-1P | 2 | right | right | ἀναλάβωμεν καρδίας ἡμῶν, 'let us lift up our hearts'; Morpheus the same |
| Lam.4:2#7 | ἐπηρμένοι | ἐπαίρω | V-RPP-NPM | 2 | right | right | υἱοὶ Σειὼν οἱ τίμιοι οἱ ἐπηρμένοι ἐν χρυσίῳ; Morpheus perf part mp masc nom pl |
| Lam.5:13#2 | κλαυθμὸν | κλαυθμός | N-ASM | 2 | right | right | ἐκλεκτοὶ κλαυθμὸν ἀνέλαβον, 'lifted up the voice in weeping'; Morpheus the same |
| Eze.3:3#14 | σου | σύ | P-2GS | 1 | right | right | ἡ κοιλία σου, 'your belly' |
| Eze.3:27#19 | Ὁ | ὁ | T-NSM | 1 | right | right | Ὁ ἀκούων ἀκουέτω, 'he that hears, let him hear' |
| Eze.20:9#25 | ἐνώπιον | ἐνώπιον | PREP | 1 | right | right | ἐνώπιον αὐτῶν, 'in their sight' |
| Eze.36:19#18 | κατὰ | κατά | PREP | 1 | right | right | κατὰ τὴν ἁμαρτίαν αὐτῶν |
| Eze.39:3#24 | σε | σύ | P-2AS | 1 | right | right | καταβαλῶ σε, 'I will cast you down' |
| Eze.46:2#19 | τῆς | ὁ | T-GSF | 1 | right | right | ἐπὶ τὰ πρόθυρα τῆς πύλης |
| Eze.6:13#28 | συσκίου | σύσκιος | A-GSN | 2a | right | right | ὑποκάτω δένδρου συσκίου (δένδρον, neuter), 'under every shady tree' |
| Eze.21:15#9 | ἀσθενοῦντες | ἀσθενέω | V-PAP-NPM | 2 | right | right | πληθυνθῶσιν οἱ ἀσθενοῦντες, 'the weak ones be multiplied', subject; Morpheus the same among others |
| Eze.30:23#2 | διασπερῶ | διασπείρω | V-FAI-1S | 2 | right | right | διασπερῶ Αἴγυπτον, 'I will disperse'; Morpheus the same |
| Eze.32:10#28 | πτώσεώς | πτῶσις | N-GSF | 2 | right | right | ἀφ᾽ ἡμέρας πτώσεώς σου, 'from the day of your fall'; Morpheus the same |
| Eze.39:5#4 | πεδίου | πεδίον | N-GSN | 2 | right | right | ἐπὶ προσώπου τοῦ πεδίου, 'on the face of the field'; Morpheus the same |
| Eze.45:17#20 | νουμηνίαις | νουμηνία | N-DPF | 2 | right | right | ἐν ταῖς νουμηνίαις, 'at the new moons'; Morpheus the same |
| Dan.2:46#15 | καὶ | καί | CONJ | 1 | right | right | θυσίας καὶ σπονδάς |
| Dan.3:77#9 | καὶ | καί | CONJ | 1 | right | right | ὑμνεῖτε καὶ ὑπερυψοῦτε (Brenton's Daniel has no 3:77: it is in the Song of the Three) |
| Dan.6:16#10 | θεός | θεός | N-NSM | 1 | right | right | Ὁ θεός σου, ᾧ σὺ λατρεύεις … αὐτὸς ἐξελεῖταί σε, 'your God … he will deliver you' |
| Dan.9:7#39 | ἐκεῖ | ἐκεῖ | ADV | 1 | right | right | εἰς ἃς διεσκόρπισας αὐτοὺς ἐκεῖ |
| Dan.9:11#4 | ἐγκατέλιπε | ἐγκαταλείπω | V-2AAI-3S | 1 | right | right | πᾶς Ἰσραὴλ ἐγκατέλιπε τὸν νόμον σου, 'have forsaken your law' |
| Dan.9:16#14 | ἀπὸ | ἀπό | PREP | 1 | right | right | ἀπὸ τῆς πόλεώς σου |
| Dan.4:15#11 | Δανιὴλ | Δανιήλ | N-ASM | 2a | right | right | ἐκάλεσα τὸν Δανιήλ, object |
| Dan.7:19#5 | τοῦ | ὁ | T-GSN | 2a | right | right | περὶ τοῦ θηρίου |
| Dan.8:1#1 | Ἔτους | ἔτος | N-GSN | 2 | right | right | Ἔτους τρίτου βασιλεύοντος, 'in the third year'; Morpheus the same |
| Dan.8:7#7 | κριόν | κριός | N-ASM | 2 | right | right | πρὸς τὸν κριόν, 'to the ram'; Morpheus the same |
| Dan.8:10#9 | ἐρράχθη | ῥάσσω | V-API-3S | 2 | right | right | ἐρράχθη ἐπὶ τὴν γῆν, 'was dashed to the earth'; Morpheus ῥάσσω V-API-3S among others |
| Dan.11:15#24 | δυναστῶν | δυνάστης | N-GPM | 2 | right | right | μετὰ τῶν δυναστῶν αὐτοῦ; Morpheus the same |
| Hos.2:8#3 | οὐκ | οὐ | PRT-N | 1 | right | right | αὕτη οὐκ ἔγνω |
| Hos.2:14#15 | τὴν | ὁ | T-ASF | 1 | right | right | λαλήσω ἐπὶ τὴν καρδίαν αὐτῆς |
| Hos.2:23#20 | μου | ἐγώ | P-1GS | 1 | right | right | Λαός μου εἶ σύ, 'You are my people' |
| Hos.4:11#1 | πορνείαν | πορνεία | N-ASF | 1 | right | right | the object of 4:10's τοῦ φυλάξαι, which Swete's verse 11 opens with: ἐγκατέλιπον τοῦ φυλάξαι πορνείαν |
| Hos.13:6#2 | τὰς | ὁ | T-APF | 1 | right | right | κατὰ τὰς νομὰς αὐτῶν |
| Hos.13:10#20 | βασιλέα | βασιλεύς | N-ASM | 1 | right | right | Δός μοι βασιλέα, 'give me a king' |
| Hos.7:4#7 | πέψιν | πέψις | N-ASF | 2 | right | right | εἰς πέψιν, 'for hot-baking'; Morpheus the same |
| Hos.9:1#10 | ἐπόρνευσας | πορνεύω | V-AAI-2S | 2 | right | right | διότι ἐπόρνευσας, 'you have gone a-whoring'; Morpheus the same |
| Hos.9:10#23 | ἀπηλλοτριώθησαν | ἀπαλλοτριόω | V-API-3P | 2 | right | right | ἀπηλλοτριώθησαν εἰς αἰσχύνην, 'were shamefully estranged'; Morpheus the same |
| Hos.10:8#2 | ἐξαρθήσονται | ἐξαίρω | V-FPI-3P | 2 | right | right | ἐξαρθήσονται βωμοὶ Ὤν, 'the altars shall be taken away'; Morpheus the same |
| Hos.10:11#13 | τραχήλου | τράχηλος | N-GSM | 2 | right | right | τὸ κάλλιστον τοῦ τραχήλου αὐτῆς, 'the fair part of her neck'; Morpheus the same |
| Hos.12:14#1 | ἐθύμωσεν | θυμόω | V-AAI-3S | 2 | right | right | ἐθύμωσεν Ἐφράιμ, 'Ephraim was angry'; Morpheus the same |
| Joe.1:5#10 | πάντες | πᾶς | A-NPM | 1 | right | wrong | θρηνήσατε, πάντες οἱ πίνοντες οἶνον, 'mourn, all you that drink wine': an address, A-VPM as TAGNT tags πάντες in Rev 19:5; layer 1 had A-VPM (7) but A-NPM held 172 of 179 (96%), over the 95%-of-20 rule |
| Joe.2:13#19 | ἐλεήμων | ἐλεήμων | A-NSM | 1 | right | right | ὅτι ἐλεήμων καὶ οἰκτίρμων ἐστίν, 'he is merciful' |
| Joe.2:25#21 | δύναμίς | δύναμις | N-NSF | 1 | right | right | ἡ δύναμίς μου ἡ μεγάλη, in apposition to the locusts, the subjects of κατέφαγεν |
| Joe.2:32#10 | σωθήσεται | σῴζω | V-FPI-3S | 1 | right | right | πᾶς ὃς ἂν ἐπικαλέσηται … σωθήσεται, 'shall be saved' |
| Joe.3:15#3 | καὶ | καί | CONJ | 1 | right | right | ὁ ἥλιος καὶ ἡ σελήνη |
| Joe.3:18#1 | Καὶ | καί | CONJ | 1 | right | right | Καὶ ἔσται |
| Joe.1:2#23 | τῶν | ὁ | T-GPM | 2a | right | right | ἐν ταῖς ἡμέραις τῶν πατέρων ὑμῶν |
| Joe.1:6#20 | σκύμνου | σκύμνος | N-GSM | 2 | right | right | αἱ μύλαι αὐτοῦ σκύμνου, 'those of a lion's whelp'; Morpheus gen sg masc or fem |
| Joe.1:7#9 | συκᾶς | συκῆ | N-APF | 2 | right | right | τὰς συκᾶς μου εἰς συνκλασμόν, 'my fig-trees'; Morpheus the same |
| Joe.2:2#4 | γνόφου | γνόφος | N-GSM | 2 | right | right | ἡμέρα σκότους καὶ γνόφου, 'a day of darkness and gloominess'; Morpheus the same |
| Joe.3:2#19 | τοῦ | ὁ | T-GSM | 2a | right | right | ὑπὲρ τοῦ λαοῦ μου |
| Joe.3:16#24 | τοῦ | ὁ | T-GSM | 2a | right | right | φείσεται τοῦ λαοῦ αὐτοῦ |
| Amo.1:5#17 | καὶ | καί | CONJ | 1 | right | right | καὶ αἰχμαλωτευθήσεται |
| Amo.1:9#9 | καὶ | καί | CONJ | 1 | right | right | Τύρου καὶ ἐπὶ ταῖς τέσσαρσιν |
| Amo.3:9#24 | αὐτῆς | αὐτός | P-GSF | 1 | right | right | ἐν μέσῳ αὐτῆς, 'in the midst of it' (Samaria) |
| Amo.4:13#10 | ἀνθρώπους | ἄνθρωπος | N-APM | 1 | right | right | ἀπαγγέλλων εἰς ἀνθρώπους, 'proclaims to men' |
| Amo.5:4#1 | διότι | διότι | CONJ | 1 | right | right | διότι τάδε λέγει Κύριος |
| Amo.8:3#19 | τόπῳ | τόπος | N-DSM | 1 | right | right | ἐν παντὶ τόπῳ, 'in every place' |
| Amo.1:3#6 | τρισὶν | τρεῖς, τρία | A-DPF | 2a | right | right | ἐπὶ ταῖς τρισὶν ἀσεβείαις, 'for three sins' |
| Amo.2:4#19 | ἀπώσασθαι | ἀπωθέω | V-ADN | 2 | right | right | ἕνεκα τοῦ ἀπώσασθαι αὐτοὺς τὸν νόμον, 'because they have rejected the law'; aorist middle infinitive, D as TAGNT writes ἀπώσατο (Acts 7:27); Morpheus aor inf mid |
| Amo.3:8#14 | προφητεύσει | προφητεύω | V-FAI-3S | 2 | right | right | τίς οὐ προφητεύσει, 'who will not prophesy'; Morpheus the same |
| Amo.4:8#16 | ἐμπλησθῶσιν | ἐμπίμπλημι | V-APS-3P | 2 | right | right | οὐ μὴ ἐμπλησθῶσιν, 'they shall not be satisfied'; Morpheus the same |
| Amo.5:20#5 | τοῦ | ὁ | T-GSM | 2a | right | right | ἡ ἡμέρα τοῦ κυρίου |
| Amo.8:3#2 | ὀλολύξει | ὀλολύζω | V-FAI-3S | 2 | right | right | ὀλολύξει τὰ φατνώματα, 'the ceilings shall howl'; Morpheus the same |
| Oba.1:3#17 | ἐν | ἐν | PREP | 1 | right | right | λέγων ἐν καρδίᾳ αὐτοῦ |
| Oba.1:12#8 | ἡμέρᾳ | ἡμέρα | N-DSF | 1 | right | right | ἐν ἡμέρᾳ ἀλλοτρίων, 'in the day of strangers' |
| Oba.1:13#6 | ἐν | ἐν | PREP | 1 | right | right | ἐν ἡμέρᾳ πόνων αὐτῶν |
| Oba.1:13#12 | καὶ | καί | CONJ | 1 | right | right | μηδὲ ἐπίδῃς καὶ σύ, 'nor you too' |
| Oba.1:13#14 | τὴν | ὁ | T-ASF | 1 | right | right | τὴν συναγωγὴν αὐτῶν |
| Oba.1:20#4 | ἡ | ὁ | T-NSF | 1 | right | right | τῆς μετοικεσίας ἡ ἀρχὴ αὕτη, subject |
| Oba.1:14#12 | συγκλείσῃς | συγκλείω | V-AAS-2S | 2 | right | right | μηδὲ συγκλείσῃς τοὺς φεύγοντας, 'neither should you have shut up his fugitives'; Morpheus the same |
| Oba.1:16#4 | ἔπιες | πίνω | V-2AAI-2S | 2 | right | right | ὃν τρόπον ἔπιες, 'as you have drunk'; Morpheus the same |
| Oba.1:17#3 | τῷ | ὁ | T-DSN | 2a | right | right | ἐν δὲ τῷ ὄρει Σειών |
| Oba.1:18#14 | οἶκος | οἶκος | N-NSM | 2a | right | right | ὁ δὲ οἶκος Ἠσαὺ εἰς καλάμην, subject |
| Oba.1:18#29 | τῷ | ὁ | T-DSM | 2a | right | right | τῷ οἴκῳ Ἠσαύ |
| Oba.1:21#2 | ἀναβήσονται | ἀναβαίνω | V-FDI-3P | 2 | right | right | ἀναβήσονται ἀνασωζόμενοι, 'they that escape shall come up' (TAGNT writes ἀναβήσεται V-FDI-3S); Morpheus fut mid |
| Jon.1:4#12 | ἐν | ἐν | PREP | 1 | right | right | κλύδων μέγας ἐν τῇ θαλάσσῃ |
| Jon.1:13#15 | θάλασσα | θάλασσα | N-NSF | 1 | right | right | ἡ θάλασσα ἐπορεύετο, subject |
| Jon.4:3#6 | τὴν | ὁ | T-ASF | 1 | right | right | λάβε τὴν ψυχήν μου |
| Jon.4:4#6 | Εἰ | εἰ | COND | 1 | right | right | Εἰ σφόδρα λελύπησαι σύ; a question's εἰ, which TAGNT writes COND (its only analysis, 439) |
| Jon.4:8#15 | καὶ | καί | CONJ | 1 | right | right | καὶ ἐπάταξεν ὁ ἥλιος |
| Jon.4:9#12 | τῇ | ὁ | T-DSF | 1 | right | right | ἐπὶ τῇ κολοκύνθῃ |
| Jon.1:3#31 | πλεῦσαι | πλέω | V-AAN | 2 | right | right | τοῦ πλεῦσαι μετ᾽ αὐτῶν, 'to sail with them'; Morpheus the same |
| Jon.1:5#19 | τῷ | ὁ | T-DSN | 2a | right | right | τῶν ἐν τῷ πλοίῳ |
| Jon.1:16#16 | εὐχάς | εὐχή | N-APF | 2 | right | right | εὔξαντο εὐχάς, 'vowed vows'; Morpheus the same |
| Jon.2:1#20 | τρεῖς | τρεῖς, τρία | A-APF | 2a | right | right | τρεῖς ἡμέρας καὶ τρεῖς νύκτας |
| Jon.2:7#11 | ἀναβήτω | ἀναβαίνω | V-2AAM-3S | 2 | right | right | καὶ ἀναβήτω φθορὰ ζωῆς μου, 'let my ruined life be restored' (come up); Morpheus aor imperat act 3rd sg (unmapped) |
| Jon.2:8#9 | τοῦ | ὁ | T-GSM | 2a | right | right | τοῦ κυρίου ἐμνήσθην, 'I remembered the Lord' |
| Mic.2:5#4 | ἔσται | εἰμί | V-FDI-3S | 1 | right | right | οὐκ ἔσται σοι βάλλων σχοινίον, 'you shall have no one to cast a line' |
| Mic.2:8#10 | τῆς | ὁ | T-GSF | 1 | right | right | κατέναντι τῆς εἰρήνης αὐτοῦ |
| Mic.3:1#10 | καὶ | καί | CONJ | 1 | right | right | αἱ ἀρχαὶ οἴκου Ἰακὼβ καὶ οἱ κατάλοιποι |
| Mic.3:6#23 | ἐπ᾽ | ἐπί | PREP | 1 | right | right | συσκοτάσει ἐπ᾽ αὐτούς |
| Mic.6:6#3 | καταλάβω | καταλαμβάνω | V-2AAS-1S | 1 | right | right | ἐν τίνι καταλάβω τὸν κύριον, 'wherewithal shall I reach the Lord' |
| Mic.7:3#15 | λόγους | λόγος | N-APM | 1 | right | right | εἰρηνικοὺς λόγους ἐλάλησεν |
| Mic.2:8#18 | ἀφελέσθαι | ἀφαιρέω | V-2AMN | 2 | right | right | τοῦ ἀφελέσθαι ἐλπίδα, 'to remove hope'; Morpheus the same |
| Mic.3:4#24 | τοῖς | ὁ | T-DPN | 2a | right | right | ἐν τοῖς ἐπιτηδεύμασιν αὐτῶν (ἐπιτήδευμα, neuter) |
| Mic.3:8#13 | τοῦ | ὁ | T-GSN | 2a | right | right | τοῦ ἀπαγγεῖλαι, the article of an infinitive |
| Mic.4:3#30 | ἀντάρῃ | ἀνταίρω | V-AAS-3S | 2 | right | right | οὐκέτι μὴ ἀντάρῃ ἔθνος ἐπ᾽ ἔθνος ῥομφαίαν, 'nation shall no more lift up sword'; Morpheus the same |
| Mic.5:15#7 | θυμῷ | θυμός | N-DSM | 2 | right | right | ἐν ὀργῇ καὶ ἐν θυμῷ, 'in anger and wrath'; Morpheus the same |
| Mic.6:16#28 | συρισμόν | συρισμός | N-ASM | 2 | right | right | εἰς συρισμόν, 'to hissing'; Morpheus the same |
| Nah.1:5#23 | ἐν | ἐν | PREP | 1 | right | right | οἱ κατοικοῦντες ἐν αὐτῇ |
| Nah.2:2#16 | σφόδρα | σφόδρα | ADV | 1 | right | right | ἄνδρισαι τῇ ἰσχύι σφόδρα, 'be very valiant' |
| Nah.2:3#7 | καθὼς | καθώς | CONJ | 1 | right | right | τὴν ὕβριν Ἰακὼβ καθὼς ὕβριν τοῦ Ἰσραήλ, 'as the pride of Israel' |
| Nah.3:5#20 | καὶ | καί | CONJ | 1 | right | right | καὶ δείξω ἔθνεσιν |
| Nah.3:7#19 | παράκλησιν | παράκλησις | N-ASF | 1 | right | right | πόθεν ζητήσω παράκλησιν αὐτῇ, 'whence shall I seek comfort for her' |
| Nah.3:11#4 | καὶ | καί | CONJ | 1 | right | right | μεθυσθήσῃ καὶ ἔσῃ ὑπερεωραμένη |
| Nah.2:1#2 | ἐξῆρται | ἐξαρτάω | V-IAI-3S | 2 | wrong | wrong | Συντετέλεσται, ἐξῆρται, 'it is all over with him, he has been removed': the perfect middle-passive of ἐξαίρω, V-RPI-3S, beside the perfect συντετέλεσται; the parser's one candidate read -ται as a stem in -τα and the rule 'εξαρτα-ι as εξαρτα-ω, augment undone' (33 lemmas), an imperfect of ἐξαρτάω 'hang', which would be ἐξήρτα; Morpheus ἐξαίρω perf ind mp 3rd sg (unmapped: the mapping leaves perfects out) |
| Nah.2:6#10 | ἀσθενήσουσιν | ἀσθενέω | V-FAI-3P | 2 | right | right | φεύξονται … καὶ ἀσθενήσουσιν, 'they shall be weak'; Morpheus the same |
| Nah.2:12#13 | σκύμνοις | σκύμνος | N-DPM | 2 | right | right | ἡ νομὴ ἡ οὖσα τοῖς σκύμνοις, 'for his whelps'; Morpheus dat pl masc or fem |
| Nah.3:3#2 | ἱππέως | ἱππεύς | N-GSM | 2 | right | right | ἱππέως ἀναβαίνοντος, 'of the mounting rider'; Morpheus the same |
| Nah.3:5#24 | αἰσχύνην | αἰσχύνη | N-ASF | 2 | right | right | δείξω ἔθνεσιν τὴν αἰσχύνην σου, 'your shame'; Morpheus the same |
| Nah.3:9#12 | φυγῆς | φυγή | N-GSF | 2a | right | right | οὐκ ἔστιν πέρας τῆς φυγῆς, 'no limit of the flight'; Morpheus the same |
| Hab.2:13#4 | παρὰ | παρά | PREP | 1 | right | right | ταῦτά ἐστιν παρὰ Κυρίου, 'of the Lord' |
| Hab.3:10#9 | ἔδωκεν | δίδωμι | V-AAI-3S | 1 | right | right | ἔδωκεν ἡ ἄβυσσος φωνὴν αὐτῆς, 'the deep uttered her voice' |
| Hab.3:13#1 | ἐξῆλθες | ἐξέρχομαι | V-2AAI-2S | 1 | right | right | ἐξῆλθες εἰς σωτηρίαν, 'you went forth' |
| Hab.3:13#17 | δεσμούς | δεσμός | N-APM | 1 | right | right | ἐξήγειρας δεσμούς, 'you have brought bands' |
| Hab.3:18#5 | κυρίῳ | κύριος | N-DSM | 1 | right | right | ἐν τῷ κυρίῳ ἀγαλλιάσομαι |
| Hab.3:19#11 | εἰς | εἰς | PREP | 1 | right | right | εἰς συντέλειαν |
| Hab.1:8#14 | Ἀραβίας | Ἀραβία | N-GSF | 2a | right | right | τοὺς λύκους τῆς Ἀραβίας, 'the wolves of Arabia'; Morpheus the same among others |
| Hab.2:1#12 | τοῦ | ὁ | T-GSN | 2a | right | right | ἀποσκοπεύσω τοῦ ἰδεῖν, the article of an infinitive |
| Hab.2:3#16 | ὑπόμεινον | ὑπομένω | V-AAM-2S | 2 | right | right | ὑπόμεινον αὐτόν, 'wait for him'; Morpheus the same |
| Hab.2:5#34 | λαούς | λαός | N-APM | 2 | right | right | εἰσδέξεται … πάντας τοὺς λαούς; Morpheus the same |
| Hab.2:7#9 | ἐπίβουλοί | ἐπίβουλος | N-NPM | 2a | right | right | ἐκνήψουσιν οἱ ἐπίβουλοί σου, 'they that plot against you shall awake', subject (the parser's part of speech, N; Morpheus A, nom pl) |
| Hab.2:18#10 | φαντασίαν | φαντασία | N-ASF | 2 | right | right | χώνευμα, φαντασίαν ψευδῆ, 'a false image'; Morpheus the same |
| Zep.1:5#8 | στρατιᾷ | στρατιά | N-DSF | 1 | right | right | προσκυνοῦντας … τῇ στρατιᾷ τοῦ οὐρανοῦ, 'worship the host of heaven' |
| Zep.1:11#14 | οἱ | ὁ | T-NPM | 1 | right | right | ἐξωλεθρεύθησαν πάντες οἱ ἐπηρμένοι, subject |
| Zep.1:12#11 | λύχνου | λύχνος | N-GSM | 1 | right | right | μετὰ λύχνου, 'with a candle' |
| Zep.3:11#2 | τῇ | ὁ | T-DSF | 1 | right | right | ἐν τῇ ἡμέρᾳ ἐκείνῃ |
| Zep.3:11#38 | μου | ἐγώ | P-1GS | 1 | right | right | τὸ ὄρος τὸ ἅγιόν μου |
| Zep.3:13#29 | οὐκ | οὐ | PRT-N | 1 | right | right | οὐκ ἔσται ὁ ἐκφοβῶν |
| Zep.1:7#18 | ἡγίακεν | ἁγιάζω | V-RAI-3S | 2 | right | right | ἡτοίμακεν … ἡγίακεν τοὺς κλητοὺς αὐτοῦ, 'has sanctified his guests'; Morpheus perf ind act 3rd sg (unmapped) |
| Zep.1:18#28 | συντέλειαν | συντέλεια | N-ASF | 2 | right | right | συντέλειαν καὶ σπουδὴν ποιήσει, 'he will bring a speedy destruction'; Morpheus the same |
| Zep.3:8#23 | τοῦ | ὁ | T-GSN | 2a | right | right | τοῦ ἐκχέαι, the article of an infinitive |
| Zep.3:11#14 | ἠσέβησας | ἀσεβέω | V-AAI-2S | 2 | right | right | ὧν ἠσέβησας εἰς ἐμέ, 'wherein you have transgressed against me'; Morpheus the same |
| Zep.3:17#14 | εὐφροσύνην | εὐφροσύνη | N-ASF | 2 | right | right | ἐπάξει ἐπὶ σὲ εὐφροσύνην, 'he shall bring joy upon you'; Morpheus the same |
| Zep.3:20#32 | τῷ | ὁ | T-DSN | 2a | right | right | ἐν τῷ στρέφειν με, the article of an infinitive |
| Hag.1:1#20 | ἐν | ἐν | PREP | 1 | right | right | ἐν χειρὶ Ἁγγαίου, 'by the hand of' |
| Hag.2:3#14 | ἔμπροσθεν | ἔμπροσθεν | PREP | 1 | right | right | ἐν τῇ δόξῃ αὐτοῦ τῇ ἔμπροσθεν, 'its former glory': an adverb in use, but TAGNT writes PREP for every ἔμπροσθεν, the adverbial ones too (Php 3:13, Rev 4:6) |
| Hag.2:9#12 | τὴν | ὁ | T-ASF | 1 | right | right | ὑπὲρ τὴν πρώτην |
| Hag.2:14#31 | ἐκεῖ | ἐκεῖ | ADV | 1 | right | right | ὃς ἐὰν ἐγγίσῃ ἐκεῖ |
| Hag.2:17#2 | ὑμᾶς | σύ | P-2AP | 1 | right | right | ἐπάταξα ὑμᾶς, 'I struck you' |
| Hag.2:21#22 | τὴν | ὁ | T-ASF | 1 | right | right | καὶ τὴν ξηράν |
| Hag.1:9#1 | ἐπεβλέψατε | ἐπιβλέπω | V-AAI-2P | 2 | right | right | ἐπεβλέψατε εἰς πολλά, 'you looked for much'; Morpheus the same |
| Hag.2:1#9 | τῷ | ὁ | T-DSN | 2a | right | right | τῷ δευτέρῳ ἔτει (ἔτος, neuter) |
| Hag.2:1#18 | τῷ | ὁ | T-DSM | 2a | right | right | τῷ μηνὶ τῷ ἑβδόμῳ |
| Hag.2:10#8 | δευτέρου | δεύτερος | A-GSN | 2a | right | right | ἔτους δευτέρου, 'in the second year' |
| Hag.2:15#16 | τοῦ | ὁ | T-GSN | 2a | right | right | πρὸ τοῦ θεῖναι, the article of an infinitive |
| Hag.2:18#1 | ὑποτάξατε | ὑποτάσσω | V-AAM-2P | 2 | right | right | ὑποτάξατε δὴ τὰς καρδίας ὑμῶν, 'set your hearts', an imperative with δή; Morpheus aor imperat or ind |
| Zec.1:7#24 | τὸν | ὁ | T-ASM | 1 | right | right | πρὸς Ζαχαρίαν τὸν τοῦ Βαραχίου υἱόν |
| Zec.2:7#7 | Βαβυλῶνος | Βαβυλών | N-GSF | 1 | right | right | θυγατέρα Βαβυλῶνος, 'the daughter of Babylon' |
| Zec.6:14#1 | ὁ | ὁ | T-NSM | 1 | right | right | ὁ δὲ στέφανος ἔσται |
| Zec.7:12#35 | Παντοκράτορος | παντοκράτωρ | N-GSM | 1 | right | right | παρὰ Κυρίου Παντοκράτορος |
| Zec.11:2#7 | μεγάλως | μεγάλως | ADV | 1 | right | right | μεγάλως μεγιστᾶνες ἐταλαιπώρησαν, 'greatly afflicted' |
| Zec.14:19#13 | ἂν | ἄν | PRT | 1 | right | right | ὅσα ἂν μὴ ἀναβῇ |
| Zec.5:11#19 | ἑτοιμασίαν | ἑτοιμασία | N-ASF | 2 | right | right | ἐπὶ τὴν ἑτοιμασίαν αὐτοῦ, 'on its own base'; Morpheus the same |
| Zec.7:1#4 | τῷ | ὁ | T-DSN | 2a | right | right | ἐν τῷ τετάρτῳ ἔτει |
| Zec.7:3#16 | Εἰσελήλυθεν | εἰσέρχομαι | V-2RAI-3S | 2 | right | right | Εἰσελήλυθεν ὧδε … τὸ ἁγίασμα, 'the holy offering has come in'; Morpheus perf ind act 3rd sg (unmapped) |
| Zec.9:3#7 | ἐθησαύρισεν | θησαυρίζω | V-AAI-3S | 2 | right | right | ἐθησαύρισεν ἀργύριον, 'heaped up silver'; Morpheus the same |
| Zec.14:10#42 | τῶν | ὁ | T-GPN | 2a | right | right | ἕως τῶν ὑποληνίων τοῦ βασιλέως (ὑπολήνιον, neuter) |
| Zec.14:19#16 | ἑορτάσαι | ἑορτάζω | V-AAN | 2 | right | right | ἀναβῇ ἑορτάσαι τὴν ἑορτήν, 'come up to keep the feast'; Morpheus the same among others |
| Mal.1:6#7 | κύριον | κύριος | N-ASM | 1 | right | right | δοῦλος τὸν κύριον αὐτοῦ, 'a servant his master' |
| Mal.1:8#22 | σου | σύ | P-2GS | 1 | right | right | τῷ ἡγουμένῳ σου, 'to your ruler' |
| Mal.2:12#11 | ἐκ | ἐκ | PREP | 1 | right | right | ἐκ σκηνωμάτων Ἰακώβ |
| Mal.2:14#23 | καὶ | καί | CONJ | 1 | right | right | κοινωνός σου καὶ γυνὴ διαθήκης σου |
| Mal.3:5#33 | καὶ | καί | CONJ | 1 | right | right | καὶ τοὺς καταδυναστεύοντας |
| Mal.3:14#9 | ὅτι | ὅτι | CONJ | 1 | right | right | τί πλέον ὅτι ἐφυλάξαμεν, 'what have we gained in that we have kept' |
| Mal.1:11#17 | παντὶ | πᾶς | A-DSM | 2a | right | right | ἐν παντὶ τόπῳ, 'in every place' |
| Mal.1:14#19 | θύει | θύω | V-PAI-3S | 2 | right | right | καὶ θύει διεφθαρμένον τῷ κυρίῳ, 'who sacrifices a corrupt thing'; Morpheus the same among others |
| Mal.1:14#37 | τοῖς | ὁ | T-DPN | 2a | right | right | ἐν τοῖς ἔθνεσιν (ἔθνος, neuter) |
| Mal.2:6#17 | κατευθύνων | κατευθύνω | V-PAP-NSM | 2 | right | right | ἐν εἰρήνῃ κατευθύνων ἐπορεύθη, 'he walked … directing his way'; Morpheus the same |
| Mal.3:14#10 | ἐφυλάξαμεν | φυλάσσω | V-AAI-1P | 2 | right | right | ὅτι ἐφυλάξαμεν τὰ φυλάγματα αὐτοῦ, 'we have kept his ordinances'; Morpheus the same |
| Mal.4:1#27 | ἀνάψει | ἀνάπτω | V-FAI-3S | 2 | right | right | ἀνάψει αὐτοὺς ἡ ἡμέρα, 'the day shall set them on fire'; Morpheus the same |
