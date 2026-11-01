# The Septuagint derivation: where every book stands

Written by `npm run lxx:report` (scripts/lxx/report.ts) between the markers below; a second run on the same inputs changes nothing. Method, bar and files:
[lxx-derivation.md](lxx-derivation.md). A book falls short on one or more lines of the bar, and the last column names them. The other 21 books of Swete's file
(the Apocrypha, the Psalms of Solomon, the Odes, 1 Enoch) are not assessed.

<!-- lxx-report:start -->

Build 55. The bar (`scripts/lxx/bar.ts`): known-answer lemma at least 99% and full parsing at least 98% on each chapter below; no word pending; guesses at most 3% of the book's words; agreement breaks at most 5 per 1,000 words.

### The known-answer chapters of this build

| Chapter | Book hidden | Words | Lemma right | Full parsing right | Pending, no choice | Choices |
| --- | --- | --- | --- | --- | --- | --- |
| Jhn.1 | jhn | 829 | 81.9% | 81.8% | 149 | none |
| Php.2 | php | 426 | 77.5% | 77.2% | 96 | none |

### The books

| Book | Words | Layer 1 | Layer 2 | Layer 2a | Layer 3 | Pending | Guesses | Breaks per 1,000 | Second pass differs | Bar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Genesis (Gen) | 32,635 | 66.9% | 4.6% | 4.5% | 0.0% | 7,857 | 0.0% | 1.2 | — | NOT: known answer; pending: 7857 |
| Exodus (Exo) | 24,647 | 62.8% | 7.5% | 4.9% | 0.0% | 6,110 | 0.0% | 0.8 | — | NOT: known answer; pending: 6110 |
| Leviticus (Lev) | 19,042 | 62.2% | 7.1% | 6.5% | 0.0% | 4,615 | 0.0% | 0.4 | — | NOT: known answer; pending: 4615 |
| Numbers (Num) | 24,973 | 63.3% | 7.2% | 4.8% | 0.0% | 6,148 | 0.0% | 0.5 | — | NOT: known answer; pending: 6148 |
| Deuteronomy (Deu) | 22,501 | 69.7% | 6.0% | 4.6% | 0.0% | 4,428 | 0.0% | 0.7 | — | NOT: known answer; pending: 4428 |
| Joshua (Jos) | 14,825 | 65.5% | 6.2% | 4.9% | 0.0% | 3,476 | 0.0% | 0.5 | — | NOT: known answer; pending: 3476 |
| Judges (Jdg) | 15,570 | 69.2% | 5.7% | 3.7% | 0.0% | 3,337 | 0.0% | 0.3 | — | NOT: known answer; pending: 3337 |
| Ruth (Rut) | 2,066 | 69.8% | 6.1% | 3.8% | 0.0% | 420 | 0.0% | 1.0 | — | NOT: known answer; pending: 420 |
| 1 Samuel (1Sa) | 20,046 | 67.4% | 5.3% | 4.1% | 0.0% | 4,673 | 0.0% | 1.3 | — | NOT: known answer; pending: 4673 |
| 2 Samuel (2Sa) | 17,907 | 67.0% | 5.2% | 4.5% | 0.0% | 4,158 | 0.0% | 1.3 | — | NOT: known answer; pending: 4158 |
| 1 Kings (1Ki) | 20,493 | 65.4% | 5.8% | 5.3% | 0.0% | 4,824 | 0.0% | 0.6 | — | NOT: known answer; pending: 4824 |
| 2 Kings (2Ki) | 18,622 | 65.9% | 5.5% | 5.4% | 0.0% | 4,329 | 0.0% | 0.8 | — | NOT: known answer; pending: 4329 |
| 1 Chronicles (1Ch) | 15,967 | 58.8% | 4.9% | 4.8% | 0.0% | 5,031 | 0.0% | 0.3 | — | NOT: known answer; pending: 5031 |
| 2 Chronicles (2Ch) | 21,071 | 65.5% | 5.9% | 6.0% | 0.0% | 4,761 | 0.0% | 1.2 | — | NOT: known answer; pending: 4761 |
| Ezra (Ezr) | 5,332 | 61.6% | 4.6% | 6.7% | 0.0% | 1,445 | 0.0% | 0.0 | — | NOT: known answer; pending: 1445 |
| Nehemiah (Neh) | 7,336 | 64.6% | 6.3% | 5.3% | 0.0% | 1,741 | 0.0% | 0.1 | — | NOT: known answer; pending: 1741 |
| Esther (Est) | 5,936 | 61.6% | 7.3% | 5.1% | 0.0% | 1,546 | 0.0% | 1.9 | — | NOT: known answer; pending: 1546 |
| Job (Job) | 13,522 | 63.7% | 8.7% | 1.9% | 0.0% | 3,485 | 0.0% | 0.4 | — | NOT: known answer; pending: 3485 |
| Psalms (Psa) | 34,615 | 65.7% | 7.5% | 4.8% | 0.0% | 7,638 | 0.0% | 0.5 | — | NOT: known answer; pending: 7638 |
| Proverbs (Pro) | 11,129 | 60.9% | 9.6% | 2.1% | 0.0% | 3,059 | 0.0% | 0.4 | — | NOT: known answer; pending: 3059 |
| Ecclesiastes (Ecc) | 4,518 | 65.0% | 5.7% | 4.6% | 0.0% | 1,116 | 0.0% | 0.0 | — | NOT: known answer; pending: 1116 |
| Song of Solomon (Sol) | 1,994 | 60.7% | 12.7% | 3.7% | 0.0% | 457 | 0.0% | 1.0 | — | NOT: known answer; pending: 457 |
| Isaiah (Isa) | 26,953 | 67.0% | 7.4% | 3.5% | 0.0% | 5,949 | 0.0% | 0.7 | — | NOT: known answer; pending: 5949 |
| Jeremiah (Jer) | 28,775 | 68.9% | 6.5% | 4.0% | 0.0% | 5,910 | 0.0% | 0.6 | — | NOT: known answer; pending: 5910 |
| Lamentations (Lam) | 2,463 | 62.9% | 11.0% | 2.0% | 0.0% | 594 | 0.0% | 0.0 | — | NOT: known answer; pending: 594 |
| Ezekiel (Eze) | 29,364 | 65.3% | 6.7% | 4.8% | 0.0% | 6,809 | 0.0% | 0.1 | — | NOT: known answer; pending: 6809 |
| Daniel (Dan) | 10,960 | 66.3% | 6.2% | 6.1% | 0.0% | 2,357 | 0.0% | 0.3 | — | NOT: known answer; pending: 2357 |
| Hosea (Hos) | 3,915 | 64.5% | 8.2% | 3.5% | 0.0% | 930 | 0.0% | 0.0 | — | NOT: known answer; pending: 930 |
| Joel (Joe) | 1,573 | 65.0% | 8.5% | 5.0% | 0.0% | 339 | 0.0% | 0.0 | — | NOT: known answer; pending: 339 |
| Amos (Amo) | 3,200 | 66.7% | 7.9% | 4.3% | 0.0% | 676 | 0.0% | 0.3 | — | NOT: known answer; pending: 676 |
| Obadiah (Oba) | 456 | 64.3% | 6.8% | 3.9% | 0.0% | 114 | 0.0% | 0.0 | — | NOT: known answer; pending: 114 |
| Jonah (Jon) | 1,080 | 73.5% | 5.6% | 4.4% | 0.0% | 177 | 0.0% | 0.0 | — | NOT: known answer; pending: 177 |
| Micah (Mic) | 2,342 | 63.8% | 8.0% | 3.2% | 0.0% | 583 | 0.0% | 0.9 | — | NOT: known answer; pending: 583 |
| Nahum (Nah) | 931 | 60.7% | 11.0% | 4.0% | 0.0% | 227 | 0.0% | 1.1 | — | NOT: known answer; pending: 227 |
| Habakkuk (Hab) | 1,090 | 60.2% | 9.6% | 3.4% | 0.0% | 292 | 0.0% | 2.8 | — | NOT: known answer; pending: 292 |
| Zephaniah (Zep) | 1,223 | 66.6% | 7.4% | 5.0% | 0.0% | 257 | 0.0% | 0.8 | — | NOT: known answer; pending: 257 |
| Haggai (Hag) | 948 | 65.7% | 6.8% | 7.1% | 0.0% | 194 | 0.0% | 0.0 | — | NOT: known answer; pending: 194 |
| Zechariah (Zec) | 4,952 | 67.0% | 6.2% | 4.3% | 0.0% | 1,114 | 0.0% | 0.6 | — | NOT: known answer; pending: 1114 |
| Malachi (Mal) | 1,408 | 68.0% | 6.5% | 3.6% | 0.0% | 307 | 0.0% | 0.0 | — | NOT: known answer; pending: 307 |

476,380 words in 39 books; 0 SHIPPABLE. A book is SHIPPABLE when it fails none of the bar's lines, and then `npm run lxx:release -- --book <code>` writes its annotation file.

<!-- lxx-report:end -->
