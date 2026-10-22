Feature: The word sheet's Study row at scale
  With a long Logos library the Study row does not draw a tile for every lexicon (docs/design/library-at-scale.md 3.5). It draws the lexicons he pinned,
  Bible Word Study and a door, "All 21 lexicons ›", to a sheet that has a search field and lists the pinned ones first and then every one that is On,
  each a row that opens the word's entry. With only a few On and none pinned the row shows them all and has no door.
  (The layout at phone width is proved in tests/e2e/word-sheet-many.spec.ts.)

  Scenario: Two pinned and twenty-one On draw the two, Bible Word Study and the door
    Given Lampas is opened with 21 Logos lexicons On and 2 of them pinned
    When he taps the word "condemnation" in verse 1
    Then the Study row has 3 tiles and a door
    And the first Study tiles are the pinned lexicons
    And the Study tile "Bible Word Study" is there
    And the door says "All 21 lexicons ›"

  Scenario: Three On and none pinned draw the three and no door
    Given Lampas is opened with 3 Logos lexicons On and 0 of them pinned
    When he taps the word "condemnation" in verse 1
    Then the Study row has 4 tiles and no door

  Scenario: The sheet lists the pinned lexicons first and then every one that is On
    Given Lampas is opened with 21 Logos lexicons On and 2 of them pinned
    When he taps the word "condemnation" in verse 1
    And he taps the door
    Then the sheet "All lexicons" is over the word sheet, a direct child of its overlay
    And the sheet lists 21 lexicons, the pinned ones first
    And every row is at least 44 px tall
    And the sheet has Manage at its foot

  Scenario: A row opens the word's entry in that lexicon
    Given Lampas is opened with 21 Logos lexicons On and 2 of them pinned
    When he taps the word "condemnation" in verse 1
    And he taps the door
    Then the row "Louw-Nida" opens the entry for "κατάκριμα" in that lexicon

  Scenario: The search narrows the rows
    Given Lampas is opened with 21 Logos lexicons On and 2 of them pinned
    When he taps the word "condemnation" in verse 1
    And he taps the door
    And he searches the sheet for "nasb"
    Then the sheet lists only the lexicons that say "NASB"

  Scenario: Manage opens the Lexicons page
    Given Lampas is opened with 21 Logos lexicons On and 2 of them pinned
    When he taps the word "condemnation" in verse 1
    And he taps the door
    And he taps Manage on the sheet
    Then the Lexicons page of the Library is open

  Scenario: Back closes the sheet and leaves the word sheet
    Given Lampas is opened with 21 Logos lexicons On and 2 of them pinned
    When he taps the word "condemnation" in verse 1
    And he taps the door
    And he presses Back
    Then the sheet "All lexicons" is gone
    And the word sheet is still there
