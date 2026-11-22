# David's player's margin (mw-ar5k42b.2)

The recorded voice (`src/speech/recordedVoice.ts`) plays one verse, or a section, out of the publisher's chapter MP3 through one `HTMLAudioElement`. Its start is
aimed by a seek (the element's second, a `#t=` fragment on a fresh src, muted until the seek lands). Its end is aimed by a timer `END_LEAD` before the end and a 20 ms
poll in the last 700 ms. The element is paused within `END_SLACK` (0.05 s) of the end, after a `FADE` of 0.06 s by volume. All of that is judged by the element's own
clock. This note says what the page really EMITS, measured sample by sample, and the margin the player is held to.

**The margin: 0.05 s each side** (`scripts/audio-timings/player-margin.json`, `lead` and `tail`). No sound from outside the span is emitted more than 0.05 s before
its start or more than 0.05 s after its end, judged at 50 dB under the voice's level. The same file says how far INTO the span its edges can be lost (`inside`): the
start up to 25 ms late, the end up to 97 ms early. The judge's slop file (`scripts/audio-timings/player-slop.json`) is set from it by the Mayor.

<!-- toc -->

- [How the test hears the page](#how-the-test-hears-the-page)
- [The numbers (before any change: the player is unchanged)](#the-numbers-before-any-change-the-player-is-unchanged)
- [Every way the player starts or stops a span (the sweep)](#every-way-the-player-starts-or-stops-a-span-the-sweep)
- [What was changed in the player, and what was rejected](#what-was-changed-in-the-player-and-what-was-rejected)
- [Limits](#limits)

<!-- /toc -->

## How the test hears the page

`tests/e2e/recorded-voice-margin.spec.ts`:

- **The recording** is `tests/e2e/fixtures/tone-verses.mp3`, made by `node tests/e2e/fixtures/make-tone-verses.ts`. It is 44.1 kHz mono, 192 kbps CBR and has no
  Xing table, like the publisher's files. It stands for both Titus 2 and Titus 3, served for two openbible.com addresses (two addresses, so a crossing loads a new src).
  - An announcement (0 to 1.775 s) comes first, then 15 verses of steady tone.
  - Every quarter second of tone (a **step**) has a pitch of its own, 400 Hz rising 25 Hz a step to 2850 Hz. So a pitch says where in the recording a sound came from.
  - Between verses there is digital silence (0.3 or 0.5 s) or **none**: 3:6 runs into 3:7 and 3:7 into 3:8 (as John 2:9 runs into 2:10), 3:8 into 3:9, and 3:11 into 3:12.
  - `tone-verses.json` has the timings and the steps, measured from the MP3 as ffmpeg decodes it. The encoder's 25 ms delay is in them, so each verse's start and end
    are where its tone starts and ends in the file.
- **The ear**, in the test only. An init script gives the player's element `crossOrigin = 'anonymous'`, because Web Audio hears a no-CORS cross-origin element as
  silence. The route answers with `access-control-allow-origin: *`. The app's element is untouched in the app.
  - The element is routed through `createMediaElementSource` into an `AudioWorklet`. It cuts what the page renders into 5 ms windows and gives each its RMS and its
    pitch, by interpolated zero crossings.
  - The element's volume and mute act on what Web Audio receives, so the fade and the mute are heard.
- **Placing.** A window is **heard** when its RMS is no more than 50 dB under the tone's.
  - A heard window whose loudness is steady against both neighbours (within 3 dB) is the step its pitch is (within 10 Hz).
  - Steps tie windows to the recording: a run of playing has one offset between the page's clock and the recording's second, at the speed (`second = offset + rate × t`).
    Where two steps meet, the offset is known to a window.
  - A window whose loudness moves, or whose pitch is no step's, takes the clock of the piece nearest it within 50 ms. These are the browser's ramp-in at a start, the
    fade, and the click of a pause mid-wave; their pitch misreads by one to three steps.
  - Pieces whose offsets differ by no more than 30 ms are one run. At 1.25x the time-stretch moves a piece's clock by about 10 ms; a pause, a seek or a new src moves it
    by far more.
- **The errors**, in ms of the recording:
  - The **start error** is the first second heard less the span's start. Below 0 is sound from before the span.
  - The **end error** is the last second heard less its end. Above 0 is sound from after it.
  - The span's own tone must be heard whole, from start + 0.05 to end − 0.05 − the fade (10 ms at each verse's edge is not asked, for the fixture's 5 ms ramp).
  - A window no step explains, or a run placed to worse than ±15 ms, fails the play.

In the gate it plays each case twice: once on a freshly loaded page (a cold element and a new src) and once by Play again (the element just played). The measure is
`LAMPAS_MARGIN_PLAYS=30 LAMPAS_MARGIN_OUT=/tmp/margin.jsonl npx playwright test tests/e2e/recorded-voice-margin.spec.ts --project=shots --workers=2`, then
`node tests/e2e/fixtures/margin-table.ts /tmp/margin.jsonl`. It needs a real clock, so it belongs in the rig's `timing_tests`.

## The numbers (before any change: the player is unchanged)

2026-11-14, Playwright 1.63.0's Chromium, headless, on the Laptop under its own load (no load made). Uptime at the start was
`17:15:40 up 31 days, 11:32, 2 users, load average: 15.96, 18.46, 28.18`, and at the end `17:31:31 up 31 days, 11:48, 2 users, load average: 31.23, 25.14, 24.84`.
There were 30 plays a row, half cold and half by Play again. The errors are in ms of the recording.

| browser | case | speed | plays | start: earliest (worst) | start: median | start: latest | end: latest (worst) | end: median | end: earliest | own tone lost, most | load (1 min) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| chromium | one verse alone (Titus 3:5, silence either side) | 1x | 30 | 20 | 23 | 25 | -53 | -56 | -68 | 0 | 14.4-18.7 |
| chromium | one verse run into and on from with no silence (Titus 3:7) | 1x | 30 | 1 | 2 | 5 | -56 | -63 | -97 | 0 | 15.8-21.7 |
| chromium | a section (Titus 3:9-11, run into from 3:8 and on into 3:12) | 1x | 30 | -4 | 0 | 19 | -45 | -70 | -73 | 0 | 15.3-23.8 |
| chromium | one verse alone (Titus 3:5, silence either side) | 1.25x | 30 | 5 | 7 | 9 | -46 | -64 | -74 | 0 | 16.2-22.6 |
| chromium | one verse run into and on from with no silence (Titus 3:7) | 1.25x | 30 | -17 | -9 | -5 | -65 | -71 | -77 | 0 | 21.0-23.7 |
| chromium | a section (Titus 3:9-11, run into from 3:8 and on into 3:12) | 1.25x | 30 | -15 | -15 | -9 | -62 | -65 | -95 | 0 | 22.3-31.2 |

Over all 180 plays the worst start was −17 ms (17 ms of the verse before, at 1.25x), and the worst end −45 ms: no sound after the end in any play. **After**: the
same table, because nothing in the player was changed. Every row holds the 0.05 s margin, and the own tone was heard whole in every play.

What the numbers say:

- **At the start**, at 1x a cold or warm start sounds from the verse's start to 25 ms after it. The 20 to 25 ms of Titus 3:5 is the element starting at the next MP3
  frame. At 1.25x the time-stretch (WSOLA) reaches back up to 17 ms into what is before the start. That is sound of the verse before where there is no silence (3:7, 3:9).
- **At the end** the player never plays past the end: it stops 45 to 97 ms short of it. The timer aims at `END_LEAD` 0.04 before the end and stops within `END_SLACK`
  0.05, after a 60 ms fade, so 50 dB down is reached about 55 to 75 ms before the end. **That is sound of the verse itself lost.** The cut rule places each
  end at least `inside.tail` (0.097 s) after the verse's last sound, or the fade eats into the last word: `align.py` and `judge.py` read it from
  `player-margin.json` as `insideTail` (mw-ar5k42b.9). The maker and its cut rule are in [docs/data.md](data.md) 'The timing maker', the judge in
  [docs/audio-judge.md](audio-judge.md).
- **WebKit was not measured.** Playwright's WebKit (26.6, build 2359) downloads, but it needs `libjxl.so.0.8` and `libbacktrace.so.0`, which Ubuntu 24.04 on the
  Laptop does not have. Its other missing libraries (GTK 4, GStreamer's base, good and libav plugins) can only be installed with root. The spec has no Chromium-only
  part: on a host with WebKit's dependencies it runs as it is under a WebKit project.

## Every way the player starts or stops a span (the sweep)

Each was measured once by the same spec, in Chromium:

| way | what was heard |
| --- | --- |
| one verse | as the table |
| a section | as the table |
| pause, then Resume inside Titus 3:5 | two runs: before the pause and after the resume. It went on from where it was held (within 10 ms). Start +21 ms, end −58 ms |
| Next verse inside Titus 3:9-11 | verse 9 from its start (−1 ms), then verse 10 from 13 ms after its start to the section's end (−70 ms). Nothing of the rest of verse 9 |
| a section crossing into the next chapter | **cannot happen.** A section ends at its chapter's end (`src/data/passage.ts` `passagesOf`), and its Listen reads span 'chapter' over its own verses, which never crosses. |
| the header's Play crossing from Titus 2 into Titus 3 | Titus 2 stops at its last verse's end (−42 ms), and **Titus 3's announcement is played** (heard from 0.008 s; it is 0 to 1.775 s). This is by design (mw-82lb97i.28: a crossing plays as a chapter read from its beginning). Whether a book read on into its next chapter should hear 'Audio Bible, Titus chapter three' is his to say. |

## What was changed in the player, and what was rejected

**mw-ar5k42b.23 (2026-11-19).** Under host load 6 plays of 360 stopped 111 to 183 ms before the end (past `inside.tail`), and one 30-play run on cloud1 at load 5 gave two
more (-119 and -185 ms, at 1.25x, on Play again). Traced in the page: the element's second was true at every look (20 ms apart), but it advanced 1.03 s of the recording a second
of the clock at a speed of 1.25, so the stop's carry of the last 700 ms of readings on by the clock at 1.25x put the sound 0.14 s ahead of itself (the heard sound ended where the
element's second stood). `soundAt` now carries those readings at the element's own speed (`carrySpeed`: a second read at every look and slower than his speed over the readings, never
slower than real time, times 1.02); a second that moves in steps (a phone's) and a speed of 1x or less are carried as before. After it, two runs of the 180-play spec at load 5 held
every row (the earliest end -90 ms, inside `inside.tail`), and `inside.tail` is unchanged. The case it does not separate: a second at 1.25x that is slow because it LAGS the sound
(not because the audio is slow) and jumps on later is stopped late, as the element's own second says; it was seen only in headless Chromium within two seconds of a seek
(tests/e2e/recorded-voice-stop.spec.ts).

Before that, nothing was changed: today's player holds 0.05 s each side in every row measured. Rejected, because nothing failed:

- **A fade that ends at the verse's end**, instead of one that starts 0.11 s before it. It would give back up to about 60 ms of each verse's own last sound. But it
  needs a timer that fires on time where a loaded page fires late (the reason for `END_LEAD`), and nothing past the end was ever heard to make room for.
- **A fade-in once the seek has landed.** No play sounded more than 17 ms before its start, and that was at 1.25x, from the time-stretch inside the browser, which no
  volume ramp in the page would reach. Chromium already ramps each start in over about 10 ms.
- **Web Audio buffers** instead of the element. That is not this story: the lock-screen play and the media session ride on the element.

## Limits

- The ear hears what the browser renders into Web Audio. The phone's own output buffer (tens of ms) delays that sound but does not change which part of the recording
  it is, or at what volume it was rendered: the fade and the pause act before it. How long a phone plays on after `pause()` is still not measured.
- One MP3 encoding (192 kbps CBR, no Xing) stands for the publisher's. A file with a different frame size or a seek table could start at a different frame.
- The end's fade stops at `SILENT_VOLUME` (0.001, -60 dB), never at 0 (mw-ar5k42b.46): headless Chromium treats an element at volume 0, or muted, as silent and snaps its second
  from the audio clock, which can run 0.8 to 1.1 s behind the sound for two seconds after a seek, to the wall clock. A stop that was on time was read 0.84 to 1.1 s past its end
  (John 6:11, 7:50, 2:18, 15:23 of `LAMPAS_ALL_JOHN=1`, at 1x and 1.25x). On a plain page volume 0 or muted jumped the second +0.98 s in 19 of 19 plays, volume 0.0001 and above in 0 of 40.
- Headless Chromium on the Laptop is not his phone's Chrome. The margin holds there with 33 ms to spare at the start and 45 ms at the end.
