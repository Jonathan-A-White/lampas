Feature: The Number sheet
  A number the source writes as a run of words (Genesis 14:14 'the 318' is eight, ten, three and hundreds; John 21:11 '153' is a hundred, fifty, three) opens one sheet when he taps its English
  (mw-5r3p30.1127): the number, the words in the order they are written, each word's value, and the sum as a line (8 + 10 + 300 = 318). Each word opens its own word sheet over the Number sheet.
  A number of one word opens the word sheet as ever, and so does a chunk that says no number ('trained men') or a sum the English does not say.

  @uc-word-sheet @hebrew
  Scenario: "the 318" in Genesis 14:14 opens the Number sheet with the four Hebrew words and 8 + 10 + 300 = 318
    Given Lampas is opened on Genesis 14 in English
    When he taps "the 318" in verse 14
    Then the Number sheet shows the number "318"
    And it lists the words "שְׁמֹנָה", "עָשָׂר", "וּשְׁלֹשׁ" and "מֵאוֹת" with the values 8, 10, 3 and 100
    And it shows the line "8 + 10 + 300 = 318"

  @uc-word-sheet @hebrew
  Scenario: A word of the Number sheet opens its own word sheet, and closing that brings the Number sheet back
    Given Lampas is opened on Genesis 14 in English
    When he taps "the 318" in verse 14
    And he taps the word "שְׁמֹנָה" in the Number sheet
    Then the word sheet shows the lemma "שְׁמֹנֶה"
    When he closes the word sheet
    Then the Number sheet shows the number "318"

  @uc-word-sheet @hebrew
  Scenario: "trained men" holds numeral words but says no number: the word sheet
    Given Lampas is opened on Genesis 14 in English
    When he taps "trained men" in verse 14
    Then the word sheet opens and no Number sheet

  @uc-word-sheet @hebrew
  Scenario: A number of one word, "a hundred" in Genesis 17:17, opens the word sheet
    Given Lampas is opened on Genesis 17 in English
    When he taps "a hundred" in verse 17
    Then the word sheet opens and no Number sheet

  @uc-word-sheet @greek
  Scenario: "153" in John 21:11 opens the Number sheet with 100 + 50 + 3 = 153
    Given Lampas is opened on John 21 in English
    When he taps "153 ," in verse 11
    Then the Number sheet shows the number "153"
    And it lists the words "ἑκατὸν", "πεντήκοντα" and "τριῶν" with the values 100, 50 and 3
    And it shows the line "100 + 50 + 3 = 153"
