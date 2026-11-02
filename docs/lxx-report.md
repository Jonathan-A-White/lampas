# The Septuagint derivation: where every book stands

Written by `npm run lxx:report` (scripts/lxx/report.ts) between the markers below; a second run on the same inputs changes nothing. Method, bar and files:
[lxx-derivation.md](lxx-derivation.md). A book falls short on one or more lines of the bar, and the last column names them. The other 21 books of Swete's file
(the Apocrypha, the Psalms of Solomon, the Odes, 1 Enoch) are not assessed.

<!-- lxx-report:start -->

Build 75. The bar (`scripts/lxx/bar.ts`): known-answer lemma at least 99% and full parsing at least 98% on each chapter below; no word pending; guesses at most 3% of the book's words; agreement breaks at most 5 per 1,000 words.

### The known-answer chapters of this build

| Chapter | Book hidden | Words | Lemma right | Full parsing right | Pending, no choice | Choices |
| --- | --- | --- | --- | --- | --- | --- |
| Jhn.1 | jhn | 829 | 99.8% | 99.3% | 0 | `lxx/known/jhn-1.tsv`: 149 |
| Luk.15 | luk | 561 | 80.6% | 78.8% | 109 | none |

### The books

| Book | Words | Layer 1 | Layer 2 | Layer 2a | Layer 3 | Pending | Guesses | Breaks per 1,000 | Second pass differs | Morpheus agreed / differed / unknown | Bar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Genesis (Gen) | 32,635 | 66.3% | 4.5% | 4.8% | 2.1% | 7,299 | 0.2% | 0.9 | — | 17 / 7 / 31 | NOT: known answer; pending: 7299 |
| Exodus (Exo) | 24,647 | 62.7% | 7.5% | 5.0% | 0.0% | 6,119 | 0.0% | 0.7 | — | 0 / 0 / 0 | NOT: known answer; pending: 6119 |
| Leviticus (Lev) | 19,042 | 62.2% | 7.1% | 6.5% | 0.0% | 4,609 | 0.0% | 0.4 | — | 0 / 0 / 0 | NOT: known answer; pending: 4609 |
| Numbers (Num) | 24,973 | 62.4% | 7.2% | 4.9% | 0.0% | 6,349 | 0.0% | 0.4 | — | 0 / 0 / 0 | NOT: known answer; pending: 6349 |
| Deuteronomy (Deu) | 22,501 | 69.6% | 6.0% | 4.7% | 0.0% | 4,436 | 0.0% | 0.7 | — | 0 / 0 / 0 | NOT: known answer; pending: 4436 |
| Joshua (Jos) | 14,825 | 64.8% | 6.2% | 5.2% | 0.0% | 3,532 | 0.0% | 0.5 | — | 0 / 0 / 0 | NOT: known answer; pending: 3532 |
| Judges (Jdg) | 15,570 | 67.8% | 5.7% | 3.9% | 0.0% | 3,525 | 0.0% | 0.3 | — | 0 / 0 / 0 | NOT: known answer; pending: 3525 |
| Ruth (Rut) | 2,066 | 68.9% | 6.1% | 3.8% | 0.0% | 440 | 0.0% | 1.0 | — | 0 / 0 / 0 | NOT: known answer; pending: 440 |
| 1 Samuel (1Sa) | 20,046 | 66.5% | 5.3% | 4.0% | 0.0% | 4,855 | 0.0% | 1.3 | — | 0 / 0 / 0 | NOT: known answer; pending: 4855 |
| 2 Samuel (2Sa) | 17,907 | 66.9% | 5.2% | 4.6% | 0.0% | 4,186 | 0.0% | 1.3 | — | 0 / 0 / 0 | NOT: known answer; pending: 4186 |
| 1 Kings (1Ki) | 20,493 | 65.2% | 4.9% | 5.4% | 0.0% | 5,015 | 0.0% | 0.5 | — | 0 / 0 / 0 | NOT: known answer; pending: 5015 |
| 2 Kings (2Ki) | 18,622 | 65.7% | 5.4% | 5.4% | 0.0% | 4,379 | 0.0% | 0.7 | — | 0 / 0 / 0 | NOT: known answer; pending: 4379 |
| 1 Chronicles (1Ch) | 15,967 | 57.9% | 4.6% | 4.7% | 0.0% | 5,249 | 0.0% | 0.3 | — | 0 / 0 / 0 | NOT: known answer; pending: 5249 |
| 2 Chronicles (2Ch) | 21,071 | 65.4% | 5.4% | 6.0% | 0.0% | 4,898 | 0.0% | 1.0 | — | 0 / 0 / 0 | NOT: known answer; pending: 4898 |
| Ezra (Ezr) | 5,332 | 61.3% | 4.5% | 6.6% | 0.0% | 1,470 | 0.0% | 0.0 | — | 0 / 0 / 0 | NOT: known answer; pending: 1470 |
| Nehemiah (Neh) | 7,336 | 64.4% | 6.1% | 5.3% | 0.0% | 1,780 | 0.0% | 0.1 | — | 0 / 0 / 0 | NOT: known answer; pending: 1780 |
| Esther (Est) | 5,936 | 61.6% | 7.3% | 5.5% | 0.0% | 1,521 | 0.0% | 1.9 | — | 0 / 0 / 0 | NOT: known answer; pending: 1521 |
| Job (Job) | 13,522 | 63.7% | 8.7% | 2.0% | 0.0% | 3,479 | 0.0% | 0.4 | — | 0 / 0 / 0 | NOT: known answer; pending: 3479 |
| Psalms (Psa) | 34,615 | 65.6% | 7.5% | 4.8% | 0.0% | 7,639 | 0.0% | 0.5 | — | 0 / 0 / 0 | NOT: known answer; pending: 7639 |
| Proverbs (Pro) | 11,129 | 60.9% | 9.6% | 2.1% | 0.0% | 3,055 | 0.0% | 0.4 | — | 0 / 0 / 0 | NOT: known answer; pending: 3055 |
| Ecclesiastes (Ecc) | 4,518 | 65.0% | 5.7% | 4.7% | 0.0% | 1,113 | 0.0% | 0.0 | — | 0 / 0 / 0 | NOT: known answer; pending: 1113 |
| Song of Solomon (Sol) | 1,994 | 60.7% | 12.3% | 3.7% | 0.0% | 464 | 0.0% | 1.0 | — | 0 / 0 / 0 | NOT: known answer; pending: 464 |
| Isaiah (Isa) | 26,953 | 67.0% | 7.4% | 3.6% | 0.0% | 5,945 | 0.0% | 0.7 | — | 0 / 0 / 0 | NOT: known answer; pending: 5945 |
| Jeremiah (Jer) | 28,775 | 68.8% | 6.5% | 4.1% | 0.0% | 5,915 | 0.0% | 0.6 | — | 0 / 0 / 0 | NOT: known answer; pending: 5915 |
| Lamentations (Lam) | 2,463 | 62.9% | 11.0% | 2.1% | 0.0% | 593 | 0.0% | 0.0 | — | 0 / 0 / 0 | NOT: known answer; pending: 593 |
| Ezekiel (Eze) | 29,364 | 65.2% | 6.7% | 4.8% | 0.0% | 6,832 | 0.0% | 0.1 | — | 0 / 0 / 0 | NOT: known answer; pending: 6832 |
| Daniel (Dan) | 10,960 | 65.5% | 6.2% | 6.4% | 0.0% | 2,408 | 0.0% | 0.3 | — | 0 / 0 / 0 | NOT: known answer; pending: 2408 |
| Hosea (Hos) | 3,915 | 64.4% | 8.2% | 3.6% | 0.0% | 931 | 0.0% | 0.0 | — | 0 / 0 / 0 | NOT: known answer; pending: 931 |
| Joel (Joe) | 1,573 | 65.0% | 8.5% | 5.0% | 0.0% | 340 | 0.0% | 0.0 | — | 0 / 0 / 0 | NOT: known answer; pending: 340 |
| Amos (Amo) | 3,200 | 66.6% | 7.9% | 4.3% | 0.0% | 678 | 0.0% | 0.3 | — | 0 / 0 / 0 | NOT: known answer; pending: 678 |
| Obadiah (Oba) | 456 | 64.0% | 6.8% | 3.9% | 0.0% | 115 | 0.0% | 0.0 | — | 0 / 0 / 0 | NOT: known answer; pending: 115 |
| Jonah (Jon) | 1,080 | 73.5% | 5.6% | 4.4% | 0.0% | 177 | 0.0% | 0.0 | — | 0 / 0 / 0 | NOT: known answer; pending: 177 |
| Micah (Mic) | 2,342 | 63.8% | 8.0% | 3.2% | 0.0% | 584 | 0.0% | 0.9 | — | 0 / 0 / 0 | NOT: known answer; pending: 584 |
| Nahum (Nah) | 931 | 60.6% | 11.0% | 4.3% | 0.0% | 225 | 0.0% | 1.1 | — | 0 / 0 / 0 | NOT: known answer; pending: 225 |
| Habakkuk (Hab) | 1,090 | 60.1% | 9.6% | 3.4% | 0.0% | 293 | 0.0% | 2.8 | — | 0 / 0 / 0 | NOT: known answer; pending: 293 |
| Zephaniah (Zep) | 1,223 | 66.7% | 7.4% | 5.2% | 0.0% | 254 | 0.0% | 0.0 | — | 0 / 0 / 0 | NOT: known answer; pending: 254 |
| Haggai (Hag) | 948 | 65.7% | 6.8% | 7.1% | 0.0% | 194 | 0.0% | 0.0 | — | 0 / 0 / 0 | NOT: known answer; pending: 194 |
| Zechariah (Zec) | 4,952 | 66.9% | 6.2% | 4.4% | 0.0% | 1,113 | 0.0% | 0.6 | — | 0 / 0 / 0 | NOT: known answer; pending: 1113 |
| Malachi (Mal) | 1,408 | 68.0% | 6.5% | 3.6% | 0.0% | 307 | 0.0% | 0.0 | — | 0 / 0 / 0 | NOT: known answer; pending: 307 |

476,380 words in 39 books; 0 SHIPPABLE. A book is SHIPPABLE when it fails none of the bar's lines, and then `npm run lxx:release -- --book <code>` writes its annotation file.

<!-- lxx-report:end -->
