# The Septuagint derivation: where every book stands

Written by `npm run lxx:report` (scripts/lxx/report.ts) between the markers below; a second run on the same inputs changes nothing. Method, bar and files:
[lxx-derivation.md](lxx-derivation.md). A book falls short on one or more lines of the bar, and the last column names them. The other 21 books of Swete's file
(the Apocrypha, the Psalms of Solomon, the Odes, 1 Enoch) are not assessed.

<!-- lxx-report:start -->

Derived without a Morpheus cache: none.

Build 427. The bar (`scripts/lxx/bar.ts`): known-answer lemma at least 99% and full parsing at least 98% on each chapter below; no word pending; guesses at most 3% of the book's words; agreement breaks at most 5 per 1,000 words.

The chapter is what ships: a Greek chapter with no word pending and breaks at most 5 per 1,000 of its words, under the known-answer lines and the book's guess line, goes into the annotation file and the app (`npm run lxx:ship`). Shipped chapters shows which.

### The known-answer chapters of this build

second chapter Php.2: no choices file; Rom.8 used (the known-answer lines are held against the chapters that have a choices file in `data/lxx/known`).

| Chapter | Book hidden | Words | Lemma right | Full parsing right | Pending, no choice | Choices |
| --- | --- | --- | --- | --- | --- | --- |
| Jhn.1 | jhn | 829 | 99.8% | 99.3% | 0 | `lxx/known/jhn-1.tsv`: 155 |
| Rom.8 | rom | 652 | 99.7% | 98.9% | 0 | `lxx/known/rom-8.tsv`: 143 |

### The books

