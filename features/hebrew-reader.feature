Feature: The Reader reads an Old Testament chapter in the Hebrew
  On a chapter of the Old Testament (its words are Hebrew) the header's switch reads English | Hebrew, as a Greek chapter's reads English | Greek: in code the
  second choice is the chapter's one source view, so the view he saved ('greek') opens a Hebrew chapter in Hebrew and a Greek chapter in Greek. The Hebrew view draws
  each verse right to left, pointed as the data has it, in the app's Hebrew face, the words in the chapter's order, and every word is a tap that does what the
  English word does: it opens the word sheet (features/hebrew-word-sheet.feature has its facts). With the Weave on, the English is woven with
  the Hebrew of his solid words, and a long press on Weave flips the order to the Hebrew word order, laid out right to left. A long press on a Hebrew word says it, and
  Listen and Read from the top read the Hebrew, in the phone's he-IL voice with the cantillation marks taken off. Genesis 1 is the copy of the built chapter in
  tests/fixtures/data/gen/1.json (scripts/fixture-chapter.mjs). The Greek and the English views are as they were.

  Scenario: On Genesis 1 the switch reads English | Hebrew
    Given Lampas is opened on Genesis 1 with nothing saved
    Then the language switch offers "English" and "Hebrew"
    And "English" is the chosen language

  Scenario: Choosing Hebrew opens the Hebrew view and is saved as the one source view
    Given Lampas is opened on Genesis 1 with nothing saved
    When he chooses "Hebrew" in the language switch
    Then "Hebrew" is the chosen language
    And the saved view is "greek"

  Scenario: The Hebrew view's first verse starts with בְּרֵאשִׁ֖ית and the row runs right to left
    Given Lampas is opened on Genesis 1 with the saved view "greek"
    Then "Hebrew" is the chosen language
    And the first word of verse 1 is "בְּרֵאשִׁ֖ית"
    And verse 1 has 7 words, each a tap numbered from 0
    And verse 1 is a row of Hebrew, right to left, in the Hebrew face
    And the heading "The Creation" stands before verse 1

  Scenario: The Hebrew view is drawn the same in the paragraph layout
    Given Lampas is opened on Genesis 1 with the saved view "greek" and the Layout "paragraph"
    Then the first word of verse 1 is "בְּרֵאשִׁ֖ית"
    And the paragraph holding verse 1 is a row of Hebrew, right to left, in the Hebrew face

  Scenario: A tap on a Hebrew word opens the Hebrew word sheet of the word
    Given Lampas is opened on Genesis 1 with the saved view "greek"
    When he taps the Hebrew word "הַשָּׁמַ֖יִם" of verse 1
    Then the Hebrew word sheet opens for "שָׁמַיִם"
    And the reader is still showing Genesis 1

  Scenario: A Hebrew word the English has no chunk for opens its sheet and nothing breaks
    Given Lampas is opened on Genesis 1 with the saved view "greek"
    When he taps the Hebrew word "אֵ֥ת" of verse 1
    Then the Hebrew word sheet opens for "אֵת"
    And the reader is still showing Genesis 1

  Scenario: An English tap opens the word sheet with the English words under the Hebrew ones
    Given Lampas is opened on Genesis 1 with nothing saved
    When he taps the chunk "God" of verse 1
    Then the word sheet opens headed "God"
    And it lists the English word "God" under the Hebrew word

  Scenario: The weave lays the English against the Hebrew, in the English order to start
    Given Lampas is opened on Genesis 1 with the Weave on Solid words and the solid Hebrew words "רֵאשִׁית" and "אֱלֹהִים"
    Then the language switch offers "English", "Weave" and "Hebrew"
    And "Weave" is the chosen language
    And verse 1 reads "בְּרֵאשִׁ֖ית אֱלֹהִ֑ים created the heavens and the earth."
    And verse 1 is a row of English, left to right
    And the weave count is a number of words in Hebrew

  Scenario: A long press on Weave lays the verse out in the Hebrew word order, right to left
    Given Lampas is opened on Genesis 1 with the Weave on Solid words and the solid Hebrew words "רֵאשִׁית" and "אֱלֹהִים"
    When he long presses "Weave" in the language switch
    Then a toast says "Hebrew word order"
    And verse 1 reads "בְּרֵאשִׁ֖ית created אֱלֹהִ֑ים the heavens and the earth."
    And verse 1 is laid out right to left
    And "Weave" is the chosen language

  Scenario: A second long press puts the English order back
    Given Lampas is opened on Genesis 1 with the Weave on Solid words and the solid Hebrew words "רֵאשִׁית" and "אֱלֹהִים"
    And he has long pressed "Weave" in the language switch
    When he long presses "Weave" in the language switch
    Then a toast says "English word order"
    And verse 1 reads "בְּרֵאשִׁ֖ית אֱלֹהִ֑ים created the heavens and the earth."
    And verse 1 is a row of English, left to right

  Scenario: A long press on a Hebrew word says it in Hebrew
    Given Lampas is opened on Genesis 1 with the saved view "greek" on a phone with an English, a Greek and a Hebrew voice
    When he long presses the Hebrew word "הַשָּׁמַ֖יִם" of verse 1
    Then the phone says "הַשָּׁמַיִם" in "he-IL"
    And no word sheet opens

  Scenario: Read from the top reads the Hebrew pieces in the Hebrew voice
    Given Lampas is opened on Genesis 1 with the saved view "greek" on a phone with an English, a Greek and a Hebrew voice
    When he taps Read from the top
    Then the phone speaks the Hebrew of verse 1 without its cantillation marks in "he-IL"
    And verse 1 is highlighted as being read
    And every voice asked for so far is Hebrew

  Scenario: Read from the top in the weave reads each piece in its own language
    Given Lampas is opened on Genesis 1 with the Weave on Solid words and the solid Hebrew words "רֵאשִׁית" and "אֱלֹהִים" on a phone with an English, a Greek and a Hebrew voice
    When he taps Read from the top
    Then the phone speaks "בְּרֵאשִׁית אֱלֹהִים" in "he-IL" and then "created the heavens and the earth." in "en-US"

  Scenario: With no Hebrew voice on the phone the reading says so and nothing breaks
    Given Lampas is opened on Genesis 1 with the saved view "greek" on a phone with an English and a Greek voice
    When he taps Read from the top
    Then the reading says "No Hebrew voice on this phone"
    And the reader is still showing Genesis 1

  Scenario: With no Hebrew voice a long press on a Hebrew word says nothing and nothing breaks
    Given Lampas is opened on Genesis 1 with the saved view "greek" on a phone with an English and a Greek voice
    When he long presses the Hebrew word "הַשָּׁמַ֖יִם" of verse 1
    Then the phone is asked to say nothing
    And the reader is still showing Genesis 1

  Scenario: A Greek chapter still reads English | Greek and the saved view opens it in Greek
    Given Lampas is opened on Romans 8 with the saved view "greek"
    Then the language switch offers "English" and "Greek"
    And "Greek" is the chosen language
    And verse 1 is a row of Greek, left to right
