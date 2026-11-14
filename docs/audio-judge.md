# The judge of David's verse cuts

`scripts/audio-timings/judge.py` (mw-ar5k42b.1) hears every verse of a book the way David's player would play it and reports anything extra or missing at each edge. It is a tool: nothing of it ships in the app, it is not in the gate, and it changes no timings. The timing maker (`align.py`, docs/data.md 'The timing maker') places the cuts; the judge only says whether they are right.

<!-- toc -->

- [The one command](#the-one-command)
- [What it reads, and what it never reads](#what-it-reads-and-what-it-never-reads)
- [The clip is what he could hear, at worst](#the-clip-is-what-he-could-hear-at-worst)
- [What it hears, and how](#what-it-hears-and-how)
- [The report](#the-report)
- [The judge is judged](#the-judge-is-judged)
- [The known faults (AC 2)](#the-known-faults-ac-2)
- [John today](#john-today)
- [What was tried and dropped](#what-was-tried-and-dropped)
- [Time zero, measured against Chromium](#time-zero-measured-against-chromium)
- [What it costs](#what-it-costs)
- [The models](#the-models)
- [What a later story must know about the recording](#what-a-later-story-must-know-about-the-recording)

<!-- /toc -->

## The one command

```bash
nice -n 10 ~/.cache/lampas-audio-timings/judge-venv/bin/python -I scripts/audio-timings/judge.py --book jhn
```

It judges every chapter of `public/data/audio/msb-david/jhn.json` and writes `scripts/audio-timings/judged/msb-david-jhn.json`. One process, one chapter at a time, 4 threads; never beside the rig's tests (`free -m` first). Other switches:

- `--timings <file>` judges another timings file of the same book (a copy, an old commit's); `--out <file>` writes the report elsewhere.
- `--chapters 2,3` judges only those now; the report is written once every chapter of the timings is done.
- `--fresh` hears and judges everything again, reading nothing an earlier run kept.
- `--prove` is the judge judged: faults planted in a copy of the timings, the table of caught / planted (`--seed`, `--verses`, `--proof-out <file>`).

**Set up once** (its own virtualenv beside the maker's, outside the repo, nothing system-wide):

```bash
uv venv --python 3.12 ~/.cache/lampas-audio-timings/judge-venv
uv pip install --python ~/.cache/lampas-audio-timings/judge-venv/bin/python --index-strategy unsafe-best-match -r scripts/audio-timings/judge-requirements.txt
```

The two models download into `~/.cache/lampas-audio-timings/` on the first run (436 MB) and are never committed.

**Its tests** are run by hand in that venv (pytest, no model, no recording: a synthetic chapter of noise and silence, faked ears):

```bash
~/.cache/lampas-audio-timings/judge-venv/bin/python -m pytest scripts/audio-timings/test_judge.py -q -p no:cacheprovider
```

## What it reads, and what it never reads

Three things only: the recording (the publisher's chapter MP3, fetched and decoded by the maker's own polite `Fetcher` and `decode`), the timings file, and each verse's text (the maker's own source and normaliser, `align.chapter_text` and `align.words_of`, imported: `test_judge.py` holds that it is the same function). It never reads the maker's alignment, and its two recognisers are not the maker's model. Only `--prove` reads the maker's measure of the gaps (`scripts/audio-timings/quiet/`), and only to decide where to plant a fault.

## The clip is what he could hear, at worst

The player does not start and stop exactly. `scripts/audio-timings/player-slop.json` is the ONE file that says by how much: `lead` 0.05 s, `tail` 0.05 s, **provisional** until the player's-margin story (mw-ar5k42b.2) measures it. For a verse timed `[start, end]`:

- **extra** is judged on the clip at its longest, `[start - lead, end + tail]`;
- **clipped** is judged on the clip at its shortest, `[start + lead, end - tail]`.

So a cut is clean only where there is at least `lead + tail` (0.1 s) of quiet around it. Where the narrator leaves less, or none (he reads on), the judge flags the verse whatever the cut: those are the cut-rule story's listen list.

## What it hears, and how

Three ears, the cheap ones first.

1. **Quiet** (the recording's own level; no model). RMS of 10 ms frames every 5 ms, against the chapter's speech level (the median of the frames within 35 dB of the loudest twentieth; John: about -17 dBFS). A frame 42 dB or more below the speech level is quiet; a quiet is 30 ms or more of it. The recording is gated: between phrases it is digital silence (about -90 dBFS), so where a sound begins and where it has died is read to 5 ms. The quiet ear is exact in time and blind to whose sound it is.
2. **Letters** (wav2vec 2.0 BASE 960h, greedy CTC, no language model; the maker's model is the LARGE LV-60k one). It hears the whole chapter once and gives letters with their seconds. The letters are paired with the letters of the chapter's verses (the most letters paired, and among those the most paired side by side). A word is heard when 60% of its letters were (all of them for a word of three letters or fewer), together. That says WHOSE each sound is: a verse's own, the next verse's, or nobody's (the announcement before verse 1, a heading read aloud, a word the narrator adds).
3. **Words** (Whisper tiny.en through faster-whisper), the dear one, hears the CUT clip of a verse only where the cheap ears flag it or cannot settle it.

**The measure.** From the letters and the quiets the judge finds four seconds for each verse (the report's `sound`): where the sound before it has died, where its own sound begins, where its own sound has died, where the next sound begins. The gap between a verse's last letter and the next letter that is not its own is the LONGEST quiet between them (a stop's closure inside a last word is a shorter quiet, and stays with its word). Where there is no quiet at all the narrator reads on: both seconds of that edge are the quietest instant between the two words, and the flag says `readsOn`.

**The flags** are then arithmetic (`flags_of`), each with `by`, the seconds of SOUND in the faulty stretch, and `level`, its loudest frame in dB against the speech level:

| flag | the stretch | means |
| --- | --- | --- |
| `head-extra` | from `start - lead` to where the sound before has died | the clip begins with the end of the verse before, or of the announcement |
| `head-clipped` | from where its own sound begins to `start + lead` | its own first sound is cut |
| `tail-extra` | from where the next sound begins to `end + tail` | the clip ends with the next verse's first sound |
| `tail-clipped` | from `end - tail` to where its own sound has died | its own last sound is cut |

A part-sound of 20 ms or less (`TOLERANCE`) is not a fault: that is the measure's own grain (10 ms frames, timings to 10 ms). Counting sound, not the stretch, is what keeps a click from being called a word: John 9:40 has a 10 ms click 60 ms before 'Some'.

**What was heard at a flagged edge** (`heard`): `extra` or `lost`, the letters of the whole-chapter hearing that lie in the faulty stretch; `next` or `before`, the neighbour's word the cut runs into; `letters`, the letters model's decode of the cut clip's last or first 1.5 s; `words`, Whisper's last or first four words of the cut clip. An extra flag is reported from the clip at its longest, a measured clipping from the clip at its shortest.

**An edge the letters cannot settle** (its first or last word was not heard, or more than 0.4 s of sound lies between its edge letter and its gap with no letter in it) is `weak`: its four seconds are a guess and are not used. It is judged by the other two ears: any sound within the player's slop of the cut is a flag (`"ear":"quiet"`), and Whisper's words for the cut clip must begin and end with the verse's (`"ear":"words"`). John has no weak edge.

**`text-differs`** is a difference in the MIDDLE of a verse and never an edge flag: a word the letters did not hear (or letters they heard that the text has not) AND Whisper's words for the clip differing at that same word AND Whisper differing there again when it is told the verse's own words (its `initial_prompt`). A word only spelt otherwise (Cana, Kana), written as two, or sharing a sound with its neighbour ('its sound' heard 'it sound') is not a difference. It says where the maker's alignment may be weak; it is not a fault of a cut, and no cut can cure it.

## The report

`scripts/audio-timings/judged/<edition>-<book>.json`, one verse to a line so a changed verdict is one line of a diff:

- `judge` (the judge's version), `timings.sha256` (of the timings file's bytes) and `timings.file`, `slop`, `tolerance`, `ears` (the two models, time zero);
- `summary`: `verses`, `ok`, `flagged`, and `flags` by kind;
- `chapters[n]`: `announcement` (the letters heard before verse 1), `between` (letters nobody owns between two verses, four or more: a heading read aloud), `closing` (letters after the last verse), `speech` (dBFS), and `verses`: `{"n", "verdict": "ok" | "flagged", "flags": [...], "sound": [before, onset, end, after]}`.

**The same input gives the same bytes.** The report holds no time and no host. A second `--fresh` run of John, hearing everything again, wrote the same file byte for byte (2026-11-14: both reports sha256 `44dd1a64ff12552ea9112d54583e50f5a1b9c1caedb1fea16cc1af2cf8504405`).

**A run stopped halfway is taken up where it stopped.** Each finished chapter is kept in `~/.cache/lampas-audio-timings/judge/done/`, under a key of the timings' bytes, the judge's version, the slops, the tolerance and the models; other timings or another slop start afresh. What the ears heard of a recording is kept too (`judge/heard`, `judge/clips`, keyed by the MP3's sha256), so judging NEW timings of a recording already heard costs seconds, not minutes: the cut-rule story can re-judge John after every change.

## The judge is judged

`judge.py --book jhn --prove`, 2026-11-14, John's timings at 7e00058cc, 200 verses drawn by seed 20261114 from the 831 with a measured gap either side (so never a chapter's first or last verse, nor the verses beside a read-on). Each fault is planted in a copy of the verse's timings (never the shipped file), from the MAKER's measure of the gaps; caught means the verdict has the planted kind.

```
the fault planted                                                              caught / planted
the end moved to 50 ms past the NEXT verse's first sound                        200 / 200   100.0%
the end moved to 100 ms past the NEXT verse's first sound                       200 / 200   100.0%
the end moved to 250 ms past the NEXT verse's first sound                       200 / 200   100.0%
the start moved to 50 ms before the end of the verse BEFORE's last sound        200 / 200   100.0%
the start moved to 100 ms before the end of the verse BEFORE's last sound       200 / 200   100.0%
the start moved to 250 ms before the end of the verse BEFORE's last sound       200 / 200   100.0%
the end moved 100 ms before its own last word's end                             200 / 200   100.0%
the end moved 250 ms before its own last word's end                             200 / 200   100.0%
the start moved 100 ms after its own first word's onset                         200 / 200   100.0%
the start moved 250 ms after its own first word's onset                         200 / 200   100.0%
verse 1's start moved to 50 ms before the end of the announcement's last sound   21 / 21    100.0%
verse 1's start moved to 100 ms before the end of the announcement's last sound   21 / 21    100.0%
verse 1's start moved to 250 ms before the end of the announcement's last sound   21 / 21    100.0%
```

The last three rows are beyond the story's ten: verse 1 of each of the 21 chapters, with the announcement's end found by the maker's own `quiet_of`.

**False alarms: 0 in 200.** Of the same 200 verses unplanted the judge flags 2, and both are real faults of today's timings. Each was looked at by its level frame by frame, its letters and its clip's decode:

- **15:5** `[35.91, 47.06]`, `head-clipped` by 0.04 s at +4.6 dB: silence until 35.915, then 'I' at full level within 15 ms. The start is 5 ms before the sound; a player 50 ms late cuts the first 40 ms of 'I am the vine'.
- **17:23** `[189.27, 199.24]`, `head-clipped` by 0.10 s at +6.2 dB: the sound of 'I' begins at 189.22, 50 ms BEFORE the start. Even an exact player cuts it.

One false alarm was found on the way and cured, not excused: 9:40 was flagged `head-clipped` by 0.05 s for a 10 ms click at -30 dB, 60 ms before the word. Since then `by` counts seconds of sound, and `test_judge.py` holds the case.

**How this proof could be wrong.** The planted faults sit where the maker's energy measure says the sounds are, and the judge's quiet ear is an energy measure too (its own code, a threshold set from the speech level, not the maker's -60 dBFS): on 858 gaps of John the two agree to 11 ms on 840 and differ by 15 to 35 ms on 18, always on where a slow dying tail ends. What the proof tests hardest is the part that is not shared: whose sound each is (the letters), the longest-quiet rule, and the arithmetic. It does not test a fault in a verse the letters model cannot hear at all; such an edge is weak and goes to the other two ears, and John has none.

## The known faults (AC 2)

John's timings at 7e00058cc (the same bytes as today's; sha256 `34f081d58b05318229136b971e01570210a38e65cc6cec4c9f84df1e8bc2b510`):

| verse | timing | the judge says |
| --- | --- | --- |
| **2:9** | `[58.53, 71.44]`, 2:10 starts at 71.44 | **flagged `tail-extra`** by 0.08 s, `readsOn`, at +2.5 dB (speech level). There is no quiet between 'aside' and 'and'; the quietest instant between them is 71.41, so the clip at its longest (to 71.49) holds the first 80 ms of the NEXT verse's first word, which it names: `"next":"AND"`. 80 ms is too little for a recogniser to spell: the letters model on the cut clip hears 'CALLED THE BRIDEGROOM ASIDE', Whisper 'called the bridegroom aside'. 2:10 is flagged `head-clipped` by 0.08 s for the same boundary. |
| 5:28 | `[234.15, 241.31]`, 5:29 starts at 241.31 | flagged `tail-extra` by 0.04 s (`"next":"AND"`) and `tail-clipped` by 0.06 s (`"lost":"E"`, the end of 'voice'), both `readsOn`: no quiet, the boundary is 241.32. 5:29 is flagged `head-extra` 0.06 s (`"before":"VOICE"`) and `head-clipped` 0.04 s. |
| 9:18 | `[146.01, 152.82]`, 9:19 starts at 152.82 | flagged `tail-extra` by 0.04 s (`"next":"AND"`) and `tail-clipped` by 0.06 s (`"lost":"S"`, the end of 'parents'), both `readsOn`: no quiet, the boundary is 152.83. 9:19 is flagged `head-extra` 0.06 s and `head-clipped` 0.04 s. |
| 1:24 | `[161.41, 163.39]`, 1:25 starts at 163.43 | flagged `tail-clipped` by 0.025 s at -17.7 dB: the quiet after 'sent' is only 75 ms (163.365 to 163.44), so the clip at its shortest (to 163.34) loses the last 25 ms of 'sent'. No `tail-extra`: 163.39 + 0.05 reaches the next sound exactly. 1:25 is flagged `head-clipped` by 0.04 s at +4.1 dB (a start 50 ms late loses the first 40 ms of 'asked'). No room: the player needs 0.1 s, the narrator left 0.075. |
| 2:1 | `[5.07, 10.62]`, 2:2 starts at 10.65 | **ok**, and 2:2 ok. The end and the next start are 30 ms apart, but the quiet around them is 0.22 s (10.565 to 10.785) and both clips stay inside it. |
| 1:1's head | `[6.79, 12.16]` | **ok**: no 'chapter one'. The announcement ('AUDIO BIBLE JOHN CHAPTER ONE') has died at 4.295, verse 1's sound begins at 6.91, and the clip at its longest starts at 6.74, in digital silence. (A pericope from verse 1 playing the announcement is the player's bug, mw-82lb97i.40, not a timing.) |

**His 'aside and s' is the player's overrun.** The cut at 2:9 is within 30 ms of the word boundary; with the provisional 50 ms slop the clip holds only the onset of 'and'. Judged with a tail slop of 0.26 s instead, the same verse gives `"extra":"AND S"`, the letters model hears 'THE BRIDEGROOM ASIDE AND SA' and Whisper 'bridegroom aside and said': exactly what he heard. So on his phone the stop came about a quarter of a second late. The cure is the player's margin (mw-ar5k42b.2) and a cut that leaves it room, and `player-slop.json` at 0.05 is far too kind until that story measures it.

## John today

879 verses judged, **858 ok, 21 flagged** (2026-11-14, timings at 7e00058cc, slop 0.05 / 0.05). The cut-rule story's work list, by cause:

- **The narrator reads on, no quiet (3 boundaries, 6 verses):** 2:9 `tail-extra` / 2:10 `head-clipped`; 5:28 `tail-extra` + `tail-clipped` / 5:29 `head-extra` + `head-clipped`; 9:18 `tail-extra` + `tail-clipped` / 9:19 `head-extra` + `head-clipped`. No cut is clean here with any slop: the listen list.
- **A quiet shorter than the player needs (1 boundary, 2 verses):** 1:24 `tail-clipped` 0.025 s / 1:25 `head-clipped` 0.04 s (75 ms of quiet).
- **A start never placed by the sound (10 verses, all `head-clipped`):** 10:30 (0.12 s), 17:23 (0.10), 10:14 (0.075), 18:8 (0.07), 6:48 (0.05), 15:5 (0.04), 5:5 (0.035), 1:28, 4:20 and 13:5 (0.025 each). In 10:14, 10:30, 17:23 and 18:8 the start is AFTER the verse's sound begins, so even an exact player cuts it. Six of the ten begin with the word 'I' (6:48, 10:14, 10:30, 15:5, 17:23, 18:8): the maker's aligner puts that vowel late.
- **A chapter's last verse, whose end the gap pass leaves alone (3 verses, all `tail-clipped`):** 17:26 (0.06 s; its end, 228.61, is before its sound has died at 228.62), 6:71 (0.04 s), 2:25 (0.03 s at -38 dB, a faint dying tail).

By kind: `head-extra` 2 (5:29, 9:19); `head-clipped` 14 (1:25, 1:28, 2:10, 4:20, 5:5, 5:29, 6:48, 9:19, 10:14, 10:30, 13:5, 15:5, 17:23, 18:8); `tail-extra` 3 (2:9, 5:28, 9:18); `tail-clipped` 6 (1:24, 2:25, 5:28, 6:71, 9:18, 17:26); `text-differs` 0. No edge was weak; the words ear was asked 50 times in the whole book.

## What was tried and dropped

- **Whisper alone.** It tidies part-words away, as the story feared. John 2:9's clip with its end 50 ms and 100 ms late: '...called the bridegroom aside.', nothing extra. At 150 ms: 'aside and...'. At 300 ms: 'aside and said,'. A start cut 150 ms into 2:3 was heard whole ('When the wine ran out'); at 300 ms it became 'The wine ran out'. So Whisper cannot be the judge of 50 to 250 ms; it is kept for whole words, where it is good.
- **Whisper base.en.** 1.2 to 2.6 s a clip here against 0.5 to 1.0 s for tiny.en, and it spelt Cana 'Kaina' where tiny.en had it right. The smallest model passed.
- **The cut clip decoded alone by the letters model** (the story's 'greedy decode of the last half second'). 70 ms of a next word gives no letter at all, and 2:10 cut 80 ms into 'and said' is heard as 'THEN SAID'. A recogniser cannot name a sound from 70 ms of it. So the letters model hears the whole chapter, each letter keeps its second, and the cut is judged by which letters' sounds fall inside the clip. The cut clip's decode is kept only as a flag's report.
- **The quiet alone.** It sees every planted fault (the clip's edge is not quiet) but cannot say whether the sound is the verse's own cut or a neighbour's added, and it passes a cut placed in a pause inside the wrong verse. It needs the letters.
- **Pairing letters by plain edit distance, then by longest common subsequence.** Both took look-alike letters from the announcement or a neighbour ('the' of an unheard 'in the' paired with the T and E of 'chapter'). The pairing now prefers letters side by side.
- **'A word's letters are together' judged by whole quiets.** 'But' at eleven verse starts (and 'Do' at one) was called unheard: its B is heard in the silence of its closure, a moment before the sound, so the verse's gap seemed to lie inside the word. The quiet is now measured between the letters' own seconds.
- **`by` as the length of the stretch.** The 9:40 click above.
- **`text-differs` on the two ears' word alone.** John 19:39 'myrrh' was heard 'MUR' by the letters and 'muh' by Whisper: two ears stumbling on one hard word, flagged as a difference of text. Whisper is now asked a second time, told the verse's words, and hears 'myrrh'. The check that this does not hide a real difference: John 3:16's clip, told 'so loved the church ... shall not vanish', is still heard 'so loved the world ... shall not perish'.
- **Not tried:** whisper.cpp (faster-whisper passed first), a phone recogniser, comparing an edge slice with the neighbouring verse's (the whole-chapter letters do that job).

## Time zero, measured against Chromium

Measured 2026-11-14 for John 2 (`MSB_43_Jhn_002_D.mp3`: 44.1 kHz mono, 192 kb/s constant, no Xing or LAME header, ffprobe `start_time` 0), Chromium 153.0.8010.12 (Playwright 1.63.0, headless) against ffmpeg 6.1.1.

**Method.** A page plays the MP3 in an `<audio>` element routed through `createMediaElementSource` into a `ScriptProcessorNode` of a 16 kHz `AudioContext`, which keeps every sample the element gives. The samples (first non-zero to last non-zero) are laid against ffmpeg's decode by cross-correlation (0.4 s, correlation 0.92 to 1.00), which gives the recording's second of the first and of the last sample the element gave; the first is compared with the second the play began at, the last with `currentTime` read just after `pause()`.

**Played on with no seek** (from second 0, paused and resumed): the first sample was 0.1 to 0.7 ms before the second the play resumed at (5 plays) and the last sample 0.6 to 1.2 ms after `currentTime` at the pause (4 pauses in speech). **Time zero is the same to about a millisecond: ffmpeg's second 0 is the element's second 0.** `TIME_ZERO` in judge.py is 0.0 and no correction is made.

**After a seek** (30 seeks to seconds in the middle of speech, each played 1.2 s): at the pause `currentTime` was from 2.9 ms behind to **24.8 ms AHEAD** of the sound (median 14 ms ahead), and the first sample given was the recording's second from 11.7 ms before to 27.9 ms after the second asked for. One MP3 frame here is 26.1 ms: Chromium seeks this header-less constant-rate file to a frame, not to a sample. **This is not a constant the judge can correct; it is the player's** (every verse is started by a seek), so it belongs in `player-slop.json` when mw-ar5k42b.2 measures the page: a verse can start up to 12 ms early or 28 ms late and stop up to 25 ms early, before the player's own timer is counted. Measured through Web Audio on the Laptop, not through a phone's speaker.

The page's part (run with Playwright's Chromium, `--autoplay-policy=no-user-gesture-required`, the MP3 served over HTTP with byte ranges):

```js
const ctx = new AudioContext({ sampleRate: 16000 });
const audio = new Audio('/a.mp3');                         // then wait for 'canplaythrough'
const proc = ctx.createScriptProcessor(4096, 1, 1);
let chunks = null;
proc.onaudioprocess = (e) => { if (chunks) chunks.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
ctx.createMediaElementSource(audio).connect(proc);
proc.connect(ctx.destination);
for (const T of seconds) {                                 // T < 0: play on with no seek
  audio.pause();
  if (T > 0) await new Promise((r) => { audio.addEventListener('seeked', r, { once: true }); audio.currentTime = T; });
  chunks = [];
  await wait(300);
  const before = audio.currentTime;
  await audio.play();
  await wait(1200);
  audio.pause();
  results.push({ T, before, stopped: audio.currentTime, samples: chunks });   // after 700 ms more, so the last samples are in
}
```

Then, for each play, with `y` ffmpeg's 16 kHz decode and `x` the samples: `k0`, `k1` the first and last non-zero sample of `x`; `L` the lag where `x[k0+800 : k0+7200]` best matches `y`; the first sample is the recording's second `(L - 800) / 16000`, the last `(L - 800 - k0 + k1) / 16000`.

## What it costs

The whole judge over John (21 chapters, 119.6 minutes of audio, everything heard afresh), on the Laptop (20 cores; 4 threads, `nice -n 10`), 2026-11-14, with other work loading the host:

```
A before:  09:45:09 up 31 days,  4:01,  2 users,  load average: 15.30, 21.41, 24.51
judged 119.6 minutes of audio in 1170 s: 9.78 wall seconds a minute of audio (letters model 1046 s, words model 28 s, words ear asked 50 times)
A after:  10:04:40 up 31 days,  4:21,  2 users,  load average: 21.22, 19.96, 22.26
```

**9.8 wall seconds a minute of audio**, measured on a host already at a load of 15 to 22 on 20 cores (the second fresh run took 1,097 s, 9.2 s a minute; the very first, under a load of 21 to 30, 11.4). A quiet box was not measured: the runner story (mw-ar5k42b.4) must measure its own. Where it goes:

- **The letters model is 89% of it** (1,046 s: 0.146 s a second of audio; the maker's larger model takes 0.33). It runs once per recording and is kept.
- **Whisper is 2%** (28 s for 50 clips): the cheap ears settle nearly every verse on their own, and it is asked only for the flagged and the unsettled.
- **Judging other timings of a recording already heard: 0.8 to 0.9 wall seconds a minute of audio** (John in 96 s, nearly all of it decoding the MP3s and reading their level). This is what the cut-rule story pays each time it re-judges.
- **The proof** (`--prove`, 2,063 verse judgments, every one flagged and so heard by Whisper and decoded by the letters model): about half an hour here the first time (the words ear asked 2,876 times, the letters model decoding as many clip edges), a minute and a half once what the ears heard is kept.

Disk: the venv 1.2 GB, the two models 436 MB, what the ears heard of John 2 MB. Memory: pairing the letters keeps two tables of (letters of the text) x (letters heard); John 6, the longest chapter here, is 5,673 letters against 5,694 (129 MB). A chapter of 10,000 letters (Psalm 119) would want 0.4 to 0.8 GB: an estimate, not measured.

## The models

Tools only: nothing ships in the app, so the Credits do not change.

| model | used for | licence | source |
| --- | --- | --- | --- |
| wav2vec 2.0 BASE, pre-trained and fine-tuned on 960 h of LibriSpeech (`torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H`, `wav2vec2_fairseq_base_ls960_asr_ls960.pth`, 361 MB) | the letters ear | MIT. torchaudio's own note on the bundle: 'Originally published by the authors of wav2vec 2.0 under MIT License and redistributed with the same license.' | `https://download.pytorch.org/torchaudio/models/wav2vec2_fairseq_base_ls960_asr_ls960.pth`, into `torch/hub/checkpoints/` |
| Whisper tiny.en (OpenAI), as converted for CTranslate2 (`Systran/faster-whisper-tiny.en`, 75 MB) | the words ear | MIT (the model card's `license: mit`; OpenAI's Whisper code and weights are MIT) | `https://huggingface.co/Systran/faster-whisper-tiny.en`, into `whisper/` |

The libraries (`judge-requirements.txt`, every resolved package pinned): torch and torchaudio 2.7.1 CPU (BSD), faster-whisper 1.2.1 (MIT), CTranslate2 4.9.0 (MIT), numpy 2.2.6 (BSD), pytest 9.2.0 (MIT).

## What a later story must know about the recording

From John's 21 chapters:

- **The announcement.** Every chapter file begins with a spoken title, 'Audio Bible, John, chapter <number>' (the report's `announcement`; the letters model spells its first word badly: 'ODIO', 'ORE', 'ON YOUR'). In some chapters a short sound comes before it (chapters 9, 11, 20 begin at 0.14 to 0.18 s; Whisper makes 'uh', 'date on your', 'on the' of it): not listened to. It has died 2.25 to 6.0 s into the file, and 1.96 to 2.91 s of quiet (median 2.41 s, digital silence at its end) lie between it and verse 1. So verse 1's start has all the room it wants, and a clip that holds any of the announcement is a `head-extra` the judge catches (21 / 21 at 50 ms).
- **No heading is read aloud** between verses in John (`between` is empty in every chapter) and nothing is read after the last verse (`closing` empty). A book that has them (a psalm's title) will show them there, as sound nobody owns: a clip holding any of it is flagged extra.
- **The narrator adds and changes no word** in John that both ears hear (`text-differs` 0).
- **The recording is gated.** Between phrases it is digital silence, about -90 dBFS and exactly zero in places; speech is -16 to -18 dBFS in every chapter. That is what lets the quiet ear read an edge to 5 ms. A recording that is not gated (room tone between verses) would need the quiet's threshold looked at again.
- **Gaps.** Of 858 verse boundaries, 3 have no quiet (2:9, 5:28, 9:18) and 1 has less than the 0.1 s the player needs (1:24, 75 ms). The file runs on 0.16 to 0.26 s of quiet after the last verse's sound.
- **A click.** 9:40 has a 10 ms click at -30 dB 60 ms before its first word; the maker's gap pass takes it for the verse's onset. It is harmless to the judge now, but a cut placed 'at the first sound' lands on it.
- **The file.** 44.1 kHz mono, 192 kb/s constant bit rate, no Xing or LAME header: Chromium seeks it to a frame (26 ms), see 'Time zero'.

And of the judge itself:

- **`text-differs` is not a cut's fault.** A lock that says 'no timings file ships unless its report is clean' should count the four edge kinds; a real `text-differs` can only be listened to.
- **The slop and the tolerance are provisional**: `player-slop.json` (0.05 / 0.05) until mw-ar5k42b.2, `TOLERANCE` (20 ms) the Governor's to confirm. A larger slop makes more verses unfixable by any cut: at 0.05 a boundary needs 0.1 s of quiet.
- **A verse with no words** (a verse the text leaves empty) has nothing for the letters to pair: both its edges are weak and Whisper's words for its clip are all 'extra'. John has none; the first book that has one must decide what its timing should be.
- **Only John is in the maker's book table** (`align.BOOKS`), which the judge reads: a new book is added there, by the maker's story.
