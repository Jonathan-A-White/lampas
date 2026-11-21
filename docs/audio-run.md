# Timing and judging a whole book, and the Bible's cost

mw-ar5k42b.4. One command times, cuts and judges a book of David's recording; one script readies a fresh box; the whole Bible's cost on 5 boxes is **measured**, not guessed. This is the runner of the epic mw-ar5k42b ([docs/audio-judge.md](audio-judge.md) is the judge, [docs/data.md](data.md) 'The timing maker' is the maker and the cut rule). Nothing here ships in the app and **Python is not in the gate**; what the gate holds is `tests/unit/audio-run.test.ts` (the shares, the staged books, the command's refusals).

<!-- toc -->

- [The commands](#the-commands)
- [The summary line](#the-summary-line)
- [A book story](#a-book-story)
- [A fresh box](#a-fresh-box)
- [The shares](#the-shares)
- [The estimate](#the-estimate)
- [What a share's story must do on its box](#what-a-shares-story-must-do-on-its-box)
- [Promoting a book](#promoting-a-book)
- [What the proof found: Psalm 3, Psalm 117 and Jude](#what-the-proof-found-psalm-3-psalm-117-and-jude)

<!-- /toc -->

## The commands

```bash
scripts/audio-timings/box-setup.sh                       # once on a box: the venv, the models, John 2 as proof (about 4 minutes)
scripts/audio-timings/run-book.sh jhn                    # a book, into <cache>/staged/ (outside the worktree)
scripts/audio-timings/run-book.sh jhn --out /tmp/jhn     # ... or into another folder
scripts/audio-timings/run-book.sh jhn --summary-only     # runs nothing: prints the summary line again from the files already staged
scripts/audio-timings/run-book.sh psa --chapters 3,117   # only these chapters (the judge hears what was timed)
scripts/audio-timings/run-book.sh jhn --fresh            # the judge hears everything again (for timing it); --no-nice for a box that does nothing else
```

`run-book.sh <book>` does the three steps of docs/data.md 'The cut rule' in order and prints ONE summary line ([The summary line](#the-summary-line)):

1. the maker fetches the chapters' MP3s (its own rule: one request a file, 2 s between files, the User-Agent `lampas-audio-timings/1`, a file already kept never again, a 4xx or 5xx stops it) and times and cuts them (`align.py`);
2. the judge hears every verse (`judge.py`);
3. the maker's listen pass writes what the judge heard at each listed edge (`align.py --listen`).

```
SUMMARY book=jhn chapters=21/21 left_out=none not_judged=none verses=879 flags=8 flags_outside_list=0 every_flag_on_list=yes listen_edges=8 minutes=72.4
  (maker 3117 s, judge 1224 s, listen 1 s; cores used 3.2; outside the list: none)
```

**It writes only into `--out`** (default `<cache>/staged/`, that is `~/.cache/lampas-audio-timings/staged/`: OUTSIDE the worktree since mw-zbgo4ep.61, so a run leaves the tree clean and `mw check` does not call it dirty; before that the default was `scripts/audio-timings/staged/` and its untracked files made 8 of 8 book stories re-run the gate at the close-out), in the repo's own layout so promotion is a copy: `audio/msb-david/<book>.json`, `quiet/`, `listen/`, `judged/` and `summary/<book>.txt` ([staged/README.md](../scripts/audio-timings/staged/README.md)). **It never writes under `public/`** (it refuses an `--out` there, and `tests/unit/audio-run.test.ts` holds it): a book in `staged/` is not played by the app, because there is no `public/data/audio/msb-david/<book>.json` for it, and so `index.json` does not list it. Promoting a book is copying its files ([Promoting a book](#promoting-a-book)).

How, with the maker and the judge unchanged: both find their repo from their own place (`Path(__file__).parents[2]`) and write where their own path says (`public/data/audio/msb-david/` for the timings), so `run-book.sh` runs them from a **work copy** of themselves in `<out>/.work/<book>/` (a tree of the same shape, git-ignored: the scripts copied, the book texts linked to the repo's, an empty `public/data/audio/msb-david/`). The reports then say `"file":"public/data/audio/msb-david/jhn.json"` as the shipped ones do. The recordings and the models stay in the cache, shared by every run on the box.

**Run again after a stop.** The same command with the same `--out` takes up where it stopped: the maker skips a chapter already timed (nothing fetched, no model loaded when none is left), the judge keeps each finished chapter (docs/audio-judge.md 'The report').

**Exit codes.** 0 only when the judge ran over every chapter asked for (every chapter of the book, or `--chapters`). 2: a stop (a bad argument, no set-up, a fetch refused, a model failed): run it again. 3: a chapter was left out by the maker's own checks (a verse count that differs, seconds a word outside 0.12 to 1.5) or was not judged; the summary line's `left_out` and `not_judged` say which. **Flags outside the listen list are findings, not failures**: they are counted in the line (and named under it) and the exit stays 0; a book that ships needs none (the lock).

## The summary line

The run prints ONE line of a fixed form, `key=value` after the word `SUMMARY`, and writes it with one indented detail line to `<out>/summary/<book>.txt`. `tests/unit/audio-run.test.ts` parses it (a run with a chapter left out and a run with none, through `--summary-only`, which reads the files already in the folder and runs no model):

```
SUMMARY book=rut chapters=4/4 left_out=none not_judged=none verses=85 flags=4 flags_outside_list=0 every_flag_on_list=yes listen_edges=2 minutes=6.0
SUMMARY book=rut chapters=3/4 left_out=4 not_judged=none verses=63 flags=1 flags_outside_list=1 every_flag_on_list=no listen_edges=0 minutes=6.0
  (maker 362 s, judge 0 s, listen 1 s; cores used 3.4; outside the list: 1:1 head)
```

| key | is |
| --- | --- |
| `book` | the book's three-character code |
| `chapters=<timed>/<of>` | the chapters the maker timed, of the chapters asked for (the book's, or `--chapters`) |
| `left_out` | the chapters the maker left out by its own checks, named (`4`, `4,7`), or `none` |
| `not_judged` | chapters timed and not judged, named, or `none` |
| `verses` | verses the judge heard |
| `flags`, `flags_outside_list`, `every_flag_on_list` | the judge's flags in all; those whose verse and edge are not on the listen list (a finding the lock refuses, the detail line names each); `yes` only when none is outside |
| `listen_edges` | edges on the listen list, for the Governor's ear |
| `minutes` | wall minutes of the run (`0.0` for `--summary-only`) |

A run is clean when `left_out=none`, `not_judged=none` and `every_flag_on_list=yes`; the exit is 0 only when no chapter is left out or not judged.

## A book story

The template the held book stories follow (mw-zbgo4ep.61; measured on the first eight, mw-zbgo4ep.1 to .8: a story was 13.4 hours at the median from claim to landed, 3.3 of them the session, and every close-out ran the gate again because the old default folder left untracked files in the tree).

1. **The host.** Any box `box-setup.sh` has prepared (`host=auto`): a cloud box needs about 4 minutes of set-up and times a book about **twice as fast** as the Laptop (mw-zbgo4ep.6 on `cloud2`: 0.51 hours a hour of audio against the Laptop's 1.10 on a loaded host). A box must end `box-setup.sh` with `DONE`; `THE PROOF FAILED` stops the story.
2. **Run** `scripts/audio-timings/run-book.sh <book>` with no `--out`, and take it up with the same command after a stop. Staging is under the cache, so the worktree has nothing of the run in it.
3. **Promote** ([Promoting a book](#promoting-a-book)): copy the four files from `<cache>/staged/` into the repo, run `npm run audio:index`. A book's story writes only that book's files.
4. **The acceptance is the summary line plus the lock.** The line says `chapters=<n>/<n>`, `not_judged=none` and `every_flag_on_list=yes` (and `left_out` is `none` or named, below), and `npx vitest run tests/unit/audio-judged.test.ts tests/unit/audio-timings-data.test.ts` is green with the book in. Paste the line in the closing comment.
5. **A chapter left out** (a name in `left_out`, or a chapter the lock refuses because a flag is outside the listen list) is not fixed in the story and is not a failure: ship the rest, and NAME the chapter in the closing comment (the verse and flag, or the maker's reason) for a re-cut story. To take a chapter out of the book you promote: delete it from `<b>.json` and from the quiet file's `chapters` and `aligned` (and its listen entries), in the work copy `<cache>/staged/.work/<b>/`, run `judge.py --book <b>` and `align.py --book <b> --listen` there, and copy the four files out again. The rule is never changed in a book's story.
6. **`align.py --check` is a hint, not the acceptance.** It fails on names and spellings the recording rightly differs from the text on (3 of the 8 first stories' found-at-close bugs were that): a failure of it that the summary line and the lock do not share is a finding for the closing comment, never a reason to change a cut rule or to drop a chapter.
7. **Close-out.** Nothing of the run is untracked in the tree, so there is nothing to explain; say in the closing comment that `git status --short` showed only the book's own files.

## A fresh box

`scripts/audio-timings/box-setup.sh`, run from a clone of the rig on a fresh Ubuntu box. No sudo is asked for; only the cache is written (`LAMPAS_AUDIO_CACHE`, default `~/.cache/lampas-audio-timings`; a private path in the variable leaves a working cache alone).

1. **uv**, if the box has none: the pinned release (0.12.22) from its GitHub release, into `<cache>/bin`. It fetches Python 3.12 itself when the box has none (not tried here: the Laptop has one).
2. **One virtualenv**, the judge's (`judge-venv`), with `judge-requirements.txt` and then `requirements.txt` (the maker's pins, a subset: nothing changes). The maker runs in it too; `run-book.sh` uses the maker's own `venv` only where one exists (the Laptop's).
3. **ffmpeg**: the maker decodes with the `ffmpeg` command. If it is on the box, that; else `sudo -n apt-get install -y ffmpeg` where the box allows a sudo with no password; else the pinned static build of the `imageio-ffmpeg` wheel (0.6.0, ffmpeg 7.0.2) in `<cache>/bin`. **It gave the same bytes** as the system ffmpeg 6.1.1 (below). ffmpeg is the one system package it may want; if neither way gets one it stops and names it.
4. **The three models** into the cache (`LAMPAS_NO_SYSTEM_FFMPEG=1` is only for trying the third way): the maker's wav2vec 2.0 LARGE LV-60k (1.2 GB), the judge's letters (BASE 960h, 361 MB) and words (Whisper tiny.en, 75 MB).
5. **The proof**: John chapter 2 (193 s, 25 verses, with the read-on 2:9 into 2:10) through `run-book.sh`, then its timings, the aligner's letters, the chapter's boundaries and the judge's verdicts are compared with the shipped ones. All four must be the same, or it stops with the first difference.

**How long.** Measured 2026-11-15 on the Laptop, from a fresh clone, with an empty cache, and the Laptop's uv wheel cache and Python 3.12 present or not as stated:

- a **warm** uv cache and the system ffmpeg: **3 min 38 s**;
- **cold** (a private `UV_CACHE_DIR`, a fresh `HOME` with no uv, `LAMPAS_NO_SYSTEM_FFMPEG=1`: uv fetched, the wheels fetched, the static ffmpeg): **4 min 8 s**, of which the models took 68 s and the proof (John 2: 1 request, the maker 107 s, the judge 43 s) 162 s; the warm run's proof, maker 89 s and judge 46 s. The Laptop's network is fast (1.7 GB of models in a minute) and the proof's CPU was shared with other work; a cloud box may differ.

**So it is under ten minutes, and no machine image is needed.** A box is made from the stock Ubuntu image and told to run `box-setup.sh`. Disk: the cache after set-up is 2.9 GB (the venv 1.2 GB, the models 1.7 GB), plus 7 to 14 MB an MP3 chapter fetched (John 165 MB, the whole Bible about 6.8 GB across all five boxes, a share about 1.4 GB).

## The shares

`scripts/audio-timings/shares.json` cuts the 66 books into 5 shares of near-equal recording length, for 5 boxes; `scripts/audio-timings/shares.py` writes it. **How the lengths were read, without downloading a recording:** the publisher's own listing of the chapter files (`https://openbible.com/audio/msb/`, ONE request with the maker's User-Agent) gives each file's size to 0.1 MB; every file is a 192 kb/s constant-rate MP3 (24,000 bytes a second), so a chapter's seconds are its size / 24,000. Checked on the 50 Genesis files kept on the Laptop: the listing's sizes summed are 0.9994 of the files' real sizes, and size / 24,000 is the real duration to a second or two (Genesis 1: 7,033,707 bytes, 293.02 s by ffprobe). A chapter's length is good to about 4 s; the errors of 1,189 chapters cancel.

The 1,189 files add up to **79.11 hours** of audio. Books are given longest first to the lightest share, then moved or swapped while the heaviest share gets lighter, then each share is put back in the canon's order:

| share | hours of audio | chapters | books, in the canon's order |
| --- | --- | --- | --- |
| 1 | 15.82 | 217 | gen lev deu jdg ecc sng hag act 1co gal 1th tit jas |
| 2 | 15.82 | 208 | exo 1sa 2sa neh est ezk amo oba hab mrk col 2ti 1pe |
| 3 | 15.82 | 240 | num ezr job isa nam mal mat jhn eph php 1ti heb jud |
| 4 | 15.82 | 309 | jos rut 2ki psa pro lam jon mic zep zec luk rom 2jn 3jn |
| 5 | 15.82 | 215 | 1ki 1ch 2ch jer dan hos jol 2co 2th phm 2pe 1jn rev |

Every share is within 0.1% of the mean (15.82 hours), against the 10% asked; `tests/unit/audio-run.test.ts` holds 5 shares, all 66 books once, the canon's order, within 10%, and 1,189 chapters. Psalms (about 6 hours) is the longest book and sits in share 4 with Luke and Romans. Balance is by hours of audio; the cost of a chapter is not exactly proportional (see the estimate).

## The estimate

**Measured**, 2026-11-15, John through `run-book.sh jhn --out /tmp/jhn --fresh` (every chapter timed and judged afresh, the recordings already kept so no fetch is in it): 21 chapters, 879 verses, 119.6 minutes (7,176 s) of audio, **72.4 wall minutes**; the output is the shipped file byte for byte (below).

(Printed in the first form of the line, `jhn: 21 chapters, 879 verses, 0 flags outside the listen list, ...`, which the fixed one of 'The summary line' replaced.)

```
start  13:32:19 up 32 days,  7:48,  2 users,  load average: 57.56, 53.39, 41.09
end    14:44:58 up 32 days,  9:01,  2 users,  load average: 28.01, 22.11, 22.51
jhn: 21 chapters, 879 verses, 0 flags outside the listen list, listen list 8 edges of 8 verses, 72.4 wall minutes
  (maker 3117 s, judge 1224 s, listen 1 s; cores used 3.2; outside the list: none)
judged 119.6 minutes of audio in 1223 s: 10.22 wall seconds a minute of audio (letters model 1108 s, words model 12 s, words ear asked 21 times)
```

| | wall seconds a second of audio | wall minutes an hour of audio |
| --- | --- | --- |
| the maker (the model and the cut rule) | 0.434 | 26.1 |
| the judge, fresh | 0.171 | 10.2 |
| **maker plus judge** | **0.605** | **36.3** |

**Cores.** The Laptop has 20 cores and was loaded by other work all the while (load average 57 at the start, 28 at the end, 20 to 25 between: the maker and the judge are each ONE process on 4 threads, `nice -n 10`). They used **3.2 cores** on average (CPU seconds over wall seconds). So 0.605 is the figure of ONE process on 4 threads on a busy host, and a quiet box should do no worse; the quieter figures written earlier (the maker about 0.33, the judge 0.16, docs/audio-judge.md) sum to 0.49. The planning rate is the measured 0.605. It is not a guess of a mean: a short chapter costs more a second (the model's load, 30 to 40 s a run, is in Jude's and the Psalms' wall time), a long one slightly more too (0.40 to 0.49 for the maker). Psalm 119 (the longest chapter, about 10,000 letters) has not been run: the judge's memory there (0.4 to 0.8 GB) is an estimate, not measured.

**The whole Bible: 79.11 hours of audio (1,189 chapters) on 5 boxes of 8 cores at $0.132 a box-hour.** One share is 15.82 hours of audio, which is 15.82 × 36.3 = **574 minutes (9.57 hours) of one process**. A box has 8 cores, a process used 3.2: two processes at once is the way to use them, but that is **an assumption** (two books at once, linear to 8 cores): it has not been run on an 8-core box. Both are given:

| | wall hours of a share | box-hours (5 boxes) | dollars at $0.132 |
| --- | --- | --- | --- |
| **A: one `run-book.sh` at a time** (4 of the 8 cores) | 9.57 compute + 0.13 fetching + 0.07 set-up = **9.8** | **48.9** | **$6.45** |
| **B: two at once** (the share's books in two halves; assumes the 8 cores do twice the work) | 4.79 + 0.13 + 0.07 = **5.0** | **24.9** | **$3.29** |

- The **fetching** is 2 s a file, politely, and the maker waits for it (1,189 chapters, 217 to 309 a share: 0.12 to 0.17 hours a box); it was not in John's measure. The **set-up** is `box-setup.sh`, 4.1 minutes a box. The download of a share's MP3s is not timed (about 1.4 GB a share).
- **Compute alone**: 47.9 box-hours, $6.32 (A), or 23.9, $3.16 (B).
- **What is already done**: John (1.99 h) and Genesis (3.83 h) are timed, cut and judged, so the shares need not run them: the 64 other books are 73.29 hours of audio, 44.3 box-hours of one process, **$5.85 (A) or $2.93 (B)** if a box is paid for only while it runs. By share (hours of one process, A / B): share 1 (without Genesis) 7.25 / 3.63, share 3 (without John) 8.37 / 4.18, the other three 9.57 / 4.79.
- **Not in it**: a chapter the maker leaves out and is timed again (John and Genesis had none), a stopped run's lost minutes (a chapter in hand is lost: at most 4 minutes), and the Laptop's own listening to the listen lists. Nothing here weighed what the listen lists cost him.
- **The wall time is set by the longest share**: 9.8 hours (A) or 5.0 (B) from the moment the five stories start. The Mayor tells the Governor the dollars and hours before any box is made.

**Byte for byte.** `run-book.sh jhn --out <a temp dir>` wrote the four files of John (the timings, the quiet file, the listen list, the judged report) and each is **identical** to the shipped one (`diff` of each pair printed nothing; timings `0e51b86a53a8`, judged `53990e624d6a`, quiet `b04dde2c58df`, listen `7395a6069093`, the first twelve of each file's sha256). A run killed after two chapters (John 2 to 5, killed after chapters 2 and 3 were written) and run again with the same command said `skipped, already in jhn.json (--redo aligns them again): [2, 3]`, timed only 4 and 5, and its four chapters are the shipped ones' byte for byte (timings, the aligner's letters, the boundaries, the judge's verdicts, the listen list); the maker stage took 407 s the second time. And `box-setup.sh`, on a fresh box with another ffmpeg (7.0.2 against 6.1.1) and the maker running in the judge's venv, made John 2's four records the same as the shipped.

## What a share's story must do on its box

A share's story is one Builder session on one fresh box (`mw` makes the box; the Mayor words the story). It must:

1. Clone the rig at the branch the Mayor names and run `scripts/audio-timings/box-setup.sh`. It must end with `DONE`; a `THE PROOF FAILED` stops the story and goes back to the Mayor (the box makes other bytes than the Laptop).
2. For each book of its share in `shares.json`, in the order listed, run `scripts/audio-timings/run-book.sh <book>` and read the summary line ([A book story](#a-book-story) is the template). Under the box's own time limit a book is run again with the same command, and it takes up where it stopped. One `run-book.sh` at a time for the fetching's sake (the publisher is asked for one file at a time, 2 s apart, by each box: five boxes are five polite clients); two books at once on the 8 cores is the story's choice only if the Mayor says so (the estimate assumes it, see below).
3. Promote each book's outputs ([Promoting a book](#promoting-a-book)), in small commits, one book to a commit; the run's folder is `<cache>/staged/`, outside the tree, and the MP3s stay in the cache (`.gitignore` bars them).
4. **Touch nothing else**: not `public/` (promotion is its own step, below), not the maker or the judge, not `player-slop.json`, not a test. A chapter the maker leaves out, a flag outside the listen list, a `text-differs`, a verse the recording joins: each is a FINDING for the closing comment under 'For the Mayor: classes' (the verse, the book, what the judge heard), never a change of the rule in the share's story. A class that needs the rule changed is its own story.
5. In its closing comment: for each book the summary line, the wall minutes of the whole share against the estimate below, and the findings by class.

Promotion into `public/data/audio/msb-david/` is neither the share's nor this story's: it is one later story per book (or per share) after the Governor has heard each book's listen list, and it is [Promoting a book](#promoting-a-book) below.

## Promoting a book

mw-zbgo4ep.49. **A book's story writes only that book's files, so any number of books are promoted at once, on any boxes, and their branches merge in any order with no conflict.** The app's list of timed books, `public/data/audio/msb-david/index.json`, is **not a file anyone edits**: it is generated from the `<book>.json` files beside it by `scripts/audio-index.mjs` and is git-ignored (`.gitignore`), so no branch carries it.

To promote a book `<b>` (after `run-book.sh <b>` and the Governor's ear on its listen list), copy from `<cache>/staged/` (`~/.cache/lampas-audio-timings/staged/`, or the `--out` you gave) into the repo, and nothing else:

| from `<cache>/staged/` | to |
| --- | --- |
| `audio/msb-david/<b>.json` | `public/data/audio/msb-david/<b>.json` |
| `quiet/msb-david-<b>.json` | `scripts/audio-timings/quiet/msb-david-<b>.json` |
| `listen/msb-david-<b>.json` | `scripts/audio-timings/listen/msb-david-<b>.json` |
| `judged/msb-david-<b>.json` | `scripts/audio-timings/judged/msb-david-<b>.json` |
| `summary/<b>.txt` | stays in `<cache>/staged/summary/` |

**A book staged before mw-ar5k42b.25** (its quiet file says `"v":2`) was cut on the clock of a file played through, not the clock the browser seeks by (docs/data.md 'The time base'), and the gate refuses it. Move it first, in its work copy (`<out>/.work/<b>/`): `align.py --book <b> --cut` there, then `judge.py --book <b>` and `align.py --book <b> --listen`, and copy the four files out again. The repo's `scripts/audio-timings/staged/` holds two such today (Psalms 3 and 117; Jude's file has no tag inside it, so only its versions would change).

Then `npm run audio:index` (the build, `npm run dev` and `npm test` run it too) lists the book, and the gate holds it: `tests/unit/audio-judged.test.ts` (the lock), `tests/unit/audio-timings-data.test.ts` (the rule), `tests/unit/audio-index.test.ts` (the index is what the book files make, no tracked `index.json`, every per-book file named for its book, two branches merge in both orders to one index). `npm run audio:index:check` says alone whether `index.json` is what the files make. **Never edit `index.json` and never `git add -f` it**: delete a book's `<b>.json` to turn its recording off. Do not change the maker, the judge, `player-slop.json`, `shares.json` or a test in a book's story.

Every file a book's story writes, and who else could write it (the sweep of mw-zbgo4ep.49):

- `public/data/audio/msb-david/<b>.json`: the book's own.
- `scripts/audio-timings/quiet/`, `listen/`, `judged/` `msb-david-<b>.json`: one file a book each, named for it (the test holds the names).
- `<cache>/staged/{audio,quiet,listen,judged}/…`, `summary/<b>.txt`: a book's own files, outside the tree (the default folder of mw-zbgo4ep.61; `box-setup.sh`'s proof already used its own `--out` under the cache). The repo's `scripts/audio-timings/staged/` is the old default's Psalms 3 and 117 and Jude, kept.
- `public/data/audio/msb-david/index.json`: **was the one shared file; now generated and not committed.** `align.py` no longer writes it (it only wrote it to keep it, and still wrote the book's own file first); `scripts/audio-timings/check-urls.mjs` derives the list itself.
- Nothing else: `shares.json` (the shares are fixed), `player-slop.json`, the credits (`tests/support/credits.ts` credits the folder by its path, so a new book needs no entry), `ATTRIBUTION.md` and the Preface (the Recording bullet names the voice, not the books). Checked against what the Numbers, Leviticus and Exodus stories changed: `index.json` and their own five files.

## What the proof found: Psalm 3, Psalm 117 and Jude

Run through `run-book.sh` into `scripts/audio-timings/staged/` (`psa --chapters 3,117` and `jud`, `--fresh`), 2026-11-15, nothing under `public/` changed. They are on what John did not teach: a Psalm with a title, a Psalm without a verse of its own heading, and a one-chapter book.

```
psa: 2 chapters, 10 verses, 0 flags outside the listen list, listen list 4 edges of 4 verses, 1.0 wall minutes   (maker 41 s, judge 19 s; cores used 3.0)
jud: 1 chapters, 25 verses, 0 flags outside the listen list, listen list 1 edges of 1 verses, 3.5 wall minutes   (maker 157 s, judge 53 s; cores used 2.8)
```

**No flag is outside a listen list**, so by the lock's own rule both would ship; the findings are what the judge and the maker say of them, each a CLASS of thing the rule meets outside John. None was acted on here: a class that needs the rule changed is its own story.

1. **The announcement is not one shape.** John's is 'Audio Bible, John, chapter <number>'. A Psalm's is 'Audio Bible, Psalm three' / '...Psalm one hundred seventeen' (the judge's letters: `ODYOUR BIBLE PSALM THREE`, `AUDIO BIBLE PSALM ONE HUNDRED SEVENTEEN`: no 'chapter'); Jude, a one-chapter book, still says 'chapter one' (`AUDIO BIBLE JUDE CHAPTER ONE`). All three are in no verse (the quiet before verse 1 is 2.4 to 2.5 s, digital silence at its end) and the judge raised no `head-extra` at any verse 1. **Nothing to change**; the letters model spells the first word badly ('ODYOUR').
2. **A title read aloud into verse 1 (Psalm 3).** The text holds 'Deliver Me, O LORD!' as the section heading (`h`) and 'A Psalm of David, when he fled from his son Absalom.' INSIDE verse 1; the narrator reads the second and not the first (`between` is empty in the judged report: nothing is read between verses; nothing is read after the last). The maker timed the title as the start of verse 1 and the judge heard verse 1 `ok` with no `text-differs`. **No class here: the Psalm title rule (docs/data.md) works as written** for the one title tried (a two-verse title like Psalm 51 was not).
3. **'Selah' at a verse's end, read on into the next verse (Psalm 3: 2 to 3, 4 to 5).** Verses 2, 4 and 8 end in 'Selah'. At 2:3 and 4:5 there is NO quiet between 'selah' and the next verse's first word ('but', 'I'): the maker cuts at the quietest instant and puts both edges on the listen list (3:2 tail, 3:3 head, 3:4 tail, 3:5 head). 3:8, the last verse, ends in Selah with room and is `ok`.
   - **3:2 / 3:3** (cut at 18.17): the judge says `tail-extra` 0.04 s (it hears 'B' of 'but' in the clip at its longest) and `tail-clipped` 0.06 s of verse 2, and `head-extra` 0.06 s (a trace of 'selah') and `head-clipped` 0.04 s of verse 3. It is the same read-on John has three of (2:9, 5:28, 9:18): no cut is clean.
   - **3:4 / 3:5** (cut at 29.94) is different and is for his ear: the judge says verse 5 is `head-clipped` by **0.51 s** at +10.5 dB and `lost: SAILOR`, and verse 4 `tail-clipped` 0.105 s by the quiet ear alone (its edge is `weak`). The English letters model cannot spell 'Selah' (it hears it `SELLAH`, `CELAB`, `SELL UP`, `SAILOR`), so the judge's pairing of letters to verses puts the sound at 29.48 to about 29.9 on verse 5's side; the maker's aligner puts 'selah' ending at 29.9 and 'I' beginning at 30.02, and cuts in between. **Either the judge misowns the word 'Selah' (likely), or the cut is half a second early**: only the ear says. Every Selah the narrator reads on from (71 in the Psalms, 3 in Habakkuk) can be this class.
4. **A word the narrator changes (Jude 1:11).** The text has 'for profit' ('they have rushed for profit into Balaam's error'); both of the judge's ears heard 'headlong' (`text-differs`, the listen list's `text` edge). Not a cut's fault. Another reading of the same verse, not a timing; it can only be listened to.
5. **A verse the recording joins**: none. Verses 1 and 2 of Psalm 117 (a two-verse psalm), and all 25 of Jude's, are `ok`, and every boundary outside item 3 has 0.27 s or more of quiet.

By kind of flag, the three together: `head-extra` 1, `head-clipped` 2, `tail-extra` 1, `tail-clipped` 2, `text-differs` 1 (the Psalms 3:2 to 3:5 and Jude 1:11); nothing else.

