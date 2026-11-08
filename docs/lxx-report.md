# The Septuagint derivation: where every book stands

Written by `npm run lxx:report` (scripts/lxx/report.ts) between the markers below; a second run on the same inputs changes nothing. Method, bar and files:
[lxx-derivation.md](lxx-derivation.md). A book falls short on one or more lines of the bar, and the last column names them. The other 21 books of Swete's file
(the Apocrypha, the Psalms of Solomon, the Odes, 1 Enoch) are not assessed.

<!-- lxx-report:start -->

Build 167. The bar (`scripts/lxx/bar.ts`): known-answer lemma at least 99% and full parsing at least 98% on each chapter below; no word pending; guesses at most 3% of the book's words; agreement breaks at most 5 per 1,000 words.

The chapter is what ships: a Greek chapter with no word pending and breaks at most 5 per 1,000 of its words, under the known-answer lines and the book's guess line, goes into the annotation file and the app (`npm run lxx:ship`). Shipped chapters shows which.

### The known-answer chapters of this build

second chapter Rev.21: no choices file; Rom.8 used (the known-answer lines are held against the chapters that have a choices file in `data/lxx/known`).

| Chapter | Book hidden | Words | Lemma right | Full parsing right | Pending, no choice | Choices |
| --- | --- | --- | --- | --- | --- | --- |
| Jhn.1 | jhn | 829 | 99.8% | 99.3% | 0 | `lxx/known/jhn-1.tsv`: 155 |
| Rom.8 | rom | 652 | 99.7% | 98.9% | 0 | `lxx/known/rom-8.tsv`: 143 |

### The books

