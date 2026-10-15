Feature: The letter drill after Got it
  Moving "Your level" on The Greek alphabet to "Learning" (Got it) starts a letter drill at once (src/LetterDrillScreen.tsx, mw-86e9r1.11): all 24
  letters, each in its small form and its capital, asked by ear ("Tap to hear a letter, then tap it") or by name ("Which letter is Beta?"), eight
  questions to a round. A round ends on "Another round" and "Done"; rounds are offered until each letter has been answered right in both forms. A
  letter missed comes back in a later round. Done returns to the idea sheet. Each right answer credits that letter, but one sitting never makes a
  letter solid: Solid comes from the spaced reviews. (The rig's hearing is a tap, not a hold: docs/pwa-best-practices.md section 12.)

  Scenario: A beginner drills the letters after Got it
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1" and no idea level
    When he opens the idea sheet of "alphabet" from the Goal screen
    And he slides "Your level" to "Learning"
    Then the letter drill opens on a round of 8 questions
    When he answers the whole round right
    Then the round ends on "Another round" and "Done"
    And the round says "8 of 8 right" and "8 of 48 right so far"
    When he goes on in rounds, answering every question right, until the drill is complete
    Then every question was heard or named
    And both the small and the capital forms were asked
    And the drill says every letter is right in both forms, and offers only "Done"
    When he taps "Done"
    Then the letter drill is closed and the idea sheet shows
    And "The Greek alphabet" is still at the frontier and no letter is solid
    And every letter has been credited

  Scenario: A letter missed comes back
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1" and no idea level
    When he opens the idea sheet of "alphabet" from the Goal screen
    And he slides "Your level" to "Learning"
    And he answers the first question wrong and the rest of the round right
    Then the round says "7 of 8 right" and "7 of 48 right so far"
    And "Another round" is offered
    When he starts another round
    Then the missed letter is asked again

  Scenario: Stop leaves the drill for the idea sheet
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1" and no idea level
    When he opens the idea sheet of "alphabet" from the Goal screen
    And he slides "Your level" to "Learning"
    And he taps "Stop"
    Then the letter drill is closed and the idea sheet shows
