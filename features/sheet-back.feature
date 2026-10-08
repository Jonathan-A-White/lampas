Feature: Back closes an open sheet
  The phone's Back (the system gesture or button, and the browser's back) on an open bottom sheet (the word sheet, the Grammar sheet over
  it, the Talk sheet) closes the sheet exactly as Done does and leaves him on the screen beneath. A second Back does what Back does on
  that screen. Done, a swipe down, a tap outside or Escape close a sheet without leaving a stray history entry behind, so the next Back
  is not swallowed. One hook (src/ui/sheetBack.ts) gives every sheet this.

  Scenario: Back on the word sheet closes it and the Reader still shows Romans 8 at the same verse
    Given Lampas is opened on Romans 8 with verse 2 selected
    And he taps "For" in verse 2
    When he goes back
    Then the word sheet is closed
    And the Reader shows Romans 8 at verse 2

  Scenario: Done closes the sheet and the next Back does what it did before the sheet opened
    Given Lampas is opened on Settings and then on Romans 8 with verse 2 selected
    And he taps "For" in verse 2
    When he taps Done on the word sheet
    Then the word sheet is closed
    When he goes back
    Then the Settings screen is open

  Scenario: Back on the Grammar sheet closes only that sheet; a second Back closes the word sheet
    Given Lampas is opened on Romans 8 with verse 2 selected
    And he taps "For" in verse 2
    And he taps the term "conjunction" on the word sheet
    When he goes back
    Then the Grammar sheet is closed and the word sheet is still open
    When he goes back once more
    Then the word sheet is closed

  Scenario: Back on the Talk sheet closes it
    Given Lampas is opened on Romans 8 with verse 2 selected
    And he opens the Talk sheet
    When he goes back
    Then the Talk sheet is closed
    And the Reader shows Romans 8 at verse 2

  Scenario: Escape and a tap outside leave no stray entry either
    Given Lampas is opened on Settings and then on Romans 8 with verse 2 selected
    And he taps "For" in verse 2
    And he taps outside the word sheet
    And he taps "For" in verse 2 again
    And he presses Escape
    When he goes back
    Then the Settings screen is open

  Scenario: Every sheet in the app uses the shared hook
    Then every component that closes with Done as a sheet uses the shared hook
