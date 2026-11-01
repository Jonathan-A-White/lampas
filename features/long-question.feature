Feature: A long pasted question is kept and sent whole, never cut
  He pastes a prayer or a passage of several paragraphs into the Talk sheet's box. A question may be 4000
  characters in both. Nothing he pastes is cut: a paste of 3000 characters goes whole to the tutor, and one past 4000 stays in the box, with its
  count in the warning colour and the reason it cannot be sent, until he shortens it.

  Scenario: A 3000-character prayer pasted into Talk is sent whole
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    When he opens the Talk sheet
    And he pastes a prayer of 3000 characters into the Talk sheet's message box
    Then the Talk sheet's message box holds all 3000 characters
    When he taps Send in the Talk sheet
    Then the mill received one bible-talk grist whose question is the whole prayer of 3000 characters

  Scenario: A 4500-character prayer pasted into Talk is kept, counted in the warning colour and not sent
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    When he opens the Talk sheet
    And he pastes a prayer of 4500 characters into the Talk sheet's message box
    Then the Talk sheet's message box holds all 4500 characters
    And the Talk sheet shows "4500 of 4000" in the warning colour
    And the Talk sheet's Send is off and says the question is too long
    And the mill received no grist

