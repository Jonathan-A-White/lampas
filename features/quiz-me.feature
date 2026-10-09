Feature: Quiz me in the Verse view
  The Verse view has a fourth action, Quiz me (mw-5r3p30.74), for a verse or for a passage under a heading. Its button starts the
  read, quiz, map cycle with the tutor: the Talk sheet opens on a conversation of its own, 'Quiz on Romans 8:1-11', and the
  bible-talk grind is sent the whole passage's Greek and English (the app's own text, never the first three verses), a quiz mode
  marker, and what Lampas knows of the reader. The quiz is kept on the phone apart from the ordinary talk about the same verses.

  Scenario: Quiz me on Romans 8:1-11 sends the whole passage with the quiz marker
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern
    When he taps the heading "Walking by the Spirit"
    And he chooses "Quiz me"
    Then the Verse view shows a "Start the quiz" button and no hold bar
    When he taps "Start the quiz"
    Then the sheet is titled "Quiz on Romans 8:1-11"
    And the mill received one grist for the lampas app, kind bible-talk, in quiz mode about "Romans 8:1-11"
    And that grist carries the Greek and the English of verses 1 to 11 and no other
    And that grist carries his solid words and what Lampas knows of him
    And that grist carries nothing but the app's own text and the reader's own data
    And the first question shows in the sheet under his "Quiz me on Romans 8:1-11."
    And the quiz is kept under "rom.8.1-11:quiz" and not under the chapter, verse 1 or the passage's talk

  Scenario: An answer in the quiz carries the marker and the earlier turn
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern
    When he taps the heading "Walking by the Spirit"
    And he chooses "Quiz me"
    And he taps "Start the quiz"
    And the quiz answer number 1 has arrived
    And he sends "There is no condemnation"
    Then the mill received 2 grists for the lampas app, kind bible-talk
    And the second grist is in quiz mode about "Romans 8:1-11" with the question "There is no condemnation"
    And the second grist carries the first question and its answer as the earlier turn

  Scenario: Quiz me on one verse
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern
    When he taps the number of verse 11
    And he chooses "Quiz me"
    And he taps "Start the quiz"
    Then the sheet is titled "Quiz on Romans 8:11"
    And the mill received one grist for the lampas app, kind bible-talk, in quiz mode about "Romans 8:11"
    And that grist carries the Greek and the English of verse 11 alone
    And the quiz is kept under "rom.8.11:quiz" and not under the chapter, verse 1 or the passage's talk

  Scenario: A quiz that is already begun is continued, not begun again
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern
    When he taps the heading "Walking by the Spirit"
    And he chooses "Quiz me"
    And he taps "Start the quiz"
    And the quiz answer number 1 has arrived
    And he taps Done on the sheet
    Then the Verse view shows a "Continue the quiz" button and no hold bar
    When he taps "Continue the quiz"
    Then the sheet is titled "Quiz on Romans 8:1-11"
    And the sheet shows 1 turn
    And the mill received one grist for the lampas app, kind bible-talk, in quiz mode about "Romans 8:1-11"

  Scenario: An ordinary talk about a verse is not in quiz mode
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern
    When he taps the number of verse 11
    And he chooses "Ask the tutor"
    And he taps "Talk about verse 11"
    And he sends "Why this word?"
    Then the mill received one grist for the lampas app, kind bible-talk, not in quiz mode
