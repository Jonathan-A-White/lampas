# Play to, and listening by what he tapped (mw-5r3p30.72, remade by mw-5r3p30.705)

The header's Play (*Read from the top* / *Read from here*) always goes on from the verse he is at. Settings > Read aloud has one choice for where it stops, **Play to**
(registry key `readSpan`, `src/speech/readSpan.ts`; the hint says: Play goes on from here, to hear less tap a verse, a section heading or the place line):

| Play to | The voice stops |
| --- | --- |
| End of the book (default) | at the end of the book (Revelation 22 for Revelation), going on into each next chapter and turning the Reader to it |
| End of the Bible | at the end of Revelation 22, going on into each next chapter and each next book (2 John 1 into 3 John 1) and turning the Reader to it |

A span saved before this setting (Verse, Passage, Chapter) reads as End of the book (`playToOf`); nothing is asked of him and the saved row is left as it is.

A shorter reading comes from what he tapped, never from the setting. Each reads exactly its own span and goes through the one range player (`startReading`, `src/speech/readAloud.ts`):

| He taps | The voice reads |
| --- | --- |
| the play button on a verse in the text (*Hear the verse*) | that verse |
| a verse's Listen (the Verse view of a verse, *Play verse N*) | that verse |
| a section heading, then Listen (the view of a passage, *Play verses A-B*) | that section, from its heading to the verse before the next |
| the place line (*Mark 12 · 45%*, mw-5r3p30.699), then Listen (*Play verses 1-N*) | that chapter |
| the header's Play | from the verse he is at (the selected verse, else verse 1) to the end of the book or of the Bible |

The other readings are not a span of the Bible: *Read it aloud* on a tutor's answer or a page of prose (About, My study way, the Preface) reads that text, a Talk answer likewise (below).
The section heading is read from the data whether or not Settings > Section headings shows it.

<!-- toc -->

