# Attribution

> If I have seen further it is by standing on the shoulders of Giants.
> — Isaac Newton, letter to Robert Hooke, 1675

Lampas stands on other people's work, so it names every text, lexicon, library, font, service and idea it
builds on, with a link to each, its licence and what we changed. Credit is owed whether or not a licence asks for it.
Lampas is free to read: the text, the lessons and the quizzes need no licence. A licence unlocks the AI, the tutor and everything sent to it; until a phone has one, Settings shows those options off with “Needs a licence”, which opens the Licence page. Once, on a third visit, one quiet line at the foot of the Reader says what a licence adds; it is never pressed. Lampas opens as a plain English Bible: at the top of Settings, How much Greek? is a dial from Just English to All in, and each step shows more of the Greek and nothing more (Curious: the Greek view and a word's Strong's number; Dipping a toe: the Weave; Learning: new words each day; Reading in Greek: the Reader opens in Greek; All in: everything). The Study resources follow the dial: at Just English the Greek ones, such as Strong's and Black's grammar, are left out, and at the steps between the English ones come first.
Tap the round Ask the tutor button to ask what any of it gives you, what its licence lets us do, or why we credit it at all. From Today, the tutor knows which of the day's links you opened and opens by naming them, and a screenshot of what you read is one tap away. When a drill ends, the same button sits beside Done, and the tutor is given every question of the drill, the answer you gave, the right answer and which were right or wrong, so you can talk the results through. On the Paradigms list and on each table there is an Ask the tutor button; on a table the tutor is told which table, whether you are in Learn or Drill, the cell you are on (with its form when the table shows it) and the word you came from, and each table keeps a talk of its own. A table opened from a word’s sheet can show that word’s own forms, This word | The pattern: every form of the word the New Testament uses is laid in its cells (never a made-up one), a cell the text never uses says not in the NT, and a tap on a form says where the text first uses it and opens the Reader there.

## Texts and data

