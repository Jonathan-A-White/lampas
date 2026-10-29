Feature: A long question not yet sent is still in the box when the sheet is opened again
  He pastes a prayer of several paragraphs into the Talk sheet's box or the Verse view's Ask the tutor and does not send it: a refused over-long
  question, a thumb on Back, or stepping out to shorten it. The words are kept on the phone for that place and put back when the box opens again;
  once the question is sent the kept words are gone. (mw-5r3p30.495, docs/pwa-best-practices.md section 16: keep the draft.)

  Scenario: A prayer in the Talk box is still there when Talk is opened again after Back
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    When he opens the Talk sheet
    And he pastes a prayer of 3800 characters into the Talk sheet's message box
    And he presses Back
    Then the Talk sheet is closed
    When he opens the Talk sheet again
    Then the Talk sheet's message box holds all 3800 characters
    And the mill received no grist

  Scenario: A prayer in the Talk box survives Done and is gone once it is sent
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    When he opens the Talk sheet
    And he pastes a prayer of 3800 characters into the Talk sheet's message box
    And he taps Done on the Talk sheet
    And he opens the Talk sheet again
    Then the Talk sheet's message box holds all 3800 characters
    When he taps Send in the Talk sheet
    Then the mill received one bible-talk grist whose question is the whole prayer of 3800 characters
    When he taps Done on the Talk sheet again
    And he opens the Talk sheet a third time
    Then the Talk sheet's message box is empty

  Scenario: A prayer in Ask the tutor is still there when it is opened again after Back
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    When he taps the heading "Walking by the Spirit"
    And he chooses "Ask the tutor"
    And he pastes a prayer of 3800 characters into the Ask the tutor box
    And he presses Back
    Then the Verse view is closed
    When he taps the heading "Walking by the Spirit" again
    And he chooses "Ask the tutor" again
    Then the Ask the tutor box holds all 3800 characters
    And the mill received no grist

  Scenario: A refused over-long question in Ask the tutor is still there when it is opened again
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    When he taps the heading "Walking by the Spirit"
    And he chooses "Ask the tutor"
    And he pastes a prayer of 4500 characters into the Ask the tutor box and taps Send
    And he presses Back
    And he taps the heading "Walking by the Spirit" again
    And he chooses "Ask the tutor" again
    Then the Ask the tutor box holds all 4500 characters

  Scenario: A prayer in Ask the tutor is gone once it is sent
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    When he taps the heading "Walking by the Spirit"
    And he chooses "Ask the tutor"
    And he pastes a prayer of 3800 characters into the Ask the tutor box and taps Send
    Then the mill received one bible-talk grist whose question is the whole prayer of 3800 characters
    When he presses Back
    And he taps the heading "Walking by the Spirit" again
    And he chooses "Ask the tutor" again
    Then the Ask the tutor box is empty
