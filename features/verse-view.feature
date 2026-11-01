@uc-verse-view @greek
Feature: The Verse view
  Tapping a verse number opens the verse on a screen of its own (mw-5r3p30.79): the verse big at the top, woven as the Reader
  weaves it, a quiet line of tools under the text (Copy, Share, Memorize, the Logos doors, Maps; mw-5r3p30.896), a row of actions under that (Listen, Read it aloud,
  Ask the tutor, Practise, Diagram; the chosen one is marked, not filled) and ONE control at the bottom, the one filled control on the screen, that
  does the chosen action: Listen's Play button, or the hold bar of Read it aloud and Ask the tutor. The phone's Back returns to the Reader where it was. The Reader's Talk bar is not shown under it.

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

  Scenario: One row of actions, the tools under the text, exactly one control at the foot, and no Talk bar
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    When he taps the number of verse 11
    Then the row of actions is "Listen", "Read it aloud", "Practise" and "Diagram"
    And "Copy" is one of the tools under the text, not an action
    And exactly one control sits at the foot, the Play button of Listen, and there is no hold bar
    And the Reader's Talk bar is not on screen

  Scenario: Listen: Play reads the verse aloud to its end by itself
    Given Lampas is opened on Romans 8 in the English view with the weave "Off" and a phone that speaks
    When he taps the number of verse 11
    And he chooses "Listen"
    Then the Play button says "Play verse 11"
    When he taps the Play button
    Then the phone is reading verse 11 aloud
    When a minute goes by
    Then the phone has stopped reading
    And the phone never spoke verse 12
    And the phone said verse 11 to its end

  Scenario: Read it aloud: the bar says Hold to read verse 11 and the reading check shows above it
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    When he taps the number of verse 11
    And he chooses "Read it aloud"
    Then the hold bar is labelled "Hold to read verse 11"
    And the reading check is shown
    And exactly one hold bar is on screen

  Scenario: Copy copies the verse with its link on the last line
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    When he taps the number of verse 11
    And he taps "Copy"
    Then the phone's clipboard ends with the link of Romans 8:11
    And the Verse view says "Copied"

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

  Scenario: There is no arrow before the first verse of Genesis
    Given Lampas is opened on Genesis 1 in the English view with the weave "Off"
    When he taps the number of verse 1
    Then the previous verse arrow is off
    And the next verse arrow is on
