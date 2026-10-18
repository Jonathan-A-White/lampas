Feature: Quiz me asks what he wants from the quiz
  People come to Lampas for different reasons: to understand a passage, to learn Greek, to learn English, to read the Bible, or
  something else (mw-5r3p30.185). When no quiz goal is kept, Quiz me opens with the tutor asking, in one short plain question and
  with no list of options, why he wants the quiz; the tutor then quizzes to match and, once, offers to keep that as his default
  ('Is this how you want me to quiz you from now on?'). 'Yes, from now on' keeps the goal on the phone as the setting Quiz goal,
  which Settings shows and he can change or clear and every quiz request carries; 'Just this time' keeps nothing. A kept goal skips
  the opening question.

  Scenario: With no quiz goal kept the quiz request says so and the instructions open by asking why
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal "understanding the passage"
    When he starts the quiz on the passage "Walking by the Spirit"
    Then the mill received 1 grist
    And grist number 1 says that no quiz goal is kept
    And the bible-talk instructions say to open by asking why he wants the quiz in one short plain question with no list of options
    And the bible-talk instructions say to ask at most one follow-up and then quiz to match the goal

  Scenario: Yes, from now on keeps the goal in Settings and every later quiz request carries it
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal "understanding the passage"
    When he starts the quiz on the passage "Walking by the Spirit"
    Then the quiz answer offers to keep the quiz goal "understanding the passage" with the buttons "Yes, from now on" and "Just this time"
    And no quiz goal is kept on the phone
    When he taps "Yes, from now on"
    Then the offer says "Kept as your quiz goal" and has no buttons
    And the phone keeps the quiz goal "understanding the passage"
    When he sends "Next, please" in the quiz
    Then the mill received 2 grists
    And grist number 2 carries the quiz goal "understanding the passage"
    When he closes the quiz sheet and opens Settings
    Then Settings shows the Quiz goal "understanding the passage"

  Scenario: Just this time keeps nothing but the quiz goes on to match
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal "learning Greek"
    When he starts the quiz on the passage "Walking by the Spirit"
    And he taps "Just this time"
    Then the offer says "Just this time" and has no buttons
    And no quiz goal is kept on the phone
    When he sends "Next, please" in the quiz
    Then the mill received 2 grists
    And grist number 2 says that no quiz goal is kept and that this quiz is for "learning Greek"

  Scenario: A kept goal is changed or cleared in Settings
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal "understanding the passage"
    And the phone was given the quiz goal "learning Greek"
    When he opens Settings
    Then Settings shows the Quiz goal "learning Greek"
    When he changes the Quiz goal to "reading the Bible with my family"
    Then the phone keeps the quiz goal "reading the Bible with my family"
    When he clears the Quiz goal
    Then no quiz goal is kept on the phone
    And Settings shows no Quiz goal kept

  Scenario: Words typed in the Quiz goal and not saved are still there when he comes back to Settings
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal "understanding the passage"
    When he opens Settings
    And he types "a draft left unsaved" in the Quiz goal
    And he goes back to the Reader and opens Settings again
    Then Settings shows the Quiz goal "a draft left unsaved"
    And the Quiz goal Save button is on
    And Settings shows no Quiz goal kept
    And no quiz goal is kept on the phone

  Scenario: After Save the kept draft is gone
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal "understanding the passage"
    And the phone was given the quiz goal "learning Greek"
    When he opens Settings
    And he types "a draft left unsaved" in the Quiz goal
    And he saves the Quiz goal
    And he goes back to the Reader and opens Settings again
    Then Settings shows the Quiz goal "a draft left unsaved"
    And no draft of the Quiz goal is kept

  Scenario: After Clear the kept draft is gone
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal "understanding the passage"
    And the phone was given the quiz goal "learning Greek"
    When he opens Settings
    And he types "a draft left unsaved" in the Quiz goal
    And he clears the Quiz goal
    And he goes back to the Reader and opens Settings again
    Then Settings shows no Quiz goal kept
    And no draft of the Quiz goal is kept

  Scenario: The Quiz goal row has a visible label and says which goal is kept without repeating the label
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal "understanding the passage"
    And the phone was given the quiz goal "understanding what the passage says"
    When he opens Settings
    Then the Quiz goal row shows the visible text "Quiz goal"
    And the Quiz goal row says "Kept: understanding what the passage says"
    And the words "Quiz goal" appear once in the Quiz goal group

  Scenario: Save is off for a field of only spaces and Clear still clears
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal "understanding the passage"
    And the phone was given the quiz goal "learning Greek"
    When he opens Settings
    And he types only spaces in the Quiz goal
    Then the Quiz goal Save button is off
    When he clears the Quiz goal
    Then no quiz goal is kept on the phone

  Scenario: A kept goal is sent with the first request of a quiz
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal "understanding the passage"
    And the phone was given the quiz goal "learning English"
    When he starts the quiz on the passage "Walking by the Spirit"
    Then the mill received 1 grist
    And grist number 1 carries the quiz goal "learning English"

  Scenario: The app asks the goal question beside the buttons when the answer leaves it out
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal "understanding the passage"
    When he starts the quiz on the passage "Walking by the Spirit"
    Then the offer shows the line "Is this how you want me to quiz you from now on?" exactly once, above the buttons "Yes, from now on" and "Just this time"

  Scenario: The question is not shown twice when the answer already asks it
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern whose answer already asks the goal question and offers the quiz goal "understanding the passage"
    When he starts the quiz on the passage "Walking by the Spirit"
    Then the goal question "Is this how you want me to quiz you from now on?" shows exactly once in the whole turn, beside the buttons "Yes, from now on" and "Just this time"

  Scenario: A turn with no quiz goal offer shows no goal question
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers no quiz goal
    When he starts the quiz on the passage "Walking by the Spirit"
    Then the turn shows no goal question and no offer

  Scenario: The instructions pitch a quiz with the goal understanding in plain English
    Given the bible-talk grind's instructions
    Then they say that with the goal understanding the questions are in plain English and leave the Greek out unless he asks
    And they say that a kept quiz goal is not asked about again and may be changed when he asks
    And they say to offer to keep the goal once, with the question "Is this how you want me to quiz you from now on?"
