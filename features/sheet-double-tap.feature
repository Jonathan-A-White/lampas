Feature: A double tap on a sheet's button does not reach what lies under it
  The Tester (mw-i7xe0n.26): on the Goal screen of 1 John, a fast double tap on the Learn sheet's Done opened Settings (the second tap hit Change),
  one on the Rho sheet's Done closed the Learn sheet as well, and one on Drill it spent the drill's Hint. Every sheet, drill screen and confirm card
  ignores taps for a moment as it opens and as it closes (src/ui/settle.ts useSettleAround, PROVISIONAL, 300 ms), as a question card does; a tap
  after that moment works as before.

  Scenario: A second tap on the Learn sheet's Done does not open Settings
    Given his goal is "1 John 1" and a sheet ignores taps for a moment
    When he opens the Learn sheet from the Goal screen
    And he taps Done and at once taps Change
    Then no idea sheet is open
    And the Goal screen is still shown
    When he waits a moment
    And he taps Change
    Then Settings is open

  Scenario: A second tap on the Rho sheet's Done does not close the Learn sheet
    Given his goal is "1 John 1" and a sheet ignores taps for a moment
    When he opens the Learn sheet from the Goal screen
    And he opens the Rho sheet from it
    And he taps the Rho sheet's Done and at once the Learn sheet's Done
    Then only the Learn sheet is open

  Scenario: A second tap on Drill it does not spend the drill's Hint
    Given his goal is "1 John 1" and a sheet ignores taps for a moment
    When he opens the Learn sheet from the Goal screen
    And he opens the Rho sheet from it
    And he taps Drill it and at once taps Hint
    Then the drill is open with its Hint unspent

  Scenario: A second tap on a word does not drop it, and one on Drop does not change another
    Given his goal is "1 John 1" and a sheet ignores taps for a moment
    When he opens Words
    And he taps a learning word and at once taps Drop
    Then the word is still learning and Drop is still asked
    When he waits a moment
    And he taps Drop and at once taps another word
    Then the word is dropped and the other word is unchanged
