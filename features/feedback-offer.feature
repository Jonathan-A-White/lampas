Feature: An ask Lampas cannot meet is offered to the makers
  If he asks the tutor for something Lampas does not do ('make it work with another app', a new setting, a change), the tutor says
  so plainly and the answer carries a one-line summary of the ask (`feedback_offer`). The turn then offers 'Send this to the makers'.
  One tap sends one grist of the kind feedback (the same sender as Ask for another approach, src/services/feedback.ts), with his
  words, the tutor's summary and the screen's name and facts; the turn then says Sent and that the answer will come back. It is on
  every Talk sheet: the Reader's and the one of any other screen. Nothing is sent without the tap. These scenarios run against a
  fake Postern whose mill answers a talk with the tutor's answer and a feedback grist with {"status":"sent"}.

  Scenario: From a screen, an answer with an offer shows Send this to the makers and a tap sends one feedback grist
    Given Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback
    When he taps the Ask the tutor control
    And he sends "Can this work with Olive Tree?"
    Then the answer shows the button "Send this to the makers"
    And the mill received 1 grists for the lampas app, kind bible-talk
    When he taps Send this to the makers
    Then the mill received 2 grists for the lampas app, the second of kind feedback
    And the feedback grist carries his words "Can this work with Olive Tree?", the tutor's summary and the screen "Goal"
    And the feedback grist carries only fields the feedback input schema allows
    And the turn shows "Sent" and "The answer will come back."
    And the bus has heard feedback-sent for tutor-ask

  Scenario: An answer without an offer has no such button and nothing is sent by itself
    Given Lampas is opened on #/goal behind a fake Postern whose tutor does not offer feedback
    When he taps the Ask the tutor control
    And he sends "Where am I?"
    Then the answer shows no button "Send this to the makers"
    And the mill received 1 grists for the lampas app, kind bible-talk

  Scenario: In the Reader the offer is the same and names the verse
    Given Lampas is opened on the Reader behind a fake Postern whose tutor offers feedback
    When he opens the Talk sheet on the chapter and sends "Add a Greek keyboard please"
    And he taps Send this to the makers
    Then the mill received 2 grists for the lampas app, the second of kind feedback
    And the feedback grist is for the screen "Reader" and the reference "Romans 8"
    And the turn shows "Sent" and "The answer will come back."

  Scenario: A mill that is down shows Could not reach the tutor and Retry, and Sent stays after the sheet is reopened
    Given Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback
    When he taps the Ask the tutor control
    And he sends "Can this work with Olive Tree?"
    And the mill goes down and he taps Send this to the makers
    Then the turn shows "Could not reach the tutor" and a Retry button
    When the mill is back and he taps Retry
    Then the turn shows "Sent" and "The answer will come back."
    When he closes the Talk sheet and opens it again
    Then the turn shows "Sent" and no button "Send this to the makers"