- [Crossing into another chapter](#crossing-into-another-chapter)
- [The recorded voice](#the-recorded-voice)
- [The speaking bar (mw-m7v5kc.3)](#the-speaking-bar-mw-m7v5kc3)
- [Pages of prose (mw-5r3p30.128)](#pages-of-prose-mw-5r3p30128)
- [The tutor's responses (mw-5r3p30.93)](#the-tutors-responses-mw-5r3p3093)
- [Hebrew in the tutor's text (mw-5r3p30.97)](#hebrew-in-the-tutors-text-mw-5r3p3097)
- [A respelling of a Greek sound (mw-5r3p30.272)](#a-respelling-of-a-greek-sound-mw-5r3p30272)
- [A speaker on any text he may want heard (mw-5r3p30.238)](#a-speaker-on-any-text-he-may-want-heard-mw-5r3p30238)
- [Read lessons to me (mw-5r3p30.366)](#read-lessons-to-me-mw-5r3p30366)
- [A Hebrew reading (mw-gdcyf98.14)](#a-hebrew-reading-mw-gdcyf9814)

<!-- /toc -->

## Crossing into another chapter

Either Play to goes on into the next chapter of the same book, and End of the Bible goes on from a book's last chapter into the first chapter of the next book (Romans 16 into 1 Corinthians 1). The reading (`src/speech/readAloud.ts`):

1. starts loading the next chapter while the last verse is spoken;
2. when the last verse ends, asks the Reader to turn to the next chapter (`openReader`, a new Back step) and waits as
   `crossing` (the reading bar says *Reading*, with no verse; Pause and Stop work);
3. the Reader that opens that chapter builds its plan (its own view and weave) and calls `continueReading`: the voice starts
   verse 1 at once, the highlight and following on screen work as in any chapter, and the open chapter
   (`src/data/readerChapter.ts`) becomes it.

`ReaderBody` (keyed by chapter) does not touch a reading that is crossing when it unmounts; leaving the Reader for another screen
pauses it (the speaking bar below offers Resume there and on coming back), and opening another chapter ends it. A chapter that cannot be fetched ends the reading before the Reader turns. Stop ends a
reading in every case, crossing included. A Listen (a verse, a section, a chapter) never crosses: it has no book to go on in (`inBook`), and a verse's reading is of span `verse`.

The verse being read keeps doing what it did: `verse-reading` on the bus per verse, the highlight, the scroll that keeps it in
view, and the wake lock.

## The recorded voice

A chapter of the Majority Standard Bible that has verse timings (`public/data/audio/msb-david/`, `src/data/audioTimings.ts`, `docs/data.md`) can be read by the publisher's own recording, David's reading
from openbible.com, in place of the phone's voice (mw-82lb97i.3). It is chosen by the **Bible voice** setting (mw-82lb97i.6): Settings > Listening > Reading voices, drawn above the English voice row (registry key `bibleVoice`, `src/settings/definitions/bibleVoice.ts`),
with three choices saved by the voice's id so another recorded voice can be added beside the first: **Recording (David)** (`msb-david`), **Recording on Wi-Fi only** (`msb-david-wifi`, the default since mw-zbgo4ep.30) and **Phone voice**
(`phone`). The row is shown always: every English text Lampas reads aloud is the MSB (the Septuagint's Brenton has no recording and is never read by it), and where no timings file exists the phone's voice reads
whatever is chosen. Its help opens with the credit line 'Recording: Majority Standard Bible, read by David, streamed from openbible.com'. The one seam is `wantsRecording()` in `src/speech/recordedVoice.ts`,
which `src/speech/settingsSync.ts` tells the choice at start and on a change (as it does the English accent): `msb-david` names `'msb-david'`; `msb-david-wifi` names it unless `connectionKind()` is `'other'` (a phone that cannot tell, `null`, is taken for Wi-Fi: the start would otherwise take David from it);
`phone` names none. Every caller asks that one function (`setBibleVoice` is a jsdom test's way in).

**How Wi-Fi is told.** `src/speech/connection.ts` is the one file that reads `navigator.connection` (the Network Information API's `type`; `setConnectionForTests` fakes it): `wifi` and `ethernet` are `'wifi'`; `cellular`
and every other named type (`unknown`, `none`, `bluetooth`, `wimax`, `mixed`, `other`) are `'other'`, so no mobile data is spent on a guess; no `navigator.connection` or no `type` (iOS Safari, desktop browsers) is
`null`: the phone cannot tell at all. Where it is `null` the Wi-Fi choice is **hidden** unless it is the saved or default value, which it is now (so the row shows all three, Recording on Wi-Fi only chosen, and its help ends with 'This phone cannot tell Wi-Fi from mobile data, so Recording on
Wi-Fi only is not offered.'); a `msb-david-wifi` that reaches such a browser reads David as `msb-david` does. `effectiveType`,
`downlink` and `saveData` are never a stand-in for Wi-Fi.

**The voice explains itself (mw-zbgo4ep.30).** Every place a Bible reading starts (the header's Play, a verse's play button, Play to, a Listen on a passage, and the crossing into the next chapter) asks `decideVoice()` in
`src/speech/voiceDecision.ts` once, with no wait; `src/reader/useReadFrom.ts` `begin` and `src/Reader.tsx` (the crossing, `mayAsk` false) are its only callers, so no start goes round it. It returns the recording to play, the line to
show (`StartOptions.notice`, drawn in the Reading bar's status line), or `ask`. PROVISIONAL wording, the Governor's to confirm: on Wi-Fi (or Recording (David)) in a chapter the index (`chapterListedNow`) does not list, the line
'David hasn't recorded <Book> here yet: the phone voice reads it.' once a book a session (an index not loaded yet says nothing); on mobile data with Recording on Wi-Fi only, in a chapter David has, the FIRST time a question
card (`src/speech/DataVoiceQuestion.tsx`, `role=alertdialog`) 'Play David over mobile data? It uses about 1.4 MB a minute (about 86 MB an hour).' with **Play David on data** (sets Bible voice to Recording (David) and plays David)
and **Keep the phone voice** (the phone voice reads; `lampas.dataVoiceAsked` in localStorage, never asked again; Settings still changes it; a tap outside takes the card down and starts nothing); and the first time the
phone's voice reads because of data (after Keep, in a chapter with no David, or crossing into the next chapter) the one-time notice 'On mobile data Lampas reads in the phone voice. David plays on Wi-Fi.'
(`lampas.dataVoiceNoticed`). The MP3s are 192 kbps mono: 24 KB a second, 1.44 MB a minute, about 86 MB an hour. The phone voice read by `passagePlayer.ts`, a tutor answer or a page of prose never uses the recording and says nothing.

**When it is decided.** When a chapter starts (the tap, and each crossing into a next chapter under Play to), never in the middle of one: a chapter that began in the recording finishes in it when Wi-Fi drops or the setting
changes (if the stream then fails, the fallback below reads on in the phone's voice), and a chapter that began in the phone's voice finishes in it. The Reader warms a book's timings (a small file) only when David could play : not for Phone voice, nor for Recording on Wi-Fi only on mobile data once the one question about data is answered (`timingsWarmFor`), nor before the saved setting is read; a change to Wi-Fi warms them (mw-zbgo4ep.33).

**What plays.** One `HTMLAudioElement` for the app's life, made on first use and reused for every chapter (a later chapter, after a crossing, needs no new tap), `preload` 'auto', its `src` the
timings' MP3 address. It plays from the start of the verse the reading starts at (a chapter, a book or the Bible read from its first verse starts at second 0, the narrator's announcement 'Audio Bible, John chapter one' included, as does a chapter a reading goes on into; one verse, a pericope or a reading from the middle of a chapter starts at the verse's own second, with no announcement: `playRecording`'s `title`, mw-82lb97i.28; the src carries that second as a media fragment `#t=` where the element is loaded afresh, and the element is muted from `play()` until its second is at the start, so a cold element never sounds from second 0 before its seek lands; that verse is marked meanwhile), tells
`readAloud.ts` the verse at each `timeupdate` (`verseAt`; never `requestAnimationFrame` alone, which stops when the page hides), and stops at the end of the span's last verse: a timer aimed at it,
`(end - sound) / playbackRate`, re-aimed on a change of speed, a pause, a seek and each `timeupdate`, which waits on rather than cut a word when the recording stalled; a `timeupdate` past the end and the element's
`ended` stop it too. The end is judged by where the SOUND is (`soundAt`, mw-82lb97i.18): the element's second moves in steps (each `timeupdate` on a phone, in bursts in Chromium), so it is run on by
the clock since it last moved (at most `RUN_ON_MS`, 300 ms, and only while it is seen to move: a stall, a seek or a `waiting` holds it). The timer is aimed `END_LEAD` (40 ms of the recording)
before the end and stops within `END_SLACK` (50 ms) of it, because a timer on a busy page fires late: the stop is at or before the end, which the timing maker's gap pass puts 0.05 s after the verse's last sound has died away. Read alone, the second was a step behind and the stop
waited for the next `timeupdate`: his John 1:50 ran on into 'Then He declar…' of verse 51. After that he still heard the first 'th' of 'Then' (mw-82lb97i.27), though verse 50's end lay in 0.4 s of digital
silence: a reading of the element can run behind the sound and then jump on (traced on a loaded page: 0.82 s of the recording a second of the clock, then +0.37 s in 0.175 s), and a reading that moves only
in steps is behind by up to a step when it is looked at. So within `NEAR_MS` (700 ms) of the end the timer looks at the element every `POLL_MS` (20 ms); `soundAt` carries the best reading of the last
`NEAR_MS` on by the clock (a reading is never ahead of the sound), never more than `RUN_ON_MS` ahead of the element's own second; and the last `FADE` (60 ms) before the stop are faded to silence by the
element's volume (`fadeVolume`: 1 until 110 ms before the end, 0 from 50 ms before it; full again at the next play), so the last of what a phone's output still holds when `pause()` is called was given to it quiet.
How long a phone's output plays on after `pause()` is not measured (no phone on the Laptop): the fade shortens it by 60 ms and cannot end it. `tests/e2e/recorded-voice-stop.spec.ts` plays verses of John's real timings over a silent MP3 and holds the
pause within 50 ms past each end and the volume at 0 when it comes (`LAMPAS_ALL_JOHN=1` runs all 879 verses, each chapter on a freshly loaded page, outside the gate). It seeks by verse (`seekToVerse`: the start, a Listen's Restart, a tapped verse and the skip below all use it). It plays at his English
speed (`rates-changed`, through `settingsSync.ts` `setRecordedRate`), keeping its pitch; a change while it plays takes effect at once.

**The reading is the same reading.** `startReading` and `continueReading` take one optional field, `recorded` (the chapter's timings): the state, the verse marked and kept in view, `verse-reading` per verse,
the wake lock, Play to's crossing, the Listen keys, Play again and `restartListen` behave as with the phone's voice; only the sound differs. A verse's play button stops at that verse's end, a Listen at the
end of its last verse, a passage at the verse before the next heading, and the header's Play at the chapter's end, where it crosses as before: into a chapter with timings the recording plays it from its
first verse, otherwise the phone's voice reads on (John 21 into Acts 1 under End of the Bible: PROVISIONAL, the Governor to confirm). The header's Pause and Play pause and play the element at the same
second; Stop and every new reading (a tutor's answer, a page of prose, another verse) pause it and drop its listener (the epoch). A weave turned on while it plays hands the reading to the phone's voice from
the next verse. The speaking bar holds a recorded reading too (below), so the header's Pause / Play and Stop are gone while it plays; the line under the header stays.

**When the phone's voice reads instead.** `recordingFor` (`recordedVoice.ts`) decides at the tap, with nothing awaited between the tap and `play()`: the Bible voice names a recording (`wantsRecording()`), the chapter is the MSB's
New Testament (`translation` 'msb', Greek source: no Old Testament, no Septuagint), every run of every verse to be read is English (the English view with nothing woven), the timings are already loaded
and have every verse to be read, and `navigator.onLine` is not false. The Reader loads the book's timings when a chapter opens (only while the seam names a voice) so the tap finds them; the Reader that
opens a chapter a reading crossed into decides by the same rule. **The recording reads the MSB's English only: a plan with any Greek or Hebrew run (the Greek view, the weave, a woven verse) is read by
the phone's voices as before.** Offline, no timings, the weave or the Greek shown, an Old Testament or Septuagint chapter, or the seam at null: the phone's voice, with no notice and no `src` set.

**Never silence.** `play()` refused, the element's `error`, or no `playing` within 8 s (`PLAYING_WAIT_MS`) hands the reading to the phone's voice from the verse in hand, with the line
*The recorded voice could not be reached: reading with the phone voice* (`RECORDING_FAILED_NOTICE`).

**No `crossOrigin`, no fetch.** The publisher's server sends no CORS headers, so the element has no `crossOrigin` attribute (with one it would refuse to play), and the MP3 is never `fetch()`ed, read
with WebAudio, cached or copied: the element plays it as any page's `<audio>` would, and there is no second element to preload. Tests never reach openbible.com: `features/recorded-voice.feature`
(jsdom, `tests/support/fake-audio.ts` moves the element's time) and `tests/e2e/recorded-voice.spec.ts` (a stub's URL answered with a WAV of silence; any other request there is failed and counted).

**The bar (mw-82lb97i.4, PROVISIONAL).** voice-kit's `<SpeakingBar />` shows only the package's own speech (`useSpeech`), and a recording is played by an element the package does not know, so a recorded reading has
`src/speech/RecordedBar.tsx`: Lampas's own small component with the same markup as voice-kit's (`section.bk-speech`, `data-testid` 'speaking-bar', `data-state` playing | paused, the buttons `.bk-speech__button` with
`data-action` previous-verse | pause | resume | restart | next-verse | stop and `data-primary` on Resume, voice-kit's `DEFAULT_LABELS`, each 44 px at the least, Lampas's `--bk-speech-*` colours). `LampasSpeakingBar` draws it into the SAME top slot
(`BarSlot`) while a recorded reading is going or paused, voice-kit's bar otherwise, never both; `useBarShown()` is true for it, so the Reader's foot, the floating ? and every sheet's `BarSlot` make room as for the phone's
voice. `ReadingState` has `recorded` (true from the first second of a recording to its end, a failure or a hand-over to the phone's voice) and `onBar` is true with it, so the header's Pause and Stop go. Pause and Resume call
`pauseReading` / `resumeReading` (the element at its second), Stop `stopReading`, Restart goes back to the start of the verse being read (`restartRecorded`: `seekToVerse` and play, the span's end kept) and, on a Listen, to its
first verse (`restartListen`, as for the phone's voice). If the slice is kept its home is voice-kit (an engine that takes an outside player), a later story; voice-kit is not changed here.

**What pauses it.** As docs 'Listen is a Listen' and 'An interruption pauses, it does not end' say for the phone's voice: a word said alone while it plays (a long press, a speaker, Tap to hear) pauses the recording at its
second BEFORE the word is heard and never talks over it (the package holds no reading's speech, so `greek.ts` says the word on its own, not `speakBeside`; `readAloud.ts` sees it in the package's speech, `recordedWordSync`, and in
`subscribeBeside` for the clip of a one-letter word, and pauses at once: `greek.ts` is unchanged). A hold of a talk bar or of the reading check (`askTranscriber.ts`, `interruptListen`) pauses it too. A Listen goes on by itself
when the interruption ends; any other reading waits for his Resume, which plays from the same second. A tutor's answer (`startAnswer`) is read in front of a recorded Listen and the Listen goes on after it, as before.
Leaving the Reader for another screen pauses it and coming back offers Resume; opening another chapter ends it (`Reader.tsx`'s effects, for a recording as for the phone's voice).
A page that hides does NOT pause a recording any more (mw-82lb97i.7): see 'The lock screen' below.
`features/recorded-voice.feature` and `tests/e2e/recorded-voice.spec.ts` (the bar in the Reader's foot, in the viewport, over no text) hold all of this.

**The lock screen (mw-82lb97i.7, PROVISIONAL, the Governor to confirm).** A recording, unlike the phone's voice, goes on with the screen off, as an audio Bible does. `src/speech/mediaSession.ts` (used only by a recorded
reading, through `readAloud.ts`) sets `navigator.mediaSession` while one is going or paused: metadata title '<Book> <chapter>' ('John 3'), artist 'Majority Standard Bible, read by David', album 'Lampas', artwork `icon-192.png`
and `icon-512.png`; `playbackState` 'playing' or 'paused' as the reading is; the action handlers Play, Pause and Stop call `resumeReading`, `pauseReading` and `stopReading`, so a headset's button does the same. The title follows a crossing into
the next chapter (it says the chapter being crossed into at once and stays across the gap, with no flicker to 'none'); when the reading ends (Stop, its span's end, a failure to the phone's voice, a weave that hands it over, the
phone's voice reading on into a chapter with no timings) the metadata and handlers are cleared and `playbackState` is 'none'. A phone without `navigator.mediaSession` reads on regardless. The phone's voice has no session:
voice-kit pauses it when the page hides, and Android stops its voice anyway, so it is unchanged. **What goes on while the page is hidden:** the recording, the verse marked (the verse reached while hidden is the verse marked when he comes
back), `verse-reading` on the bus, and a crossing into the next chapter (`cross`, then the Reader's `continueReading` on a hidden page, which plays the next chapter's recording and shows 'John 4' on the lock screen). **What does not:**
a word said alone and a hold to ask still pause it; leaving the Reader for another screen of the app still pauses it; a Listen an interruption paused while the page was hidden waits for his Resume; the wake lock is as it was
(`wakeLock.ts` drops it when the page hides and asks again when it shows). Previous and next track skip a verse: see 'Skip a verse' below. Not built, on purpose: seek handlers, a position state, a silent looping audio to keep the page alive (docs/pwa-best-practices.md section 11), `crossOrigin`, a fetch of the MP3. Not proved on a phone yet: the tests fake the page's hiding, so whether a locked phone keeps the end timer and the crossing on time is for the Governor's own check. `tests/unit/media-session.test.ts` (a stub session, `tests/support/fake-media-session.ts`) and `features/recorded-voice.feature` (hidden: not paused, the verse follows, the lock
screen's Pause and Play, hidden crossing into John 4) hold it.

**Skip a verse (mw-82lb97i.19, PROVISIONAL: the button words and 'Previous always means the verse before', the Governor to confirm).** While a recorded reading is going or paused the bar has two more buttons, **Previous verse** and
**Next verse** (`RecordedBar.tsx`, 44 px at the least, `data-action` previous-verse and next-verse, drawn as their icons alone so the five buttons fit two rows at 390 px; the words are their names), and the lock screen's (or a headset's, or a car's)
previous and next track do the same: all call `skipRecordedVerse(-1 | 1)` in `readAloud.ts`, which seeks the recording with `seekToVerse` to the START of the verse before or after the one being read, however far into this verse it is
(Restart is the way back to this verse's start). The verse mark follows at once (`markVerse`, `verse-reading` on the bus); a paused reading stays paused at the new verse's start and a reading in progress plays on from it. It never leaves the span:
a verse's own play button reads one verse, so neither skip goes anywhere; a Listen of a section keeps to its section (Next at its last verse and Previous at its first do nothing); the chapter's first verse has none before it, and nothing is said when
nothing is done. After the chapter's last verse a Play to End (the header's Play, to the end of the book or of the Bible) goes on into the next chapter's first verse, as it does when the recording ends by itself (the recording is stopped and the reading
crosses, `recordingReached`; a paused reading plays on there, because the Reader hands a chapter over only to a reading that plays); a Listen of a chapter or a section does nothing there. The action handlers `previoustrack` and `nexttrack`
are set with the rest while a recorded reading is going or paused and cleared when it ends. The phone's voice has neither buttons nor handlers. `features/recorded-voice.feature` ('Next verse', 'Previous verse' and the lock screen's) and
`tests/e2e/recorded-voice.spec.ts` (five buttons at 390 px, `recorded-skip`) hold it. Not built: a seek bar, a time display, skip buttons on the phone voice's bar.

**Later stories.** b3: the setting in place of the seam (done); b4: the media session (above); b5: skip a verse (above).

## The speaking bar (mw-m7v5kc.3)

Everything read aloud goes through voice-kit's speech package (`voice-kit/speech`, the engine Postern's read-aloud was lifted into, pinned by commit with the rest
of bsv-kit): the text is spoken a sentence at a time, each sentence in the language of its letters (`el-GR` for Greek, `he-IL` for Hebrew, the English voice
for Latin letters), and **Pause** keeps the sentence reached, **Resume** goes on from it, **Restart** goes back to the first and **Stop** clears it. A page
that hides pauses it. One bar, `<SpeakingBar />` of `voice-kit/speech/react`, shows whenever a verse, a chapter or the tutor's answer is read, and is the same as
Postern's and SpellForge's; its colours are Lampas's (`--bk-speech-*` in `src/index.css`).

- A verse is ONE speech under the key `read-aloud` (`greek.ts` READ_KEY): `readAloud.ts` joins its runs with a line break (a run is one language, so the package
  cuts a sentence at the end of every run too and tells the Greek from the English by its letters) and goes on to the next verse when the speech ends. It follows
  the package: a Pause, Resume or Stop made on the bar moves the reading's state (`syncWithEngine`). `Listen` on a verse stops at the verse end (`span` 'verse'), on a passage or the whole chapter at its end.
- Where the bar is drawn (`src/speech/SpeakingBarSlot.tsx`): a screen with a bottom edge leaves a `<BarSlot level>` and the one bar is drawn into the highest on screen:
  the foot of the shell (0, every screen but the Reader), the Reader at its foot (1), the Verse view above its hold bar (2), the Talk sheet above its foot (3).
  It is in flow, never over text, and the floating ? rides above it. The header's own Pause / Stop are gone while the bar holds the reading.
- A word said alone (a long press, a speaker, Tap to hear) is not a reading and has no bar (`isWordSpeech`).
- A Greek voice names a letter it is handed alone ('omicron'), accent or none, so Greek of ONE letter (ὁ, ἡ, ὦ, Ὃ: a held word, a speaker, a lesson's example,
  Tap to hear, a one-letter syllable of Sound it out, a lone woven word, a lone ὁ in a tutor's answer) is never handed to a voice as it is: the voice is handed
  the chosen pronunciation's `loneLetterForm`, for Modern Greek the vowel doubled (`οο`), which his phone's Greek voice says as the sound (mw-5r3p30.421, his
  pick on the listening trial; `docs/pronunciation.md`; mw-5r3p30.256 and .262 had handed a voice a respelling and a stressed vowel, and he heard 'Omicron'). In
  a reading the Greek is cut at every such word, inside a run as well as alone (`greek.ts` `loneLetterCuts`, mw-5r3p30.448: 1 John 1:1's Ὃ and ὃ had gone to
  the voice inside the verse's one line), and it is a line of its own in the verse's speech. On a phone with no Greek voice the scheme's clip of the sound plays instead (mw-5r3p30.347): said
  alone it is a word beside the reading (`greek.ts` `playLoneLetter`: a reading is paused, a Listen goes on after it); in a reading the verse is played in
  pieces (`readAloud.ts` `piecesOf`): the voice up to it, the clip, the voice after it; Pause during the clip waits, and Resume reads the verse from its start.
  A word speaker's phrase with such a word in it ('ἄγγελος, -ου, ὁ', `speak` and `speakWord`) is played in the same turns (`greek.ts` `playInTurn`, shared with `playPieces`; mw-5r3p30.640).
  A sound question says a vowel's sound the same way and names a consonant (`speakSound`); a teach tile names its letter (`speakLetter`). Words of two letters
  or more go to the Greek voice in lower case (mw-5r3p30.226).
  An elided word of one consonant (δ', Luke 9:24 ὃς δ' ἂν) stays in its stretch, but the voice is handed it joined to the word after it (`greek.ts` `greekVoiceForm`, `elision.ts`
  `joinElidedLetters`: δ'ἂν, said 'dan'), or it would name the letter ('Delta'); the text on screen is unchanged (mw-5r3p30.654; `tests/unit/lone-letter-clip.test.ts` sweeps every such verse).
  When δ' ends its stretch (the end of a run before an English chunk of a woven plan, or a one-letter word comes next) there is no word to join it to: `loneLetterCuts` cuts it
  off as its clip, the dh sound, on every phone (mw-5r3p30.657; the same test sweeps every plan kind).
- **Listen is a Listen** (mw-5r3p30.130, `docs/verse-view.md` 'Listen is a player'): a reading started with `listen: <key>` is paused by an in-app interruption and goes on by itself when it ends
  (`readAloud.ts` `interruptListen`; a word beside it, a Hold to ask, a recording, a tutor's answer); the speaking bar's Restart on it goes back to the first verse (`restartListen`); one that ran
  to its end by itself is remembered (`useListenCompleted`) so the Verse view's foot says Play again.
- **An interruption pauses, it does not end (mw-5r3p30.122).** A word, speaker or Tap to hear that speaks while a reading or a tutor's answer is under way (playing or
  paused) pauses it where it is (the package keeps the sentence, `greek.ts` `speakBeside`) and is said BESIDE it, straight to the phone's synthesiser: the bar stays,
  showing Resume, Restart and Stop, and Resume goes on from the sentence the answer was in (not from the start, not from the next). This covers the tapped Greek or Hebrew
  word, the speaker beside a flagged word of the reading check, the word sheet's and the guide's Hear it, and a hold on the Talk sheet's bar to talk (a hold of any talk bar goes through `speech/askTranscriber.ts`, which pauses it or
  a Listen). The word has its own key for `useSpeakingKey` (its speaker shows Stop), `watchWordEnd`, `stopSpeaking` and a second tap, which end
  only the word. A second word cuts the first off; Resume tapped while a word still sounds goes on after it; Stop on the bar ends everything. The word sheet and the Hebrew
  guide, which sit over the screen's own bar, leave a `<BarSlot level={4}>` so Resume stays in view. Only a new question, the panel being left (below) or Stop ends an answer.
- What the package lacks stays in `src/speech/greek.ts`: his **speed** for a language and the **voice he picked** (the package names a language and takes the phone's
  voice; the app puts the rate and the chosen voice on each utterance as it is handed to the phone, by wrapping `speechSynthesis.speak` once; with an English voice it sets the
  utterance's `lang` to the voice's own tag, hyphenated (Greek and Hebrew keep the pronunciation's tag), because Android Chrome sounds an utterance by its tag and ignores the voice object: mw-82lb97i.17), the slow speed of a
  word being sounded out, the no-voice help line and the word said alone (`speakWord`). A phone that lists no voices yet is waited for up to a second by the package
  before the first sentence (`warmVoices` ahead of a tap avoids it).
- Leaving the Reader for another screen **pauses** the chapter's reading and coming back offers Resume; the tutor's answers still stop when their panel goes (the story
  mw-5r3p30.122 kept this as it was; the Governor's rule, pwa-best-practices section 12, would pause them too, for a later story to decide). A page that hides pauses both
  (the package), and Resume continues from the same sentence on coming back.

## Pages of prose (mw-5r3p30.128)

About, My study way and the Preface have two round 44 px buttons in their header (`src/PageActions.tsx`, `usePageActions(hash, title)`: `buttons` for the
header's `action`, `notice` under the header):

- **Read aloud** (aria-label `Read aloud`, `aria-pressed` while its own reading is on; a second tap stops it) reads the page top to bottom. The page marks each
  paragraph, heading or line worth reading with `data-read-block`; each block is one "verse" of a plan handed to `startReading` under the answer id
  `PAGE_READING_ID`, so the speaking bar (Pause, Resume, Restart, Stop) and the package's sentence-keeping are the ones above, and Resume goes on from the same
  sentence. Greek and Hebrew stretches are runs of their own (`src/speech/pageRuns.ts`, the cut a long press and `answerRuns` make). The block being read has
  `data-reading` (the highlight in `src/index.css`) and is scrolled into view; leaving the page stops its reading, and only its own. A new page of prose is
  `usePageActions` plus `data-read-block` on its text.
- **Share** (aria-label `Share`) calls `navigator.share({ title, text, url })` with the page's name, its first block and its own link
  (`https://lampas.allmymind.org/#/about`, `#/studyway`, `#/preface`); with no `navigator.share` (or one that fails for a reason other than the sheet being
  closed) it copies the link and says 'Link copied', or shows the link in a field to copy by hand when the clipboard refuses.

## The tutor's responses (mw-5r3p30.93)

Settings > The tutor's responses has one choice, **Read the tutor's responses aloud** (registry key `readTutor`, On by default, so the tutor can change it
when asked). On, a response is spoken the moment it arrives, with no tap (`src/speech/tutorVoice.ts`, the one engine of `startAnswer`, English in the
English voice and Greek words in the Greek voice):

- a list in an answer (mw-5r3p30.928, `src/markdown/plain.ts`): a numbered item opens with its ordinal word ('First, Daniel...', 'Second, ...'; past tenth 'Number 11, ...'), a bulleted item is its own sentence, and no digit, dot or star is said; the instructions (`340-how-to-answer.md`) have the tutor write at most 7 items, each one sentence that reads as speech;
- the reading check's verdict (`ReadCheck.tsx`): the heading, the note, and each word to fix with its tip in full ("blessed: say it as one beat, blest");
  never the verse, the chunks or the words of "Read these again", which are for him to read;
- the answer to Ask the tutor in the Verse view (the Talk sheet's, mw-5r3p30.842), and the answers of the Talk sheet and of
  Ask the tutor from any screen (as the Talk sheet already read them, now through the setting). 'Sound it out' still sounds the syllables out: he asked for that.

A new question or message (`useTalk`), leaving the panel or the cards (`stopAnswerSpeech`), and a tap on the response (not on a button in it, `stopOnTap`) stop the speech
at once; a tapped word, a speaker or a hold to talk only pause it (above). Off, nothing is spoken by itself; the speaker on an answer ('Read aloud') still reads it.

A response that comes while the page is hidden (he is in another app, `document.visibilityState` 'hidden') is not spoken (mw-5r3p30.270): `tutorVoice.ts`
`startAnswerWhenSeen` keeps it in `src/speech/tutorWaiting.ts`, and when he is back a bar at the top of the app (`TutorWaitingBar.tsx`, in the shell's flow inside `ShellBars.tsx`, above every screen, sheet and backdrop, which start below it,
so the Verse view and the Talk sheet he asked from do not cover it and it does not overlap 'Update ready': mw-5r3p30.322, mw-5r3p30.636; `tests/e2e/tutor-waiting-bar.spec.ts`) says **The tutor answered: tap to play**; his tap starts it (a tap is what lets the page speak). A new question, a tap on the response or a newer response drops it; leaving the panel (`stopAnswerSpeech`, which stops the speech and keeps the response that waits, mw-5r3p30.323) does not: the bar stays over the Reader and plays it on his tap; nothing is sent outside the app, no notification. With the page in front the whole time, nothing changes.

## Hebrew in the tutor's text (mw-5r3p30.97)

A Hebrew word in a response is said in the Hebrew voice (mw-gdcyf98.27), the word itself at the Hebrew speed, as a Greek word is said in the Greek voice: `answerRuns`
cuts the response with `src/speech/languageRuns.ts` (the cut a page of prose, `pageRuns`, makes too), a run of `hebrew` for each Hebrew stretch, so the English voice is never given
Hebrew letters and the Hebrew is never skipped. The transliteration beside it ('רוּחַ ruach') is read as English; a capitalised respelling of the Hebrew word ('roo-AKH') is replaced by the Hebrew word, as a Greek respelling is.
Each script of `src/script/scripts.ts` names the speech language it is `speaks`; a new language there is spoken by the same cut with no new branch. A tap on a Hebrew word still says it by itself (`script/HebrewWord.tsx`).

## A respelling of a Greek sound (mw-5r3p30.272)

The tutor respells a Greek sound ('πνεῦμα sounds like PNEV-ma', 'Say it "pnev"'). An English voice spells such a token letter by letter, so
`answerRuns` puts the Greek it respells there instead, for the Greek voice: the answer's own Greek words are respelt by the chosen pronunciation
(`respell`, whole or by runs of syllables) and a capitalised or hyphened-capital token, or a quoted lower-case one, that matches is replaced by that Greek
('PNEV-ma' by πνεῦμα, "pnev" by πνεῦ). A capitalised respelling that matches no Greek in the answer is said by the English voice as a lower-case word;
acronyms (NT, BDAG, LSB ...) and a quoted English meaning are left alone. The match is on the text: the grinds' answer shape does not tie a respelling to its Greek.

## A speaker on any text he may want heard (mw-5r3p30.238)

Wherever Lampas shows a block of prose a learner may want to hear, a small quiet speaker reads it aloud: `src/speech/ReadAloud.tsx`, ONE component
(icon only, aria-label 'Read aloud', 'Stop reading' while its text is read, a speaker named 'Reading paused, tap to stop' while the bar offers Resume; a second tap stops it). It is on the Grammar sheet (title, explanation, 'In Greek'),
the idea sheet of every idea and letter (title, What it is, How to spot it, How it sounds, the Worked example), a new word's sheet, each tutor answer (in the
Talk sheet and in the Verse view's Ask; where the 'Hear the answer' play button used to be) and each version in About's What's new and in the sheet shown after an update or opened from the Update ready banner (`DEFAULT_LABELS` kind, then
the line; the sheet is Lampas's own SpokenWhatsNewSheet, with a speaking bar slot, since pwa-kit's WhatsNewSheet has no place for one) and each Settings row's open More help (at its right). It is the reading engine of 'Pages of prose' and 'The tutor's responses': the text is cut into runs (`pageRuns`, or the answer's `answerRuns` when
the Markdown must go first), each Greek stretch in the Greek voice and the rest in the English one, at his speed and in his voices; the package's bar has Pause,
Resume and Stop; the words stay on screen. The read starts from the tap itself (section 12). A sheet that sits over the screen's bar has a `BarSlot` so the bar
shows above its foot (Grammar 5, new word 5, idea 6). `proseOf(parts)` (src/speech/proseOf.ts) joins a block's parts with a stop between them. A phone with no Greek voice reads the English,
leaves the Greek out and shows the same one-line help as the word speakers (`noVoiceHelp`); a phone that cannot speak at all says so in a line, never a silent button.
Tests: features/read-aloud-anywhere.feature.

## Read lessons to me (mw-5r3p30.366)

For a reader who reads English slowly (the Governor's son, eight): Settings > Read aloud > **Read lessons to me** (registry key `readLessons`, On | Off, **Off** by default,
`src/settings/definitions/readLessons.ts`). With it On the Grammar sheet, the idea sheet and a new word's sheet start the shared Read aloud by themselves when they open
(`LessonReadAloud` in `src/speech/ReadAloud.tsx`: `ReadAloud` with `auto`; the idea sheet waits until its passage is loaded, so the Worked example it reads is the one on screen;
a new word's sheet reads each word as it comes up). The words are never hidden; the speaker still stops the voice; closing the sheet ends its own reading. Chrome and Safari
may refuse speech that no tap asked for: the utterance then ends in the error 'not-allowed' (`onSpeechRefused` in `src/speech/greek.ts`), and the speaker becomes a gently
pulsing 'Tap to listen' (still a button; `motion-safe:animate-pulse`) instead of silence. A refusal that never fires an error (a browser that just stays quiet) is not detected.
Tests: features/read-lessons.feature.

## A Hebrew reading (mw-gdcyf98.14)

*Read it aloud* is offered in the Hebrew view of an Old Testament verse as in the English one (`actionsFor`, `src/verse/action.ts`). In the Hebrew view (`ReadingView` 'hebrew', made from the Reader's 'greek' view by the chapter's
language: `readingViewOf`, `src/services/reading.ts`; `useReadChecks` does it by the book) the verse is read in Hebrew, **pointed and without the cantillation marks** (`readingText`, `hebrewPointedForm`), and the request carries:
`lang` `'he'` (the chosen Hebrew scheme's `scoringLang`, `src/speech/pronunciation.ts`; `grinds/verse-read.json` `scoring.langs` is `en`, `el`, `he`), `target_text` the Hebrew words in order, the Hebrew scheme's id and guide in the
`pronunciation` and `pronunciation_guide` fields that carry the Greek scheme's for a Greek reading (no new field, so `src/tutor/knows.ts` is as it was), and **no `greek_words`**. A woven Old Testament verse (`wovenReading` with the
Hebrew scoring language) is sent as segments `en` and `he`, the Hebrew pieces without cantillation, and is kept as a reading of its own (`WOVEN_LANG`), off the ladder and the drill tally, as the Greek weave is.

The panel's words follow the view: a marked Hebrew word is drawn right to left in the Hebrew face, its speaker (`Hear <word>`, "Should sound") says the word, or the answer's `say` when that has Hebrew letters (a `say` in Latin letters is
dropped, as a Greek reading's is), in the phone's Hebrew voice, and `Me` plays his own clip of the word as it does for any language. In a woven reading each token is set and spoken by its own letters: Greek, Hebrew or English.

The miss tally and the drill: a Hebrew reading is tallied by the word itself (`hebrewUnit`: pointed, no cantillation, no maqaf), as an English one is, and the words missed in two of the last five readings are offered as
*Drill these words*; the drill sheet reads them in Hebrew, and finishing schedules them in Review (`he:<word>`), where the card is a Hebrew flashcard (`SoundWordCard`).
