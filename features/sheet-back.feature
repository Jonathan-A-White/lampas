Feature: Back closes an open sheet
  The phone's Back (the system gesture or button, and the browser's back) on an open bottom sheet (the word sheet, the Grammar sheet over
  it, the idea sheet over that, the Talk sheet) closes the sheet exactly as Done does and leaves him on the screen beneath. A second Back does what Back does on
  that screen. Done, a swipe down, a tap outside or Escape close a sheet without leaving a stray history entry behind, so the next Back
  is not swallowed. One hook (src/ui/sheetBack.ts) gives every sheet this.

  Back steps back one sheet; Done, a swipe down, a tap outside and Escape on the Grammar sheet or the idea sheet that opened over a word
  card close the whole stack (the word card too) in one go and take every sheet's history entry off (mw-5r3p30.514, PROVISIONAL until the
  Governor confirms on use). A Grammar or idea sheet that is not over a word card (the Goal screen's) closes only itself.

  Scenario: Back on the word sheet closes it and the Reader still shows Romans 8 at the same verse
    Given Lampas is opened on Romans 8 with verse 2 selected
    And he taps "For" in verse 2
    When he goes back
    Then the word sheet is closed
    And the Reader shows Romans 8 at verse 2

  Scenario: Done closes the sheet and the next Back does what it did before the sheet opened
    Given Lampas is opened on Settings and then on Romans 8
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

  Scenario: Back closes the idea sheet
    Given Lampas is opened on Romans 8 with verse 2 selected
    And he taps "of the" in verse 2
    And he taps the term "genitive" on the word sheet
    And he taps Learn this idea on the Grammar sheet
    When he goes back
    Then the idea sheet is closed and the Grammar sheet is still open
    When he goes back once more
    Then the Grammar sheet is closed and the word sheet is still open

  Scenario: Back walks the Grammar sheet's trail one term at a time (word card, plural, singular)
    Given Lampas is opened on 1 John 2 in Greek
    And he taps "Τεκνία" in verse 1
    And he taps the term "plural" on the word sheet
    And he taps the related term "singular" on the Grammar sheet
    When he goes back
    Then the Grammar sheet shows "plural"
    When he goes back once more
    Then the Grammar sheet is closed and the word sheet is still open
    When he goes back a third time
    Then the word sheet is closed
    And the Reader shows 1 John 2

  Scenario: Back from an example word returns to the idea sheet, then the Grammar sheet, then the first word
    Given Lampas is opened on Romans 8 with verse 2 selected
    And he taps "of the" in verse 2
    And he taps the term "genitive" on the word sheet
    And he taps Learn this idea on the Grammar sheet
    And he taps the first example on the idea sheet
    Then the idea sheet and the Grammar sheet are gone and the word sheet shows the example
    When he goes back
    Then the idea sheet is open again over the Grammar sheet, and the word sheet shows what it did before the example
    When he goes back once more
    Then the idea sheet is closed and the Grammar sheet is still open
    When he goes back a third time
    Then the Grammar sheet is closed and the word sheet is still open
    When he goes back a fourth time
    Then the word sheet is closed

  Scenario: Done after moves inside a sheet leaves no entry behind
    Given Lampas is opened on Settings and then on Romans 8
    And he taps "For" in verse 2
    And he taps the term "conjunction" on the word sheet
    And he taps the related term "particle" on the Grammar sheet
    And he taps Done on the Grammar sheet
    When he goes back
    Then the Settings screen is open

  Scenario: Done on the word sheet after an example word leaves no entry behind
    Given Lampas is opened on Settings and then on Romans 8
    And he taps "of the" in verse 2
    And he taps the term "genitive" on the word sheet
    And he taps Learn this idea on the Grammar sheet
    And he taps the first example on the idea sheet
    And he taps Done on the word sheet
    When he goes back
    Then the Settings screen is open

  Scenario: Back on the Talk sheet closes it
    Given Lampas is opened on Romans 8
    And he opens the Talk sheet
    When he goes back
    Then the Talk sheet is closed
    And the Reader shows Romans 8

  Scenario: Back on the teach sheet closes it
    Given Lampas is opened on Romans 8
    And he opens the teach sheet
    When he goes back
    Then the teach sheet is closed
    And the Reader shows Romans 8

  Scenario: Back on the Ask for another approach sheet closes it
    Given Lampas is opened on Settings with the Ask for another approach sheet open
    When he goes back
    Then the Ask for another approach sheet is closed
    And the Settings screen is open

  Scenario: Escape and a tap outside leave no stray entry either
    Given Lampas is opened on Settings and then on Romans 8
    And he taps "For" in verse 2
    And he taps outside the word sheet
    And he taps "For" in verse 2 again
    And he presses Escape
    When he goes back
    Then the Settings screen is open

  Scenario Outline: <way> on the Grammar sheet closes the Grammar sheet and the word card with it
    Given Lampas is opened on 1 John 2 in Greek
    And he taps "Τεκνία" in verse 1
    And he taps the term "plural" on the word sheet
    When he dismisses the Grammar sheet with <way>
    Then no sheet is open
    And the Reader shows 1 John 2

    Examples:
      | way           |
      | Done          |
      | a swipe down  |
      | a tap outside |
      | Escape        |

  Scenario Outline: <way> on the idea sheet closes the idea sheet, the Grammar sheet and the word card
    Given Lampas is opened on Romans 8 with verse 2 selected
    And he taps "of the" in verse 2
    And he taps the term "genitive" on the word sheet
    And he taps Learn this idea on the Grammar sheet
    When he dismisses the idea sheet with <way>
    Then no sheet is open
    And the Reader shows Romans 8 at verse 2

    Examples:
      | way           |
      | Done          |
      | a swipe down  |
      | a tap outside |
      | Escape        |

  Scenario: Done on the Grammar sheet over the word card takes every entry off, so Back does not reopen a sheet
    Given Lampas is opened on Settings and then on Romans 8
    And he taps "For" in verse 2
    And he taps the term "conjunction" on the word sheet
    And he taps Done on the Grammar sheet
    When he goes back
    Then the Settings screen is open
    And no sheet is open

  Scenario: Done on the idea sheet over the Grammar sheet and the word card takes every entry off
    Given Lampas is opened on Settings and then on Romans 8
    And he taps "of the" in verse 2
    And he taps the term "genitive" on the word sheet
    And he taps Learn this idea on the Grammar sheet
    And he taps Done on the idea sheet
    When he goes back
    Then the Settings screen is open
    And no sheet is open

  Scenario: Every sheet in the app uses the shared hook
    Then every component that closes with Done as a sheet uses the shared hook
