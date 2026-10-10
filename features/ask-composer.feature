Feature: Ask the tutor uses the shared composer
  The Verse view's Ask the tutor action is bsv-kit's Composer, the way Postern asks: one big Hold to ask bar with his words as he speaks, and a quiet
  Type a question under it. There is no separate Ask button and no second hold bar. What he says or types goes to the tutor as it always did, with the
  verses of the passage or the verse in the reference. The tutor takes no photo or file, so the composer shows no attach or camera button.

  Scenario: Ask the tutor shows one composer and nothing else to ask with
    Given Lampas is opened on Romans 8 in the English view with a tutor and a recogniser behind a fake Postern
    When he taps the heading "Walking by the Spirit"
    And he chooses "Ask the tutor"
    Then one composer is on screen with a "Hold to ask" bar and a "Type a question" button
    And there is no Ask button, no second hold bar, no attach button and no camera button

  Scenario: Holding shows his words as he speaks and letting go asks about verses 1-11
    Given Lampas is opened on Romans 8 in the English view with a tutor and a recogniser behind a fake Postern
    When he taps the heading "Walking by the Spirit"
    And he chooses "Ask the tutor"
    And he holds the Hold to ask bar
    And the recogniser hears "What is the Spirit's work"
    Then the composer shows the live words "What is the Spirit's work"
    When he lets go of the Hold to ask bar
    Then the mill received one grist for the lampas app, kind verse-ask, about "Romans 8:1-11" with the question "What is the Spirit's work"
    And that grist carries the Greek and the English of verses 1 to 11 and no other
    And the answer shows in the Verse view

  Scenario: Typing a question and tapping Send asks the same way
    Given Lampas is opened on Romans 8 in the English view with a tutor and a recogniser behind a fake Postern
    When he taps the heading "Walking by the Spirit"
    And he chooses "Ask the tutor"
    And he taps "Type a question"
    And he types "What is the Spirit's work here?" and taps Send
    Then the mill received one grist for the lampas app, kind verse-ask, about "Romans 8:1-11" with the question "What is the Spirit's work here?"
    And that grist carries the Greek and the English of verses 1 to 11 and no other
    And the answer shows in the Verse view
