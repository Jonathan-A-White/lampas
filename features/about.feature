Feature: About and credits
  Lampas shows the credit its data requires. The About screen, opened from Home, is built from
  ATTRIBUTION.md, so the credit on the screen and the credit in the repository cannot differ.

  Scenario: About credits the lexicon and the Bible text
    Given Lampas is opened on Home
    When he taps "About"
    Then the screen is headed "About"
    And it credits STEPBible and Tyndale House for the lexicon
    And it links to the CC BY 4.0 licence at "https://creativecommons.org/licenses/by/4.0/"
    And it lists the changes made to the lexicon
    And it says the Majority Standard Bible is public domain

  Scenario: Back returns Home
    Given Lampas is opened on Home
    And he taps "About"
    When he taps "‹ Reader"
    Then Home is shown again
