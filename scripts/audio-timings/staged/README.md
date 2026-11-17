# staged/: books timed and judged, not yet played

`scripts/audio-timings/run-book.sh <book>` writes here (its default `--out`), in the same layout as the repo, so promoting a book is a copy:

| here | promoted to |
| --- | --- |
| `audio/msb-david/<book>.json` (the timings) | `public/data/audio/msb-david/<book>.json` (the index lists the book from this file: it is made by `scripts/audio-index.mjs`, never edited) |
| `quiet/msb-david-<book>.json` (what the maker measured) | `scripts/audio-timings/quiet/` |
| `listen/msb-david-<book>.json` (the edges for the Governor's ear) | `scripts/audio-timings/listen/` |
| `judged/msb-david-<book>.json` (the judge's report, with the timings' sha256) | `scripts/audio-timings/judged/` |
| `summary/<book>.txt` (the one summary line) | stays here |

**A book here is not played by the app**: there is no `<book>.json` for it under `public/data/audio/msb-david/`, and `index.json` (the only list the app reads, made from the files there) does not list it. `tests/unit/audio-run.test.ts` holds both. Promotion (the copy above, then the lock `tests/unit/audio-judged.test.ts` and the rule `tests/unit/audio-timings-data.test.ts`) is a later story's, one book at a time, after the Governor has heard the listen list.

`.work/` (git-ignored) is the run's own scratch tree; it is what lets a stopped run be taken up where it stopped. Delete it to start a book from nothing.

What is here now (mw-ar5k42b.4, the proof on what John did not teach): **Psalm 3** (a title read into verse 1, and three 'Selah') and **Psalm 117** in `psa`, and **Jude**, a one-chapter book. docs/audio-run.md says what their flags are.
