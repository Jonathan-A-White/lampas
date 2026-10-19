Feature: A few minutes of speech go to the Bible talk whole, and come back whole
  He holds the Talk button and speaks for a while. A question of 885 characters, about a minute of speech, goes to the tutor whole as he said it, and the
  request passes the grind's input schema. When the tutor gives it back cleaned up, the cleaned question of 885 characters is kept whole.
  (mw-5r3p30.463: once the Talk sheet cut a spoken question at 600 characters; the limit is now 4000, src/services/requestBudget.ts.)

  Scenario: An 885-character spoken question is sent whole and the request passes the input schema
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and a recogniser
    When he holds the Talk button
    And he says a spoken question of 885 characters
    And he lets go of the Talk button
    Then the mill received one bible-talk grist marked as spoken whose question is all 885 characters
    And that request passes grinds/bible-talk.input.schema.json

  Scenario: An answer whose question is 885 characters is kept
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and a recogniser
    When he holds the Talk button
    And he says a spoken question of 885 characters
    And he lets go of the Talk button
    And the tutor answers with his question cleaned up, 885 characters long
    Then the answer passes grinds/bible-talk.answer.schema.json and the phone's own check
    And the sheet shows the cleaned question of 885 characters over the answer
    And the talk keeps the cleaned question of 885 characters
