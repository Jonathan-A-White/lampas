Feature: My study way
  The reader shapes the tutor's read, quiz and map method by talking with it (mw-5r3p30.76). When he says how he wants the quiz
  different ("shorter quizzes", "skip the map"), the tutor may propose a one-line change to his study way; the answer shows it
  with Keep this, and nothing is kept until he taps. The kept lines live on the phone (the settings store, at most 12), are read,
  edited and deleted on the page Settings > My study way, and go in every quiz request, where the grind lets them override its
  default method.

  Scenario: A line the tutor proposes is kept with one tap and survives a close
    Given Lampas is opened on Romans 8 with a quiz whose first answer proposes the line "Keep quizzes to five questions."
    When he starts the quiz on the passage "Walking by the Spirit"
    Then the quiz answer shows the proposed line "Keep quizzes to five questions." with a "Keep this" button
    And nothing is kept on the phone
    When he taps "Keep this"
    Then the proposed line shows "Kept" and no "Keep this" button
    And the phone keeps the study way lines "Keep quizzes to five questions."
    When Lampas is closed and opened again
    Then the phone still keeps the study way lines "Keep quizzes to five questions."

  Scenario: A proposed line that is not kept is not saved
    Given Lampas is opened on Romans 8 with a quiz whose first answer proposes the line "Skip the map."
    When he starts the quiz on the passage "Walking by the Spirit"
    And he taps Done on the quiz sheet
    Then nothing is kept on the phone

  Scenario: Settings lists the kept lines, and each can be edited or deleted
    Given Lampas is opened on Romans 8 with a quiz whose first answer proposes the line "Skip the map."
    And the phone was given the study way lines "Keep quizzes to five questions. / Skip the map."
    When he opens Settings and then "My study way"
    Then the page shows the lines "Keep quizzes to five questions. / Skip the map."
    When he edits the line "Skip the map." to "Always map the passage."
    Then the page now shows the lines "Keep quizzes to five questions. / Always map the passage."
    And the phone now keeps the study way lines "Keep quizzes to five questions. / Always map the passage."
    When he deletes the line "Keep quizzes to five questions."
    Then the page ends with the lines "Always map the passage."
    And the phone ends with the study way lines "Always map the passage."

  Scenario: Every quiz request carries the kept lines
    Given Lampas is opened on Romans 8 with a quiz whose first answer proposes the line "Keep quizzes to five questions."
    And the phone was given the study way lines "Use more grammar. / Skip the map."
    When he starts the quiz on the passage "Walking by the Spirit"
    And the quiz answer number 1 has arrived
    And he sends "Next, please"
    Then the mill received 2 grists
    And grist number 1 carries the study way "Use more grammar. / Skip the map."
    And grist number 2 also carries the study way "Use more grammar. / Skip the map."

  Scenario: An ordinary talk and a phone with no kept lines send no study way
    Given Lampas is opened on Romans 8 with a quiz whose first answer proposes the line "Skip the map."
    And the phone was given the study way lines "Use more grammar."
    When he opens the ordinary talk about verse 11 and sends "Why this word?"
    Then the mill received 1 grists
    And grist number 1 carries no study way

  Scenario: Twelve lines are the most he can keep
    Given Lampas is opened on Romans 8 with a quiz whose first answer proposes the line "A thirteenth line."
    And the phone was given 12 study way lines
    When he starts the quiz on the passage "Walking by the Spirit"
    Then the proposed line shows no "Keep this" button and says "Your study way is full: delete a line in Settings > My study way."
