Feature: The Hebrew word sheet
  A tap on a Hebrew word of an Old Testament chapter opens the word sheet at parity with the Greek one (mw-5vvlay.2): the pointed form large and right to left, its respelling in the Hebrew pronunciation chosen in Settings (mw-gdcyf98.6: where it first showed the scholarly transliteration), the
  lemma, the gloss and definition from the chapter's lex, the parsing in plain words from the chapter's parse map, Strong's number H7225, and Listen in the phone's he-IL voice. An English
  tap in an Old Testament chapter opens the same sheet with the Hebrew words the chunk renders, and under them the English sheet of its words. #/?word=H7225, the pointed lemma or the
  lemma with its points off opens the sheet of a word by itself. With Logos on the Study row has Strong's Hebrew, Bible Word Study at lbs/he and his Hebrew lexicons; with Logos off it offers to
  turn it on. Genesis 1 is the copy of the built chapter in tests/fixtures/data/gen/1.json (scripts/fixture-chapter.mjs). The Greek sheet is as it was (features/word-sheet-study.feature and the others
  run on it too). Not yet, and not drawn for a Hebrew word: the Paradigm row, the Heart note, Help with this word and the Grammar sheet of a parsing term (docs/layout/word-sheet.md lists them as LATER).

  Scenario: A tap on בְּרֵאשִׁ֖ית opens its sheet: the form, the respelling, the lemma, the meaning, the parsing, H7225 and Listen
    Given Lampas is opened on Genesis 1 with the saved view "greek" and Strong's on
    When he taps the Hebrew word "בְּרֵאשִׁ֖ית" of verse 1
    Then the Hebrew word sheet shows the form "בְּרֵאשִׁ֖ית" large, in Hebrew, right to left
    And it shows the respelling "be-reh-SHEET" and no transliteration
    And it shows the lemma "רֵאשִׁית" in Hebrew, right to left
    And it shows the meaning "first, beginning"
    And it shows the definition "beginning 1) first, beginning, best, chief"
    And it shows the parsing "Preposition-b | Noun - feminine singular"
    And it shows the Strong's number "H7225"
    And it has a Listen button
    And it has no Paradigm row and no Help with this word row

  Scenario: The parsing of a verb is the long form, in plain words with no Greek term to tap
    Given Lampas is opened on Genesis 1 with the saved view "greek"
    When he taps the Hebrew word "בָּרָ֣א" of verse 1
    Then it shows the parsing "Verb - Qal - Perfect - third person masculine singular"
    And no word of the parsing is a link

  Scenario: Listen says the word in the phone's Hebrew voice
    Given Lampas is opened on Genesis 1 with the saved view "greek" on a phone with an English, a Greek and a Hebrew voice
    When he taps the Hebrew word "בְּרֵאשִׁ֖ית" of verse 1
    And he taps Listen on the Hebrew word sheet
    Then the phone says "בְּרֵאשִׁית" in "he-IL"

  Scenario: An English tap opens the sheet with the Hebrew words of the chunk, and the English sheet under them
    Given Lampas is opened on Genesis 1 with nothing saved and Logos on
    When he taps the chunk "the heavens" of verse 1
    Then the Hebrew word sheet is headed "the heavens"
    And it shows the lemma "שָׁמַיִם" in Hebrew, right to left
    And under the Hebrew words it lists the English words "the" and "heavens", each with its Listen
    And the English word "heavens" has a "Look it up in Logos: heavens" link

  Scenario: A Hebrew word the English has no chunk for opens its sheet all the same
    Given Lampas is opened on Genesis 1 with the saved view "greek"
    When he taps the Hebrew word "אֵ֥ת" of verse 1
    Then the Hebrew word sheet shows the form "אֵ֥ת" large, in Hebrew, right to left
    And it shows the meaning "[Obj.]"

  Scenario: #/?word=H7225 opens the sheet of the word
    Given a link "#/?word=H7225" is opened on a phone with Strong's on
    Then the Hebrew word sheet shows the lemma "רֵאשִׁית" in Hebrew, right to left
    And it shows the meaning "first, beginning"
    And it shows the Strong's number "H7225"
    And it has no Parsing row

  Scenario: The pointed lemma finds the word
    Given a link "#/?word=%D7%A8%D6%B5%D7%90%D7%A9%D6%B4%D7%81%D7%99%D7%AA" is opened on a phone with Strong's on
    Then the Hebrew word sheet shows the lemma "רֵאשִׁית" in Hebrew, right to left
    And it shows the Strong's number "H7225"

  Scenario: A typed word with its points off finds the word
    Given a link "#/?word=%D7%A8%D7%90%D7%A9%D7%99%D7%AA" is opened on a phone with Strong's on
    Then the Hebrew word sheet shows the lemma "רֵאשִׁית" in Hebrew, right to left
    And it shows the Strong's number "H7225"

  Scenario: A Hebrew word Lampas does not hold says so and opens no sheet
    Given a link "#/?word=H99999" is opened on a phone with Strong's on
    Then the reader shows a notice that says "“H99999” is not in Lampas"
    And no word sheet is open

  Scenario: With Logos on the Study row has Strong's Hebrew, Bible Word Study and a Hebrew lexicon of his
    Given Lampas is opened on Genesis 1 with the saved view "greek" and Logos on with New Strong's and BDB ticked
    When he taps the Hebrew word "בְּרֵאשִׁ֖ית" of verse 1
    Then the Study row has the link "Open in Logos: The New Strong's Dictionary of Hebrew and Greek Words" to "logosres:LLS:46.10.6;ref=HebrewStrongs.7225"
    And the Study row has the link "Open in Logos: Enhanced Brown-Driver-Briggs Hebrew and English Lexicon" to "logosres:LLS:46.30.16;hw=%D7%A8%D7%90%D7%A9%D7%99%D7%AA"
    And the Study row has Bible Word Study for "ראשית" in Hebrew, the lemma "lbs/he/ראשית"

  Scenario: A Greek lexicon of his is not drawn for a Hebrew word
    Given Lampas is opened on Genesis 1 with the saved view "greek" and Logos on with BDAG and BDB ticked
    When he taps the Hebrew word "בְּרֵאשִׁ֖ית" of verse 1
    Then the Study row has the link "Open in Logos: Enhanced Brown-Driver-Briggs Hebrew and English Lexicon" to "logosres:LLS:46.30.16;hw=%D7%A8%D7%90%D7%A9%D7%99%D7%AA"
    And the Study row has no link "Open in Logos: BDAG"

  Scenario: With Logos off the sheet offers to turn it on
    Given Lampas is opened on Genesis 1 with the saved view "greek"
    When he taps the Hebrew word "בְּרֵאשִׁ֖ית" of verse 1
    Then the Hebrew word sheet offers "Turn on Logos"

  Scenario: At Just English an English tap opens the small English sheet and no Hebrew word does
    Given Lampas is opened on Genesis 1 with the Hebrew dial at Just English
    When he taps the chunk "God" of verse 1
    Then the English word sheet opens headed "God"
    And the Hebrew word sheet is not opened

  Scenario: The Greek sheet on a Greek word is unchanged
    Given Lampas is opened on Romans 8 with the saved view "greek"
    When he taps the Greek word "Οὐδὲν" of verse 1
    Then the Greek word sheet shows the form "Οὐδὲν", its respelling and no transliteration
    And its parsing is made of tappable grammar terms

  Scenario: Tapping "of" in "of Amittai," lists only "of" under the Hebrew word
    Given Lampas is opened on Jonah 1 with nothing saved and Logos on
    When he taps the word "of" of the chunk "of Amittai," of verse 1
    Then the Hebrew word sheet is headed "of Amittai"
    And under the Hebrew words it lists only the English word "of", with the link "Look it up in Logos: of"

  Scenario: Tapping "Amittai," lists only "Amittai" under the Hebrew word
    Given Lampas is opened on Jonah 1 with nothing saved and Logos on
    When he taps the word "Amittai," of the chunk "of Amittai," of verse 1
    Then under the Hebrew words it lists only the English word "Amittai", with the link "Look it up in Logos: amittai"

  Scenario: The Hebrew word of the chunk stays whichever English word he taps
    Given Lampas is opened on Jonah 1 with nothing saved and Logos on
    When he taps the word "of" of the chunk "of Amittai," of verse 1
    Then the Hebrew word sheet shows one Hebrew word

  Scenario: At Just English a tapped word of a chunk lists only that word
    Given Lampas is opened on Genesis 1 with the Hebrew dial at Just English and Logos on
    When he taps the word "heavens" of the chunk "the heavens" of verse 1
    Then the English word sheet is headed "the heavens"
    And the English word sheet has the one link "Look it up in Logos: heavens"

