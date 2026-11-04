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
- [The re-count after the three fixes](#the-re-count-after-the-three-fixes)
  - [The batches, before and after](#the-batches-before-and-after)
  - [The seven wrong words, each now](#the-seven-wrong-words-each-now)
  - [The audit's 468 words, each now](#the-audits-468-words-each-now)
  - [A fresh sample](#a-fresh-sample)
- [The re-count: the words](#the-re-count-the-words)

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

## The re-count after the three fixes

Story mw-u2w5klk.29, 2026-11-04. The Governor's word (card direct:d9a56620c9f2, 2026-11-04): "A: Fix the 3 causes first, re-count, then the model batches". The three fixes are stories mw-u2w5klk.26 (an address is tagged vocative,
F1), .27 (a preposition's case checks the word it governs, F2) and .28 (a lone candidate on thin support is not settled, F3), all landed. This section counts again, on `main` at `f1799228`, what they did to
the batches and to the first audit's words, and reads a fresh sample. It measures. It files no model story and fixes nothing. Sources: the ones the pipeline already uses (the pinned Swete, TAGNT and TBESG, and Brenton's English);
Morpheus was **not** run this time (the host's Docker refuses the socket: `permission denied`), so no word below has Morpheus's reading beside it, as the first audit's had.

**The number of batches is over 178: 193, against 178, and 121,137 pending words against 112,991.**

### The batches, before and after

Run as the story names, from a fresh checkout of `main` with the pinned sources and **no Morpheus cache and no choices** (as 'What was sampled' derives): `npm run lxx:derive -- --all --no-morpheus`, then
`npm run lxx:batches -- --book <code>` for each of the 39 books and `npm run lxx:pending -- --book <code> --batch <n>` for each of the 193 batches it printed (every listing's first line, its chapters, its pending words and its no-candidate
count, agrees with that book's `lxx:batches` row). The older columns come from the same two commands run on the older commits, each checked out alone: `b9798a6c`, where the audit was drawn, and `cd8aea45`, `main` after F1 and F2
and before F3, which is the state the story's '178 batches' is.

I read the story's '39 short lists' as the **39 recheck lists**, one a book (`lxx:pending -- --book <code> --recheck`: a blind 5% of a book's chosen words, at least one). They cannot be listed yet, for a recheck reads a book's
choices files and only `gen-01` has one; their size is 5% of the book's pending words, rounded (at least 1), as `recheckSample` would take it were every pending word chosen. There are 39 of them whatever the batches
number; their words are the last column. If '39 short lists' meant something else, the batches columns are still the number asked for.

| book | batches at the audit | batches after F1 and F2 (the 178) | batches now | change | pending at the audit | pending after F1 and F2 | pending now | change | words in the 5% recheck list now |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Gen | 11 | 11 | 12 | +1 | 7,972 | 7,980 | 8,369 | +389 | 418 |
| Exo | 9 | 9 | 10 | +1 | 6,124 | 6,125 | 6,577 | +452 | 329 |
| Lev | 7 | 7 | 8 | +1 | 4,618 | 4,618 | 5,051 | +433 | 253 |
| Num | 9 | 10 | 10 | +0 | 6,321 | 6,333 | 6,679 | +346 | 334 |
| Deu | 7 | 7 | 7 | +0 | 4,457 | 4,462 | 4,845 | +383 | 242 |
| Jos | 6 | 6 | 6 | +0 | 3,515 | 3,528 | 3,735 | +207 | 187 |
| Jdg | 5 | 5 | 6 | +1 | 3,522 | 3,532 | 3,772 | +240 | 189 |
| Rut | 1 | 1 | 1 | +0 | 437 | 441 | 474 | +33 | 24 |
| 1Sa | 7 | 7 | 8 | +1 | 4,849 | 4,856 | 5,117 | +261 | 256 |
| 2Sa | 6 | 6 | 7 | +1 | 4,195 | 4,198 | 4,419 | +221 | 221 |
| 1Ki | 8 | 8 | 8 | +0 | 4,936 | 4,938 | 5,185 | +247 | 259 |
| 2Ki | 7 | 7 | 7 | +0 | 4,414 | 4,415 | 4,664 | +249 | 233 |
| 1Ch | 8 | 8 | 8 | +0 | 5,130 | 5,133 | 5,286 | +153 | 264 |
| 2Ch | 7 | 7 | 8 | +1 | 4,864 | 4,865 | 5,134 | +269 | 257 |
| Ezr | 3 | 3 | 3 | +0 | 1,465 | 1,467 | 1,526 | +59 | 76 |
| Neh | 3 | 3 | 3 | +0 | 1,783 | 1,783 | 1,885 | +102 | 94 |
| Est | 2 | 2 | 3 | +1 | 1,480 | 1,480 | 1,562 | +82 | 78 |
| Job | 5 | 5 | 6 | +1 | 3,475 | 3,479 | 3,853 | +374 | 193 |
| Psa | 12 | 12 | 13 | +1 | 7,654 | 7,655 | 8,448 | +793 | 422 |
| Pro | 5 | 5 | 5 | +0 | 3,022 | 3,023 | 3,281 | +258 | 164 |
| Ecc | 2 | 2 | 2 | +0 | 1,116 | 1,125 | 1,219 | +94 | 61 |
| Sol | 1 | 1 | 1 | +0 | 464 | 465 | 527 | +62 | 26 |
| Isa | 9 | 9 | 10 | +1 | 6,005 | 6,006 | 6,631 | +625 | 332 |
| Jer | 9 | 9 | 10 | +1 | 5,946 | 5,948 | 6,510 | +562 | 326 |
| Lam | 1 | 1 | 1 | +0 | 613 | 614 | 690 | +76 | 35 |
| Eze | 10 | 10 | 11 | +1 | 6,852 | 6,861 | 7,310 | +449 | 366 |
| Dan | 3 | 3 | 4 | +1 | 2,420 | 2,422 | 2,626 | +204 | 131 |
| Hos | 2 | 2 | 2 | +0 | 930 | 930 | 1,033 | +103 | 52 |
| Joe | 1 | 1 | 1 | +0 | 347 | 347 | 385 | +38 | 19 |
| Amo | 1 | 1 | 2 | +1 | 684 | 684 | 747 | +63 | 37 |
| Oba | 1 | 1 | 1 | +0 | 116 | 116 | 129 | +13 | 6 |
| Jon | 1 | 1 | 1 | +0 | 174 | 175 | 199 | +24 | 10 |
| Mic | 1 | 1 | 1 | +0 | 592 | 592 | 647 | +55 | 32 |
| Nah | 1 | 1 | 1 | +0 | 229 | 229 | 250 | +21 | 13 |
| Hab | 1 | 1 | 1 | +0 | 293 | 292 | 321 | +29 | 16 |
| Zep | 1 | 1 | 1 | +0 | 257 | 257 | 283 | +26 | 14 |
| Hag | 1 | 1 | 1 | +0 | 194 | 194 | 219 | +25 | 11 |
| Zec | 2 | 2 | 2 | +0 | 1,116 | 1,116 | 1,213 | +97 | 61 |
| Mal | 1 | 1 | 1 | +0 | 307 | 307 | 336 | +29 | 17 |
| **total** | **177** | **178** | **193** | **+15** | **112,888** | **112,991** | **121,137** | **+8,146** | **6,058** |

- **Batches: 178 → 193 (+15)**, and 177 at the audit. The 39 recheck lists stay 39; their words go from 5,650 to 6,058.
- **Pending words: 112,991 → 121,137 (+8,146)**, and 112,888 at the audit. Between the audit and `cd8aea45` (F1 and F2) the change is +103; F3 is the rest. No book has fewer pending words than before F3. The words with no candidate are 9,715 at all three commits: the fixes add no forced guess.
- **The settled words:** 363,241 at the audit; 354,992 now (layer 1: 310,457 → 310,143; layer 2 or 2a: 52,784 → 44,849).
- **No model story is filed here.** The number above is what the Mayor tells the Governor first.

### The seven wrong words, each now

The seven words the first audit judged wrong (each read in its verse again, in Swete's Greek and Brenton's English):

| Ref | Was | Reads now | Judged now |
| --- | --- | --- | --- |
| 2Sa.13:20#19 ἀδελφή | ἀδελφή N-NSF (layer 1) | ἀδελφή **N-VSF**, layer 2a | right: καὶ νῦν, ἀδελφή μου, κώφευσον |
| Psa.148:2#5 ἄγγελοι | ἄγγελος N-NPM (layer 1) | ἄγγελος **N-VPM**, layer 2a | right: αἰνεῖτε αὐτόν, πάντες οἱ ἄγγελοι αὐτοῦ |
| Joe.1:5#10 πάντες | πᾶς A-NPM (layer 1) | πᾶς **A-VPM**, layer 2a | right: θρηνήσατε, πάντες οἱ πίνοντες οἶνον |
| Job.18:10#12 τρίβων | τρίβω V-PAP-NSM (layer 2) | **τρίβος N-GPF**, layer 2a | right: ἐπὶ τρίβων, 'by the path' |
| Pro.11:22#4 ῥινὶ | ῥίν N-NPF (layer 2) | ῥίν **N-DSF**, layer 2a | right: ἐν ῥινὶ ὑός, 'in a swine's snout' |
| Ecc.2:16#9 ἄφρονος | ἄφρων A-GSF-C (layer 2) | **pending**, one candidate ἄφρων A-GSF-C | not settled; **the right reading, A-GSM, is not among the candidates** |
| Nah.2:1#2 ἐξῆρται | ἐξαρτάω V-IAI-3S (layer 2) | **pending**, one candidate ἐξαρτάω V-IAI-3S | not settled; **the right reading, ἐξαίρω V-RPI-3S, is not among the candidates** |

Five are now settled right (F1 the three addresses, F2 the two prepositions). Two, F3's, are no longer settled wrong; but each is left to a model with a candidate list that holds only the wrong answer. A model that
chooses among the candidates cannot be right on them; it has to guess (a marked guess), which is what 'a word with no right candidate' costs. Two such words in 468 is the size of it in this sample.

### The audit's 468 words, each now

`data/lxx/derived` and `data/lxx/pending` from the derivation above, joined by ref to the first audit's rows ('The words'): **422 read as before** (the same lemma, parsing and layer for 420; the same lemma and parsing for two,
Pro.28:4#3 and Lam.4:2#7, which were layer 2 and are now layer 2a). **46 read differently**: 5 settled-wrong now settled right (above); 2 settled-wrong now pending with no right candidate (above); 1 unsure (1Ki.11:27#6) now pending;
and **38 judged right now pending**, 36 layer-2 words that a thin lone candidate no longer settles and 2 layer-2a articles whose neighbour became pending. No word that was right is now settled as something else.
Each of the 46, judged by hand in its verse:

| Ref | Form | Settled then | Then (lemma / parsing) | Reads now | Judged now |
| --- | --- | --- | --- | --- | --- |
| Gen.4:5#10 | προσέσχεν | προσέχω V-2AAI-3S, layer 2 | right / right | pending; its one candidate προσέχω/V-2AAI-3S/3 | the old answer is right in its verse and is that one candidate |
| Deu.12:1#9 | φυλάξετε | φυλάσσω V-FAI-2P, layer 2 | right / right | pending; its one candidate φυλάσσω/V-FAI-2P/3 | the old answer is right in its verse and is that one candidate |
| Deu.15:14#2 | ἐφοδιάσεις | ἐφοδιάζω V-FAI-2S, layer 2 | right / right | pending; its one candidate ἐφοδιάζω/V-FAI-2S/2 | the old answer is right in its verse and is that one candidate |
| Jos.10:4#9 | ἐκπολεμήσωμεν | ἐκπολεμέω V-AAS-1P, layer 2 | right / right | pending; its one candidate ἐκπολεμέω/V-AAS-1P/4 | the old answer is right in its verse and is that one candidate |
| Jos.24:7#2 | ἀνεβοήσαμεν | ἀναβοάω V-AAI-1P, layer 2 | right / right | pending; its one candidate ἀναβοάω/V-AAI-1P/1 | the old answer is right in its verse and is that one candidate |
| 2Sa.13:20#19 | ἀδελφή | ἀδελφή N-NSF, layer 1 | right / wrong | ἀδελφή N-VSF, layer 2a | right: καὶ νῦν, ἀδελφή μου, κώφευσον, an address |
| 2Sa.1:22#10 | ἀπεστράφη | ἀποστρέφω V-2API-3S, layer 2 | right / right | pending; its one candidate ἀποστρέφω/V-2API-3S/2 | the old answer is right in its verse and is that one candidate |
| 1Ki.11:27#6 | ἐπήρατο | ἐπαίρω V-ADI-3S, layer 2 | right / unsure | pending; its one candidate ἐπαίρω V-ADI-3S | lemma and mood right as before; D or M is still what the data cannot tell: the model's call, with the one candidate to start from |
| 2Ki.5:7#27 | ἀποσυνάξαι | ἀποσυνάγω V-AAN, layer 2 | right / right | pending; its one candidate ἀποσυνάγω/V-AAN/2 | the old answer is right in its verse and is that one candidate |
| 2Ki.22:6#1 | τοῖς | ὁ T-DPM, layer 2a | right / right | pending; T-DPM or T-DPN | the old answer T-DPM is right (τοῖς τέκτοσιν, masculine) and is a candidate |
| 2Ch.16:5#7 | ἀπέλιπεν | ἀπολείπω V-2AAI-3S, layer 2 | right / right | pending; its one candidate ἀπολείπω/V-2AAI-3S/2 | the old answer is right in its verse and is that one candidate |
| Neh.1:2#20 | κατελίπησαν | καταλείπω V-2API-3P, layer 2 | right / right | pending; its one candidate καταλείπω/V-2API-3P/1 | the old answer is right in its verse and is that one candidate |
| Est.8:4#10 | ἐξηγέρθη | ἐξεγείρω V-API-3S, layer 2 | right / right | pending; its one candidate ἐξεγείρω/V-API-3S/1 | the old answer is right in its verse and is that one candidate |
| Job.3:14#6 | ἠγαυριῶντο | ἀγαυριάομαι V-INI-3P, layer 2 | right / right | pending; its one candidate ἀγαυριάομαι/V-INI-3P/2 | the old answer is right in its verse and is that one candidate |
| Job.18:10#12 | τρίβων | τρίβω V-PAP-NSM, layer 2 | wrong / wrong | τρίβος N-GPF, layer 2a | right: ἐπὶ τρίβων, 'by the path' (ἐπί with the genitive; τρίβος is feminine as in Mat 3:3) |
| Psa.148:2#5 | ἄγγελοι | ἄγγελος N-NPM, layer 1 | right / wrong | ἄγγελος N-VPM, layer 2a | right: αἰνεῖτε αὐτόν, πάντες οἱ ἄγγελοι αὐτοῦ, an address |
| Psa.36:32#1 | κατανοήσει | κατανοέω V-FAI-3S, layer 2 | right / right | pending; its one candidate κατανοέω/V-FAI-3S/24 | the old answer is right in its verse and is that one candidate |
| Pro.11:22#4 | ῥινὶ | ῥίν N-NPF, layer 2 | right / wrong | ῥίν N-DSF, layer 2a | right: ἐν ῥινὶ ὑός, 'in a swine's snout' |
| Ecc.2:16#9 | ἄφρονος | ἄφρων A-GSF-C, layer 2 | right / wrong | pending; its one candidate ἄφρων A-GSF-C | still not right, and now not settled: μετὰ τοῦ ἄφρονος wants A-GSM, which is not a candidate, so the model must read it, not choose it |
| Ecc.4:15#2 | σύμπαντας | σύμπας A-APM, layer 2 | right / right | pending; its one candidate σύμπας/A-APM/2 | the old answer is right in its verse and is that one candidate |
| Ecc.5:1#12 | ἐξενέγκαι | ἐκφέρω V-AAN, layer 2 | right / right | pending; its one candidate ἐκφέρω/V-AAN/1 | the old answer is right in its verse and is that one candidate |
| Sol.4:6#7 | κινηθῶσιν | κινέω V-APS-3P, layer 2 | right / right | pending; its one candidate κινέω/V-APS-3P/2 | the old answer is right in its verse and is that one candidate |
| Sol.4:9#6 | ἐκαρδίωσας | καρδιόω V-AAI-2S, layer 2 | right / right | pending; its one candidate καρδιόω/V-AAI-2S/3 | the old answer is right in its verse and is that one candidate |
| Isa.22:5#14 | φάραγγι | φάραγξ N-DSF, layer 2 | right / right | pending; its one candidate φάραγξ/N-DSF/2 | the old answer is right in its verse and is that one candidate |
| Isa.31:2#16 | ἐπαναστήσεται | ἐπανίστημι V-FMI-3S, layer 2 | right / right | pending; its one candidate ἐπανίστημι/V-FMI-3S/1 | the old answer is right in its verse and is that one candidate |
| Isa.50:2#20 | τοῦ | ὁ T-GSN, layer 2a | right / right | pending; T-GSM, T-GSN or P-GSN | the old answer T-GSN is right (τοῦ ῥύσασθαι, the article before an infinitive) and is a candidate |
| Isa.59:5#15 | συντρίψας | συντρίβω V-AAP-NSM, layer 2 | right / right | pending; its one candidate συντρίβω/V-AAP-NSM/1 | the old answer is right in its verse and is that one candidate |
| Lam.3:41#1 | ἀναλάβωμεν | ἀναλαμβάνω V-2AAS-1P, layer 2 | right / right | pending; its one candidate ἀναλαμβάνω/V-2AAS-1P/2 | the old answer is right in its verse and is that one candidate |
| Eze.30:23#2 | διασπερῶ | διασπείρω V-FAI-1S, layer 2 | right / right | pending; its one candidate διασπείρω/V-FAI-1S/1 | the old answer is right in its verse and is that one candidate |
| Dan.8:10#9 | ἐρράχθη | ῥάσσω V-API-3S, layer 2 | right / right | pending; its one candidate ῥάσσω/V-API-3S/3 | the old answer is right in its verse and is that one candidate |
| Hos.9:10#23 | ἀπηλλοτριώθησαν | ἀπαλλοτριόω V-API-3P, layer 2 | right / right | pending; its one candidate ἀπαλλοτριόω/V-API-3P/9 | the old answer is right in its verse and is that one candidate |
| Hos.10:8#2 | ἐξαρθήσονται | ἐξαίρω V-FPI-3P, layer 2 | right / right | pending; its one candidate ἐξαίρω/V-FPI-3P/1 | the old answer is right in its verse and is that one candidate |
| Joe.1:5#10 | πάντες | πᾶς A-NPM, layer 1 | right / wrong | πᾶς A-VPM, layer 2a | right: θρηνήσατε, πάντες οἱ πίνοντες οἶνον, an address |
| Amo.8:3#2 | ὀλολύξει | ὀλολύζω V-FAI-3S, layer 2 | right / right | pending; its one candidate ὀλολύζω/V-FAI-3S/1 | the old answer is right in its verse and is that one candidate |
| Oba.1:14#12 | συγκλείσῃς | συγκλείω V-AAS-2S, layer 2 | right / right | pending; its one candidate συγκλείω/V-AAS-2S/6 | the old answer is right in its verse and is that one candidate |
| Jon.1:3#31 | πλεῦσαι | πλέω V-AAN, layer 2 | right / right | pending; its one candidate πλέω/V-AAN/2 | the old answer is right in its verse and is that one candidate |
| Mic.2:8#18 | ἀφελέσθαι | ἀφαιρέω V-2AMN, layer 2 | right / right | pending; its one candidate ἀφαιρέω/V-2AMN/1 | the old answer is right in its verse and is that one candidate |
| Mic.4:3#30 | ἀντάρῃ | ἀνταίρω V-AAS-3S, layer 2 | right / right | pending; its one candidate ἀνταίρω/V-AAS-3S/1 | the old answer is right in its verse and is that one candidate |
| Nah.2:1#2 | ἐξῆρται | ἐξαρτάω V-IAI-3S, layer 2 | wrong / wrong | pending; its one candidate ἐξαρτάω V-IAI-3S | still not right, and now not settled: ἐξῆρται wants ἐξαίρω V-RPI-3S, which is not a candidate (nor is any perfect), so the model must read it, not choose it |
| Hab.2:3#16 | ὑπόμεινον | ὑπομένω V-AAM-2S, layer 2 | right / right | pending; its one candidate ὑπομένω/V-AAM-2S/1 | the old answer is right in its verse and is that one candidate |
| Zep.1:7#18 | ἡγίακεν | ἁγιάζω V-RAI-3S, layer 2 | right / right | pending; its one candidate ἁγιάζω/V-RAI-3S/2 | the old answer is right in its verse and is that one candidate |
| Hag.1:9#1 | ἐπεβλέψατε | ἐπιβλέπω V-AAI-2P, layer 2 | right / right | pending; its one candidate ἐπιβλέπω/V-AAI-2P/1 | the old answer is right in its verse and is that one candidate |
| Hag.2:18#1 | ὑποτάξατε | ὑποτάσσω V-AAM-2P, layer 2 | right / right | pending; its one candidate ὑποτάσσω/V-AAM-2P/3 | the old answer is right in its verse and is that one candidate |
| Zec.7:3#16 | Εἰσελήλυθεν | εἰσέρχομαι V-2RAI-3S, layer 2 | right / right | pending; its one candidate εἰσέρχομαι/V-2RAI-3S/2 | the old answer is right in its verse and is that one candidate |
| Mal.3:14#10 | ἐφυλάξαμεν | φυλάσσω V-AAI-1P, layer 2 | right / right | pending; its one candidate φυλάσσω/V-AAI-1P/6 | the old answer is right in its verse and is that one candidate |
| Mal.4:1#27 | ἀνάψει | ἀνάπτω V-FAI-3S, layer 2 | right / right | pending; its one candidate ἀνάπτω/V-FAI-3S/5 | the old answer is right in its verse and is that one candidate |

What the 41 words that went to the model cost: 39 are layer 2 (of the first audit's 139, 28%) and 2 are layer 2a (of its 95); all but Ecc.2:16#9 and Nah.2:1#2 carry the right reading as a candidate. The 427 of the first audit's 468 that are
still settled (468 less 41) are 427 right and none wrong (the seven wrong words: five are settled right, two are pending). That is **not a fresh measure**: those words are the ones the three fixes were written from. It
says only that the fixes did what they were written to do on the words they were written from.

### A fresh sample

**The draw** is the first audit's (`scripts/lxx/audit-sample.ts`): mulberry32, the first six steps of a Fisher-Yates shuffle over each pool in the text's order, **6 words from each pool of each of the 39 books** (layer 1; layer 2
or 2a), 468 words, nothing filtered or weighted; only the seed is new, **20261104** (the first was 20261103), given as `--seed 20261104`. The pools are those of the derivation now: layer 1 310,143 words, layer 2 or 2a 44,849 (per book,
the head of each book in the script's output). Every word was read in its verse in Swete's Greek and Brenton's English, as 'How a word was judged' says. Its rows are 'The re-count: the words'.

```bash
npx tsx scripts/lxx/audit-sample.ts --seed 20261104                                              # the sample
npx tsx scripts/lxx/audit-sample.ts --count docs/sources/lxx-settled-audit.md --section 'The re-count: the words'   # the counts below, from the rows
```

#### The whole word (lemma and parsing both right)

| | words | right | wrong | unsure | right of those judged (95% interval) | right of all, unsure as not right (95% interval) |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| all | 468 | 456 | 7 | 5 | 98.5% (96.9% to 99.3%) | 97.4% (95.6% to 98.5%) |
| layer 1 | 234 | 232 | 1 | 1 | 99.6% (97.6% to 99.9%) | 99.1% (96.9% to 99.8%) |
| layer 2 or 2a | 234 | 224 | 6 | 4 | 97.4% (94.4% to 98.8%) | 95.7% (92.3% to 97.7%) |
| of which layer 2 | 124 | 115 | 6 | 3 | 95.0% (89.6% to 97.7%) | 92.7% (86.8% to 96.1%) |
| of which layer 2a | 110 | 109 | 0 | 1 | 100.0% (96.6% to 100.0%) | 99.1% (95.0% to 99.8%) |

#### The lemma alone

| | words | right | wrong | unsure | right of those judged (95% interval) | right of all, unsure as not right (95% interval) |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| all | 468 | 465 | 3 | 0 | 99.4% (98.1% to 99.8%) | 99.4% (98.1% to 99.8%) |
| layer 1 | 234 | 234 | 0 | 0 | 100.0% (98.4% to 100.0%) | 100.0% (98.4% to 100.0%) |
| layer 2 or 2a | 234 | 231 | 3 | 0 | 98.7% (96.3% to 99.6%) | 98.7% (96.3% to 99.6%) |
| of which layer 2 | 124 | 121 | 3 | 0 | 97.6% (93.1% to 99.2%) | 97.6% (93.1% to 99.2%) |
| of which layer 2a | 110 | 110 | 0 | 0 | 100.0% (96.6% to 100.0%) | 100.0% (96.6% to 100.0%) |

#### The parsing alone

| | words | right | wrong | unsure | right of those judged (95% interval) | right of all, unsure as not right (95% interval) |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| all | 468 | 457 | 6 | 5 | 98.7% (97.2% to 99.4%) | 97.6% (95.8% to 98.7%) |
| layer 1 | 234 | 232 | 1 | 1 | 99.6% (97.6% to 99.9%) | 99.1% (96.9% to 99.8%) |
| layer 2 or 2a | 234 | 225 | 5 | 4 | 97.8% (95.0% to 99.1%) | 96.2% (92.9% to 98.0%) |
| of which layer 2 | 124 | 116 | 5 | 3 | 95.9% (90.7% to 98.2%) | 93.5% (87.8% to 96.7%) |
| of which layer 2a | 110 | 109 | 0 | 1 | 100.0% (96.6% to 100.0%) | 99.1% (95.0% to 99.8%) |

#### By book (the whole word)

| book | layer 1: right / wrong / unsure | layer 2 or 2a: right / wrong / unsure |
| --- | --- | --- |
| Gen | 5 / 0 / 1 | 6 / 0 / 0 |
| Exo | 6 / 0 / 0 | 6 / 0 / 0 |
| Lev | 6 / 0 / 0 | 6 / 0 / 0 |
| Num | 6 / 0 / 0 | 6 / 0 / 0 |
| Deu | 6 / 0 / 0 | 6 / 0 / 0 |
| Jos | 6 / 0 / 0 | 6 / 0 / 0 |
| Jdg | 6 / 0 / 0 | 5 / 0 / 1 |
| Rut | 5 / 1 / 0 | 5 / 1 / 0 |
| 1Sa | 6 / 0 / 0 | 5 / 1 / 0 |
| 2Sa | 6 / 0 / 0 | 6 / 0 / 0 |
| 1Ki | 6 / 0 / 0 | 5 / 1 / 0 |
| 2Ki | 6 / 0 / 0 | 6 / 0 / 0 |
| 1Ch | 6 / 0 / 0 | 6 / 0 / 0 |
| 2Ch | 6 / 0 / 0 | 6 / 0 / 0 |
| Ezr | 6 / 0 / 0 | 6 / 0 / 0 |
| Neh | 6 / 0 / 0 | 6 / 0 / 0 |
| Est | 6 / 0 / 0 | 5 / 1 / 0 |
| Job | 6 / 0 / 0 | 6 / 0 / 0 |
| Psa | 6 / 0 / 0 | 6 / 0 / 0 |
| Pro | 6 / 0 / 0 | 5 / 1 / 0 |
| Ecc | 6 / 0 / 0 | 6 / 0 / 0 |
| Sol | 6 / 0 / 0 | 6 / 0 / 0 |
| Isa | 6 / 0 / 0 | 6 / 0 / 0 |
| Jer | 6 / 0 / 0 | 6 / 0 / 0 |
| Lam | 6 / 0 / 0 | 6 / 0 / 0 |
| Eze | 6 / 0 / 0 | 5 / 0 / 1 |
| Dan | 6 / 0 / 0 | 6 / 0 / 0 |
| Hos | 6 / 0 / 0 | 6 / 0 / 0 |
| Joe | 6 / 0 / 0 | 5 / 0 / 1 |
| Amo | 6 / 0 / 0 | 6 / 0 / 0 |
| Oba | 6 / 0 / 0 | 6 / 0 / 0 |
| Jon | 6 / 0 / 0 | 6 / 0 / 0 |
| Mic | 6 / 0 / 0 | 5 / 0 / 1 |
| Nah | 6 / 0 / 0 | 6 / 0 / 0 |
| Hab | 6 / 0 / 0 | 5 / 1 / 0 |
| Zep | 6 / 0 / 0 | 6 / 0 / 0 |
| Hag | 6 / 0 / 0 | 6 / 0 / 0 |
| Zec | 6 / 0 / 0 | 6 / 0 / 0 |
| Mal | 6 / 0 / 0 | 6 / 0 / 0 |

**The whole word: 456 of the 463 judged, 98.5%, with a Wilson interval of 96.9% to 99.3%**, beside the first audit's 98.5% (96.9% to 99.3%): the same figure to the first decimal and the same interval. Seven wrong and five unsure
(the first had seven and one). **It cannot settle the 98 bar.** The interval holds 98%, as the first did; the estimate is above 98 and the interval says nothing more. A lower end above 98% at this rate would need about 2,300 words
judged by hand, five times this sample. The lemma alone is 465 of 468, 99.4% (98.1% to 99.8%): above 98, and holding 99.

**What was wrong or unsure, by cause** (none of these is one of the three the fixes mended; each has its row below):

| Cause | Words | Where it lives |
| --- | --- | --- |
| **Analogy's lone candidate, taken on one sibling form** | Rut.2:22#12 ἐπορεύθης (taken as the subjunctive V-AOS-2S, not the indicative V-AOI-2S); 1Sa.4:12#20 διερρηγότα (masculine singular for a neuter plural); 1Ki.12:24#810 κατάρξω (read as καταργέω, whose future is not that; it is κατάρχω's); Hab.1:2#4 κράξομαι (a present passive for the future middle) | `byAnalogy` in `scripts/lxx/parser.ts`: the case the first audit's 'Not changed' note named and `mw-u2w5klk.30` (deferred) holds. All four are layer 2 with support 1 or 3 and the note `analogy: a sibling form in the New Testament`. |
| **A rule's winner over the reading the verse needs** | Est.1:6#15 ἀργυροῖς (the noun ἄργυρος, where ἀργυροῦς 'of silver' agrees with κύβοις); Pro.5:16#11 σὰς (the participle σαίνω, where σός 'your' is the word) | `settleParsed`: each is its ending rule's only candidate (rule support 70 and 7, not analogy), settled because its stem support reached F3's threshold of 4. |
| **Layer 1 on a name's one New Testament case** | Rut.2:14#4 Βόος (N-GSM, the genitive Luke 3:32 has, for the nominative the verse needs) | `settle` in `scripts/lxx/tagnt.ts`: layer 1 takes the form's one New Testament analysis (seen once, confidence 0.90); the nominative is not among TAGNT's. |
| **Unsure: the form decides nothing** | Gen.35:29#10 πρεσβύτερος (N or A); Jdg.21:22#38 πλημμελήσατε (mood); Eze.1:22#18 ἐπάνωθεν (preposition or adverb); Joe.2:7#22 ἐκκλίνωσιν (present or aorist subjunctive, one form); Mic.4:8#5 αὐχμώδης (agrees with πύργος or with ποιμνίου) | Not faults of a rule: the text and TAGNT's data leave them open. |

By layer: layer 1, 232 of 233 judged (99.6%, 97.6% to 99.9%); layer 2 or 2a, 224 of 230 judged (97.4%, 94.4% to 98.8%); layer 2 alone 115 of 121 (95.0%, 89.6% to 97.7%), and layer 2a, the agreement check, 109 of 109. The first audit's
layer 2 was 134 of 138 (97.1%). Layer 2 is again the pool under 98, and now by more; its six wrong words are four analogy's and two a rule's winner, which F3 (a thin lone candidate) does not touch because
analogy's candidate has no stem support to be thin and the two rule winners have enough.

**What this does not say** is what 'What this does not say' above says of the first sample: 12 words a book weighs a small book like a large one; per-book rows are for finding where words fell; the pending words, the model's choices and Morpheus
are not here; and a cause rarer than one in 468 would not show. Added: the layer 2 or 2a pool is now 12.6% of the settled words (44,849 of 354,992), where it was 14.5%, so the 'all' line leans on it as before and by less.

## The re-count: the words

The fresh sample of 'The re-count after the three fixes', seed 20261104, in the order of the draw. Columns as in 'The words'. A word judged right has the three words each side as its evidence (the script's
quoting; the judgment is the hand's). A word judged wrong or unsure has what decides it written out.

| ref | form | lemma | parsing | layer | lemma | parsing | evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gen.2:3#6 | ἡμέραν | ἡμέρα | N-ASF | 1 | right | right | [ὁ θεὸς τὴν] ἡμέραν τὴν ἑβδόμην καὶ |
| Gen.11:31#37 | εἰς | εἰς | PREP | 1 | right | right | τῶν Χαλδαίων πορευθῆναι εἰς τὴν γῆν Χανάαν· |
| Gen.25:6#18 | ἔτι | ἔτι | ADV | 1 | right | right | τοῦ υἱοῦ αὐτοῦ ἔτι ζῶντος αὐτοῦ πρὸς |
| Gen.34:20#12 | τῆς | ὁ | T-GSF | 1 | right | right | πρὸς τὴν πύλην τῆς πόλεως αὐτῶν, καὶ |
| Gen.35:29#10 | πρεσβύτερος | πρεσβύτερος | N-NSM | 1 | right | unsure | predicate 'old and full of days': N-NSM or A-NSM(-C) (TAGNT writes πρεσβύτερος A-NSM-C as an adjective at Luk 15:25, N as 'elder' of a man); the verse does not settle it |
| Gen.43:22#7 | ἀγοράσαι | ἀγοράζω | V-AAN | 1 | right | right | ἠνέγκαμεν μεθ᾽ ἑαυτῶν ἀγοράσαι βρώματα· οὐκ οἴδαμεν |
| Gen.4:7#10 | ἡσύχασον | ἡσυχάζω | V-AAM-2S | 2 | right | right | μὴ διέλῃς, ἥμαρτες; ἡσύχασον· πρὸς σὲ ἡ |
| Gen.15:9#10 | τριετίζουσαν | τριετίζω | V-PAP-ASF | 2 | right | right | τριετίζουσαν καὶ αἶγα τριετίζουσαν καὶ κριὸν τριετίζοντα |
| Gen.16:15#12 | τοῦ | ὁ | T-GSM | 2a | right | right | Ἀβρὰμ τὸ ὄνομα τοῦ υἱοῦ αὐτοῦ, ὃν |
| Gen.17:27#5 | τοῦ | ὁ | T-GSM | 2a | right | right | πάντες οἱ ἄνδρες τοῦ οἴκου αὐτοῦ καὶ |
| Gen.32:16#13 | τοῖς | ὁ | T-DPM | 2a | right | right | μόνας. εἶπεν δὲ τοῖς παισὶν αὐτοῦ Προπορεύεσθε |
| Gen.39:22#4 | ἀρχιδεσμοφύλαξ | ἀρχιδεσμοφύλαξ | N-NSM | 2a | right | right | καὶ ἔδωκεν ὁ ἀρχιδεσμοφύλαξ τὸ δεσμωτήριον διὰ |
| Exo.8:9#4 | πρὸς | πρός | PREP | 1 | right | right | εἶπεν δὲ Μωυσῆς πρὸς Φαραώ Τάξαι πρὸς |
| Exo.10:23#1 | καὶ | καί | CONJ | 1 | right | right | καὶ οὐκ εἶδεν οὐδεὶς |
| Exo.16:7#6 | Κυρίου | κύριος | N-GSM | 1 | right | right | ὄψεσθε τὴν δόξαν Κυρίου ἐν τῷ εἰσακοῦσαι |
| Exo.25:23#3 | αὐτῇ | αὐτός | P-DSF | 1 | right | right | καὶ ποιήσεις αὐτῇ στρεπτὰ κυμάτια χρυσᾶ |
| Exo.28:21#9 | υἱῶν | υἱός | N-GPM | 1 | right | right | τῶν ὀνομάτων τῶν υἱῶν Ἰσραὴλ δέκα δύο, |
| Exo.38:15#11 | καὶ | καί | CONJ | 1 | right | right | τρεῖς ἐκ τούτου καὶ τρεῖς ἐκ τούτου, |
| Exo.19:21#10 | τῷ | ὁ | T-DSM | 2a | right | right | λέγων Καταβὰς διαμάρτυραι τῷ λαῷ, μή ποτε |
| Exo.24:17#12 | κορυφῆς | κορυφή | N-GSF | 2a | right | right | φλέγον ἐπὶ τῆς κορυφῆς τοῦ ὄρους ἐναντίον |
| Exo.32:25#3 | Μωυσῆς | Μωϋσῆς, Μωσῆς | N-NSM | 2 | right | right | καὶ ἰδὼν Μωυσῆς τὸν λαὸν ὅτι |
| Exo.33:8#29 | τοῦ | ὁ | T-GSN | 2a | right | right | ἀπιόντος Μωσῆ ἕως τοῦ εἰσελθεῖν αὐτὸν εἰς |
| Exo.36:23#4 | ἀσπιδίσκας | ἀσπιδίσκη | N-APF | 2 | right | right | καὶ ἐποίησαν δύο ἀσπιδίσκας χρυσᾶς καὶ δύο |
| Exo.36:34#17 | τῷ | ὁ | T-DSM | 2a | right | right | καθὰ συνέταξεν Κύριος τῷ Μωυσῇ. |
| Lev.4:11#21 | τῇ | ὁ | T-DSF | 1 | right | right | τῇ κοιλίᾳ καὶ τῇ κόπρῳ, |
| Lev.5:12#6 | ἱερέα | ἱερεύς | N-ASM | 1 | right | right | αὐτὸ πρὸς τὸν ἱερέα. καὶ δραξάμενος ὁ |
| Lev.13:53#25 | σκεύει | σκεῦος | N-DSN | 1 | right | right | ἢ ἐν παντὶ σκεύει δερματίνῳ, |
| Lev.20:11#16 | ἔνοχοί | ἔνοχος | A-NPM | 1 | right | right | ἀπεκάλυψεν, θανατούσθω· ἀμφότεροι ἔνοχοί εἰσιν. |
| Lev.21:20#13 | ᾖ | εἰμί | V-PAS-3S | 1 | right | right | ἄνθρωπος ᾧ ἂν ᾖ ἐν αὐτῷ ψώρα |
| Lev.25:21#5 | μου | ἐγώ | P-1GS | 1 | right | right | ἀποστέλλω τὴν εὐλογίαν μου ὑμῖν ἐν τῷ |
| Lev.7:27#13 | πλημμελίας | πλημμέλεια | N-GSF | 2a | right | right | ἁμαρτίας καὶ τῆς πλημμελίας καὶ τῆς τελειώσεως |
| Lev.8:33#16 | τελειώσεως | τελείωσις | N-GSF | 2 | right | right | ἕως ἡμέρα πληρωθῇ τελειώσεως ὑμῶν· ἑπτὰ γὰρ |
| Lev.13:56#31 | κρόκης | κρόκη | N-GSF | 2a | right | right | ἢ ἀπὸ τῆς κρόκης. |
| Lev.20:10#17 | μοιχεύων | μοιχεύω | V-PAP-NSM | 2 | right | right | θανάτῳ θανατούσθωσαν ὁ μοιχεύων καὶ ἡ μοιχευομένη. |
| Lev.23:24#12 | μηνὸς | μήν | N-GSM | 2 | right | right | ἑβδόμου μιᾷ τοῦ μηνὸς ἔσται ὑμῖν ἀνάπαυσις, |
| Lev.25:7#7 | θηρίοις | θηρίον | N-DPN | 2 | right | right | σου καὶ τοῖς θηρίοις τοῖς ἐν τῇ |
| Num.1:36#18 | κατὰ | κατά | PREP | 1 | right | right | ἀριθμὸν ὀνομάτων αὐτῶν, κατὰ κεφαλὴν αὐτῶν, πάντα |
| Num.4:2#9 | υἱῶν | υἱός | N-GPM | 1 | right | right | Καὰθ ἐκ μέσου υἱῶν Λευεί, κατὰ δήμους |
| Num.9:19#22 | μὴ | μή | PRT-N | 1 | right | right | θεοῦ καὶ οὐ μὴ ἐξάρωσιν· |
| Num.12:15#12 | οὐκ | οὐ | PRT-N | 1 | right | right | καὶ ὁ λαὸς οὐκ ἐξῆρεν ἕως ἐκαθαρίσθη |
| Num.26:2#13 | οἴκους | οἶκος | N-APM | 1 | right | right | καὶ ἐπάνω κατ᾽ οἴκους πατριῶν αὐτῶν, πᾶς |
| Num.29:12#17 | οὐ | οὐ | PRT-N | 1 | right | right | πᾶν ἔργον λατρευτὸν οὐ ποιήσετε· καὶ ἑορτάσατε |
| Num.1:16#6 | τῶν | ὁ | T-GPF | 2a | right | right | τῆς συναγωγῆς, ἄρχοντες τῶν φυλῶν κατὰ πατριάς, |
| Num.3:15#10 | δήμους | δῆμος | N-APM | 2 | right | right | πατριῶν αὐτῶν, κατὰ δήμους αὐτῶν· πᾶν ἀρσενικὸν |
| Num.24:16#5 | ἐπιστήμην | ἐπιστήμη | N-ASF | 2 | right | right | λόγια θεοῦ, ἐπιστάμενος ἐπιστήμην παρὰ Ὑψίστου, καὶ |
| Num.29:10#5 | τῷ | ὁ | T-DSM | 2a | right | right | δέκατον τῷ ἀμνῷ τῷ ἑνὶ εἰς τοὺς |
| Num.32:9#13 | τῶν | ὁ | T-GPM | 2a | right | right | ἀπέστησαν τὴν καρδίαν τῶν υἱῶν Ἰσραήλ, ὅπως |
| Num.34:5#7 | χειμάρρουν | χείμαρρος | N-ASM | 2 | right | right | ὅρια ἀπὸ Ἀσεμῶνα χειμάρρουν Αἰγύπτου, καὶ ἔσται |
| Deu.12:31#13 | ἐποίησαν | ποιέω | V-AAI-3P | 1 | right | right | Κυρίου, ἃ ἐμίσησεν, ἐποίησαν ἐν τοῖς θεοῖς |
| Deu.17:17#10 | καρδία | καρδία | N-NSF | 1 | right | right | μεταστήσεται αὐτοῦ ἡ καρδία· καὶ ἀργύριον καὶ |
| Deu.20:5#36 | αὐτήν | αὐτός | P-ASF | 1 | right | right | ἄνθρωπος ἕτερος ἐνκαινιεῖ αὐτήν. |
| Deu.21:12#8 | σου | σύ | P-2GS | 1 | right | right | εἰς τὴν οἰκίαν σου, καὶ ξυρήσεις τὴν |
| Deu.29:25#2 | ἐροῦσιν | ἔπω, ἐρῶ, εἶπον | V-FAI-3P | 1 | right | right | καὶ ἐροῦσιν Ὅτι κατελίποσαν τὴν |
| Deu.30:19#11 | ζωὴν | ζωή | N-ASF | 1 | right | right | τὴν γῆν, τὴν ζωὴν καὶ τὸν θάνατον |
| Deu.1:20#7 | τοῦ | ὁ | T-GSN | 2a | right | right | ὑμᾶς Ἤλθατε ἕως τοῦ ὄρους τοῦ Ἀμορραίου, |
| Deu.8:3#8 | ἐψώμισέν | ψωμίζω | V-AAI-3S | 2 | right | right | ἐλιμαγχόνησέν σε, καὶ ἐψώμισέν σε τὸ μάννα |
| Deu.11:12#21 | τοῦ | ὁ | T-GSM | 2a | right | right | αὐτῆς ἀπ᾽ ἀρχῆς τοῦ ἐνιαυτοῦ καὶ ἕως |
| Deu.18:9#20 | τῶν | ὁ | T-GPN | 2a | right | right | κατὰ τὰ βδελύγματα τῶν ἐθνῶν ἐκείνων. |
| Deu.25:11#33 | διδύμων | Δίδυμος | N-GPM | 2 | right | right | χεῖρα ἐπιλάβηται τῶν διδύμων αὐτοῦ, |
| Deu.28:31#2 | μόσχος | μόσχος | N-NSM | 2a | right | right | ὁ μόσχος σου ἐσφαγμένος ἐναντίον |
| Jos.1:9#3 | σοι | σύ | P-2DS | 1 | right | right | ἰδοὺ ἐντέταλμαί σοι· ἴσχυε καὶ ἀνδρίζου, |
| Jos.2:7#1 | καὶ | καί | CONJ | 1 | right | right | καὶ οἱ ἄνδρες κατεδίωξαν |
| Jos.4:10#27 | ὁ | ὁ | T-NSM | 1 | right | right | λαῷ· καὶ ἔσπευσεν ὁ λαός, καὶ διέβησαν. |
| Jos.22:1#8 | τοὺς | ὁ | T-APM | 1 | right | right | υἱοὺς Ῥουβὴν καὶ τοὺς υἱοὺς Γὰδ καὶ |
| Jos.22:14#11 | πατριᾶς | πατριά | N-GSF | 1 | right | right | εἷς ἀπὸ οἴκου πατριᾶς ἀπὸ πασῶν φυλῶν |
| Jos.24:10#1 | καὶ | καί | CONJ | 1 | right | right | καὶ οὐκ ἠθέλησεν Κύριος |
| Jos.5:1#38 | τῷ | ὁ | T-DSN | 2a | right | right | υἱῶν Ἰσραὴλ ἐν τῷ διαβαίνειν αὐτούς, καὶ |
| Jos.6:18#16 | ἀναθέματος | ἀνάθεμα | N-GSN | 2 | right | right | λάβητε ἀπὸ τοῦ ἀναθέματος καὶ ποιήσητε τὴν |
| Jos.11:12#20 | ἐξωλέθρευσαν | ἐξολεθρεύω | V-AAI-3P | 2 | right | right | στόματι ξίφους, καὶ ἐξωλέθρευσαν αὐτοὺς ὃν τρόπον |
| Jos.14:14#24 | προστάγματι | πρόσταγμα | N-DSN | 2 | right | right | αὐτὸν ἐπακολουθῆσαι τῷ προστάγματι. Κυρίου θεοῦ Ἰσραήλ. |
| Jos.17:2#9 | δήμους | δῆμος | N-APM | 2 | right | right | τοῖς λοιποῖς κατὰ δήμους αὐτῶν, τοῖς υἱοῖς |
| Jos.21:19#6 | τῶν | ὁ | T-GPM | 2a | right | right | πόλεις υἱῶν Ἀαρὼν τῶν ἱερέων δέκα τρεῖς. |
| Jdg.4:16#11 | ἕως | ἕως | PREP | 1 | right | right | ὀπίσω τῆς παρεμβολῆς ἕως Ἀρείσωθ τῶν ἐθνῶν· |
| Jdg.5:2#10 | Κύριον | κύριος | N-ASM | 1 | right | right | ἀκουσιασθῆναι λαὸν εὐλογεῖτε Κύριον. |
| Jdg.9:34#8 | μετ᾽ | μετά | PREP | 1 | right | right | πᾶς ὁ λαὸς μετ᾽ αὐτοῦ νυκτός, καὶ |
| Jdg.11:36#24 | σοι | σύ | P-2DS | 1 | right | right | ἐν τῷ ποιῆσαί σοι Κύριον ἐκδίκησιν ἀπὸ |
| Jdg.13:9#1 | καὶ | καί | CONJ | 1 | right | right | καὶ εἰσήκουσεν ὁ θεὸς |
| Jdg.20:5#14 | τὴν | ὁ | T-ASF | 1 | right | right | ἐπ᾽ ἐμὲ ἐπὶ τὴν οἰκίαν νυκτός· ἐμὲ |
| Jdg.3:13#16 | Ἰσραήλ | Ἰσραήλ | N-ASM | 2a | right | right | καὶ ἐπάταξεν τὸν Ἰσραήλ, καὶ ἐκληρονόμησεν τὴν |
| Jdg.7:20#28 | τοῦ | ὁ | T-GSN | 2a | right | right | αὐτῶν τὰς κερατίνας τοῦ σαλπίζειν, καὶ ἀνέκραξαν |
| Jdg.12:1#6 | παρῆλθαν | παρέρχομαι | V-2AAI-3P | 2 | right | right | ἀνὴρ Ἐφράιμ, καὶ παρῆλθαν εἰς βορρᾶν καὶ |
| Jdg.18:19#32 | ἑνός | εἷς | A-GSM | 2a | right | right | ἱερέα οἴκου ἀνδρὸς ἑνός, ἢ γενέσθαι σε |
| Jdg.19:10#27 | παλλακὴ | παλλακή | N-NSF | 2a | right | right | ἐπισεσαγμένων, καὶ ἡ παλλακὴ αὐτοῦ μετ᾽ αὐτοῦ. |
| Jdg.21:22#38 | πλημμελήσατε | πλημμελέω | V-AAM-2P | 2 | right | unsure | ὡς κλῆρος πλημμελήσατε: imperative or indicative; Hebrew 'you would be guilty' reads as indicative, the text is too thin to say |
| Rut.1:17#22 | σοῦ | σύ | P-2GS | 1 | right | right | μέσον ἐμοῦ καὶ σοῦ. |
| Rut.2:4#13 | ὑμῶν | σύ | P-2GP | 1 | right | right | θερίζουσιν Κύριος μεθ᾽ ὑμῶν· καὶ εἶπον αὐτῷ |
| Rut.2:12#12 | Κυρίου | κύριος | N-GSM | 1 | right | right | σου πλήρης παρὰ Κυρίου θεοῦ Ἰσραήλ, πρὸς |
| Rut.2:14#4 | Βόος | Βοόζ | N-GSM | 1 | right | wrong | εἶπεν αὐτῇ Βόος: the subject, nominative; settled N-GSM (the form's one New Testament use, τοῦ Βοός) |
| Rut.3:3#18 | μὴ | μή | PRT-N | 1 | right | right | ἐπὶ τὸν ἅλω· μὴ γνωρισθῇς τῷ ἀνδρὶ |
| Rut.4:10#1 | καί | καί | CONJ | 1 | right | right | καί γε Ῥοὺθ τὴν |
| Rut.1:21#5 | κενὴν | κενός | A-ASF | 2 | right | right | πλήρης ἐπορεύθην, καὶ κενὴν ἀπέστρεψέν με ὁ |
| Rut.2:19#30 | τοῦ | ὁ | T-GSM | 2a | right | right | εἶπεν Τὸ ὄνομα τοῦ ἀνδρὸς μεθ᾽ οὗ |
| Rut.2:22#12 | ἐπορεύθης | πορεύω | V-AOS-2S | 2 | right | wrong | ὅτι ἐπορεύθης: aorist passive-deponent indicative (the augment shows it; V-AOI-2S); settled V-AOS-2S, a subjunctive, by analogy to a sibling form (lemma πορεύω is TAGNT's) |
| Rut.3:2#11 | κορασίων | κοράσιον | N-GPN | 2 | right | right | ἦς μετὰ τῶν κορασίων αὐτοῦ; ἰδοὺ αὐτὸς |
| Rut.3:3#20 | τῷ | ὁ | T-DSM | 2a | right | right | ἅλω· μὴ γνωρισθῇς τῷ ἀνδρὶ ἕως οὗ |
| Rut.4:7#35 | ἀγχιστείαν | ἀγχιστεία | N-ASF | 2 | right | right | τῷ ἀγχιστεύοντι τὴν ἀγχιστείαν αὐτοῦ· καὶ τοῦτο |
| 1Sa.1:20#4 | ἐγενήθη | γίνομαι | V-2AOI-3S | 1 | right | right | καὶ συνέλαβεν, καὶ ἐγενήθη τῷ καιρῷ τῶν |
| 1Sa.5:9#11 | τῇ | ὁ | T-DSF | 1 | right | right | γίνεται χεὶρ Κυρίου τῇ πόλει, τάραχος μέγας |
| 1Sa.17:45#20 | πορεύομαι | πορεύω | V-PNI-1S | 1 | right | right | ἐν ἀσπίδι, κἀγὼ πορεύομαι πρὸς σὲ ἐν |
| 1Sa.19:12#5 | τὸν | ὁ | T-ASM | 1 | right | right | κατάγει ἡ Μελχὸλ τὸν Δαυεὶδ διὰ τῆς |
| 1Sa.28:21#5 | πρὸς | πρός | PREP | 1 | right | right | εἰσῆλθεν ἡ γυνὴ πρὸς Σαούλ, καὶ εἶδεν |
| 1Sa.29:6#39 | ἀφ᾽ | ἀπό | PREP | 1 | right | right | κατὰ σοῦ κακίαν ἀφ᾽ ἧς ἡμέρας ἥκεις |
| 1Sa.4:12#20 | διερρηγότα | διαρρήγνυμι | V-2RAP-ASM | 2 | right | wrong | τὰ ἱμάτια αὐτοῦ διερρηγότα: a neuter plural participle (N/A-PN), settled V-2RAP-ASM, masculine singular |
| 1Sa.4:18#12 | τοῦ | ὁ | T-GSM | 2a | right | right | καὶ ἔπεσεν ἀπὸ τοῦ δίφρου ὀπισθίως ἐχόμενος |
| 1Sa.6:11#7 | ἅμαξαν | ἄμαξα | N-ASF | 2 | right | right | κιβωτὸν ἐπὶ τὴν ἅμαξαν, καὶ τὸ θέμα |
| 1Sa.14:15#19 | διαφθείροντες | διαφθείρω | V-PAP-NPM | 2 | right | right | Μεσσὰφ καὶ οἱ διαφθείροντες, ἐξέστησαν, καὶ αὐτοὶ |
| 1Sa.20:38#35 | σχίζας | σχίζα | N-APF | 2a | right | right | παιδάριον Ἰωναθὰν τὰς σχίζας πρὸς τὸν κύριον |
| 1Sa.27:11#29 | ἡμέρας | ἡμέρα | N-APF | 2a | right | right | αὐτοῦ πάσας τὰς ἡμέρας ἃς ἐκάθητο Δαυεὶδ |
| 2Sa.1:1#14 | ἐκάθισεν | καθίζω | V-AAI-3S | 1 | right | right | τὸν Ἀμαλήκ· καὶ ἐκάθισεν Δαυεὶδ ἐν Σεκελὰκ |
| 2Sa.12:20#17 | εἰσῆλθεν | εἰσέρχομαι | V-2AAI-3S | 1 | right | right | ἱμάτια αὐτοῦ, καὶ εἰσῆλθεν εἰς τὸν οἶκον |
| 2Sa.12:29#11 | καὶ | καί | CONJ | 1 | right | right | ἐπορεύθη εἰς Ῥαββάθ, καὶ ἐπολέμησεν ἐν αὐτῇ |
| 2Sa.20:10#21 | καὶ | καί | CONJ | 1 | right | right | εἰς τὴν ψόαν, καὶ ἐξεχύθη ἡ κοιλία |
| 2Sa.22:14#7 | ὕψιστος | ὕψιστος | A-NSM | 1 | right | right | Κύριος, καὶ ὁ ὕψιστος ἔδωκεν φωνὴν αὐτοῦ· |
| 2Sa.23:10#27 | ἐν | ἐν | PREP | 1 | right | right | Κύριος σωτηρίαν μεγάλην ἐν τῇ ἡμέρᾳ ἐκείνῃ, |
| 2Sa.11:6#11 | Οὐρείαν | Οὐρίας | N-ASM | 2 | right | right | πρὸς μὲ τὸν Οὐρείαν τὸν Χετταῖον· καὶ |
| 2Sa.11:17#4 | ἄνδρες | ἀνήρ | N-NPM | 2a | right | right | καὶ ἐξῆλθον οἱ ἄνδρες τῆς πόλεως καὶ |
| 2Sa.18:1#15 | ἑκατοντάρχους | ἑκατόνταρχος | N-APM | 2 | right | right | αὐτῶν χιλιάρχους καὶ ἑκατοντάρχους. |
| 2Sa.19:1#9 | κλαίει | κλαίω | V-PAI-3S | 2 | right | right | Ἰδοὺ ὁ βασιλεὺς κλαίει καὶ πενθεῖ ἐπὶ |
| 2Sa.22:46#5 | σφαλοῦσιν | σφάλλω | V-FAI-3P | 2 | right | right | ἀλλότριοι ἀπορριφήσονται καὶ σφαλοῦσιν ἐκ τῶν συγκλεισμῶν |
| 2Sa.24:1#16 | ἀρίθμησον | ἀριθμέω | V-AAM-2S | 2 | right | right | αὐτοῖς λέγων Βάδιζε ἀρίθμησον τὸν Ἰσραὴλ καὶ |
| 1Ki.8:14#14 | καὶ | καί | CONJ | 1 | right | right | βασιλεὺς πάντα Ἰσραήλ· καὶ πᾶσα ἐκκλησία Ἰσραὴλ |
| 1Ki.12:16#29 | υἱῷ | υἱός | N-DSM | 1 | right | right | ἡμῖν κληρονομία ἐν υἱῷ Ἰεσσαί· ἀπότρεχε, Ἰσραήλ, |
| 1Ki.12:24#194 | ἀπέθανεν | ἀποθνήσκω | V-2AAI-3S | 1 | right | right | μετ᾽ αὐτοῦ ἕως ἀπέθανεν Σαλωμών. καὶ ἤκουσεν |
| 1Ki.18:3#13 | κύριον | κύριος | N-ASM | 1 | right | right | ἦν φοβούμενος τὸν κύριον σφόδρα. |
| 1Ki.18:44#15 | ὡς | ὡς | PRT | 1 | right | right | ἰδοὺ νεφέλη μικρὰ ὡς ἴχνος ἀνδρὸς ἀνάγουσα |
| 1Ki.22:10#10 | ἀνὴρ | ἀνήρ | N-NSM | 1 | right | right | βασιλεὺς Ἰούδα ἐκάθηντο ἀνὴρ ἐπὶ τοῦ θρόνου |
| 1Ki.8:1#4 | συνετέλεσεν | συντελέω | V-AAI-3S | 2 | right | right | Καὶ ἐγένετο ὡς συνετέλεσεν Σαλωμὼν τοῦ οἰκοδομῆσαι |
| 1Ki.8:53#53 | Οἰκοδόμησον | οἰκοδομέω | V-AAM-2S | 2 | right | right | κατοικεῖν ἐκ γνόφου. Οἰκοδόμησον οἶκόν μου, οἶκον |
| 1Ki.12:24#810 | κατάρξω | καταργέω | V-FAI-1S | 2 | wrong | right | ἐγὼ δὲ κατάρξω ὑμᾶς ἐν σκορπίοις: the future of κατάρχω, 'I will rule over you'; καταργέω's future is καταργήσω, so the lemma καταργέω is not this verb |
| 1Ki.17:3#8 | τῷ | ὁ | T-DSM | 2a | right | right | καὶ κρύβηθι ἐν τῷ χειμάρρῳ Χορρὰθ τοῦ |
| 1Ki.19:5#4 | ὕπνωσεν | ὑπνόω | V-AAI-3S | 2 | right | right | καὶ ἐκοιμήθη καὶ ὕπνωσεν ἐκεῖ ὑπὸ φυτόν· |
| 1Ki.20:9#12 | Ναβουθαὶ | Ναβουθαί | N-ASM | 2a | right | right | καὶ καθίσατε τὸν Ναβουθαὶ ἐν ἀρχῇ τοῦ |
| 2Ki.1:18#15 | λόγων | λόγος | N-GPM | 1 | right | right | γεγραμμένα ἐπὶ βιβλίῳ λόγων τῶν ἡμερῶν τοῖς |
| 2Ki.4:6#1 | καὶ | καί | CONJ | 1 | right | right | καὶ εἶπεν πρὸς τοὺς |
| 2Ki.14:3#17 | ἐποίησεν | ποιέω | V-AAI-3S | 1 | right | right | κατὰ πάντα ὅσα ἐποίησεν Ἰωὰς ὁ πατὴρ |
| 2Ki.16:14#34 | κατὰ | κατά | PREP | 1 | right | right | μηρὸν τοῦ θυσιαστηρίου κατὰ βορρᾶν. |
| 2Ki.19:14#17 | Κυρίου | κύριος | N-GSM | 1 | right | right | ἀνέβη εἰς οἶκον Κυρίου καὶ ἀνέπτυξεν αὐτὰ |
| 2Ki.24:14#17 | καὶ | καί | CONJ | 1 | right | right | δέκα χιλιάδας αἰχμαλωτίσας, καὶ πᾶν τέκτονα καὶ |
| 2Ki.3:21#9 | πολεμεῖν | πολεμέω | V-PAN | 2 | right | right | ἀνέβησαν οἱ βασιλεῖς πολεμεῖν αὐτούς· καὶ ἀνεβόησαν |
| 2Ki.5:4#5 | τῷ | ὁ | T-DSM | 2a | right | right | εἰσῆλθεν καὶ ἀπήγγειλεν τῷ κυρίῳ ἑαυτῆς καὶ |
| 2Ki.9:33#21 | συνεπάτησαν | συμπατέω | V-AAI-3P | 2 | right | right | τοὺς ἵππους, καὶ συνεπάτησαν αὐτήν. |
| 2Ki.14:18#19 | τοῖς | ὁ | T-DPM | 2a | right | right | λόγων τῶν ἡμερῶν τοῖς βασιλεῦσιν Ἰούδα; |
| 2Ki.16:15#29 | τοῦ | ὁ | T-GSM | 2a | right | right | καὶ τὴν ὁλοκαύτωσιν τοῦ βασιλέως καὶ τὴν |
| 2Ki.25:21#7 | ἐθανάτωσεν | θανατόω | V-AAI-3S | 2 | right | right | βασιλεὺς Βαβυλῶνος καὶ ἐθανάτωσεν αὐτοὺς ἐν Ῥεβλάθα |
| 1Ch.1:41#4 | υἱοὶ | υἱός | N-NPM | 1 | right | right | υἱοὶ Σωνάν· Δαισών. υἱοὶ δὲ Δαισὼν· Ἑμερὼν |
| 1Ch.2:10#11 | ἄρχοντα | ἄρχων | N-ASM | 1 | right | right | ἐγέννησεν τὸν Ναασσὼν ἄρχοντα τοῦ οἴκου Ἰούδα. |
| 1Ch.7:10#2 | υἱοὶ | υἱός | N-NPM | 1 | right | right | καὶ υἱοὶ Ἀριήλ· Βαλαάν. καὶ |
| 1Ch.12:4#10 | ἐπὶ | ἐπί | PREP | 1 | right | right | τοῖς τριάκοντα καὶ ἐπὶ τῶν τριάκοντα, Ἰερμίας |
| 1Ch.18:11#6 | κυρίῳ | κύριος | N-DSM | 1 | right | right | ἡγίασεν Δαυεὶδ τῷ κυρίῳ μετὰ τοῦ ἀργυρίου |
| 1Ch.23:13#1 | υἱοὶ | υἱός | N-NPM | 1 | right | right | υἱοὶ Ἀμβράμ· Ἀαρὼν καὶ |
| 1Ch.5:23#6 | κατῴκησαν | κατοικέω | V-AAI-3P | 2 | right | right | ἡμίσεις φυλῆς Μανασσὴ κατῴκησαν ἀπὸ Βασὰν ἕως |
| 1Ch.10:3#17 | ἐπόνεσαν | πονέω | V-AAI-3P | 2 | right | right | καὶ πόνοις, καὶ ἐπόνεσαν ἀπὸ τῶν τόξων. |
| 1Ch.12:18#24 | τοῖς | ὁ | T-DPM | 2a | right | right | σοι, καὶ εἰρήνη τοῖς βοηθοῖς σου· ὅτι |
| 1Ch.21:25#13 | ἑξακοσίους | ἑξακόσιοι | A-APM | 2 | right | right | σίκλους χρυσίου ὁλκῆς ἑξακοσίους. |
| 1Ch.22:4#10 | Σειδώνιοι | Σιδώνιος | N-NPM | 2a | right | right | ὅτι ἐφέροσαν οἱ Σειδώνιοι καὶ οἱ Τύριοι |
| 1Ch.29:16#14 | τῷ | ὁ | T-DSN | 2a | right | right | ἡτοίμακα οἰκοδομηθῆναι οἶκον τῷ ὀνόματι τῷ ἁγίῳ |
| 2Ch.6:23#17 | ἀποδοῦναι | ἀποδίδωμι | V-2AAN | 1 | right | right | δούλους σου τοῦ ἀποδοῦναι τῷ ἀνόμῳ καὶ |
| 2Ch.9:1#34 | πρὸς | πρός | PREP | 1 | right | right | τίμιον· καὶ ἦλθεν πρὸς Σαλωμὼν καὶ ἐλάλησεν |
| 2Ch.13:17#7 | ὁ | ὁ | T-NSM | 1 | right | right | αὐτοῖς Ἀβιὰ καὶ ὁ λαὸς αὐτοῦ πληγὴν |
| 2Ch.20:17#23 | εἰς | εἰς | PREP | 1 | right | right | φοβηθῆτε αὐτόν, ἐξελθεῖν εἰς ἀπάντησιν αὐτοῖς, καὶ |
| 2Ch.25:8#9 | σε | σύ | P-2AS | 1 | right | right | τούτοις, καὶ τροπώσεταί σε Κύριος ἐναντίον τῶν |
| 2Ch.34:20#2 | ἐνετείλατο | ἐντέλλω | V-ADI-3S | 1 | right | right | καὶ ἐνετείλατο ὁ βασιλεὺς τῷ |
| 2Ch.14:7#3 | τῷ | ὁ | T-DSM | 2a | right | right | καὶ εἶπεν τῷ Ἰούδᾳ Οἰκοδομήσωμεν τάς |
| 2Ch.15:11#12 | ἑπτακοσίους | ἑπτακόσιοι | A-APM | 2 | right | right | ὧν ἤνεγκεν, μόσχους ἑπτακοσίους καὶ πρόβατα ἑπτακισχίλια. |
| 2Ch.20:3#9 | ἐκζητῆσαι | ἐκζητέω | V-AAN | 2 | right | right | τὸ πρόσωπον αὐτοῦ ἐκζητῆσαι τὸν κύριον, καὶ |
| 2Ch.20:20#2 | ὤρθρισαν | ὀρθρίζω | V-AAI-3P | 2 | right | right | καὶ ὤρθρισαν πρωὶ καὶ ἐξῆλθον |
| 2Ch.25:18#15 | Λιβάνῳ | λίβανος | N-DSM | 2 | right | right | χοζεὶ ἐν τῷ Λιβάνῳ ἀπέστειλεν πρὸς τὴν |
| 2Ch.26:12#6 | τῶν | ὁ | T-GPM | 2a | right | right | ἀριθμὸς τῶν πατριαρχῶν τῶν δυνατῶν εἰς πόλεμον |
| Ezr.5:2#12 | καὶ | καί | CONJ | 1 | right | right | ὁ υἱὸς Ἰωσεδὲκ καὶ ἤρξαντο οἰκοδομῆσαι τὸν |
| Ezr.6:2#14 | αὐτῇ | αὐτός | P-DSF | 1 | right | right | τοῦτο γεγραμμένον ἐν αὐτῇ ὑπόμνημα |
| Ezr.7:27#7 | ἡμῶν | ἐγώ | P-1GP | 1 | right | right | θεὸς τῶν πατέρων ἡμῶν, ὃς ἔδωκεν οὕτως |
| Ezr.7:28#9 | βασιλέως | βασιλεύς | N-GSM | 1 | right | right | ἐν ὀφθαλμοῖς τοῦ βασιλέως καὶ τῶν συμβούλων |
| Ezr.7:28#19 | βασιλέως | βασιλεύς | N-GSM | 1 | right | right | τῶν ἀρχόντων τοῦ βασιλέως τῶν ἐπηρμένων. καὶ |
| Ezr.8:31#33 | ἐν | ἐν | PREP | 1 | right | right | ἐχθροῦ καὶ πολεμίου ἐν τῇ ὁδῷ. |
| Ezr.3:11#7 | τῷ | ὁ | T-DSM | 2a | right | right | αἴνῳ καὶ ἀνθομολογήσει τῷ κυρίῳ Ὃτι ἀγαθόν, |
| Ezr.6:10#7 | τοῦ | ὁ | T-GSM | 2a | right | right | εὐωδίας τῷ θεῷ τοῦ οὐρανοῦ, καὶ προσεύχωνται |
| Ezr.7:11#4 | διασάφησις | διασάφησις | N-NSF | 2a | right | right | Καὶ αὕτη ἡ διασάφησις τοῦ διατάγματος οὗ |
| Ezr.8:19#3 | Ἁσεβειὰ | Ἁσεβειά | N-ASM | 2a | right | right | καὶ τὸν Ἁσεβειὰ καὶ τὸν Ὠσαίαν |
| Ezr.8:36#7 | τοῖς | ὁ | T-DPM | 2a | right | right | νόμισμα τοῦ βασιλέως τοῖς διοικηταῖς τοῦ βασιλέως |
| Ezr.10:18#10 | ἀλλοτρίας | ἀλλότριος | A-APF | 2a | right | right | οἳ ἐκάθισαν γυναῖκας ἀλλοτρίας· ἀπὸ υἱῶν Ἰησοῦ |
| Neh.2:1#4 | μηνὶ | μήν | N-DSM | 1 | right | right | Καὶ ἐγένετο ἐν μηνὶ Νισὰν ἔτους εἰκοστοῦ |
| Neh.3:4#12 | καὶ | καί | CONJ | 1 | right | right | Οὐρεία υἱοῦ Ἁκώς. καὶ ἐπὶ χεῖρα αὐτῶν |
| Neh.4:17#7 | οἱ | ὁ | T-NPM | 1 | right | right | τῷ τείχει. καὶ οἱ αἴροντες ἐν τοῖς |
| Neh.6:11#4 | ἐστιν | εἰμί | V-PAI-3S | 1 | right | right | καὶ εἶπα Τίς ἐστιν ὁ ἀνὴρ ὃς |
| Neh.6:17#15 | αἱ | ὁ | T-NPF | 1 | right | right | πρὸς Τωβίαν, καὶ αἱ Τωβία ἤρχοντο πρὸς |
| Neh.11:9#14 | πόλεως | πόλις | N-GSF | 1 | right | right | Ἁσανὰ ἐπὶ τῆς πόλεως δεύτερος. |
| Neh.3:3#10 | ἐστέγασαν | στεγάζω | V-AAI-3P | 2 | right | right | υἱοὶ Ἁσάν· αὐτοὶ ἐστέγασαν αὐτήν, καὶ ἐστέγασαν |
| Neh.6:3#24 | καταβήσομαι | καταβαίνω | V-FDI-1S | 2 | right | right | ἂν τελειώσω αὐτό, καταβήσομαι πρὸς ὑμᾶς. |
| Neh.9:1#7 | τοῦ | ὁ | T-GSM | 2a | right | right | εἰκοστῇ καὶ τετάρτῃ τοῦ μηνὸς τούτου συνήχθησαν |
| Neh.9:10#13 | τοῖς | ὁ | T-DPM | 2a | right | right | καὶ ἐν πᾶσιν τοῖς παισὶν αὐτοῦ καὶ |
| Neh.9:29#36 | ἐσκλήρυναν | σκληρύνω | V-AAI-3P | 2 | right | right | καὶ τράχηλον αὐτῶν ἐσκλήρυναν, καὶ οὐκ ἤκουσαν. |
| Neh.12:28#16 | ἐπαύλεων | ἔπαυλις | N-GPF | 2 | right | right | Ἰερουσαλὴμ καὶ ἀπὸ ἐπαύλεων |
| Est.1:21#13 | βασιλεὺς | βασιλεύς | N-NSM | 1 | right | right | καὶ ἐποίησεν ὁ βασιλεὺς καθὰ ἐλάλησεν ὁ |
| Est.2:13#4 | πρὸς | πρός | PREP | 1 | right | right | καὶ τότε εἰσπορεύεται πρὸς τὸν βασιλέα· καὶ |
| Est.2:14#8 | τὸν | ὁ | T-ASM | 1 | right | right | ἡμέραν ἀποτρέχει εἰς τὸν γυναικῶνα τὸν δεύτερον |
| Est.4:16#43 | ᾖ | εἰμί | V-PAS-3S | 1 | right | right | καὶ ἀπολέσθαι με ᾖ. |
| Est.4:17#350 | καὶ | καί | CONJ | 1 | right | right | δίκαιος εἶ, Κύριε· καὶ νῦν οὐχ ἱκανώθησαν |
| Est.8:9#34 | ἕως | ἕως | PREP | 1 | right | right | ἀπὸ τῆς Ἰνδικῆς ἕως τῆς Αἰθιοπίας, ἑκατὸν |
| Est.1:6#15 | ἀργυροῖς | ἄργυρος | N-DPM | 2 | wrong | wrong | ἐπὶ κύβοις χρυσοῖς καὶ ἀργυροῖς: the adjective ἀργυροῦς 'of silver' (A-DPM) agreeing with κύβοις, 'golden and silver studs'; settled the noun ἄργυρος N-DPM |
| Est.3:13#66 | ἐξουσίας | ἐξουσία | N-GSF | 2a | right | right | τῷ θράσει τῆς ἐξουσίας ἐπαιρόμενος ἐπιεικέστερον δὲ |
| Est.3:14#4 | τῶν | ὁ | T-GPF | 2a | right | right | τὰ δὲ ἀντίγραφα τῶν ἐπιστολῶν ἐξετίθετο κατὰ |
| Est.4:8#27 | ἀξιῶσαι | ἀξιόω | V-AAN | 2 | right | right | τὸν βασιλέα καὶ ἀξιῶσαι αὐτὸν περὶ τοῦ |
| Est.6:14#4 | παραγίνονται | παραγίνομαι | V-PNI-3P | 2 | right | right | ἔτι αὐτῶν λαλούντων παραγίνονται οἱ εὐνοῦχοι ἐπισπεύδοντες |
| Est.10:3#141 | τοῖς | ὁ | T-DPN | 2a | right | right | οὐ γέγονεν ἐν τοῖς ἔθνεσιν. διὰ τοῦτο |
| Job.2:9#10 | Μέχρι | μέχρι | PREP | 1 | right | right | ἡ γυνὴ αὐτοῦ Μέχρι τίνος καρτερήσεις λέγων |
| Job.11:20#10 | ὀφθαλμοὶ | ὀφθαλμός | N-NPM | 1 | right | right | ἐλπὶς αὐτῶν ἀπώλεια, ὀφθαλμοὶ δὲ ἀσεβῶν τακήσονται. |
| Job.14:21#7 | οὐκ | οὐ | PRT-N | 1 | right | right | τῶν υἱῶν αὐτοῦ οὐκ οἶδεν, ἐὰν δὲ |
| Job.19:22#8 | κύριος | κύριος | N-NSM | 1 | right | right | ὥσπερ καὶ ὁ κύριος, ἀπὸ δὲ σαρκῶν |
| Job.25:2#9 | ὁ | ὁ | T-NSM | 1 | right | right | ὁ παρ᾽ αὐτοῦ, ὁ ποιῶν τὴν σύμπασαν |
| Job.39:22#9 | σιδήρου | σίδηρος | N-GSM | 1 | right | right | μὴ ἀποστραφῇ ἀπὸ σιδήρου. |
| Job.9:24#7 | κριτῶν | κριτής | N-GPM | 2 | right | right | χεῖρας ἀσεβοῦς. πρόσωπα κριτῶν αὐτῆς συνκαλύπτει· εἰ |
| Job.13:26#6 | περιέθηκας | περιτίθημι | V-AAI-2S | 2 | right | right | κατ᾽ ἐμοῦ κακά, περιέθηκας δέ μοι νεότητος |
| Job.14:18#8 | παλαιωθήσεται | παλαιόω | V-FPI-3S | 2 | right | right | διαπεσεῖται, καὶ πέτρα παλαιωθήσεται ἐκ τοῦ τόπου |
| Job.21:21#12 | μηνῶν | μήν | N-GPM | 2 | right | right | αὐτοῦ, καὶ ἀριθμοὶ μηνῶν αὐτοῦ διῃρέθησαν. |
| Job.27:13#10 | δυναστῶν | δυνάστης | N-GPM | 2 | right | right | Κυρίου, κτῆμα δὲ δυναστῶν ἐλεύσεται παρὰ Παντοκράτορος |
| Job.34:14#4 | συνέχειν | συνέχω | V-PAN | 2 | right | right | εἰ γὰρ βούλοιτο συνέχειν, καὶ τὸ πνεῦμα |
| Psa.36:33#7 | αὐτὸν | αὐτός | P-ASM | 1 | right | right | οὐ μὴ ἐνκαταλίπῃ αὐτὸν εἰς τὰς χεῖρας |
| Psa.44:5#5 | καὶ | καί | CONJ | 1 | right | right | ἔντεινον, καὶ κατευοδοῦ καὶ βασίλευε ἕνεκεν ἀληθείας |
| Psa.50:8#3 | ἀλήθειαν | ἀλήθεια | N-ASF | 1 | right | right | ἰδοὺ γὰρ ἀλήθειαν ἠγάπησας, τὰ ἄδηλα |
| Psa.90:2#5 | μου | ἐγώ | P-1GS | 1 | right | right | τῷ θεῷ Ἀντιλήμπτωρ μου εἶ· καὶ καταφυγή |
| Psa.118:25#4 | ἡ | ὁ | T-NSF | 1 | right | right | Ἐκολλήθη τῷ ἐδάφει ἡ ψυχή μου· ζήσομαι |
| Psa.150:3#2 | αὐτὸν | αὐτός | P-ASM | 1 | right | right | αἰνεῖτε αὐτὸν ἐν ἤχῳ σάλπιγγος, |
| Psa.9:21#3 | νομοθέτην | νομοθέτης | N-ASM | 2 | right | right | κατάστησον, Κύριε, νομοθέτην ἐπ᾽ αὐτούς, γνώτωσαν |
| Psa.18:2#6 | ποίησιν | ποίησις | N-ASF | 2 | right | right | διηγοῦνται δόξαν θεοῦ, ποίησιν δὲ χειρῶν αὐτοῦ |
| Psa.32:6#9 | τῷ | ὁ | T-DSN | 2a | right | right | οὐρανοὶ ἐστερεώθησαν, καὶ τῷ πνεύματι τοῦ στόματος |
| Psa.48:4#10 | καρδίας | καρδία | N-GSF | 2a | right | right | ἡ μελέτη τῆς καρδίας μου σύνεσιν. |
| Psa.54:15#12 | ἐπορεύθημεν | πορεύω | V-AOI-1P | 2 | right | right | οἴκῳ τοῦ θεοῦ ἐπορεύθημεν ἐν ὁμονοίᾳ. |
| Psa.102:21#6 | δυνάμεις | δύναμις | N-VPF | 2a | right | right | κύριον, πᾶσαι αἱ δυνάμεις αὐτοῦ, λειτουργοὶ αὐτοῦ |
| Pro.7:14#7 | τὰς | ὁ | T-APF | 1 | right | right | ἐστιν· σήμερον ἀποδίδωμι τὰς εὐχάς μου· |
| Pro.9:12#57 | χερσὶν | χείρ | N-DPF | 1 | right | right | διψώδεσιν, συνάγει δὲ χερσὶν ἀκαρπίαν. |
| Pro.24:12#14 | ὁ | ὁ | T-NSM | 1 | right | right | πάντων γινώσκει· καὶ ὁ πλάσας πνοὴν πᾶσιν |
| Pro.24:31#12 | μή | μή | PRT-N | 1 | right | right | δὲ καὶ πενίαν μή μοι δῷς, σύνταξον |
| Pro.24:51#1 | ᾅδης | ᾍδης | N-NSM | 1 | right | right | ᾅδης καὶ ἔρως γυναικὸς |
| Pro.26:5#5 | τὴν | ὁ | T-ASF | 1 | right | right | ἀποκρίνου ἄφρονι κατὰ τὴν ἀφροσύνην αὐτοῦ, ἵνα |
| Pro.5:16#11 | σὰς | σαίνω | V-2AAP-NSM | 2 | wrong | wrong | εἰς δὲ σὰς πλατείας: σός 'your' (A-APF) with πλατείας, 'into your streets'; settled σαίνω V-2AAP-NSM, a participle of 'to wag the tail' |
| Pro.6:18#3 | τεκταινομένη | τεκταίνομαι | V-PNP-NSF | 2 | right | right | καὶ καρδία τεκταινομένη λογισμοὺς κακούς, καὶ |
| Pro.19:25#5 | καθυβρίζει | καθυβρίζω | V-PAI-3S | 2 | right | right | ἐγγυώμενος παῖδα ἄφρονα καθυβρίζει δικαίωμα, στόμα δὲ |
| Pro.24:25#4 | πάντων | πᾶς | A-GPM | 2a | right | right | ἀφρονέστατος γάρ εἰμι πάντων ἀνθρώπων, καὶ φρόνησις |
| Pro.26:26#2 | κρύπτων | κρύπτω | V-PAP-NSM | 2a | right | right | ὁ κρύπτων ἔχθραν συνίστησιν δόλον, |
| Pro.27:17#6 | παροξύνει | παροξύνω | V-PAI-3S | 2 | right | right | ὀξύνει, ἀνὴρ δὲ παροξύνει πρόσωπον ἑταίρου. |
| Ecc.1:7#12 | ἔσται | εἰμί | V-FDI-3S | 1 | right | right | ἡ θάλασσα οὐκ ἔσται ἐμπιμπλαμένη· εἰς τόπον |
| Ecc.1:13#5 | μου | ἐγώ | P-1GS | 1 | right | right | ἔδωκα τὴν καρδίαν μου τοῦ ἐκζητῆσαι καὶ |
| Ecc.5:7#12 | μὴ | μή | PRT-N | 1 | right | right | ἴδῃς ἐν χώρᾳ, μὴ θαυμάσῃς ἐπὶ τῷ |
| Ecc.6:1#10 | ἐστιν | εἰμί | V-PAI-3S | 1 | right | right | ἥλιον, καὶ πολλή ἐστιν ὑπὸ τὸν ἄνθρωπον· |
| Ecc.7:26#3 | καὶ | καί | CONJ | 1 | right | right | ἐκύκλωσα ἐγώ, καὶ ἡ καρδία μου |
| Ecc.11:5#7 | ἡ | ὁ | T-NSF | 1 | right | right | ἔστιν γινώσκων τίς ἡ ὁδὸς τοῦ πνεύματος |
| Ecc.2:9#8 | γενομένους | γίνομαι | V-2ADP-APM | 2 | right | right | παρὰ πάντας τοὺς γενομένους ἀπὸ ἔμπροσθέν μου |
| Ecc.2:13#14 | τοῦ | ὁ | T-GSN | 2a | right | right | ἀφροσύνην, ὡς περισσεία τοῦ φωτὸς ὑπὲρ τὸ |
| Ecc.5:6#6 | ματαιοτήτων | ματαιότης | N-GPF | 2 | right | right | πλήθει ἐνυπνίων καὶ ματαιοτήτων καὶ λόγων πολλῶν· |
| Ecc.7:23#6 | καθόδους | κάθοδος | N-APF | 2 | right | right | πονηρεύσεταί σε καὶ καθόδους πολλὰς κακώσει καρδία |
| Ecc.9:4#15 | ζῶν | ζάω | V-PAP-NSM | 2a | right | right | ὁ κύων ὁ ζῶν αὐτὸς ἀγαθὸς ὑπὲρ |
| Ecc.9:4#20 | λέοντα | λέων | N-ASM | 2a | right | right | ἀγαθὸς ὑπὲρ τὸν λέοντα τὸν νεκρόν. |
| Sol.1:4#14 | εἰς | εἰς | PREP | 1 | right | right | με ὁ βασιλεὺς εἰς τὸ ταμεῖον αὐτοῦ. |
| Sol.2:13#12 | ἐλθέ | ἔρχομαι | V-2AAM-2S | 1 | right | right | ἔδωκαν ὀσμήν. ἀνάστα ἐλθέ, ἡ πλησίον μου, |
| Sol.3:1#22 | ὑπήκουσέν | ὑπακούω | V-AAI-3S | 1 | right | right | αὐτὸν καὶ οὐχ ὑπήκουσέν μου. |
| Sol.6:3#5 | ὡς | ὡς | PRT | 1 | right | right | εἶ πλησίον μου, ὡς εὐδοκία, ὡραία ὡς |
| Sol.8:2#17 | ἀπὸ | ἀπό | PREP | 1 | right | right | με· ποτιῶ σε ἀπὸ οἴνου τοῦ μυρεψικοῦ, |
| Sol.8:5#7 | ἐπὶ | ἐπί | PREP | 1 | right | right | ἀναβαίνουσα λελευκαθισμένη, ἐπιστηριζομένη ἐπὶ τὸν ἀδελφιδὸν αὐτῆς; |
| Sol.2:1#3 | τοῦ | ὁ | T-GSN | 2a | right | right | ἐγὼ ἄνθος τοῦ πεδίου, κρίνον τῶν |
| Sol.3:3#1 | εὕροσάν | εὑρίσκω | V-2AAI-3P | 2 | right | right | εὕροσάν με οἱ τηροῦντες, |
| Sol.3:6#18 | μυρεψοῦ | μυρεψός | N-GSM | 2 | right | right | ἀπὸ πάντων κονιορτῶν μυρεψοῦ; |
| Sol.6:12#5 | ἐπίστρεφε | ἐπιστρέφω | V-PAM-2S | 2 | right | right | ἐπίστρεφε, ἡ Σουμανεῖτις· ἐπίστρεφε, ἐπίστρεφε, καὶ ὀφόμεθα |
| Sol.7:11#9 | κώμαις | κώμη | N-DPF | 2 | right | right | ἀγρόν, αὐλισθῶμεν ἐν κώμαις· |
| Sol.7:12#9 | ἤνθησεν | ἀνθέω | V-AAI-3S | 2 | right | right | ἤνθησεν ἡ ἄμπελος, ἤνθησεν ὁ κυπρισμός, ἤνθησαν |
| Isa.4:2#17 | καὶ | καί | CONJ | 1 | right | right | γῆς, τοῦ ὑψῶσαι καὶ δοξάσαι τὸ καταλειφθὲν |
| Isa.7:7#4 | σαβαώθ | σαβαώθ | N-GPM | 1 | right | right | τάδε λέγει Κύριος σαβαώθ Οὐ μὴ μείνῃ |
| Isa.21:13#8 | ὁδῷ | ὁδός | N-DSF | 1 | right | right | κοιμηθήσῃ, ἐν τῇ ὁδῷ Δαιδάν. |
| Isa.37:7#7 | καὶ | καί | CONJ | 1 | right | right | εἰς αὐτὸν πνεῦμα, καὶ ἀκούσας ἀγγελίαν ἀποστραφήσεται |
| Isa.44:24#6 | σε | σύ | P-2AS | 1 | right | right | Κύριος ὁ λυτρούμενός σε καὶ πλάσσων σε |
| Isa.58:5#10 | τὴν | ὁ | T-ASF | 1 | right | right | ἡμέραν ταπεινοῦν ἄνθρωπον τὴν ψυχὴν αὐτοῦ· οὐδ᾽ |
| Isa.19:8#20 | ἀμφιβολεῖς | ἀμφιβολεύς | N-NPM | 2a | right | right | σαγήνας καὶ οἱ ἀμφιβολεῖς πενθήσουσιν. |
| Isa.28:11#2 | φαυλισμὸν | φαυλισμός | N-ASM | 2 | right | right | διὰ φαυλισμὸν χειλέων, διὰ γλώσσης |
| Isa.35:2#31 | τοῦ | ὁ | T-GSM | 2a | right | right | καὶ τὸ ὕψος τοῦ θεοῦ. |
| Isa.51:22#20 | πτώσεως | πτῶσις | N-GSF | 2 | right | right | τὸ ποτήριον τῆς πτώσεως, τὸ κόνδυ τοῦ |
| Isa.53:3#11 | τῶν | ὁ | T-GPM | 2a | right | right | παρὰ τοὺς υἱοὺς τῶν ἀνθρώπων· ἄνθρωπος ἐν |
| Isa.55:6#6 | τῷ | ὁ | T-DSN | 2a | right | right | κύριον, καὶ ἐν τῷ εὑρίσκειν αὐτὸν ἐπικαλέσασθε· |
| Jer.20:1#9 | οὗτος | οὗτος | D-NSM | 1 | right | right | ὁ ἱερεύς, καὶ οὗτος ἦν καθεσταμένος ἡγούμενος |
| Jer.25:18#9 | ἐξαποστελῶ | ἐξαποστέλλω | V-FAI-1S | 1 | right | right | ἐν Αἰλάμ, καὶ ἐξαποστελῶ ἐκεῖθεν βασιλέα καὶ |
| Jer.43:27#10 | τὸν | ὁ | T-ASM | 1 | right | right | μετὰ τὸ κατακαῦσαι τὸν βασιλέα τὸ χαρτίον, |
| Jer.50:11#6 | Αἰγύπτου | Αἴγυπτος | N-GSF | 1 | right | right | καὶ πατάξει γῆν Αἰγύπτου, οὓς εἰς θάνατον |
| Jer.51:19#3 | ἡμεῖς | ἐγώ | P-1NP | 1 | right | right | καὶ ὅτι ἡμεῖς θυμιῶμεν τῇ βασιλίσσῃ |
| Jer.52:8#22 | διεσπάρησαν | διασπείρω | V-2API-3P | 1 | right | right | οἱ παῖδες αὐτοῦ διεσπάρησαν ἀπ᾽ αὐτοῦ. |
| Jer.9:19#9 | κατῃσχύνθημεν | καταισχύνω | V-API-1P | 2 | right | right | Σειών Πῶς ἐταλαιπωρήσαμεν, κατῃσχύνθημεν σφόδρα, ὅτι ἐνκατελίπομεν |
| Jer.18:15#10 | ἀσθενήσουσιν | ἀσθενέω | V-FAI-3P | 2 | right | right | κενὸν ἐθυμίασαν, καὶ ἀσθενήσουσιν ἐν ταῖς ὁδοῖς |
| Jer.31:32#19 | τρυγηταῖς | τρυγητής | N-DPM | 2 | right | right | ὀπώραν σου, ἐπὶ τρυγηταῖς σου ὄλεθρος ἐπέπεσεν· |
| Jer.32:1#10 | τοῦ | ὁ | T-GSM | 2a | right | right | Λάβε τὸ ποτήριον τοῦ οἴνου τοῦ ἀκράτου |
| Jer.39:20#11 | ἡμέρας | ἡμέρα | N-GSF | 2a | right | right | Αἰγύπτῳ ἕως τῆς ἡμέρας ταύτης, καὶ ἐν |
| Jer.39:21#2 | ἐξήγαγες | ἐξάγω | V-2AAI-2S | 2 | right | right | καὶ ἐξήγαγες τὸν λαόν σου |
| Lam.1:5#11 | αὐτῆς | αὐτός | P-GSF | 1 | right | right | καὶ οἱ ἐχθροὶ αὐτῆς εὐθηνοῦσαν, ὅτι Κύριος |
| Lam.1:5#16 | ἐπὶ | ἐπί | PREP | 1 | right | right | ὅτι Κύριος ἐταπείνωσεν ἐπὶ τὸ πλῆθος τῶν |
| Lam.2:19#14 | σου | σύ | P-2GS | 1 | right | right | ὡς ὕδωρ καρδίαν σου ἀπέναντι προσώπου Κυρίου, |
| Lam.3:9#3 | ὁδούς | ὁδός | N-APF | 1 | right | right | Δάλεθ. Ἀνῳκοδόμησεν ὁδούς μου, ἐνέφραξεν τρίβους |
| Lam.3:59#8 | κρίσιν | κρίσις | N-ASF | 1 | right | right | μου, ἔκρινας τὴν κρίσιν μου. |
| Lam.5:14#8 | ψαλμῶν | ψαλμός | N-GPM | 1 | right | right | κατέπαυσαν, ἐκλεκτοὶ ἐκ ψαλμῶν αὐτῶν κατέπαυσαν, |
| Lam.2:9#10 | μοχλοὺς | μοχλός | N-APM | 2 | right | right | ἀπώλεσεν καὶ συνέτριψεν μοχλοὺς αὐτῆς, βασιλέα αὐτῆς |
| Lam.3:5#6 | ἐκύκλωσεν | κυκλόω | V-AAI-3S | 2 | right | right | κατ᾽ ἐμοῦ, καὶ ἐκύκλωσεν κεφαλήν μου καὶ |
| Lam.3:32#4 | ταπεινώσας | ταπεινόω | V-AAP-NSM | 2 | right | right | Χάφ. Ὅτι ὁ ταπεινώσας οἰκτειρήσει καὶ κατὰ |
| Lam.4:5#6 | ἠφανίσθησαν | ἀφανίζω | V-API-3P | 2 | right | right | ἔσθοντες τὰς τροφὰς ἠφανίσθησαν ἐν ταῖς ἐξόδοις, |
| Lam.4:10#14 | τῷ | ὁ | T-DSN | 2a | right | right | βρῶσιν αὐταῖς ἐν τῷ συντρίμματι τῆς θυγατρὸς |
| Lam.4:14#17 | ἐνδυμάτων | ἔνδυμα | N-GPN | 2 | right | right | δύνασθαι αὐτούς, ἥψαντο ἐνδυμάτων αὐτῶν. |
| Eze.7:13#10 | καὶ | καί | CONJ | 1 | right | right | οὐκέτι μὴ ἐπιστρέψῃ, καὶ ἄνθρωπος ἐν ὀφθαλμῷ |
| Eze.13:15#6 | ἐπὶ | ἐπί | PREP | 1 | right | right | τὸν θυμόν μου ἐπὶ τὸν τοῖχον καὶ |
| Eze.19:14#19 | εἰς | εἰς | PREP | 1 | right | right | ῥάβδος ἰσχύος· φυλὴ εἰς παραβολὴν θρήνου ἐστίν, |
| Eze.28:7#26 | καὶ | καί | CONJ | 1 | right | right | τῆς ἐπιστήμης σου, καὶ στρώσουσιν τὸ κάλλος |
| Eze.29:18#4 | βασιλεὺς | βασιλεύς | N-NSM | 1 | right | right | Υἱὲ ἀνθρώπου, Ναβουχοδονοσὸρ βασιλεὺς Βαβυλῶνος κατεδουλώσατο αὐτοῦ |
| Eze.41:11#21 | πρὸς | πρός | PREP | 1 | right | right | θύρα ἡ μία πρὸς νότον, καὶ τὸ |
| Eze.1:22#18 | ἐπάνωθεν | ἐπάνωθεν | PREP | 2 | right | unsure | ἐκτεταμένον ἐπὶ τῶν πτερύγων αὐτῶν ἐπάνωθεν: used as an adverb ('above') with no noun after it; TAGNT's convention for ἐπάνω as a preposition or an adverb cannot be told from its data (the form is not in the New Testament) |
| Eze.33:27#25 | δοθήσονται | δίδωμι | V-FPI-3P | 2 | right | right | θηρίοις τοῦ ἀγροῦ δοθήσονται εἰς κατάβρωμα, καὶ |
| Eze.41:12#17 | διορίζοντος | διορίζω | V-PAP-GSM | 2a | right | right | τοῦ τοίχου τοῦ διορίζοντος πήχεων πέντε, εὖρος |
| Eze.42:8#19 | ἀντιπρόσωποι | ἀντιπρόσωπος | A-NPF | 2a | right | right | αὗταί εἰσιν αἱ ἀντιπρόσωποι ταύταις· τὸ πᾶν |
| Eze.45:17#16 | ἑορταῖς | ἑορτή | N-DPF | 2 | right | right | σπονδαὶ ἐν ταῖς ἑορταῖς καὶ ἐν ταῖς |
| Eze.48:28#3 | τῶν | ὁ | T-GPN | 2a | right | right | καὶ ἀπὸ τῶν ὁρίων τῶν Γὰδ |
| Dan.1:2#38 | καὶ | καί | CONJ | 1 | right | right | καὶ τὰ σκεύη· καὶ ἀπηρείσατο αὐτὰ ἐν |
| Dan.4:14#20 | καὶ | καί | CONJ | 1 | right | right | ἐπὶ τῆς γῆς, καὶ ὅσα ἂν θέλῃ |
| Dan.5:7#5 | φωνῇ | φωνή | N-DSF | 1 | right | right | ὁ βασιλεὺς ἐφώνησε φωνῇ μεγάλῃ καλέσαι τοὺς |
| Dan.7:16#12 | ὑπὲρ | ὑπέρ | PREP | 1 | right | right | ἐζήτουν παρ᾽ αὐτοῦ ὑπὲρ πάντων τούτων. ἀποκριθεὶς |
| Dan.10:11#38 | τρέμων | τρέμω | V-PAP-NSM | 1 | right | right | πρόσταγμα τοῦτο ἔστην τρέμων. |
| Dan.11:5#4 | Αἰγύπτου | Αἴγυπτος | N-GSF | 1 | right | right | καὶ ἐνισχύσει βασιλείαν Αἰγύπτου, καὶ εἷς ἐκ |
| Dan.2:16#22 | τοῦ | ὁ | T-GSM | 2a | right | right | δηλώσῃ πάντα ἐπὶ τοῦ βασιλέως. |
| Dan.3:95#30 | τοῦ | ὁ | T-GSM | 2a | right | right | τὴν γὰρ προσταγὴν τοῦ βασιλέως ἠθέτησαν καὶ |
| Dan.6:7#32 | τῶν | ὁ | T-GPM | 2a | right | right | εἰς τὸν λάκκον τῶν λεόντων. |
| Dan.6:17#40 | Δανιὴλ | Δανιήλ | N-NSM | 2a | right | right | αὐτῶν ἀρθῇ ὁ Δανιὴλ ἢ ὁ βασιλεὺς |
| Dan.11:2#33 | παντὶ | πᾶς | A-DSM | 2a | right | right | πλούτῳ αὐτοῦ ἐπαναστήσεται παντὶ βασιλεῖ Ἑλλήνων. |
| Dan.11:40#23 | πλοίοις | πλοῖον | N-DPN | 2 | right | right | πολλοῖς καὶ ἐν πλοίοις πολλοῖς, καὶ εἰσελεύσεται |
| Hos.4:4#10 | λαός | λαός | N-NSM | 1 | right | right | μηδείς. ὁ δὲ λαός μου ὡς ἀντιλεγόμενος |
| Hos.6:4#20 | πορευομένη | πορεύω | V-PNP-NSF | 1 | right | right | ὡς δρόσος ὀρθρινὴ πορευομένη. |
| Hos.6:10#3 | οἴκῳ | οἶκος | N-DSM | 1 | right | right | ἐν τῷ οἴκῳ τοῦ Ἰσραήλ· εἶδον |
| Hos.12:9#12 | ἔτι | ἔτι | ADV | 1 | right | right | ἐκ γῆς Αἰγύπτου, ἔτι κατοικιῶ σε ἐν |
| Hos.14:9#14 | ἐγὼ | ἐγώ | P-1NS | 1 | right | right | καὶ κατισχύσω αὐτόν· ἐγὼ ὡς ἄρκευθος πυκάζουσα, |
| Hos.14:10#11 | διότι | διότι | CONJ | 1 | right | right | καὶ ἐπιγνώσεται αὐτά; διότι εὐθεῖαι αἱ ὁδοὶ |
| Hos.4:2#17 | αἵμασιν | αἷμα | N-DPN | 2 | right | right | καὶ αἵματα ἐφ᾽ αἵμασιν μίσγουσιν. |
| Hos.4:18#8 | φρυάγματος | φρύαγμα | N-GSN | 2 | right | right | ἠγάπησαν ἀτιμίαν ἐκ φρυάγματος αὐτῆς. |
| Hos.7:3#3 | κακίαις | κακία | N-DPF | 2 | right | right | ἐν ταῖς κακίαις αὐτῶν εὔφραναν βασιλεῖς, |
| Hos.7:6#10 | καταράσσειν | καταράσσω | V-PAN | 2 | right | right | αὐτῶν, ἐν τῷ καταράσσειν αὐτοὺς ὅλην τὴν |
| Hos.11:9#7 | τοῦ | ὁ | T-GSM | 2a | right | right | κατά τὴν ὀργὴν τοῦ θυμοῦ μου, οὐ |
| Hos.12:12#15 | ἐφυλάξατο | φυλάσσω | V-AMI-3S | 2 | right | right | καὶ ἐν γυναικὶ ἐφυλάξατο. |
| Joe.1:2#5 | καὶ | καί | CONJ | 1 | right | right | ταῦτα, οἱ πρεσβύτεροι, καὶ ἐνωτίσασθε, πάντες οἱ |
| Joe.2:2#9 | ὡς | ὡς | PRT | 1 | right | right | νεφέλης καὶ ὁμίχλης. ὡς ὄρθρος χυθήσεται ἐπὶ |
| Joe.2:5#24 | εἰς | εἰς | PREP | 1 | right | right | καὶ ἰσχυρὸς παρατασσόμενος εἰς πόλεμον. |
| Joe.2:20#29 | τὴν | ὁ | T-ASF | 1 | right | right | ὀπίσω αὐτοῦ εἰς τὴν θάλασσαν τὴν ἐσχάτην· |
| Joe.2:24#5 | σίτου | σῖτος | N-GSM | 1 | right | right | πλησθήσονται αἱ ἅλωνες σίτου, καὶ ὑπερχυθήσονται αἱ |
| Joe.2:28#9 | πνεύματός | πνεῦμα | N-GSN | 1 | right | right | ἐκχεῶ ἀπὸ τοῦ πνεύματός μου ἐπὶ πᾶσαν |
| Joe.1:20#5 | πεδίου | πεδίον | N-GSN | 2 | right | right | τὰ κτήνη τοῦ πεδίου ἀνέβλεψαν πρὸς σέ· |
| Joe.2:7#22 | ἐκκλίνωσιν | ἐκκλίνω | V-PAS-3P | 2 | right | unsure | καὶ οὐ μὴ ἐκκλίνωσιν τὰς τρίβους: present or aorist subjunctive, the one form for both; the verse cannot tell which TAGNT would write |
| Joe.2:8#11 | τοῖς | ὁ | T-DPN | 2a | right | right | ἀφέξεται· καταβαρυνόμενοι ἐν τοῖς ὅπλοις αὐτῶν πορεύσονται, |
| Joe.3:14#7 | δίκης | δίκη | N-GSF | 2a | right | right | τῇ κοιλάδι τῆς δίκης, ὅτι ἐγγὺς ἡμέρα |
| Joe.3:18#10 | γλυκασμόν | γλυκασμός | N-ASM | 2 | right | right | ἀποσταλάξει τὰ ὄρη γλυκασμόν, καὶ οἱ βουνοὶ |
| Joe.3:19#7 | Ἰδουμαία | Ἰδουμαία | N-NSF | 2a | right | right | ἔσται, καὶ ἡ Ἰδουμαία εἰς πεδίον ἀφανισμοῦ |
| Amo.3:11#7 | θεός | θεός | N-NSM | 1 | right | right | λέγει Κύριος ὁ θεός Τύρος κυκλόθεν ἡ |
| Amo.6:14#23 | ὡς | ὡς | PRT | 1 | right | right | εἰς Ἑμὰθ καὶ ὡς τοῦ χειμάρρου τῶν |
| Amo.7:13#11 | ἐστίν | εἰμί | V-PAI-3S | 1 | right | right | ὅτι ἁγίασμα βασιλέως ἐστίν, καὶ οἶκος βασιλείας |
| Amo.7:16#19 | οἶκον | οἶκος | N-ASM | 1 | right | right | ὀχλαγωγήσεις ἐπὶ τὸν οἶκον Ἰακώβ· |
| Amo.8:8#16 | ἀναβήσεται | ἀναβαίνω | V-FDI-3S | 1 | right | right | ἐν αὐτῇ, καὶ ἀναβήσεται ὡς ποταμὸς συντέλεια, |
| Amo.9:5#29 | ὡς | ὡς | PRT | 1 | right | right | αὐτῆς, καὶ καταβήσεται ὡς ποταμὸς Αἰγύπτου· |
| Amo.2:8#10 | τοῦ | ὁ | T-GSN | 2a | right | right | παραπετάσματα ἐποίουν ἐχόμενα τοῦ θυσιαστηρίου, καὶ οἶνον |
| Amo.4:1#18 | καταπατοῦσαι | καταπατέω | V-PAP-NPF | 2 | right | right | καταδυναστεύουσαι πτωχοὺς καὶ καταπατοῦσαι πένητας, αἱ λέγουσαι |
| Amo.4:3#3 | γυμναὶ | γυμνός | A-NPF | 2 | right | right | καὶ ἐξενεχθήσεσθε γυμναὶ κατέναντι ἀλλήλων, καὶ |
| Amo.5:11#19 | κατοικήσητε | κατοικέω | V-AAS-2P | 2 | right | right | καὶ οὐ μὴ κατοικήσητε ἐν αὐτοῖς, ἀμπελῶνας |
| Amo.5:15#9 | ἀποκαταστήσατε | ἀποκαθίστημι | V-AAM-2P | 2 | right | right | τὰ καλά, καὶ ἀποκαταστήσατε ἐν πύλαις κρίμα, |
| Amo.6:8#15 | χώρας | χώρα | N-APF | 2a | right | right | Ἰακώβ, καὶ τὰς χώρας αὐτοῦ μεμίσηκα, καὶ |
| Oba.1:11#19 | καὶ | καί | CONJ | 1 | right | right | εἰς πύλας αὐτοῦ καὶ ἐπὶ Ἰερουσαλὴμ ἔβαλον |
| Oba.1:11#24 | καὶ | καί | CONJ | 1 | right | right | Ἰερουσαλὴμ ἔβαλον κλήρους, καὶ σὺ ἦς ὡς |
| Oba.1:14#3 | ἐπὶ | ἐπί | PREP | 1 | right | right | μηδὲ ἐπιστῇς ἐπὶ τὰς διεκβολὰς αὐτοῦ |
| Oba.1:14#16 | ἐν | ἐν | PREP | 1 | right | right | τοὺς φεύγοντας αὐτοῦ ἐν ἡμέρᾳ θλίψεως. |
| Oba.1:16#1 | διότι | διότι | CONJ | 1 | right | right | διότι ὃν τρόπον ἔπιες |
| Oba.1:16#12 | καὶ | καί | CONJ | 1 | right | right | ἅγιόν μου, πίονται καὶ καταβήσονται, καὶ ἔσονται |
| Oba.1:4#9 | τῶν | ὁ | T-GPN | 2a | right | right | ἐὰν ἀνὰ μέσον τῶν ἄστρων θῇς νοσσιάν |
| Oba.1:17#12 | κατακληρονομήσουσιν | κατακληρονομέω | V-FAI-3P | 2 | right | right | ἔσται ἅγιον καὶ κατακληρονομήσουσιν ὁ οἶκος Ἰακὼβ |
| Oba.1:17#14 | οἶκος | οἶκος | N-NSM | 2a | right | right | καὶ κατακληρονομήσουσιν ὁ οἶκος Ἰακὼβ τοὺς κατακληρονομήσαντας |
| Oba.1:17#17 | κατακληρονομήσαντας | κατακληρονομέω | V-AAP-APM | 2a | right | right | οἶκος Ἰακὼβ τοὺς κατακληρονομήσαντας αὐτούς. |
| Oba.1:18#4 | οἶκος | οἶκος | N-NSM | 2a | right | right | καὶ ἔσται ὁ οἶκος Ἰακὼβ πῦρ, ὁ |
| Oba.1:20#23 | πόλεις | πόλις | N-APF | 2a | right | right | Ἐφράθα· κληρονομήσουσιν τὰς πόλεις τοῦ Νάγεβ. |
| Jon.1:6#5 | ὁ | ὁ | T-NSM | 1 | right | right | προσῆλθεν πρὸς αὐτὸν ὁ πρωρεὺς καὶ εἶπεν |
| Jon.1:6#18 | σου | σύ | P-2GS | 1 | right | right | ἐπικαλοῦ τὸν θεόν σου, ὅπως διασώσῃ ὁ |
| Jon.3:2#22 | σὲ | σύ | P-2AS | 1 | right | right | ἐγὼ ἐλάλησα πρὸς σὲ. |
| Jon.3:6#28 | ἐπὶ | ἐπί | PREP | 1 | right | right | σάκκον, καὶ ἐκάθισεν ἐπὶ σποδοῦ. |
| Jon.4:5#2 | ἐξῆλθεν | ἐξέρχομαι | V-2AAI-3S | 1 | right | right | καὶ ἐξῆλθεν Ἰωνᾶς ἐκ τῆς |
| Jon.4:9#4 | θεὸς | θεός | N-NSM | 1 | right | right | καὶ εἶπεν ὁ θεὸς πρὸς Ἰωνᾶν Εἰ |
| Jon.2:1#15 | τοῦ | ὁ | T-GSN | 2a | right | right | ἐν τῇ κοιλίᾳ τοῦ κήτους τρεῖς ἡμέρας |
| Jon.2:1#20 | τρεῖς | τρεῖς, τρία | A-APF | 2a | right | right | τρεῖς ἡμέρας καὶ τρεῖς νύκτας. |
| Jon.2:8#2 | τῷ | ὁ | T-DSN | 2a | right | right | ἐν τῷ ἐκλιπεῖν ἀπ᾽ ἐμοῦ |
| Jon.3:7#7 | Νινευὴ | Νινευή | N-DSF | 2a | right | right | ἐρρέθη ἐν τῇ Νινευὴ παρὰ τοῦ βασιλέως |
| Jon.4:2#39 | μετανοῶν | μετανοέω | V-PAP-NSM | 2 | right | right | καὶ πολυέλεος καὶ μετανοῶν ἐπὶ ταῖς κακίαις. |
| Jon.4:6#32 | κολοκύνθῃ | κολοκύνθη | N-DSF | 2a | right | right | Ἰωνᾶς ἐπὶ τῇ κολοκύνθῃ χαρὰν μεγάλην. |
| Mic.2:13#2 | τῆς | ὁ | T-GSF | 1 | right | right | διὰ τῆς διακοπῆς πρὸ προσώπου |
| Mic.4:5#21 | καὶ | καί | CONJ | 1 | right | right | εἰς τὸν αἰῶνα καὶ ἐπέκεινα. |
| Mic.6:5#20 | ἀπὸ | ἀπό | PREP | 1 | right | right | υἱὸς τοῦ Βεὼρ ἀπὸ τῶν σχοίνων ἕως |
| Mic.6:14#10 | σοὶ | σύ | P-2DS | 1 | right | right | καὶ σκοτάσει ἐν σοὶ καὶ ἐκνεύσει, καὶ |
| Mic.7:10#3 | ἡ | ὁ | T-NSF | 1 | right | right | καὶ ὄψεται ἡ ἐχθρά μου καὶ |
| Mic.7:10#17 | σου | σύ | P-2GS | 1 | right | right | Κύριος ὁ θεός σου; οἱ ὀφθαλμοί μου |
| Mic.2:4#32 | ἀγροὶ | ἀγρός | N-NPM | 2a | right | right | τοῦ ἀποστρέψαι· οἱ ἀγροὶ ἡμῶν διεμερίσθησαν. |
| Mic.2:9#6 | τῶν | ὁ | T-GPF | 2a | right | right | μου ἀποριφήσονται ἐκ τῶν οἰκιῶν τρυφῆς αὐτῶν, |
| Mic.2:9#15 | ἐξώσθησαν | ἐξωθέω | V-API-3P | 2 | right | right | πονηρὰ ἐπιτηδεύματα αὐτῶν ἐξώσθησαν. ἐγγίσατε ὄρεσιν αἰωνίοις· |
| Mic.4:8#5 | αὐχμώδης | αὐχμώδης | A-GSN | 2a | right | unsure | πύργος ποιμνίου αὐχμώδης: the adjective agrees with πύργος (NSM or VSM, 'dark tower of the flock', Brenton) or with ποιμνίου (GSN, 'of the dusky flock', as settled); the Greek allows both |
| Mic.4:10#18 | πεδίῳ | πεδίον | N-DSN | 2 | right | right | καὶ κατασκηνώσεις ἐν πεδίῳ, καὶ ἥξεις ἕως |
| Mic.7:12#7 | ὁμαλισμὸν | ὁμαλισμός | N-ASM | 2 | right | right | σου εἴξουσιν εἰς ὁμαλισμὸν καὶ εἰς διαμερισμὸν |
| Nah.1:3#3 | καὶ | καί | CONJ | 1 | right | right | Κύριος μακρόθυμος, καὶ μεγάλη ἡ ἰσχὺς |
| Nah.1:5#4 | ἀπ᾽ | ἀπό | PREP | 1 | right | right | τὰ ὄρη ἐσείσθησαν ἀπ᾽ αὐτοῦ, καὶ οἱ |
| Nah.1:12#8 | οὕτως | οὕτω, οὕτως | ADV | 1 | right | right | ὑδάτων πολλῶν Καὶ οὕτως διασταλήσονται, καὶ ἡ |
| Nah.2:3#11 | διότι | διότι | CONJ | 1 | right | right | ὕβριν τοῦ Ἰσραήλ, διότι ἐκτινάσσοντες ἐξετίναξαν αὐτοὺς |
| Nah.2:5#11 | ταῖς | ὁ | T-DPF | 1 | right | right | καὶ συνπλακήσονται ἐν ταῖς πλατείαις ἡ ὅρασις |
| Nah.3:10#16 | ὁδῶν | ὁδός | N-GPF | 1 | right | right | ἀρχὰς πασῶν τῶν ὁδῶν αὐτῆς, καὶ ἐπὶ |
| Nah.1:5#18 | σύμπασα | σύμπας | A-NSF | 2a | right | right | προσώπου αὐτοῦ, ἡ σύμπασα, καὶ πάντες οἱ |
| Nah.1:5#22 | κατοικοῦντες | κατοικέω | V-PAP-NPM | 2a | right | right | καὶ πάντες οἱ κατοικοῦντες ἐν αὐτῇ. |
| Nah.2:4#8 | ἐμπαίζοντας | ἐμπαίζω | V-PAP-APM | 2 | right | right | ἀνθρώπων, ἄνδρας δυνατοὺς ἐμπαίζοντας ἐν πυρί· αἱ |
| Nah.2:12#12 | τοῖς | ὁ | T-DPM | 2a | right | right | νομὴ ἡ οὖσα τοῖς σκύμνοις; ποῦ ἐπορεύθη |
| Nah.3:8#11 | ποταμοῖς | ποταμός | N-DPM | 2 | right | right | ἡ κατοικοῦσα ἐν ποταμοῖς· ὕδωρ κύκλῳ αὐτῆς, |
| Nah.3:15#5 | ἐξολεθρεύσει | ἐξολεθρεύω | V-FAI-3S | 2 | right | right | καταφάγεταί σε πῦρ, ἐξολεθρεύσει σε ῥομφαία, καταφάγεταί |
| Hab.1:9#12 | ὡς | ὡς | PRT | 1 | right | right | ἐναντίας, καὶ συνάξει ὡς ἄμμον αἰχμαλωσίαν. |
| Hab.1:9#13 | ἄμμον | ἄμμος | N-ASF | 1 | right | right | καὶ συνάξει ὡς ἄμμον αἰχμαλωσίαν. |
| Hab.1:14#11 | ὡς | ὡς | PRT | 1 | right | right | τῆς θαλάσσης, καὶ ὡς τὰ ἑρπετὰ τὰ |
| Hab.2:5#19 | οὐκ | οὐ | PRT-N | 1 | right | right | οὗτος ὡς θάνατος οὐκ ἐμπιπλάμενος, καὶ ἐπισυνάξει |
| Hab.2:19#23 | καὶ | καί | CONJ | 1 | right | right | χρυσίου καὶ ἀργυρίου, καὶ πᾶν πνεῦμα οὐκ |
| Hab.3:2#28 | τὸν | ὁ | T-ASM | 1 | right | right | ἐν τῷ παρεῖναι τὸν καιρὸν ἀναδειχθήσῃ· ἐν |
| Hab.1:2#4 | κράξομαι | κράζω | V-PPI-1S | 2 | right | wrong | Ἕως τίνος, Κύριε, κράξομαι: 'how long shall I cry out', the future middle (V-FDI-1S); settled V-PPI-1S, a present passive |
| Hab.1:3#3 | ἔδειξάς | δεικνύω | V-AAI-2S | 2 | right | right | ἵνα τί ἔδειξάς μοι κόπους καὶ |
| Hab.1:4#13 | καταδυναστεύει | καταδυναστεύω | V-PAI-3S | 2 | right | right | κρίμα, ὅτι ἀσεβὴς καταδυναστεύει τὸν δίκαιον· ἕνεκεν |
| Hab.1:12#6 | ὁ | ὁ | T-VSM | 2a | right | right | ἀπ᾽ ἀρχῆς, Κύριε ὁ θεός, ὁ ἅγιός |
| Hab.3:3#15 | ἐκάλυψεν | καλύπτω | V-AAI-3S | 2 | right | right | κατασκίου δασέος. διάψαλμα. ἐκάλυψεν οὐρανοὺς ἡ ἀρετὴ |
| Hab.3:16#20 | ὑποκάτωθέν | ὑποκάτωθεν | PREP | 2 | right | right | ὀστᾶ μου, καὶ ὑποκάτωθέν μου ἐταράχθη ἡ |
| Zep.1:9#4 | ἐπὶ | ἐπί | PREP | 1 | right | right | καὶ ἐκδικήσω ἐμφανῶς ἐπὶ τὰ πρόπυλα ἐν |
| Zep.1:18#36 | τὴν | ὁ | T-ASF | 1 | right | right | πάντας τούς κατοικοῦντας τὴν γῆν. |
| Zep.2:9#34 | οἱ | ὁ | T-NPM | 1 | right | right | τὸν αἰῶνα· καὶ οἱ κατάλοιποι λαοῦ μου |
| Zep.2:11#18 | ἐκ | ἐκ | PREP | 1 | right | right | προσκυνήσουσιν αὐτῷ ἕκαστος ἐκ τοῦ τόπου αὐτοῦ, |
| Zep.3:2#23 | θεὸν | θεός | N-ASM | 1 | right | right | καὶ πρὸς τὸν θεὸν αὐτῆς οὐκ ἤγγισεν. |
| Zep.3:14#14 | σου | σύ | P-2GS | 1 | right | right | ὅλης τῆς καρδίας σου, θύγατερ Ἰερουσαλήμ. |
| Zep.1:9#12 | πληροῦντας | πληρόω | V-PAP-APM | 2a | right | right | τῇ ἡμέρᾳ, τοὺς πληροῦντας τὸν οἶκον Κυρίου |
| Zep.1:17#10 | τῷ | ὁ | T-DSM | 2a | right | right | ὡς τυφλοί, ὅτι τῷ κυρίῳ ἐξήμαρτον· καὶ |
| Zep.3:1#5 | φαυλίστρια | φαυλίστρια | N-NSF | 2a | right | right | ἡ πόλις ἡ φαυλίστρια, ἡ κατοικοῦσα ἐπ᾽ |
| Zep.3:2#16 | τῷ | ὁ | T-DSM | 2a | right | right | ἐδέξατο παιδίαν, ἐπὶ τῷ κυρίῳ οὐκ ἐπεποίθει, |
| Zep.3:6#6 | γωνίαι | γωνία | N-NPF | 2 | right | right | κατέσπασα ὑπερηφάνους, ἠφανίσθησαν γωνίαι αὐτῶν· ἐξερημώσω τάς |
| Zep.3:17#27 | τέρψει | τέρψις | N-DSF | 2 | right | right | ἐπὶ σὲ ἐν τέρψει ὡς ἐν ἡμέρᾳ |
| Hag.1:14#40 | θεοῦ | θεός | N-GSM | 1 | right | right | οἴκῳ Κυρίου Παντοκράτορος θεοῦ αὐτῶν, |
| Hag.2:6#3 | Κύριος | κύριος | N-NSM | 1 | right | right | διότι λέγει Κύριος Παντοκράτωρ Ἔτι ἅπαξ |
| Hag.2:6#10 | οὐρανὸν | οὐρανός | N-ASM | 1 | right | right | ἐγὼ σείσω τὸν οὐρανὸν καὶ τὴν γῆν |
| Hag.2:14#27 | καὶ | καί | CONJ | 1 | right | right | τῶν χειρῶν αὐτῶν, καὶ ὃς ἐὰν ἐγγίσῃ |
| Hag.2:15#9 | ἀπὸ | ἀπό | PREP | 1 | right | right | τὰς καρδίας ὑμῶν ἀπὸ τῆς ἡμέρας ταύτης |
| Hag.2:16#24 | ἐγένοντο | γίνομαι | V-2ADI-3P | 1 | right | right | πεντήκοντα μετρητάς, καὶ ἐγένοντο εἴκοσι. |
| Hag.1:1#15 | τοῦ | ὁ | T-GSM | 2a | right | right | τῷ ἕκτῳ μιᾷ τοῦ μηνὸς ἐγένετο λόγος |
| Hag.1:12#35 | τοῦ | ὁ | T-GSM | 2a | right | right | τῶν λόγων Ἁγγαίου τοῦ προφήτου, καθότι ἐξαπέστειλεν |
| Hag.1:14#18 | τοῦ | ὁ | T-GSM | 2a | right | right | Ἰησοῦ τοῦ Ἰωσεδὲκ τοῦ ἱερέως τοῦ μεγάλου |
| Hag.2:2#25 | τοῦ | ὁ | T-GSM | 2a | right | right | πάντας τοὺς καταλοίπους τοῦ λαοῦ λέγων |
| Hag.2:4#18 | κατισχυέτω | κατισχύω | V-PAM-3S | 2 | right | right | ὁ μέγας, καὶ κατισχυέτω πᾶς ὁ λαὸς |
| Hag.2:17#10 | χαλάζῃ | χάλαζα | N-DSF | 2 | right | right | ἀνεμοφθορίᾳ καὶ ἐν χαλάζῃ, πάντα τὰ ἔργα |
| Zec.2:5#4 | αὐτῇ | αὐτός | P-DSF | 1 | right | right | καὶ ἐγὼ ἔσομαι αὐτῇ, λέγει Κύριος, τεῖχος |
| Zec.3:5#24 | Κυρίου | κύριος | N-GSM | 1 | right | right | καὶ ὁ ἄγγελος Κυρίου ἱστήκει· |
| Zec.4:5#2 | ἀπεκρίθη | ἀποκρίνω | V-ADI-3S | 1 | right | right | καὶ ἀπεκρίθη ὁ ἄγγελος ὁ |
| Zec.9:5#12 | ὅτι | ὅτι | CONJ | 1 | right | right | σφόδρα, καὶ Ἀκκαρών, ὅτι ᾐσχύνθη ἐπὶ τῷ |
| Zec.9:15#17 | ὡς | ὡς | PRT | 1 | right | right | καὶ ἐκπίονται αὐτοὺς ὡς οἶνον, καὶ πλήσουσιν |
| Zec.10:9#6 | καὶ | καί | CONJ | 1 | right | right | αὐτοὺς ἐν λαοῖς, καὶ οἱ μακρὰν μνησθήσονταί |
| Zec.8:9#27 | οἶκος | οἶκος | N-NSM | 2a | right | right | ἡμέρας τεθεμελίωται ὁ οἶκος Κυρίου Παντοκράτορος, καὶ |
| Zec.9:8#19 | ἐξελαύνων | ἐξελαύνω | V-PAP-NSM | 2 | right | right | ἐπ᾽ αὐτοὺς οὐκέτι ἐξελαύνων, διότι νῦν ἑόρακα |
| Zec.10:3#11 | ἀμνοὺς | ἀμνός | N-APM | 2 | right | right | καὶ ἐπὶ τοὺς ἀμνοὺς ἐπισκέψομαι· καὶ ἐπισκέψεται |
| Zec.11:1#11 | κέδρους | κέδρος | N-APF | 2a | right | right | καταφαγέτω πῦρ τὰς κέδρους σου· |
| Zec.13:3#43 | τῷ | ὁ | T-DSN | 2a | right | right | γεννήσαντες αὐτόν, ἐν τῷ προφητεύειν αὐτόν. |
| Zec.14:16#20 | τῷ | ὁ | T-DSM | 2a | right | right | ἐνιαυτὸν τοῦ προσκυνῆσαι τῷ βασιλεῖ Κυρίῳ Παντοκράτορι |
| Mal.1:6#32 | ὑμεῖς | σύ | P-2NP | 1 | right | right | λέγει Κύριος Παντοκράτωρ. ὑμεῖς οἱ ἱερεῖς οἱ |
| Mal.2:6#24 | ἀπὸ | ἀπό | PREP | 1 | right | right | καὶ πολλοὺς ἐπέστρεψεν ἀπὸ ἀδικίας. |
| Mal.2:17#20 | ποιῶν | ποιέω | V-PAP-NSM | 1 | right | right | λέγειν ὑμᾶς Πᾶς ποιῶν πονηρόν, καλὸν ἐνώπιον |
| Mal.3:1#33 | λέγει | λέγω | V-PAI-3S | 1 | right | right | θέλετε· ἰδοὺ ἔρχεται, λέγει Κύριος Παντοκράτωρ. |
| Mal.3:2#7 | ἢ | ἤ | CONJ | 1 | right | right | ἡμέραν εἰσόδου αὐτοῦ; ἢ τίς ὑποστήσεται ἐν |
| Mal.3:13#4 | τοὺς | ὁ | T-APM | 1 | right | right | Ἐβαρύνατε ἐπ᾽ ἐμὲ τοὺς λόγους ὑμῶν, λέγει |
| Mal.1:4#4 | Ἰδουμαία | Ἰδουμαία | N-NSF | 2a | right | right | διότι ἐρεῖ Ἡ Ἰδουμαία κατέστραπται, καὶ ἐπιστρέψωμεν |
| Mal.1:5#8 | Ἐμεγαλύνθη | μεγαλύνω | V-API-3S | 2 | right | right | καὶ ὑμεῖς ἐρεῖτε Ἐμεγαλύνθη Κύριος ὑπεράνω τῶν |
| Mal.1:6#2 | δοξάζει | δοξάζω | V-PAI-3S | 2 | right | right | Υἱὸς δοξάζει πατέρα, καὶ δοῦλος |
| Mal.2:6#17 | κατευθύνων | κατευθύνω | V-PAP-NSM | 2 | right | right | αὐτοῦ· ἐν εἰρήνῃ κατευθύνων ἐπορεύθη μετ᾽ ἐμοῦ, |
| Mal.3:7#18 | ἐφυλάξασθε | φυλάσσω | V-AMI-2P | 2 | right | right | μου καὶ οὐκ ἐφυλάξασθε. ἐπιστρέψατε πρὸς μέ, |
| Mal.3:14#16 | ἐπορεύθημεν | πορεύω | V-AOI-1P | 2 | right | right | αὐτοῦ, καὶ διότι ἐπορεύθημεν ἱκέται πρὸ προσώπου |