- **[Majority Standard Bible (MSB), New Testament tables](https://majoritybible.com).** Public domain. Byzantine Greek word-aligned
  to the MSB English, with Strong's numbers and Robinson-Pierpont parsing codes: the text and the English you read.
  Source: the msb_nt_tables.tsv file at majoritybible.com. Its Greek is the Robinson-Pierpont 2005 edition (public domain), found by comparing it word by word
  with the [byztxt Byzantine text on GitHub](https://github.com/byztxt/byzantine-majority-text), also public domain (scripts/greek-edition.ts, docs/greek-edition.md); nothing of that repository is in the app.
  Changes: cut into one file per chapter, with short keys (scripts/data-build.ts, docs/data.md); each verse is also scored for how hard its Greek is to say aloud, in public/data/ladder/el.json (scripts/ladder-el.ts, docs/reading-ladder.md); the app's Reading ladder walks the reader up that list, easiest first, and keeps his place; a sound he keeps missing gets a drill of short words from this text (the commonest words that hold the sound, easiest to say first, from public/data/frequency.json); Review's question "What does this say?" shows the Greek of a chunk or clause of a verse and offers four of the verse's own English chunks as the answers (none invented, mw-emk3xt.2); Review's question "Parse" asks a word of a verse one feature at a time (part of speech, tense, case and the rest) and its "Tap the one who does it" asks which word of a verse is the subject, the verb or the object, both worked out from the Robinson-Pierpont parsing codes of the verse's words (mw-emk3xt.3). The Goal screen counts, and the idea sheet shows, the uses of several words in a verse (a clause with ἵνα or ὅτι, the genitive absolute, the three kinds of “if” and others), found from the same parsing codes and dictionary forms and never from the English, and drawn as the verse with those words marked (mw-br588b.2). The word sheet shows the English a word stands for without the verse's punctuation at its ends ('at all times', not 'at all times.'; an apostrophe or hyphen inside stays); the Reader's text keeps every mark (mw-5r3p30.265). In 1 John 2:6 the English “walk” and “walked.” are moved to the Greek verbs they translate (the table paired them the other way round) (mw-5r3p30.334).
- **[Maurice A. Robinson, "The Case for Byzantine Priority"](https://byzantinetext.com/study/editions/robinson-pierpont/).** Public domain. The text read in the app is the appendix
  of the Robinson-Pierpont 2005 edition (pp. 533 to 586), whose copyright notice says: "we hereby release into the public domain the introduction and appendix which have been especially prepared for this edition"
  (the same notice is on the edition's page there). It is that appendix, not the article *TC: A Journal of Biblical Textual Criticism* published in 2001: the two differ (Robinson
  revised the essay for the book), so the 2001 article, which that release does not cover, is only linked, never copied. Compared (mw-5r3p30.162): the 2005 text has 168 footnotes to the journal's 167, opens with a note on where the essay was first
  presented, and numbers its principles in the text where the journal numbered paragraphs 1 to 113; it differs in wording throughout ("predominated among the Greek-speaking world" for the journal's "in the Greek-speaking world",
  "can more easily account for the rise and dominance" for "explain", and many longer rewrites).
  Source: [the appendix as a PDF from the editors’ site](https://byzantinetext.com/wp-content/uploads/2016/11/editions-rp-11-appendix.pdf), checked against the page images of the edition's
  [scan at the Internet Archive](https://archive.org/details/RP2005KoineGreekNTinByzantineTextform).
  Changes: the PDF's Greek, typed in Latin letters, is set in Greek letters (the PDF's text has no accents, so the Greek here has none); the signs the PDF draws as pictures for the papyri, aleph and the Majority text
  are the letters 𝔓, ℵ and 𝔐; footnotes open under the paragraph that cites them; Chart 1 is left in the edition; the list of abbreviations (p. 587) is not carried
  (scripts/essay-build.ts, src/essay/robinson.json). The 2001 article stays linked as "Original (TC Journal, 2001)", as the older text.
- **[Tyndale House's Brief lexicon of the Greek NT, extended (TBESG), from STEPBible](https://www.stepbible.org).** Licensed
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit: STEPBible, Tyndale House, Cambridge. The words' lemmas,
  glosses and definitions (the definitions are Abbott-Smith's). Data used under the licence.
  Changes: per Strong's number only the first entry is used, with its lemma and gloss as given, except that a gloss
  written as a range and the sense chosen ('spirit/breath: spirit') is shown as one list of meanings ('spirit, breath'); the
  gloss of a verb whose aorist cannot be guessed (ἔρχομαι) ends with it ('to come/go (aorist ἦλθον)'); the
  Abbott-Smith definition has its markup, scripture references and daggers removed and is cut near 300
  characters (scripts/data-build.ts, docs/data.md).
- **[eSpeak NG](https://github.com/espeak-ng/espeak-ng)** speech synthesizer. The short clips of a vowel's sound that play when you hear a Greek word of one
  letter (ὁ, ἡ, ὦ, Ὃ) on a phone with no Greek voice, in public/sounds/: with a Greek voice the app hands it the vowel doubled ('οο'), which it says as the
  sound, where the letter alone it would name ('omicron'). And the clip of the th of 'this' that plays, on every phone, when you hear δ' alone (δέ with its
  vowel dropped), which a voice would name ('delta').
  Each is eSpeak NG's Greek voice saying one sound from its phoneme input, not a letter. Licence: eSpeak NG is [GPL-3.0](https://github.com/espeak-ng/espeak-ng/blob/master/COPYING);
  the clips are sound it made, and no eSpeak NG code is in the app. Changes: silence trimmed, cut to MP3 with [FFmpeg](https://ffmpeg.org) (scripts/sounds-build.sh).
  Its Greek voice is also how the app chose what the phone's voice is handed for a word said alone (a word ending in '!', so the voice's pitch peaks on the
  stressed syllable): the pitch of each syllable was measured with [Praat](https://www.fon.hum.uva.nl/praat/) (GPL-3.0) through
  [Parselmouth](https://github.com/YannickJadoul/Parselmouth) (GPL-3.0) on the factory's machine (scripts/stress-peak/peaks.py, docs/pronunciation.md
  'A word said alone'); neither is in the app.
- **Trial clips of a neural Greek voice** (public/sounds-trial/, heard only on the listening page sounds-trial.html, which no screen of the app links to; docs/research/letter-sounds.md).
  The same vowels, one-letter words and letter sounds as above, cut out of sentences said by three free, local voices, so that they can be heard beside the phone's own voice before one is chosen:
  [Piper](https://github.com/rhasspy/piper) (engine [MIT](https://github.com/rhasspy/piper/blob/master/LICENSE.md); its voice el_GR-rapunzelina-low was trained on a
  [Greek single-speaker set](https://www.kaggle.com/datasets/bryanpark/greek-single-speaker-speech-dataset) released CC0), [Coqui TTS](https://github.com/idiap/coqui-ai-TTS) (the maintained fork; engine
  [MPL-2.0](https://github.com/idiap/coqui-ai-TTS/blob/dev/LICENSE.txt); its voice tts_models/el/cv/vits, trained on Common Voice Greek, is released BSD-3-Clause in its model list) and
  [Chatterbox](https://github.com/resemble-ai/chatterbox) by Resemble AI ([MIT](https://github.com/resemble-ai/chatterbox/blob/master/LICENSE)). Licence: the clips are sound these made; no code or model of theirs is in the app.
  Changes: each sound is cut out of a carrier sentence by the voice's own alignment, silence trimmed, cut to MP3 with [FFmpeg](https://ffmpeg.org) (scripts/sounds-trial/make-clips.py).
- **[Biblical Mastery Academy](https://biblicalmastery.academy/).** The inspiration for Lampas's one grammar path, the ladder. An earlier path taught
  in the sequence of the Greek Success Path of Biblical Mastery Academy; it no longer teaches anyone, but its order is kept as a record and the ladder's own order was worked out beside it. Only a sequence was ever followed: the lesson titles,
  the method, the drills, Drill it (the walk that proves an idea, its wrong answers near misses of the point first, a sound that changes by the next letter or by its place in the word (αυ, ευ, ηυ, μπ, ντ, γκ, γχ) taught on its sheet as a rule with a word for each side, and drilled on both sides, each asked on a real word with the pair marked) and the drill plan that follows a Drill it that does not prove an idea (a short drill on each weak point, easiest first, then Drill it again) and Try it on a verse (three questions on the easiest verse at his level that has a form of the idea) in Lampas are its own, and no course text, image or exercise is copied. Changes: in the record of its order a few lessons are moved earlier or later, so that no idea is taught before an idea it rests on.

## Type

- **[Gentium Plus](https://software.sil.org/gentium/)** by SIL International, the Greek type of the reader. Licence:
  [SIL Open Font License 1.1](https://openfontlicense.org/open-font-license-official-text/), Copyright (c) 2003-2022 SIL International;
  the licence text is in `src/fonts/OFL.txt`. The Greek and Greek Extended subsets are bundled as the
  @fontsource/gentium-plus 5.3.0 builds. Changes: none.
- **[Noto Serif Hebrew](https://github.com/notofonts/hebrew)** by the Noto Project Authors, the Hebrew type of the tutor's answers. Licence:
  [SIL Open Font License 1.1](https://openfontlicense.org/open-font-license-official-text/), Copyright 2022 The Noto Project Authors;
  the licence text is in `src/fonts/OFL-noto-serif-hebrew.txt`. The Hebrew subset (letters, points and accents; 400 and 700) is bundled as the
  @fontsource/noto-serif-hebrew 5.3.0 builds. Changes: none.
- **[Literata](https://github.com/googlefonts/literata)**, **[Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/)**, **[Lexend](https://www.lexend.com/)**
  by The Literata Project Authors, the Braille Institute of America and The Lexend Project Authors, the English fonts to choose in Settings: Literata, a book face for long reading;
  Atkinson Hyperlegible, very clear, made for low vision; Lexend, built for reading ease. Licence: each is
  [SIL Open Font License 1.1](https://openfontlicense.org/open-font-license-official-text/), Copyright 2017 The Literata Project Authors, Copyright 2020 Braille Institute of America, Inc.
  and Copyright 2019 The Lexend Project Authors; the licence texts are in `src/fonts/OFL-literata.txt`, `src/fonts/OFL-atkinson-hyperlegible.txt` and `src/fonts/OFL-lexend.txt`.
  The Latin subsets (400 and 700) are bundled as the @fontsource/literata, @fontsource/atkinson-hyperlegible and @fontsource/lexend 5.3.0 builds. Changes: none.

## Libraries the app runs on

- **[React](https://react.dev/)** (`react`, `react-dom`). The interface library, from Meta and the React community.
  Licence: [MIT](https://github.com/facebook/react/blob/main/LICENSE). Changes: none.
- **[Dexie](https://dexie.org/)** (`dexie`, `dexie-react-hooks`) by David Fahlander. Keeps your words, answers and settings on the phone
  (IndexedDB). Licence: [Apache-2.0](https://github.com/dexie/Dexie.js/blob/master/LICENSE). Changes: none.
- **[bsv-kit](https://github.com/Jonathan-A-White/bsv-kit)** (`bsv-kit`) by Jonathan A. White. The licence gate, the tutor's payments
  and messages.
  Licence: [MIT](https://github.com/Jonathan-A-White/bsv-kit/blob/main/LICENSE). Changes: none.
- **[pwa-kit](https://github.com/Jonathan-A-White/pwa-kit)** (`pwa-kit`) by Jonathan A. White. What's new (the Update ready banner's line, the sheet after an update, the list of versions in About and its Check for updates button, `pwa-kit/whats-new`), the one-time tips (`pwa-kit/tips`, the line with Got it), the update flow (`pwa-kit/app-update`: the Update ready banner's state, the tap that takes the new build over and reloads once) and the full-screen picture viewer (`pwa-kit/picture-viewer`: a picture in a talk opens on the browser's top layer, with pinch, drag and double-tap zoom; it was Postern's viewer) and the settings (`pwa-kit/settings`: each setting declared once, the list of rows searched and hidden by what does not apply, the Settings home's search box and group buttons, and the check of a change the tutor asks for; carved out of Lampas). Also under the grammar ladder, and by the same hand, [learn-kit](https://github.com/Jonathan-A-White/learn-kit) (`learn-kit`): the learning graph (which idea rests on which, how deep it sits, the ideas ready to learn now), the review schedule (the gaps between reviews and when an idea is due) and the rules of the Drill it walk and Your drill plan, carved out of Lampas so that Lampas and the spelling and maths app share them.
  Licence: [MIT](https://github.com/Jonathan-A-White/pwa-kit/blob/main/LICENSE) (learn-kit: [MIT](https://github.com/Jonathan-A-White/learn-kit/blob/main/LICENSE)). Changes: none.
- **[voice-kit](https://github.com/Jonathan-A-White/voice-kit)** (`voice-kit`) by Jonathan A. White. Read aloud (the sentence queue, the Pause, Resume, Restart and Stop bar, `voice-kit/speech`, also behind the Play on a Bible reference's pop-up), and the way you ask the tutor about a verse (the big Hold to ask bar with your words as you speak, and Type a question beneath it, `voice-kit/composer`, lifted from Postern's message composer), and how Lampas hears you whenever you hold to talk (the one hold-to-talk bar of the Talk bar, the Talk sheet’s compose button (the same as Ask the tutor’s, with attach and camera), Hold to ask, Welcome and the letter drill's Say it, `voice-kit/composer`: its listening goes on through a pause while you think, and tries each of the phone's ways of hearing you, on the phone and online, before it says it cannot; Settings > The tutor > Talk chooses whether a bar is held or tapped to start and stop (Talk: Hold or Tap), and whether Ask the tutor and the Talk sheet send your words when you let go or wait for the Send button (Send: On release or By button); anything being read aloud pauses while you hold); in our tests, its honest speech and microphone fakes (`voice-kit/testing`, whose two clips are spoken by
  [eSpeak NG](https://github.com/espeak-ng/espeak-ng)). Licence: [MIT](https://github.com/Jonathan-A-White/voice-kit/blob/main/LICENSE). Changes: none.
- **[BSV SDK](https://github.com/bsv-blockchain/ts-stack/tree/main/packages/sdk)** (`@bsv/sdk`) by the BSV Association. Keys, signatures
  and transactions under bsv-kit. Licence: [Open BSV License](https://github.com/bsv-blockchain/ts-stack/blob/main/packages/sdk/LICENSE.txt).
  Changes: none.
- **[react-markdown](https://github.com/remarkjs/react-markdown)** (`react-markdown`) by Titus Wormer and the unified collective. Draws the
  tutor's answers, which are written in Markdown. Licence: [MIT](https://github.com/remarkjs/react-markdown/blob/main/license). Changes: none.
- **[remark-gfm](https://github.com/remarkjs/remark-gfm)** (`remark-gfm`) by Titus Wormer and the unified collective. Tables, lists and
  strike-through in those answers. Licence: [MIT](https://github.com/remarkjs/remark-gfm/blob/main/license). Changes: none.
- **[node-qrcode](https://github.com/soldair/node-qrcode)** (`qrcode`) by Ryan Day. Draws this phone's key as a QR code on the unlock screen,
  so Postern can scan it to issue a licence. Licence: [MIT](https://github.com/soldair/node-qrcode/blob/master/license). Changes: none.
- **[Workbox](https://developer.chrome.com/docs/workbox)** (`workbox-precaching`, `workbox-routing`, `workbox-strategies`) from Google Chrome.
  The service worker that lets Lampas open with no signal. Licence: [MIT](https://github.com/GoogleChrome/workbox/blob/v7/LICENSE). Changes: none.

## Services and apps

- **[WhatsOnChain](https://whatsonchain.com)**. A public Bitcoin SV block explorer. Lampas asks it whether your phone's key holds a Lampas
  licence. Licence: none needed, it is a service used through its public API and no code or data is copied; its [terms](https://whatsonchain.com/terms) apply. Changes: none.
- **[Twilio Verify](https://www.twilio.com/en-us/user-authentication-identity/verify)**. Only if you tap Get a licence on the Licence page: the email and the phone you type
  go to Postern, which has Twilio send a code to each so you can prove them, and Twilio sees them for that. Postern keeps only scrambled (keyed) fingerprints of them, never
  the address or the number, so each can be used once; one licence covers up to three devices, which My devices on the Licence page lists, renames and removes. Licence: none needed, it is a service used through Postern's backend and no code or data is copied; its [terms](https://www.twilio.com/en-us/legal/tos) apply. Changes: none.
- **[Postern](https://github.com/Jonathan-A-White/postern)** and its mill, by Jonathan A. White. Carries your questions to the tutor (a question on its way is kept on your phone until its answer is stored, so leaving the page or a reload does not lose it), with any pictures you attach, the last ten turns of the talk and a short running summary of the older ones, which the tutor writes and your phone keeps (so a long talk does not forget what you said at its start), and the name of the talk (the passage and the time of its first turn), by which the mill keeps the tutor's thread of that talk going from one turn to the next (when it has to start the thread again it writes down the key points of the talk so far, which your phone keeps as the summary and shows you), and what you chose to tell it in Settings > About you, what it learned about you in your talks (which you can change or remove there), how you go, as your phone counts it (when you ask about a piece of grammar, that includes which ideas under it you have not learned yet, so the tutor can offer to take you to the next one), what is on your Today list (the pieces behind the Reader’s Today chip, by name, and which you have ticked, so the tutor can answer what is on your drill today and offer to open Today; nothing opens unless you tap or say yes), which of your solid words and ideas have gone rusty (you slipped on them lately or have not met them for a long while, so the tutor can say so and offer to move them back to Frontier and practise; nothing moves unless you tap or say yes, and a grammar idea moves only while no other idea is being learned, because you learn one grammar idea at a time), which grammar ideas you missed in a Review round, with verses of your passage that use them, so it can write more questions on them in the background, which language the Reader shows (English or Greek, so the tutor offers you the Greek only when you are reading in English, and once), and, the first time your licence is found on a new phone, your answers to a short welcome (why you are here, what you want and one thing about yourself, which the tutor writes to your memory; Skip ends it), and the notes Lampas keeps about you in Settings > Memory (the index and the notes named for the book, word or screen you are on, which the tutor may add a line to and may change or remove only when you ask it to), and
  its answers back. Settings > Ask for more sends the makers what you type in one of its short forms (what you would like Lampas to have, why, and a link), the same way. Lampas's place in your phone's share sheet follows the way Postern takes what you share. Licence: [MIT](https://github.com/Jonathan-A-White/postern/blob/main/LICENSE). Changes: none.
- **[Claude](https://www.anthropic.com/claude)** by Anthropic. The model behind the tutor's answers (including its reading of the pictures you send it, and its finding of the Bible references in a picture you share to Lampas, and its reading of the chapter on a screenshot of Audible you send when you come back from listening), the extra drill questions it writes in the background, from verses of the passage you read, on the grammar ideas you missed in a Review round, the reading check (which grades a reading you stop part-way through as far as you got, and helps you with the word you stopped at), the reading drill (which grades each practice word you read aloud), the tips and the help with filling in a form.
  Licence: none needed, it is a service used through the mill; its [terms](https://www.anthropic.com/legal/consumer-terms) apply. Changes: none.
- **[Logos Bible Software](https://www.logos.com)** and **[Accordance](https://www.accordancebible.com)**. Only if you switch them on in
  Settings: Lampas links to a word or a verse in the app you already own, and offers a link to the app's page in your phone's store if you do not have it yet. No text, image or data is taken from either. Their own licences are yours.
  With Logos on, an idea sheet's Read more links to the lesson that teaches the idea in the grammar books you turn on (Settings > Study resources > Logos > Your Logos library > Grammars):
  David Alan Black's Learn to Read New Testament Greek (third edition, B&H, 2009) first, whose lesson titles and starting pages Lampas keeps, read from the book's
  table of contents as [Google Books](https://books.google.com/books/about/Learn_to_Read_New_Testament_Greek.html?id=41j7siCRS0QC) lists it. No text of the book is kept.
  Under the Logos switch, Ask for another book sends the title you type (and its author) to the makers as a request, which they weigh against what Lampas is for; nothing of your Logos library is read or sent.
  Your Logos library > Commentaries lists John Calvin's commentaries and his Institutes of the Christian Religion, each Off until you turn on the ones you own; Lampas cannot see your Logos library, so
  it keeps only which books are on. The tutor is told the title and author of the ones on, and may link one: a commentary opens in Logos at the passage, a book at its start. Only a link is built, from Resource IDs
  read from a listing of the maker's own Logos library; no text of any of them is kept, shown or sent.
  A screen of its own, Your Logos library, lists the Logos books Lampas knows how to open, by kind (lexicons, grammars, Greek texts, interlinears, commentaries,
  Bibles and devotionals): each is Off, On or Pinned by a tap, and a search finds a book by its title or author. Lampas keeps only those choices on the phone; nothing of your library is shown or sent.
  Import reads the list Logos saves (Library > Save as Spreadsheet) when you choose that file: it is read on the phone, matched to the books Lampas knows how to open (by Resource ID, and by the Logos series and type of a book), and kept on the phone, only the books' ids, titles, series, languages and the Bible
  places they cover, so an update can match it again; Turn on switches the matches On, and nothing is sent.
  On a verse (the Verse view, the tutor's verse links, Today's Psalms and Proverbs, the reference card of an Old Testament verse), In Logos opens it in your own Bible and In another book… opens a chooser of the Greek texts,
  interlinears and commentaries you have switched on that cover it, each row a link to the verse in that book; only links are built, and nothing of those books is read, shown or sent.
  On the word sheet, the Logos lexicons you pin are tiles of its Study row, with Bible Word Study; when more than three are On, a last tile, All N lexicons, opens a sheet with a search that lists every one that is On, each opening the word's entry in it (Manage opens the Lexicons page). Only links are built; nothing of any lexicon is read, shown or sent.
  Settings no longer lists the books: with Logos On, Settings > Study resources has one row, Your Logos library, that says how many books are on and opens that screen; Bible in Logos opens its Bibles page,
  where the Resource ID of a Bible the list lacks can still be typed; Settings > Daily picks the devotional among those that are On there, and the Settings search finds a book by its title.
  With Logos on, a tap on an English word (at Just English, on the small English word sheet; at the Greek steps, on the word sheet too) offers Look it up in Logos: a link to the word in
  Webster's 1828 *An American Dictionary of the English Language* (Noah Webster) in your own Logos library, if you own it. Only a link is built, from the book's Resource ID; no text of the dictionary is kept, shown or sent.
- **[Audible](https://www.audible.com)** and **The Word of Promise Audio Bible** (NKJV), by Thomas Nelson. Only if you choose it in Settings > Study resources >
  Audio Bible: Lampas opens the Audible app on the chapter you are reading (in the Verse view's Listen) or on any chapter of the Old Testament you pick in the chapter picker (beside Read in Logos), using Audible's own app link, and names the chapter in Audible's list. The chapter start times
  (a number of milliseconds for each of the Bible's chapters) were read once from [Audible's public catalogue](https://api.audible.com/1.0/content/B003UC45I8/metadata?response_groups=chapter_info) and are kept in Lampas; nothing is looked up as you read. With a reading plan, the same start times let Lampas guess how far you listened while you were away (the time away, chapter by chapter) when you come back and tell it where you got to. With a licence you can instead send a screenshot of Audible's playing screen, and the tutor's model reads the chapter on it.
  The reading plan lives on Today, which the Reader's Today chip opens (a Reading plan piece with the next chapter and how many chapters you have listened to, or "Start a plan" to start one: you pick the plan and the chapter you are starting at, here or in Settings), and the chapter picker marks the chapters done and the next one; a tap on the next chapter lets you say where you are (the chapter open in the Reader, or a place you pick or type), and Undo puts the place back for a few seconds; Today also lists the chapters you read today (the plan keeps the day you marked each one, on this phone only), each with a ticked box that takes it back, and a box beside the next chapter that marks it read; all of it is kept only on this phone. With a reading plan started, when you listen to the plan's next chapter a short sheet comes first and Lampas notes the time you left, so it can help you find your place when you are back: you say which chapter you stopped in, and the plan counts the chapters before it as heard, so your next listen starts at the beginning of that chapter. Listening to any other chapter opens Audible at once and notes nothing. You need the book in your own Audible library. No audio or text is taken from either. Their own terms apply; the audio is yours through Audible.
  The app link and the reading of the chapter list come from [audible-kit](https://github.com/Jonathan-A-White/audible-kit) (`audible-kit`) by Jonathan A. White. Licence: [MIT](https://github.com/Jonathan-A-White/audible-kit/blob/main/LICENSE). Changes: none.
- **[Blue Letter Bible](https://www.blueletterbible.org)** and **[STEPBible](https://www.stepbible.org)**. Links from a word to its Strong's
  entry, if you switch Strong's on. Links only: nothing is copied. Their own terms apply.
- **[Web Speech API](https://developer.mozilla.org/docs/Web/API/Web_Speech_API)**. Your phone's own voices speak the Greek and English and its
  recogniser hears you (in the letter drill's Say it, it writes down the name or sound of a letter you say, and Lampas checks it; Lampas keeps no recording); Lampas ships no voice. In a Hard sounds lesson's Try it step the phone's microphone records you saying a word, held in memory on the phone only, so you hear your try and then the Greek voice; it is sent nowhere and dropped when the step closes. With Read lessons to me on in Settings, a lesson is read aloud by it as soon as it opens. The API is a web standard; the voices are your phone's and its maker's.

## Ideas and tools we borrowed

- **[Beads](https://github.com/steveyegge/beads)** and **[Gas Town](https://github.com/steveyegge/gastown)** by [Steve Yegge](https://github.com/steveyegge). The way the
  factory that builds Lampas keeps its work: small tracked tasks, and agents that take them one at a time. Licence:
  [MIT](https://github.com/steveyegge/beads/blob/main/LICENSE) (Beads), [MIT](https://github.com/steveyegge/gastown/blob/main/LICENSE) (Gas Town).
  Changes: our factory, [millwright](https://github.com/Jonathan-A-White/millwright), uses the ideas in its own code.
- **[Logos Bible Software](https://www.logos.com)**'s verse pop-up. The idea of the card a Bible reference in the tutor's answer opens before it takes you
  there: the reference, the verse and an Open button. Only the idea is borrowed: the card is our own, and nothing is
  taken from Logos. Licence: none needed, it is an idea. Changes: none.
- **[$P recognizer](https://depts.washington.edu/acelab/proj/dollar/pdollar.html)** by Radu-Daniel Vatavu, Lisa Anthony and Jacob O. Wobbrock
  (University of Washington, 2012). The way Lampas checks a letter you write with a pen or a finger in Write it (a letter's lesson and the letter
  drill, while Settings > Handwriting drills is on), on the phone itself: your strokes become a cloud of points, which is compared with the shapes
  of the letters, so the order and direction you draw them in do not matter. The same letter shapes are drawn for you to trace and to copy. Only the idea is borrowed: the code and the letter
  shapes are our own. Licence: none needed, it is a published method. Changes: the comparison is the nearest-point distance taken both ways,
  and the writing is also tried turned a little each way.
- **[IPA](https://www.internationalphoneticassociation.org)**, the International Phonetic Alphabet of the International Phonetic Association. The symbols
  of the optional course Learn the IPA sounds (under Optional on the Goal screen, and, if you choose IPA in Settings > English accent, in every sound hint and at the
  head of each Hard sounds lesson (and, on a stretch step, its own sound, the trill of Rolling your r), the optional lessons on the Goal screen on the Greek sounds an English speaker finds hard): each
  sound the Greek says is shown by its IPA symbol, drilled both ways with a pass check. Only the symbols, a standard alphabet, are used: the chart itself is not copied. Licence:
  none needed; a standard (the [chart](https://www.internationalphoneticassociation.org/content/full-ipa-chart) is [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)). Changes: the key words, the Greek letters and the Greek words that go
  with each sound are our own.
- **[Claude Code](https://www.anthropic.com/claude-code)** by Anthropic. Writes most of Lampas's code and the files of its lamp icon and
  memory pictures, under Jonathan's direction. Licence: none needed, it is a tool; Anthropic's [terms](https://www.anthropic.com/legal/commercial-terms) apply.
  Changes: none.

## What built it

- **[Vite](https://vite.dev)** ([MIT](https://github.com/vitejs/vite/blob/main/LICENSE)),
  **[vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa)** ([MIT](https://github.com/vite-pwa/vite-plugin-pwa/blob/main/LICENSE)),
  **[Tailwind CSS](https://tailwindcss.com)** ([MIT](https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE)) and
  **[TypeScript](https://www.typescriptlang.org/)** ([Apache-2.0](https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt)) build the
  app you are holding, and **[Vitest](https://vitest.dev)** ([MIT](https://github.com/vitest-dev/vitest/blob/main/LICENSE)) and
  **[Playwright](https://playwright.dev)** ([Apache-2.0](https://github.com/microsoft/playwright/blob/main/LICENSE)) test it;
  **[axe-core](https://github.com/dequelabs/axe-core)** (`@axe-core/playwright`, [MPL-2.0](https://github.com/dequelabs/axe-core/blob/develop/LICENSE)) checks every main screen for
  accessibility (names, roles, contrast).
  Changes: none.