| Book | Words | Layer 1 | Layer 2 | Layer 2a | Layer 3 | Pending | Guesses | Breaks per 1,000 | Second pass differs | Morpheus agreed / differed / unknown | Shipped chapters | Bar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Genesis (Gen) | 32,635 | 66.3% | 3.1% | 5.1% | 25.5% | 0 | 1.4% | 0.5 | 3.8% of 417 | 80 / 92 / 283 | all | SHIPPABLE |
| Exodus (Exo) | 24,647 | 62.7% | 5.5% | 5.0% | 26.6% | 52 | 2.6% | 0.6 | 4.0% of 329 | — | 1, 6, 8, 11, 14-15, 17-20, 22, 24-25, 27, 35, 37, 39-40 of 40 | NOT: pending: 52 |
| Leviticus (Lev) | 19,042 | 62.2% | 4.6% | 6.7% | 26.4% | 51 | 2.2% | 0.3 | — | — | 1, 12, 18, 20, 24-27 of 27 | NOT: pending: 51 |
| Numbers (Num) | 24,973 | 62.5% | 5.3% | 5.2% | 0.0% | 6,763 | 0.0% | 0.2 | — | — | none | NOT: pending: 6763 |
| Deuteronomy (Deu) | 22,501 | 69.6% | 3.8% | 4.9% | 0.0% | 4,887 | 0.0% | 0.5 | — | — | none | NOT: pending: 4887 |
| Joshua (Jos) | 14,815 | 64.8% | 4.2% | 5.6% | 0.0% | 3,769 | 0.0% | 0.3 | — | — | none | NOT: pending: 3769 |
| Judges (Jdg) | 15,570 | 67.8% | 3.7% | 4.4% | 0.0% | 3,760 | 0.0% | 0.2 | — | — | none | NOT: pending: 3760 |
| Ruth (Rut) | 2,066 | 68.7% | 4.1% | 3.9% | 0.0% | 481 | 0.0% | 1.0 | — | — | none | NOT: pending: 481 |
| 1 Samuel (1Sa) | 20,044 | 66.6% | 3.5% | 4.5% | 0.0% | 5,110 | 0.0% | 0.5 | — | — | none | NOT: pending: 5110 |
| 2 Samuel (2Sa) | 17,906 | 66.9% | 3.4% | 5.0% | 0.0% | 4,429 | 0.0% | 0.2 | — | — | none | NOT: pending: 4429 |
| 1 Kings (1Ki) | 20,436 | 65.3% | 3.3% | 5.9% | 0.0% | 5,195 | 0.0% | 0.3 | — | — | none | NOT: pending: 5195 |
| 2 Kings (2Ki) | 18,618 | 65.7% | 3.6% | 5.8% | 0.0% | 4,645 | 0.0% | 0.1 | — | — | none | NOT: pending: 4645 |
| 1 Chronicles (1Ch) | 15,967 | 57.8% | 3.2% | 6.0% | 0.0% | 5,273 | 0.0% | 0.2 | — | — | none | NOT: pending: 5273 |
| 2 Chronicles (2Ch) | 21,059 | 65.3% | 3.8% | 6.5% | 0.0% | 5,123 | 0.0% | 0.6 | — | — | none | NOT: pending: 5123 |
| Ezra (Ezr) | 5,332 | 61.3% | 3.2% | 6.9% | 0.0% | 1,527 | 0.0% | 0.0 | — | — | none | NOT: pending: 1527 |
| Nehemiah (Neh) | 7,336 | 64.3% | 4.3% | 5.6% | 0.0% | 1,898 | 0.0% | 0.0 | — | — | none | NOT: pending: 1898 |
| Esther (Est) | 5,830 | 62.7% | 4.9% | 6.0% | 0.0% | 1,546 | 0.0% | 0.3 | — | — | none | NOT: pending: 1546 |
| Job (Job) | 13,509 | 63.7% | 5.4% | 2.1% | 0.0% | 3,878 | 0.0% | 0.4 | — | — | none | NOT: pending: 3878 |
| Psalms (Psa) | 34,615 | 65.2% | 4.7% | 5.4% | 24.6% | 44 | 2.2% | 0.4 | 4.0% of 427 | — | 2-8, 11-13, 15-16, 18-19, 22-23, 25-26, 28-29, 31-34, 37-40, 42-43, 45-48, 50-71, 73, 75-83, 85-87, 90-95, 97-100, 104-105, 107, 109-112, 114-116, 119-120, 122-135, 137-139, 141, 143-151 of 151 | NOT: pending: 44 |
| Proverbs (Pro) | 11,091 | 61.1% | 6.9% | 2.5% | 0.0% | 3,276 | 0.0% | 0.3 | — | — | none | NOT: pending: 3276 |
| Ecclesiastes (Ecc) | 4,518 | 64.9% | 3.6% | 4.6% | 0.0% | 1,218 | 0.0% | 0.0 | — | — | none | NOT: pending: 1218 |
| Song of Solomon (Sol) | 1,994 | 60.5% | 8.9% | 4.0% | 0.0% | 531 | 0.0% | 1.0 | — | — | none | NOT: pending: 531 |
| Isaiah (Isa) | 26,953 | 66.8% | 4.4% | 4.0% | 24.5% | 61 | 2.4% | 0.6 | 7.5% of 333 | — | 2-8, 12, 15, 18, 20, 23-26, 28-29, 31, 37-38, 40-41, 46, 52, 55-56, 63-64 of 66 | NOT: pending: 61 |
| Jeremiah (Jer) | 28,775 | 68.8% | 4.2% | 4.4% | 0.0% | 6,528 | 0.0% | 0.3 | — | — | none | NOT: pending: 6528 |
| Lamentations (Lam) | 2,463 | 62.7% | 6.5% | 2.4% | 0.0% | 699 | 0.0% | 0.0 | — | — | none | NOT: pending: 699 |
| Ezekiel (Eze) | 29,364 | 65.2% | 4.8% | 5.1% | 0.0% | 7,326 | 0.0% | 0.0 | — | — | none | NOT: pending: 7326 |
| Daniel (Dan) | 10,952 | 65.3% | 4.0% | 6.7% | 0.0% | 2,624 | 0.0% | 0.0 | — | — | none | NOT: pending: 2624 |
| Hosea (Hos) | 3,915 | 64.4% | 5.2% | 3.9% | 0.0% | 1,040 | 0.0% | 0.0 | — | — | none | NOT: pending: 1040 |
| Joel (Joe) | 1,573 | 64.4% | 4.8% | 5.7% | 0.0% | 395 | 0.0% | 0.0 | — | — | none | NOT: pending: 395 |
| Amos (Amo) | 3,200 | 66.6% | 5.7% | 4.4% | 0.0% | 747 | 0.0% | 0.3 | — | — | none | NOT: pending: 747 |
| Obadiah (Oba) | 456 | 64.0% | 3.1% | 4.6% | 0.0% | 129 | 0.0% | 0.0 | — | — | none | NOT: pending: 129 |
| Jonah (Jon) | 1,080 | 73.2% | 3.1% | 5.0% | 0.0% | 202 | 0.0% | 0.0 | — | — | none | NOT: pending: 202 |
| Micah (Mic) | 2,342 | 63.5% | 4.8% | 3.8% | 0.0% | 652 | 0.0% | 0.4 | — | — | none | NOT: pending: 652 |
| Nahum (Nah) | 931 | 60.6% | 7.7% | 4.3% | 0.0% | 255 | 0.0% | 1.1 | — | — | none | NOT: pending: 255 |
| Habakkuk (Hab) | 1,090 | 59.9% | 6.5% | 3.7% | 0.0% | 326 | 0.0% | 1.8 | — | — | none | NOT: pending: 326 |
| Zephaniah (Zep) | 1,223 | 66.6% | 4.9% | 5.5% | 0.0% | 281 | 0.0% | 0.0 | — | — | none | NOT: pending: 281 |
| Haggai (Hag) | 948 | 65.7% | 3.7% | 7.5% | 0.0% | 219 | 0.0% | 0.0 | — | — | none | NOT: pending: 219 |
| Zechariah (Zec) | 4,952 | 67.0% | 3.8% | 4.8% | 0.0% | 1,207 | 0.0% | 0.0 | — | — | none | NOT: pending: 1207 |
| Malachi (Mal) | 1,408 | 68.0% | 4.1% | 3.7% | 0.0% | 340 | 0.0% | 0.0 | — | — | none | NOT: pending: 340 |

476,129 words in 39 books; 1 SHIPPABLE, 5 with at least one chapter that ships. A book is SHIPPABLE when it fails none of the bar's lines, as a whole; `npm run lxx:release -- --book <code>` writes the rows of its shippable chapters.

<!-- lxx-report:end -->
