Feature: The word sheet with many study resources
  With every Logos lexicon ticked the Study row has 22 tiles. Each tile names its book in words (two lines are allowed, nothing is cut off), all of them
  sit in the sheet's own scroll box with a fade at the foot while more is below, and a Close button under the box keeps a way out in thumb reach however far
  he has scrolled (the layout itself is proved at phone width in tests/e2e/word-sheet-many.spec.ts).

  Scenario: Every Logos tile is on the sheet and says which book it opens
    Given Lampas is opened with every Logos lexicon ticked
    When he taps the word "condemnation" in verse 1
    Then the Study row has 22 tiles
    And the Study tile "Lexham Theological Wordbook" is there in full
    And the Study tile "NASB Dictionaries" is also there in full
    And the Study tile "Intermediate Greek-English Lexicon" is there in full too
    And the Study tile "Bible Word Study" is one more there in full
    And no two Study tiles say the same

  Scenario: The tiles are in the sheet's scroll box, and Close sits under the box
    Given Lampas is opened with every Logos lexicon ticked
    When he taps the word "condemnation" in verse 1
    Then every Study tile is inside the sheet's scroll box
    And the sheet has a Close button under the scroll box

  Scenario: A fade tells him there is more below until he reaches the end
    Given Lampas is opened with every Logos lexicon ticked
    When he taps the word "condemnation" in verse 1
    And the sheet's scroll box holds more than it shows
    Then the sheet shows a fade at the foot of the scroll box
    When he scrolls the sheet's scroll box to its end
    Then the sheet shows no fade at the foot of the scroll box

  Scenario: Close closes the sheet
    Given Lampas is opened with every Logos lexicon ticked
    When he taps the word "condemnation" in verse 1
    And he taps Close on the sheet
    Then the word sheet is gone
