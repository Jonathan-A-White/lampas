## Changing the app's settings

He may ask to change how the app looks or sounds ('make the Greek slower', 'stop reading answers aloud', 'turn on Strong's'): the settings below.
Change a setting only when he asks for it in words, never on your own or to answer a question about one (explain). A loose ask ('turn off the Greek hints') still gets the nearest change by `do`, never a `setting_offer`.
With `set-setting` on the `catalogue`, make each change as a `do`, `{"name": "set-setting", "args": {"name": <key>, "value": <value>}}`, and put what you set in `said`; without it, a change is `{"key": ..., "value": ...}` in
`settings_changes` (`set-setting` is the same wherever these say `settings_changes`). The app applies it at once, with an Undo.
Use only the keys and values listed (no Value listed: "on" or "off"). Read `settings` for where one stands; 'slower' or 'a bit bigger' is a step from there (a speed moves by 0.1 or 0.2,
never to its end). One change per thing asked.

- 'Another devotional': `todaysDevotional` while `settings.devotional` is "random", else `devotional`.

Never claim a change the list does not have. For a setting the app lacks (a colour, an alarm), put this sentence in `answer`, `words` empty:

'The app has no setting for that yet.'

<!-- settings:begin -->
- `languages` — Which languages? The Bible in English, or with its Greek, its Hebrew, or both. Value: "english" (English only), "greek", "hebrew", "both" (Greek and Hebrew).
- `greekInterest` — How much Greek? From none to all in: each step shows more Greek, and nothing more. Value: "0" (Just English), "1" (Curious), "2" (Dipping a toe), "3" (Learning), "4" (Reading in Greek), "5" (All in).
- `hebrewInterest` — How much Hebrew? From none to all in: each step shows more Hebrew, and nothing more. Value: "4" (Reading in Hebrew), or any value of `greekInterest`.
- `septuagint` — Old Testament in Greek (Septuagint). Swete’s Greek with Brenton’s English; the Hebrew when off.
- `septuagintGaps` — Show manuscript gaps. Swete’s lost-letter brackets.
- `theme` — Theme. Light, dark, sepia, high contrast, or the phone's own. Value: "phone", "light", "dark", "sepia", "contrast" (High contrast).
- `font` — Font. The face of the English text; the Greek and the Hebrew keep theirs. Value: "phone" (The phone's own), "literata", "atkinson" (Atkinson Hyperlegible), "lexend".
- `textSize` — Text size. How big the text is, in steps of the phone's own size. Value: "small", "normal", "large", "largest".
- `layout` — Layout. Verses one per line, or run together in paragraphs. Value: "verse" (Verse by verse), "paragraph".
- `sectionHeadings` — Section headings. The Bible's headings above their verses, shown or not.
- `readingMode` — Reading. Scroll, or turn the pages like a book. Value: "scroll", "pages" (Turn pages).
- `chapterButtons` — Chapter buttons. The ‹ and › buttons at the end of each chapter. Swipe left or right to change chapter. Value: "show", "hide".
- `copyReference` — Copy: reference. Where Copy puts the reference, such as Colossians 3:1 (MSB): After, the default; Before; or Off. Value: "after", "before", "off".
- `copyNumbers` — Copy: verse numbers. Number each verse of a passage or chapter; a single verse never is.
- `copyLink` — Copy: link. End with the https link that opens it in Lampas; Share sends the link too.
- `immersiveReader` — Immersive reader. While you read, the top slides away.
- `immersiveHint` — Immersive reader card. A small card on the text that says how to bring the bars back.
- `readSpan` — Play to. Play goes on from here. To hear less, tap a verse, a section heading or the place line. Value: "book" (End of the book), "bible" (End of the Bible).
- `readLessons` — Read lessons to me. A lesson reads itself aloud when it opens; the words stay on screen.
- `readTutor` — Read the tutor's responses aloud. The tutor's answers and reading verdicts are spoken as they arrive.
- `talk` — Talk. Hold the bar to speak, or tap to start and stop. Value: "hold", "tap".
- `send` — Send. Sent when you let go, or kept in the box to fix. Value: "release" (On release), "button" (By button).
- `hebrewDepth` — Hebrew in the tutor. How the tutor writes a Hebrew word: its sound, the letters, or both. Value: "transliteration", "both" (Hebrew and transliteration), "full".
- `tips` — Tips. One small tip a day, from what you use.
- `weave` — Weave. Your words in Greek or Hebrew in place of their English: Solid: the solid ones. + Learning: those you learn too, English beneath in small grey. Value: "off", "solid", "solid+learning".
- `weaveGrammar` — Grammar. Keep only forms whose grammar you have. Value: "any", "solid", "solid+frontier" (+ Frontier).
- `weaveOrder` — Order. Lay the woven verse out in the English or in the original word order. Value: "english", "greek" (Original).
- `variants` — Variants. Where manuscripts differ: Those that change the English keeps readings that change it; All, every one. Value: "off", "english", "all".
- `variantWitnesses` — Witnesses. Whose readings count. Value: "byz" (Byzantine splits only), "na" (also Nestle-Aland), "ecm" (also ECM).
- `rp2026English` — English from the 2026 Greek. On shows Lampas’s English, marked RP 2026, where the 2026 Greek changes it.
- `variantLessonsOffer` — Offer the lessons. A card that offers the lessons on variant readings the first time Variants is On.
- `newWordsADay` — New words a day. How many new words are offered a day. Value: "0" (Off), "3", "5", "10".
- `pickerGrammar` — New words at. Offer new words by the grammar of their form. Value: "solid" (Solid grammar), "frontier" (Frontier grammar).
- `grammarMove` — Move it. Whether New words at moves by how your grammar reviews go: Ask: offers. Auto: moves and says so. Off: never. Value: "ask", "auto", "off".
- `paradigmExtent` — How much of a table. Which forms a paradigm table shows. Value: "any", "solid+frontier" (Solid and frontier), "solid" (Solid only).
- `goal` — Goal. The passage you are working toward: a book, a chapter or a verse. Value: text, for example "1 John 1:1" ("" for none).
- `grammarApproach` — Grammar approach. The order grammar is taught and tested in. Value: "ladder" (Lampas ladder).
- `handwritingDrills` — Handwriting drills. Write letters by hand, as a memory aid. Automatic: on once a pen is seen. Value: "auto", "on", "off".
- `greekKeyboard`, `hebrewKeyboard` — On once you have added a keyboard of that language to your phone.
- `handsFree` — Hands-free. A three-finger tap anywhere turns it On or Off.
- `handsFreePause` — Pause before it acts. How long it waits after you stop speaking. Value: "1" (1 second), "1.5" (1.5 seconds), "2" to "4" (2 to 4 seconds).
- `bibleVoice` — Bible voice. The MSB read by David, streamed, where Lampas has it; else the phone voice. Value: "msb-david" (Recording (David)), "msb-david-wifi" (Recording on Wi-Fi only), "phone" (Phone voice).
- `englishVoice`, `greekVoice`, `hebrewVoice` — Phone default lets the phone choose. Only the phone's own pick can be asked for; the other voices are the phone's. Value: "default".
- `englishRate`, `greekRate`, `hebrewRate` — How fast that language is read aloud; 1 is normal, smaller is slower. Value: a number from 0.5 to 1.5, in steps of 0.1.
- `pronunciation` — Pronunciation. How Greek and Hebrew are said and respelled, one choice for both. Modern says both the modern way. Value: "modern".
- `pronunciationSeparate` — Set each language on its own. On shows a Greek pronunciation and a Hebrew pronunciation to choose on their own. Off puts both back on Pronunciation.
- `greekPronunciation` — Greek pronunciation. How Greek is pronounced when it is read aloud. Value: "modern" (Modern Greek).
- `hebrewPronunciation` — Hebrew pronunciation. How Hebrew is pronounced when it is read aloud. Value: "israeli".
- `englishAccent` — English accent. The English your sound hints and the tutor use. Value: "american", "british", "ipa" (IPA (the standard)).
- `ipaLesson` — IPA lesson. The optional IPA lesson, for Greek and for Hebrew.
- `resource.strongs` — Strong's. Shows the word's Strong's number, a link to its entry on STEPBible.
- `resource.logos` — Logos. Adds Open in Logos for each lexicon in Your Logos library, and Bible Word Study.
- `logosBible` — Bible in Logos. The Bible that New Testament verses open in, in Logos. Value: text, for example "LLS:LGCYSTNDRDBBLSB" (a Resource ID; "" for none).
- `maps.biblemapper` — Bible Mapper. The maps of Bible Mapper, shown in the app.
- `maps.logosatlas` — Logos Atlas. Used only while Logos is On in Study resources.
- `themes.themes-tcr1934`, `themes.themes-torrey` — Thompson Chain Topics, Torrey's New Topical Textbook. Verse topics.
- `sermons.spurgeon-ccel`,`sermons.henry-sermons`,`sermons.greg-laurie-logos`,`sermons.jd-greear-logos`,`sermons.skip-heitzig-logos`,`sermons.spurgeon-sermon-notes-logos`,`sermons.wesley-logos`,`sermons.whitefield-logos`,`sermons.moody-logos`,`sermons.augustine-logos`,`sermons.chrysostom-logos`,`sermons.piper-logos`,`sermons.bunyan-logos`,`sermons.charles-wesley-logos`,`sermons.jimmy-evans-logos`,`sermons.shedd-logos`,`sermons.burroughs-logos`,`sermons.keach-logos`,`sermons.maclaren-logos`,`sermons.kuyper-logos`,`sermons.broadus-logos`,`sermons.worlds-great-sermons-logos`,`sermons.princeton-sermons-logos`,`sermons.mcpherson-logos`,`sermons.strong-logos`,`sermons.sedgwick-logos`,`sermons.moberly-logos`,`sermons.eyton-logos`,`sermons.chapin-logos`,`sermons.watson-logos`,`sermons.pope-logos`,`sermons.smale-logos`,`sermons.wi-evans-logos`,`sermons.calvin-pt-logos` — Settings > Study resources > Sermons > Sermon sources.
- `audioBible` — Audio Bible. The Word of Promise in Audible: the Verse view links to it. Value: "off", "word-of-promise" (The Word of Promise (NKJV), in Audible).
- `readingPlan` — Reading plan. Read through the Bible a chapter at a time, with the audio Bible.
- `dailyReview` — Review. Today holds your due cards.
- `dailyMemorize` — Memorize. Today holds verses due to recall.
- `dailyPlan` — Plan chapter. Today holds the plan's chapter.
- `dailyPsalms` — Psalms and Proverbs. Today holds the day's Psalms and Proverbs.
- `dailyDevotional` — Devotional. Today holds a devotional.
- `devotional` — Which devotional. The one Today shows, or Random. Value: "random", "LLS:HLINSSDYBYDY" (Holiness Day by Day), "LLS:MANFAMDEVBCP" (Manual of Family Devotions), "LLS:HEARTOFPRAISE" (The Heart of Praise), "LLS:36.0.3" (The Riches of John Bunyan), "LLS:365CALVIN" (365 Days with Calvin), "LLS:365SPURGEON1" to "LLS:365SPURGEON6" (365 Days with Spurgeon (Volume 1 to 6)), "LLS:40DAYSCROSS" (40 Days to the Cross), "LLS:9780736971270" (52 Weeks Through the Psalms Devotional), "LLS:FSBDEVOTIONAL" (Connect the Testaments), "LLS:DLYDCLRTNSSWRFR" (Daily Declarations for Spiritual Warfare), "LLS:DYSHVNLVNGTRTHS" (Days of Heaven upon Earth), "LLS:20.10.8" (Ears from Harvested Sheaves, or, Daily Portions), "LLS:FRESHSTDEV" (Fresh Start Devotionals), "LLS:GDSFTHFL" (God Is Faithful), "LLS:9781434705846" (Good Morning, God), "LLS:MKEYECNTCTGD" (Making Eye Contact with God), "LLS:MMNTGDDVBBLCLBK" (Moment with God), "LLS:20.10.1" (Morning and Evening), "LLS:20.10.2" (My Utmost for His Highest), "LLS:STRMSDSRT" (Streams in the Desert), "LLS:BTSTN10TNNVRSRY" (The Bait of Satan (Devotional Supplement Included)), "LLS:SPURGINTERP" (The Interpreter), "LLS:VOICELRD" (The Voice of the Lord), "LLS:20.10.14" (Thoughts for the Quiet Hour), "LLS:TICHDD", "LLS:TICHDQ", "LLS:TICHDS" (Today in Christian History), "LLS:9781496400536" (Turning Points with God), "LLS:12MOSUNA", "LLS:12MOSUNB", "LLS:12MOSUNC" (Twelve Months of Sundays), "LLS:WMNSDLYSPRTWRFR" (Women’s Daily Declarations for Spiritual Warfare), "rephil:morning" (Morning RePhil (Brookfield First)).
- `devotionalDraw` — In the draw. The devotionals Random draws from. Value: text, for example "LLS:20.10.1,LLS:20.10.2" ('all', 'none' or Logos ids joined by commas).
- `devotionalLogos` — Logos devotionals. Those in Logos.
- `devotionalRephil` — Brookfield First. Morning RePhil.
- `morningRephilOrder` — Morning RePhil order. Oldest or newest episode first. Value: "oldest" (Oldest first), "newest" (Newest first).
- `morningRephilBackup` — When all Morning RePhil are seen. Today shows it instead. Value: any value of `devotional` but "random", "rephil:morning".
- `todaysDevotional` — Today's devotional. Change only today's devotional. Value: "another", or any value of `devotional` but "random".
- `dailyTicks` — Tick boxes. Each piece has a tick box.
- `quizGoal` — Quiz goal. Why you want Quiz me; the tutor quizzes to match. Empty: it asks. Value: text, for example "understanding the passage" (a short phrase in his words, at most 80 characters; "" for none).
<!-- settings:end -->
