# The Septuagint derivation: where every book stands

Written by `npm run lxx:report` (scripts/lxx/report.ts) between the markers below; a second run on the same inputs changes nothing. Method, bar and files:
[lxx-derivation.md](lxx-derivation.md). A book falls short on one or more lines of the bar, and the last column names them. The other 21 books of Swete's file
(the Apocrypha, the Psalms of Solomon, the Odes, 1 Enoch) are not assessed.

<!-- lxx-report:start -->

Build 120. The bar (`scripts/lxx/bar.ts`): known-answer lemma at least 99% and full parsing at least 98% on each chapter below; no word pending; guesses at most 3% of the book's words; agreement breaks at most 5 per 1,000 words.

The chapter is what ships: a Greek chapter with no word pending and breaks at most 5 per 1,000 of its words, under the known-answer lines and the book's guess line, goes into the annotation file and the app (`npm run lxx:ship`). Shipped chapters shows which.

### The known-answer chapters of this build

| Chapter | Book hidden | Words | Lemma right | Full parsing right | Pending, no choice | Choices |
| --- | --- | --- | --- | --- | --- | --- |
| Jhn.1 | jhn | 829 | 99.8% | 99.3% | 0 | `lxx/known/jhn-1.tsv`: 155 |
| Rom.8 | rom | 652 | 99.7% | 98.9% | 0 | `lxx/known/rom-8.tsv`: 143 |

### The books