| Book | Words | Layer 1 | Layer 2 | Layer 2a | Layer 3 | Pending | Guesses | Breaks per 1,000 | Second pass differs | Morpheus agreed / differed / unknown | Shipped chapters | Bar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Genesis (Gen) | 32,635 | 66.3% | 3.1% | 5.1% | 25.5% | 0 | 1.4% | 0.5 | 3.8% of 417 | 91 / 90 / 276 | all | SHIPPABLE |
| Exodus (Exo) | 24,647 | 62.7% | 5.5% | 5.1% | 26.7% | 0 | 1.2% | 0.6 | 4.0% of 329 | 62 / 50 / 173 | all | SHIPPABLE |
| Leviticus (Lev) | 19,042 | 62.2% | 4.6% | 6.7% | 26.6% | 0 | 0.7% | 0.3 | 0.8% of 253 | 32 / 20 / 83 | all | SHIPPABLE |
| Numbers (Num) | 24,973 | 62.5% | 5.3% | 5.3% | 26.9% | 0 | 1.1% | 0.2 | 4.7% of 337 | 24 / 59 / 181 | all | SHIPPABLE |
| Deuteronomy (Deu) | 22,501 | 69.6% | 3.8% | 5.0% | 21.6% | 0 | 1.1% | 0.5 | 3.7% of 243 | 74 / 40 / 126 | all | SHIPPABLE |
| Joshua (Jos) | 14,815 | 64.8% | 4.2% | 5.8% | 25.2% | 0 | 2.8% | 0.3 | 9.1% of 186 | 107 / 86 / 218 | all | SHIPPABLE |
| Judges (Jdg) | 15,570 | 67.8% | 3.7% | 4.5% | 4.8% | 3,003 | 0.3% | 0.1 | — | 0 / 7 / 45 | 1-4 of 21 | NOT: pending: 3003 |
| Ruth (Rut) | 2,066 | 68.7% | 4.2% | 3.9% | 0.0% | 481 | 0.0% | 1.0 | — | 0 / 0 / 0 | none | NOT: pending: 481 |
| 1 Samuel (1Sa) | 20,044 | 66.6% | 3.5% | 4.5% | 0.0% | 5,084 | 0.0% | 0.4 | — | 0 / 0 / 0 | none | NOT: pending: 5084 |
| 2 Samuel (2Sa) | 17,906 | 66.9% | 3.4% | 5.1% | 0.0% | 4,404 | 0.0% | 0.2 | — | 0 / 0 / 0 | none | NOT: pending: 4404 |
| 1 Kings (1Ki) | 20,436 | 65.3% | 3.3% | 6.0% | 0.0% | 5,176 | 0.0% | 0.3 | — | 0 / 0 / 0 | none | NOT: pending: 5176 |
| 2 Kings (2Ki) | 18,618 | 65.7% | 3.6% | 5.9% | 0.0% | 4,620 | 0.0% | 0.1 | — | 0 / 0 / 0 | none | NOT: pending: 4620 |
| 1 Chronicles (1Ch) | 15,967 | 57.8% | 3.2% | 6.0% | 0.0% | 5,269 | 0.0% | 0.2 | — | 0 / 0 / 0 | none | NOT: pending: 5269 |
| 2 Chronicles (2Ch) | 21,059 | 65.3% | 3.8% | 6.6% | 0.0% | 5,102 | 0.0% | 0.5 | — | 0 / 0 / 0 | none | NOT: pending: 5102 |
| Ezra (Ezr) | 5,332 | 61.3% | 3.2% | 6.9% | 0.0% | 1,526 | 0.0% | 0.0 | — | 0 / 0 / 0 | none | NOT: pending: 1526 |
| Nehemiah (Neh) | 7,336 | 64.3% | 4.3% | 5.6% | 0.0% | 1,894 | 0.0% | 0.0 | — | 0 / 0 / 0 | none | NOT: pending: 1894 |
| Esther (Est) | 5,830 | 62.7% | 4.9% | 6.4% | 0.0% | 1,517 | 0.0% | 0.2 | — | 0 / 0 / 0 | none | NOT: pending: 1517 |
| Job (Job) | 13,509 | 63.7% | 5.5% | 2.2% | 0.0% | 3,866 | 0.0% | 0.4 | — | 0 / 0 / 0 | none | NOT: pending: 3866 |
| Psalms (Psa) | 34,615 | 65.2% | 4.8% | 5.4% | 24.6% | 0 | 1.1% | 0.4 | 4.0% of 427 | 96 / 80 / 204 | all | SHIPPABLE |
| Proverbs (Pro) | 11,091 | 61.1% | 6.9% | 2.5% | 0.0% | 3,269 | 0.0% | 0.3 | — | 0 / 0 / 0 | none | NOT: pending: 3269 |
| Ecclesiastes (Ecc) | 4,518 | 64.9% | 3.7% | 4.6% | 0.0% | 1,212 | 0.0% | 0.0 | — | 0 / 0 / 0 | none | NOT: pending: 1212 |
| Song of Solomon (Sol) | 1,994 | 60.5% | 8.9% | 4.0% | 0.0% | 531 | 0.0% | 1.0 | — | 0 / 0 / 0 | none | NOT: pending: 531 |
| Isaiah (Isa) | 26,953 | 66.8% | 4.4% | 4.1% | 24.7% | 0 | 1.0% | 0.6 | 7.5% of 333 | 71 / 65 / 127 | all | SHIPPABLE |
| Jeremiah (Jer) | 28,775 | 68.7% | 4.2% | 4.5% | 0.0% | 6,504 | 0.0% | 0.3 | — | 0 / 0 / 0 | none | NOT: pending: 6504 |
| Lamentations (Lam) | 2,463 | 62.7% | 6.6% | 2.4% | 0.0% | 696 | 0.0% | 0.0 | — | 0 / 0 / 0 | none | NOT: pending: 696 |
| Ezekiel (Eze) | 29,364 | 65.2% | 4.8% | 5.2% | 0.0% | 7,292 | 0.0% | 0.0 | — | 0 / 0 / 0 | none | NOT: pending: 7292 |
| Daniel (Dan) | 10,952 | 65.3% | 4.0% | 6.9% | 23.7% | 0 | 0.8% | 0.0 | 3.1% of 130 | 5 / 26 / 56 | all | SHIPPABLE |
| Hosea (Hos) | 3,915 | 64.3% | 5.3% | 3.9% | 17.7% | 343 | 0.4% | 0.0 | — | 1 / 3 / 10 | 1-9 of 14 | NOT: pending: 343 |
| Joel (Joe) | 1,573 | 64.4% | 4.8% | 5.7% | 25.1% | 0 | 1.9% | 0.0 | — | 21 / 5 / 4 | all | SHIPPABLE |
| Amos (Amo) | 3,200 | 66.6% | 5.7% | 4.5% | 20.5% | 89 | 2.3% | 0.3 | — | 47 / 15 / 11 | 1-8 of 9 | NOT: pending: 89 |
| Obadiah (Oba) | 456 | 64.0% | 3.1% | 4.6% | 28.3% | 0 | 2.4% | 0.0 | — | 6 / 1 / 4 | all | SHIPPABLE |
| Jonah (Jon) | 1,080 | 73.2% | 3.1% | 5.0% | 18.7% | 0 | 0.6% | 0.0 | — | 2 / 0 / 4 | all | SHIPPABLE |
| Micah (Mic) | 2,342 | 63.5% | 4.9% | 3.8% | 27.8% | 0 | 2.8% | 0.4 | — | 37 / 14 / 15 | all | SHIPPABLE |
| Nahum (Nah) | 931 | 60.6% | 7.8% | 4.6% | 0.0% | 251 | 0.0% | 1.1 | — | 0 / 0 / 0 | none | NOT: pending: 251 |
| Habakkuk (Hab) | 1,090 | 59.9% | 6.6% | 3.7% | 0.0% | 325 | 0.0% | 1.8 | — | 0 / 0 / 0 | none | NOT: pending: 325 |
| Zephaniah (Zep) | 1,223 | 66.6% | 5.0% | 5.6% | 0.0% | 279 | 0.0% | 0.0 | — | 0 / 0 / 0 | none | NOT: pending: 279 |
| Haggai (Hag) | 948 | 65.7% | 3.7% | 7.5% | 0.0% | 219 | 0.0% | 0.0 | — | 0 / 0 / 0 | none | NOT: pending: 219 |
| Zechariah (Zec) | 4,952 | 67.0% | 3.9% | 4.9% | 0.0% | 1,203 | 0.0% | 0.0 | — | 0 / 0 / 0 | none | NOT: pending: 1203 |
| Malachi (Mal) | 1,408 | 68.0% | 4.1% | 3.7% | 0.0% | 340 | 0.0% | 0.0 | — | 0 / 0 / 0 | none | NOT: pending: 340 |

476,129 words in 39 books; 13 SHIPPABLE, 16 with at least one chapter that ships. A book is SHIPPABLE when it fails none of the bar's lines, as a whole; `npm run lxx:release -- --book <code>` writes the rows of its shippable chapters.

<!-- lxx-report:end -->
