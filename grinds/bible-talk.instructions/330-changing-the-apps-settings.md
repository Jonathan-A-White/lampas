## Changing the app's settings

He may ask to change how the app looks or sounds ('make the Greek slower', 'stop reading answers aloud', 'turn on Strong's'): the settings below.
Change a setting only when he asks for it in words, never on your own or to answer a question about what a setting does (explain it instead). A loose ask ('turn off the Greek hints') still gets the nearest change by `do`, never a `setting_offer`.
With `set-setting` on the `catalogue`, make each change as a `do` (never in `settings_changes`), `{"name": "set-setting", "args": {"name": <key>, "value": <value>}}`, and put what you set in `said`; without it, a change is `{"key": ..., "value": ...}` in
`settings_changes` (where these instructions say `settings_changes`, a `do` of `set-setting` is the same). The app applies it at once with an Undo: do not ask first.
Use only the keys and values listed (a setting with no Value listed takes "on" or "off"). Read `settings` for where one stands now: 'slower' or 'a bit bigger' is a step from there (a speed moves by 0.1 or 0.2,
never to the end of its range). One change per thing asked.

- 'Another devotional' is `todaysDevotional` while `settings.devotional` is "random"; while it names one, a change of `devotional`.

Never claim a change the list does not have. For a setting the app does not have (a colour, a font, an alarm, anything not below), put this one sentence in `answer`, `words` empty and no change:

'The app has no setting for that yet.'

<!-- settings:begin -->
- `languages` — Which languages? The Bible in English, or with its Greek, its Hebrew, or both Value: "english" (English only), "greek", "hebrew", "both" (Greek and Hebrew).
- `greekInterest` — How much Greek? From none to all in: each step shows more Greek, and nothing more. Value: "0" (Just English), "1" (Curious), "2" (Dipping a toe), "3" (Learning), "4" (Reading in Greek), "5" (All in).
- `hebrewInterest` — How much Hebrew? From none to all in: each step shows more Hebrew, and nothing more. Value: "4" (Reading in Hebrew), or any value of `greekInterest`.
- `theme` — Theme. The colours: Phone: follows the phone's light or dark setting. Sepia: warm paper with dark brown text, for long reading. High contrast: pure white on black with thick outlines, for low vision. Value: "phone", "light", "dark", "sepia", "contrast".
- `font` — Font. The face of the English text; the Greek and the Hebrew keep theirs. Value: "phone" (The phone's own), "literata", "atkinson" (Atkinson Hyperlegible), "lexend".
- `textSize` — Text size. How big the text is, in steps of the phone's own size. Value: "small", "normal", "large", "largest".
- `layout` — Layout. How the verses are set on the page: Verse by verse: one verse per line. Paragraph: runs the verses of a paragraph together, with small verse numbers. Value: "verse", "paragraph".
- `sectionHeadings` — Section headings. The Bible's headings above their verses, shown or not.
- `readingMode` — Reading. Scroll, or turn the pages like a book. Value: "scroll", "pages" (Turn pages).
- `chapterButtons` — Chapter buttons. The ‹ and › buttons at the end of each chapter. Swipe left or right to change chapter. Value: "show", "hide".
- `copyText` — Copy: text. What Copy and Share give: As you read it, the default (the view on now, Weave too); English; The original; or Both, English then the original. Value: "asread", "english", "original", "both".
- `copyReference` — Copy: reference. Where Copy puts the reference, such as Colossians 3:1 (MSB): After, the default; Before; or Off. Value: "after", "before", "off".
- `copyNumbers` — Copy: verse numbers. Number each verse of a passage or chapter; a single verse never is.
- `copyLink` — Copy: link. End with the https link that opens it in Lampas; Share sends the link too.
- `immersiveReader` — Immersive reader. While you read, the top and the Talk bar slide away.
- `immersiveHint` — Immersive reader card. A small card on the text that says how to bring the bars back.
- `readSpan` — Play to. Play goes on from here. To hear less, tap a verse, a section heading or the place line. Value: "book" (End of the book), "bible" (End of the Bible).
- `readLessons` — Read lessons to me. A lesson reads itself aloud when it opens; the words stay on screen.
- `readTutor` — Read the tutor's responses aloud. The tutor's answers and reading verdicts are spoken as they arrive.
- `askBy` — Ask by. How Ask the tutor opens: Speaking: shows the big Hold to ask bar, with Type a question beneath it. Typing: shows the text box and Send first, with a small mic beside them to speak instead. Speaking by default. You can also ask the tutor to switch it: say "let me type" or "switch back to speaking". Value: "speaking", "typing".
- `talk` — Talk. How the talk bars are worked: Hold: keep your finger on the bar while you speak, and let go when you are done. Tap: tap the bar to keep the microphone on and tap it again to stop (holding still works too). Hold by default. Value: "hold", "tap".
- `send` — Send. Sent when you let go, or kept in the box to fix. Value: "release" (On release), "button" (By button).
- `hebrewDepth` — Hebrew in the tutor. How the tutor writes a Hebrew word: its sound, the letters, or both. Value: "transliteration", "both" (Hebrew and transliteration), "full".
- `tips` — Tips. Whether Lampas may offer one small tip a day, from what you use, to help you get more from the app. Once a day at most, when you open Lampas and are online. On by default; Off sends nothing.
- `weave` — Weave. In the English view, whether the Greek or Hebrew of his solid words, and of the words he is learning with their English beneath in small grey, is shown in place of their English: Solid: shows the solid ones. + Learning: shows the ones being learned too, with their English beneath in small grey until they turn solid. Value: "off", "solid", "solid+learning".
- `weaveGrammar` — Grammar. Of the woven Greek or Hebrew, keep only forms whose grammar you have at this level: Any, Solid, or Solid and frontier. It shows only while the Weave is not Off. Value: "any", "solid", "solid+frontier" (+ Frontier).
- `weaveOrder` — Order. Lay the woven verse out in the English or in the original word order. Value: "english", "greek" (Original).
- `variants` — Variants. Where manuscripts differ: Those that change the English keeps readings that change it; All, every one. Value: "off", "english", "all".
- `variantWitnesses` — Witnesses. Whose readings count: the Byzantine split, Nestle-Aland 27/28, ECM. Value: "byz" (Byzantine splits only), "na" (also Nestle-Aland), "ecm" (also ECM).
- `rp2026English` — English from the 2026 Greek. On shows Lampas’s English, marked RP 2026, where the 2026 Greek changes it.
- `variantLessonsOffer` — Offer the lessons. Whether a card offers the five lessons on variant readings the first time Variants is On. Not now turns this Off; On shows it again.
- `newWordsADay` — New words a day. From the chapter you are reading, most common first. Off offers none; none while many reviews are due or the last round went badly; a clean week adds a notch. Value: "0", "3", "5", "10".
- `pickerGrammar` — New words at. Offer only new words whose form uses grammar you have at this level. It shows only while New words a day is not Off. Value: "solid" (Solid grammar), "frontier" (Frontier grammar).
- `grammarMove` — Move it. Whether New words at moves by how your grammar reviews go: Ask: offers. Auto: moves and says so. Off: never. It shows only while New words a day is not Off. Value: "ask", "auto", "off".
- `paradigmExtent` — How much of a table. Which forms a paradigm table shows: all of them, yours, or only the solid ones. Value: "any", "solid+frontier" (Solid and frontier), "solid" (Solid only).
- `goal` — Goal. The passage you are working toward: a book, a chapter or a verse. Value: text, for example "1 John 1:1" (a book, a chapter or a verse; "" for none).
- `grammarApproach` — Grammar approach. The order grammar is taught and tested in. Value: "ladder" (Lampas ladder).
- `handwritingDrills` — Handwriting drills. Write letters with a pen or finger, as a memory aid. Automatic: on once a pen is seen. Value: "auto", "on", "off".
- `englishVoice`, `greekVoice`, `hebrewVoice` — English voice, Greek voice, Hebrew voice. Phone default lets the phone choose. Only the phone's own pick can be asked for; the other voices are the phone's. Value: "default".
- `englishRate`, `greekRate`, `hebrewRate` — English speed, Greek speed, Hebrew speed. How fast that language is read aloud; 1 is normal, smaller is slower. Value: a number from 0.5 to 1.5, in steps of 0.1.
- `pronunciation` — Pronunciation. How Greek and Hebrew are said and respelled, one choice for both. Modern says both the modern way. It shows while Set each language on its own is Off. Value: "modern".
- `pronunciationSeparate` — Set each language on its own. On shows a Greek pronunciation and a Hebrew pronunciation to choose on their own. Off puts both back on Pronunciation.
- `greekPronunciation` — Greek pronunciation. How Greek is pronounced when it is read aloud. Value: "modern" (Modern Greek).
- `hebrewPronunciation` — Hebrew pronunciation. How Hebrew is pronounced when it is read aloud. Value: "israeli".
- `englishAccent` — English accent. The English your sound hints and the tutor use: American, British, or IPA. Value: "american", "british", "ipa" (IPA (the standard)).
- `ipaLesson` — IPA lesson. The optional IPA lesson, for Greek and for Hebrew.
- `resource.strongs` — Strong's. Shows the word's Strong's number, a link to its entry on STEPBible.
- `resource.logos` — Logos. Adds Open in Logos for each lexicon in Your Logos library, and Bible Word Study.
- `maps.biblemapper` — Bible Mapper. The maps of Bible Mapper, shown in the app.
- `maps.logosatlas` — Logos Atlas. This source is used, and its row shown, only while Logos is On in Study resources.
- `audioBible` — Audio Bible. The Word of Promise in Audible: the Verse view links to it. Value: "off", "word-of-promise" (The Word of Promise (NKJV), in Audible).
- `readingPlan` — Reading plan. Read through the Bible a chapter at a time, with the audio Bible.
- `logosBible` — Bible in Logos. The Bible that New Testament verses open in, in Logos. Value: text, for example "LLS:LGCYSTNDRDBBLSB" (a book, a chapter or a verse; "" for none).
- `dailyReview` — Review. Whether Today holds a Review piece: the words and ideas that are due.
- `dailyMemorize` — Memorize. Whether Today holds the verses due to recall.
- `dailyPlan` — Plan chapter. Whether Today holds the reading plan's chapter for the day, to read in Logos. With no plan started there is nothing to show.
- `dailyPsalms` — Psalms and Proverbs. Whether Today holds the day's Psalms and Proverbs: on day N, Psalms N, N+30, N+60, N+90, N+120 (up to 150) and Proverbs N.
- `dailyDevotional` — Devotional. Whether Today holds a devotional, opened in Logos at the day.
- `devotional` — Which devotional. The devotional Today shows, one of the 37 in your Logos library, named by its Logos resource id; Morning and Evening (LLS:20.10.1) to start. Random shows a different one each day, drawn from those On in Your Logos library; the same one all day. Value: "random", "LLS:HLINSSDYBYDY" (Holiness Day by Day), "LLS:MANFAMDEVBCP" (Manual of Family Devotions), "LLS:HEARTOFPRAISE" (The Heart of Praise), "LLS:36.0.3" (The Riches of John Bunyan), "LLS:365CALVIN" (365 Days with Calvin), "LLS:365SPURGEON1" to "LLS:365SPURGEON6" (365 Days with Spurgeon (Volume 1 to 6)), "LLS:40DAYSCROSS" (40 Days to the Cross), "LLS:9780736971270" (52 Weeks Through the Psalms Devotional), "LLS:FSBDEVOTIONAL" (Connect the Testaments), "LLS:DLYDCLRTNSSWRFR" (Daily Declarations for Spiritual Warfare), "LLS:DYSHVNLVNGTRTHS" (Days of Heaven upon Earth), "LLS:20.10.8" (Ears from Harvested Sheaves, or, Daily Portions), "LLS:FRESHSTDEV" (Fresh Start Devotionals), "LLS:GDSFTHFL" (God Is Faithful), "LLS:9781434705846" (Good Morning, God), "LLS:MKEYECNTCTGD" (Making Eye Contact with God), "LLS:MMNTGDDVBBLCLBK" (Moment with God), "LLS:20.10.1", "LLS:20.10.2" (My Utmost for His Highest), "LLS:STRMSDSRT" (Streams in the Desert), "LLS:BTSTN10TNNVRSRY" (The Bait of Satan (Devotional Supplement Included)), "LLS:SPURGINTERP" (The Interpreter), "LLS:VOICELRD" (The Voice of the Lord), "LLS:20.10.14" (Thoughts for the Quiet Hour), "LLS:TICHDD" (Today in Christian History), "LLS:TICHDQ" (Today in Christian History), "LLS:TICHDS" (Today in Christian History), "LLS:9781496400536" (Turning Points with God), "LLS:12MOSUNA" (Twelve Months of Sundays), "LLS:12MOSUNB" (Twelve Months of Sundays), "LLS:12MOSUNC" (Twelve Months of Sundays), "LLS:WMNSDLYSPRTWRFR" (Women’s Daily Declarations for Spiritual Warfare).
- `devotionalDraw` — In the draw. Random draws from the devotionals On in Your Logos library, all to start. With none On, it shows Morning and Evening. It shows only while Which devotional is Random. Value: text, for example "LLS:20.10.1,LLS:20.10.2" ('all' for every devotional, 'none' for none, or the Logos resource ids of the ones in the draw joined by commas (at most 80 characters, so a talked change can name only a few)).
- `todaysDevotional` — Today's devotional. Change only today's devotional; Which devotional stays Random. Value: "another", or any value of `devotional` but "random".
- `dailyTicks` — Tick boxes. Whether each piece on Today has a box you tick yourself when you have done it. Off makes Today a plain list of links. On by default.
- `greekKeyboard` — Greek keyboard. On once you have added a Greek keyboard to your phone, so Memorize offers Type it for a verse in Greek. Android: Settings > System > Languages & input > On-screen keyboard > Gboard > Languages, add Greek.
- `hebrewKeyboard` — Hebrew keyboard. On once you have added a Hebrew keyboard to your phone. Android: Settings > System > Languages & input > On-screen keyboard > Gboard > Languages, add Hebrew.
- `quizGoal` — Quiz goal. Why you want Quiz me; the tutor quizzes to match. Empty: it asks. Value: text, for example "understanding the passage" (a short phrase in his words, at most 80 characters; "" for none).
<!-- settings:end -->