| Book | Words | Layer 1 | Layer 2 | Layer 2a | Layer 3 | Pending | Guesses | Breaks per 1,000 | Second pass differs | Morpheus agreed / differed / unknown | Shipped chapters | Bar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Genesis (Gen) | 32,635 | 66.3% | 3.0% | 4.9% | 2.1% | 7,737 | 0.2% | 0.5 | — | — | none | NOT: pending: 7737 |
| Exodus (Exo) | 24,647 | 62.7% | 5.3% | 4.8% | 0.0% | 6,682 | 0.0% | 0.6 | — | — | none | NOT: pending: 6682 |
| Leviticus (Lev) | 19,042 | 62.2% | 4.5% | 6.5% | 0.0% | 5,113 | 0.0% | 0.3 | — | — | none | NOT: pending: 5113 |
| Numbers (Num) | 24,973 | 62.5% | 5.2% | 5.0% | 0.0% | 6,822 | 0.0% | 0.2 | — | — | none | NOT: pending: 6822 |
| Deuteronomy (Deu) | 22,501 | 69.6% | 3.7% | 4.8% | 0.0% | 4,923 | 0.0% | 0.5 | — | — | none | NOT: pending: 4923 |
| Joshua (Jos) | 14,815 | 64.8% | 4.0% | 5.5% | 0.0% | 3,803 | 0.0% | 0.3 | — | — | none | NOT: pending: 3803 |
| Judges (Jdg) | 15,570 | 67.8% | 3.6% | 4.2% | 0.0% | 3,799 | 0.0% | 0.2 | — | — | none | NOT: pending: 3799 |
| Ruth (Rut) | 2,066 | 68.7% | 4.0% | 3.9% | 0.0% | 483 | 0.0% | 1.0 | — | — | none | NOT: pending: 483 |
| 1 Samuel (1Sa) | 20,044 | 66.6% | 3.4% | 4.2% | 0.0% | 5,182 | 0.0% | 0.5 | — | — | none | NOT: pending: 5182 |
| 2 Samuel (2Sa) | 17,906 | 66.9% | 3.3% | 4.9% | 0.0% | 4,458 | 0.0% | 0.2 | — | — | none | NOT: pending: 4458 |
| 1 Kings (1Ki) | 20,436 | 65.3% | 3.3% | 5.8% | 0.0% | 5,235 | 0.0% | 0.3 | — | — | none | NOT: pending: 5235 |
| 2 Kings (2Ki) | 18,618 | 65.7% | 3.6% | 5.5% | 0.0% | 4,696 | 0.0% | 0.1 | — | — | none | NOT: pending: 4696 |
| 1 Chronicles (1Ch) | 15,967 | 57.7% | 3.2% | 5.8% | 0.0% | 5,305 | 0.0% | 0.2 | — | — | none | NOT: pending: 5305 |
| 2 Chronicles (2Ch) | 21,059 | 65.3% | 3.8% | 6.4% | 0.0% | 5,167 | 0.0% | 0.6 | — | — | none | NOT: pending: 5167 |
| Ezra (Ezr) | 5,332 | 61.3% | 3.1% | 6.8% | 0.0% | 1,537 | 0.0% | 0.0 | — | — | none | NOT: pending: 1537 |
| Nehemiah (Neh) | 7,336 | 64.3% | 4.2% | 5.5% | 0.0% | 1,909 | 0.0% | 0.0 | — | — | none | NOT: pending: 1909 |
| Esther (Est) | 5,830 | 62.6% | 4.8% | 5.6% | 0.0% | 1,572 | 0.0% | 0.3 | — | — | none | NOT: pending: 1572 |
| Job (Job) | 13,509 | 63.7% | 5.4% | 2.0% | 0.0% | 3,908 | 0.0% | 0.4 | — | — | none | NOT: pending: 3908 |
| Psalms (Psa) | 34,615 | 65.2% | 4.7% | 5.3% | 0.0% | 8,614 | 0.0% | 0.4 | — | — | none | NOT: pending: 8614 |
| Proverbs (Pro) | 11,091 | 61.1% | 6.8% | 2.2% | 0.0% | 3,320 | 0.0% | 0.3 | — | — | none | NOT: pending: 3320 |
| Ecclesiastes (Ecc) | 4,518 | 64.9% | 3.6% | 4.5% | 0.0% | 1,222 | 0.0% | 0.0 | — | — | none | NOT: pending: 1222 |
| Song of Solomon (Sol) | 1,994 | 60.5% | 8.9% | 3.9% | 0.0% | 532 | 0.0% | 1.0 | — | — | none | NOT: pending: 532 |
| Isaiah (Isa) | 26,953 | 66.8% | 4.3% | 3.9% | 0.0% | 6,727 | 0.0% | 0.6 | — | — | none | NOT: pending: 6727 |
| Jeremiah (Jer) | 28,775 | 68.8% | 4.1% | 4.2% | 0.0% | 6,586 | 0.0% | 0.3 | — | — | none | NOT: pending: 6586 |
| Lamentations (Lam) | 2,463 | 62.7% | 6.5% | 2.3% | 0.0% | 701 | 0.0% | 0.0 | — | — | none | NOT: pending: 701 |
| Ezekiel (Eze) | 29,364 | 65.2% | 4.7% | 4.9% | 0.0% | 7,390 | 0.0% | 0.0 | — | — | none | NOT: pending: 7390 |
| Daniel (Dan) | 10,952 | 65.3% | 3.9% | 6.6% | 0.0% | 2,648 | 0.0% | 0.0 | — | — | none | NOT: pending: 2648 |
| Hosea (Hos) | 3,915 | 64.4% | 5.1% | 3.8% | 0.0% | 1,044 | 0.0% | 0.0 | — | — | none | NOT: pending: 1044 |
| Joel (Joe) | 1,573 | 64.4% | 4.8% | 5.7% | 0.0% | 395 | 0.0% | 0.0 | — | — | none | NOT: pending: 395 |
| Amos (Amo) | 3,200 | 66.6% | 5.6% | 4.3% | 0.0% | 756 | 0.0% | 0.3 | — | — | none | NOT: pending: 756 |
| Obadiah (Oba) | 456 | 64.0% | 3.1% | 4.4% | 0.0% | 130 | 0.0% | 0.0 | — | — | none | NOT: pending: 130 |
| Jonah (Jon) | 1,080 | 73.2% | 3.1% | 4.8% | 0.0% | 204 | 0.0% | 0.0 | — | — | none | NOT: pending: 204 |
| Micah (Mic) | 2,342 | 63.5% | 4.8% | 3.7% | 0.0% | 656 | 0.0% | 0.4 | — | — | none | NOT: pending: 656 |
| Nahum (Nah) | 931 | 60.6% | 7.7% | 4.2% | 0.0% | 256 | 0.0% | 1.1 | — | — | none | NOT: pending: 256 |
| Habakkuk (Hab) | 1,090 | 59.9% | 6.4% | 3.7% | 0.0% | 327 | 0.0% | 1.8 | — | — | none | NOT: pending: 327 |
| Zephaniah (Zep) | 1,223 | 66.6% | 4.7% | 5.5% | 0.0% | 284 | 0.0% | 0.0 | — | — | none | NOT: pending: 284 |
| Haggai (Hag) | 948 | 65.7% | 3.7% | 7.3% | 0.0% | 221 | 0.0% | 0.0 | — | — | none | NOT: pending: 221 |
| Zechariah (Zec) | 4,952 | 66.9% | 3.8% | 4.6% | 0.0% | 1,222 | 0.0% | 0.0 | — | — | none | NOT: pending: 1222 |
| Malachi (Mal) | 1,408 | 68.0% | 4.1% | 3.6% | 0.0% | 341 | 0.0% | 0.0 | — | — | none | NOT: pending: 341 |

476,129 words in 39 books; 0 SHIPPABLE, 0 with at least one chapter that ships. A book is SHIPPABLE when it fails none of the bar's lines, as a whole; `npm run lxx:release -- --book <code>` writes the rows of its shippable chapters.

<!-- lxx-report:end -->
