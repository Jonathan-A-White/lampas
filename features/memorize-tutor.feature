Feature: The tutor knows his memorizing and works the Memorize screen
  Memorizing is in the tutor's registry (mw-fu7dqf.12, his Q8 A): the tutor reads his verses (the fact `memorizing`, and `verseText` and `memorizeEvidence` to quiz him and judge how it goes),
  memorizes, unmemorizes, moves a verse between his lists and starts a session through the same functions the buttons call, and opens Memorize. 'Help me memorize Romans 8:28' puts
  the verse on his schedule in English with the app's own line and an Undo; asked what he is memorizing the tutor looks at his memorized verses first; asked to open Memorize it
  takes him there as a step of Back.

  Scenario: Help me memorize Romans 8:28
    Given Lampas is opened on Romans 8 and the tutor answers with a do of memorize "Rom.8.28"
    And he opens Talk
    When he sends "help me memorize Romans 8:28"
    Then the sheet says "Memorizing Romans 8:28 in English" with an Undo button
    And "Rom.8.28" is memorized in "en"
    When he taps Undo on that line
    Then the sheet says "Put back"
    And "Rom.8.28" is not memorized

  Scenario: What am I memorizing?
    Given he memorizes "Rom.8.28" and said it once, and Lampas is opened on Romans 8 with the tutor asking for "memorizing" before it answers
    And he opens Talk
    When he sends "what am I memorizing?"
    Then the sheet says "Looking at your memorized verses"
    And the follow-up carries "memorizing" with "Rom.8.28" in it
    When the tutor gives its second answer
    Then the answer shows in the sheet
    And the sheet no longer says "Looking at your"

  Scenario: Open Memorize
    Given Lampas is opened on Romans 8 and the tutor takes him to "memorize-screen" when he asks for it
    And he opens Talk
    When he sends "open Memorize"
    Then the Memorize screen is open
    And the Talk sheet is closed
    When he taps the phone's Back
    Then the Talk sheet is open again
    And the Memorize screen is not open
