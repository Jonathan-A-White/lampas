Feature: The Verse view
  Tapping a verse number opens the verse on a screen of its own (mw-5r3p30.79): the verse big at the top, woven as the Reader
  weaves it, one row of actions under it (Listen, Read it aloud, Ask the tutor, Quiz me, Copy link) and ONE hold bar at the bottom that
  does the chosen action. The phone's Back returns to the Reader where it was. The Reader's Talk bar is not shown under it.

  Scenario: Tapping verse 11 opens the Verse view with the verse big and woven
    Given Lampas is opened on Romans 8 in the English view with the weave "Solid words"
    And the Reader is scrolled a little down
    When he taps the number of verse 11
    Then the Verse view is open, headed "Romans 8:11"
    And the Verse view's verse has the same words as the Reader's line for verse 11
    And the Verse view's verse has a Greek word woven in
    And the Verse view's verse is set bigger than the Reader's line
    When he presses the phone's Back
    Then the Verse view is closed
    And the Reader is still scrolled to the same place

  Scenario: Back is a step of its own and the Verse view does not keep the verse selected
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    When he taps the number of verse 11
    And he presses the phone's Back
    Then the Verse view is closed
    And the address names no verse

  Scenario: One row of actions and exactly one hold bar, and no Talk bar
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    When he taps the number of verse 11
    Then the row of actions is "Listen", "Read it aloud", "Ask the tutor", "Quiz me" and "Copy link"
    And exactly one hold bar is on screen
    And the Reader's Talk bar is not on screen

  Scenario: Listen: the bar says Hold to listen and the verse is read aloud while it is held
    Given Lampas is opened on Romans 8 in the English view with the weave "Off" and a phone that speaks
    When he taps the number of verse 11
    And he chooses "Listen"
    Then the hold bar is labelled "Hold to listen to verse 11"
    When he holds the hold bar
    Then the phone is reading verse 11 aloud
    When he lets go of the hold bar
    Then the phone has stopped reading

  Scenario: Listen stops at the end of the verse even while the bar is still held
    Given Lampas is opened on Romans 8 in the English view with the weave "Off" and a phone that speaks
    When he taps the number of verse 11
    And he chooses "Listen"
    And he holds the hold bar
    Then the phone is reading verse 11 aloud
    When the phone finishes speaking
    Then the phone has stopped reading
    And the phone never spoke verse 12

  Scenario: Read it aloud: the bar says Hold to read verse 11 and the reading check shows above it
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    When he taps the number of verse 11
    And he chooses "Read it aloud"
    Then the hold bar is labelled "Hold to read verse 11"
    And the reading check is shown
    And exactly one hold bar is on screen

  Scenario: Ask the tutor: the bar says Hold to ask and what he says goes to the tutor about the verse
    Given Lampas is opened on Romans 8 in the English view with the weave "Off" and a tutor and a recogniser behind a fake Postern
    When he taps the number of verse 11
    And he chooses "Ask the tutor"
    Then the hold bar is labelled "Hold to ask"
    When he holds the hold bar and says "What does ζωοποιήσει mean?" and lets go
    Then the mill received one grist for the lampas app, kind verse-ask, about "Romans 8:11" with the question "What does ζωοποιήσει mean?"
    And the answer shows in the Verse view

  Scenario: Copy link copies the verse's link
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    When he taps the number of verse 11
    And he taps "Copy link"
    Then the phone's clipboard holds the link of Romans 8:11
    And the Verse view says "Link copied"

  Scenario: The chosen action is remembered from verse to verse
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    When he taps the number of verse 11
    And he chooses "Ask the tutor"
    And he goes to the next verse
    Then the Verse view is headed "Romans 8:12"
    And the hold bar is labelled "Hold to ask"

  Scenario: The arrows go to the verse before and the verse after
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    When he taps the number of verse 11
    And he goes to the next verse
    Then the Verse view is headed "Romans 8:12"
    When he goes to the previous verse
    Then the Verse view is again headed "Romans 8:11"
    When he presses the phone's Back
    Then the Verse view is closed

  Scenario: Across a chapter end the arrow goes from Romans 8:39 to Romans 9:1 and back
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    When he taps the number of verse 39
    Then the next verse arrow is on
    When he goes to the next verse
    Then the Verse view is headed "Romans 9:1"
    And the previous verse arrow is on
    When he goes to the previous verse
    Then the Verse view is again headed "Romans 8:39"

  Scenario: There is no arrow before the first verse of Matthew
    Given Lampas is opened on Matthew 1 in the English view with the weave "Off"
    When he taps the number of verse 1
    Then the previous verse arrow is off
    And the next verse arrow is on
