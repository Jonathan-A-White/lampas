Feature: A section heading opens the Verse view for its passage
  Tapping a section heading in the Reader opens the same Verse view a verse number opens (mw-5r3p30.73), for the passage under the
  heading (the heading to the next heading): the heading and its verse range at the top, the passage's verses big, the same one row of
  actions (Listen, Read it aloud, Ask the tutor, Quiz me, Copy link) and the same ONE control at the foot, each doing its action for the whole passage.
  Romans 8 has five headings: 8:1-11, 8:12-17, 8:18-27, 8:28-34 and 8:35-39. The phone's Back returns to the Reader.

  Scenario: Tapping the heading of Romans 8:1-11 opens the Verse view headed with the heading and its range
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    And the Reader is scrolled a little down
    When he taps the heading "Walking by the Spirit"
    Then the Verse view is open, headed "Walking by the Spirit, Romans 8:1-11"
    And the Verse view shows verses 1 to 11 of the chapter and no other
    And the Reader's Talk bar is not on screen
    When he presses the phone's Back
    Then the Verse view is closed
    And the Reader is still scrolled to the same place
    And the address names no passage

  Scenario: The whole heading is the tap target and it looks as before
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    Then every section heading is one button holding its whole text
    And the heading "Walking by the Spirit" is still a level 2 heading

  Scenario: The passage has the same one row of actions and exactly one control at the foot
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    When he taps the heading "Walking by the Spirit"
    Then the row of actions is "Listen", "Read it aloud", "Ask the tutor", "Quiz me" and "Copy link"
    And exactly one control sits at the foot, the Play button of Listen, and there is no hold bar

  Scenario: Listen reads the whole passage aloud to its end by itself
    Given Lampas is opened on Romans 8 in the English view with the weave "Off" and a phone that speaks
    When he taps the heading "Walking by the Spirit"
    Then the Play button says "Play verses 1-11"
    When he taps the Play button
    Then the phone is reading verse 1 aloud
    When the phone finishes speaking until verse 11 is being read
    Then verse 11 is the one highlighted in the Verse view
    When the phone finishes speaking
    Then the phone has stopped reading
    And the phone never spoke verse 12

  Scenario: Read it aloud sends the whole passage's English to be scored
    Given Lampas is opened on Romans 8 in the English view with the weave "Off" and a reading check behind a fake Postern
    When he taps the heading "Walking by the Spirit"
    And he chooses "Read it aloud"
    Then the hold bar is labelled "Hold to read verses 1-11"
    And the reading check is shown
    And exactly one hold bar is on screen
    When he holds the hold bar for 2 seconds and lets go
    Then the mill received one grist for the lampas app, kind verse-read, about "Romans 8:1-11" whose target_text holds the English of verses 1 to 11 and no other
    And the reading of the passage is kept under "rom.8.1-11" and not under verse 1

  Scenario: Ask the tutor about the passage carries its reference and text
    Given Lampas is opened on Romans 8 in the English view with the weave "Off" and a tutor and a recogniser behind a fake Postern
    When he taps the heading "Walking by the Spirit"
    And he chooses "Ask the tutor"
    Then the hold bar is labelled "Hold to ask"
    When he holds the hold bar and says "What is the Spirit's work here?" and lets go
    Then the mill received one grist for the lampas app, kind verse-ask, about "Romans 8:1-11" with the question "What is the Spirit's work here?"
    And that grist carries the Greek and the English of verses 1 to 11 and no other
    And the answer shows in the Verse view
    And the answer is kept under "rom.8.1-11" and not under verse 1

  Scenario: Copy link copies the passage's link
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    When he taps the heading "Walking by the Spirit"
    And he taps "Copy link"
    Then the phone's clipboard holds the link of Romans 8:1-11
    And the Verse view says "Link copied"

  Scenario: The arrows go to the passage before and the passage after, and are off at the chapter's ends
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    When he taps the heading "Walking by the Spirit"
    Then the previous passage arrow is off
    When he goes to the next passage
    Then the Verse view is headed "Heirs with Christ, Romans 8:12-17"
    When he goes to the previous passage
    Then the Verse view is again headed "Walking by the Spirit, Romans 8:1-11"

  Scenario: The last passage of the chapter has no next passage
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    When he taps the heading "More than Conquerors"
    Then the Verse view is open, headed "More than Conquerors, Romans 8:35-39"
    And the next passage arrow is off

  Scenario: A link or a reopen at a passage opens its view
    Given Lampas is opened on Romans 8 at the passage that starts at verse 12
    Then the Verse view is open, headed "Heirs with Christ, Romans 8:12-17"
