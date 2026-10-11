Feature: The tutor takes him to a chapter
  A Bible talk answer may carry `go` (mw-5r3p30.172): a book of the app's own list and a chapter in range. Asked in words to switch
  to, open, go to or take him to a chapter ('can you switch to Colossians 1'), the tutor says where it is taking him and the app opens
  the Reader there as a new Back step, with the line 'Opened Colossians 1' under the header. The talk he left keeps the same line on
  that turn. The app reads `go` itself and never free text: a go it cannot take is ignored, the answer is still shown and the talk says
  'Could not open ...' so the text never claims a move that did not happen.

  Scenario: Switching to Colossians 1 opens the Reader there, and Back returns to Romans 8
    Given Lampas is opened on Romans 8 and the tutor answers with go "Colossians" 1
    And he opens Talk
    When he sends "can you switch to Colossians 1"
    Then the Reader is open on "Colossians 1"
    And the Talk sheet is closed
    And the Reader says "Opened Colossians 1"
    When he taps the phone's Back
    Then the Reader is back on "Romans 8"
    And the Reader does not say "Opened Colossians 1"
    When he opens Talk again
    Then the talk shows the answer and the line "Opened Colossians 1"

  Scenario: A chapter the book does not have is not opened and the talk says so
    Given Lampas is opened on Romans 8 and the tutor answers with go "Colossians" 9
    And he opens Talk
    When he sends "take me to Colossians 9"
    Then the answer shows in the sheet
    And the sheet says "Could not open Colossians 9" and nothing was opened
    And the Reader is open on "Romans 8"

  Scenario: A book the app does not have is not opened and the talk says so
    Given Lampas is opened on Romans 8 and the tutor answers with go "Psalms" 23
    And he opens Talk
    When he sends "open Psalm 23"
    Then the answer shows in the sheet
    And the sheet says "Could not open Psalms 23" and nothing was opened
    And the Reader is open on "Romans 8"

  Scenario: A go in a shape the app refuses is ignored and the answer is still shown
    Given Lampas is opened on Romans 8 and the tutor answers with the go text "Colossians 1"
    And he opens Talk
    When he sends "go to Colossians 1"
    Then the answer shows in the sheet
    And the sheet says "Could not open Colossians 1" and nothing was opened
    And the Reader is open on "Romans 8"

  Scenario: An answer that comes after he closed the sheet does not move him
    Given Lampas is opened on Romans 8 and the tutor holds its answer with go "Colossians" 1
    And he opens Talk
    When he sends "can you switch to Colossians 1"
    And he taps Done on the Talk sheet
    And the tutor answers
    And he opens Talk again
    Then the answer shows in the sheet
    And the sheet says "Could not open Colossians 1" and nothing was opened
    And the Reader is open on "Romans 8"
