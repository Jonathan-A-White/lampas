Feature: Quiz me on a Hebrew verse
  The Verse view of an Old Testament verse offers Quiz me (mw-gdcyf98.21) as a Greek verse does, from the Hebrew dial's Curious up: the Talk sheet opens its quiz and the bible-talk grist carries the verse's Hebrew and its
  words beside the English. Diagram is offered for Hebrew as for Greek (mw-5r3p30.887), and at Hebrew 0, where the talk holds the English alone, there is no Quiz me. A question the mill wrote on a Hebrew idea is
  drawn right to left in the Hebrew face and graded like any other; a Hebrew idea he marked known comes due in Review and is asked in Hebrew. A Greek verse's quiz is as it was (features/quiz-me.feature).
  Jonah 1 and Genesis 1 are the copies in tests/fixtures/data.

  @uc-verse-quiz @hebrew
  Scenario: Jonah 1:1's Verse view offers Quiz me and the quiz talk carries the Hebrew
    Given Lampas is opened on Jonah 1 with the Hebrew dial at Curious and a quiz behind a fake Postern
    When he taps the number of verse 1
    Then the Verse view offers the actions "Listen", "Read it aloud", "Ask the tutor", "Quiz me" and "Diagram"
    When he chooses "Quiz me" and taps "Start the quiz"
    Then the sheet is titled "Quiz on Jonah 1:1"
    And the mill received one grist for the lampas app, kind bible-talk, in quiz mode about "Jonah 1:1"
    And that grist carries the Hebrew of verse 1 pointed, its Hebrew words and the English, and no Greek

  @uc-verse-quiz @hebrew
  Scenario: At Hebrew 0 an Old Testament verse offers no Quiz me
    Given Lampas is opened on Jonah 1 with the Hebrew dial at Just English and a quiz behind a fake Postern
    When he taps the number of verse 1
    Then the Verse view offers the actions "Listen", "Read it aloud", "Ask the tutor" and "Diagram"

  @uc-verse-quiz @greek
  Scenario: A Greek verse's quiz is as it was
    Given Lampas is opened on Romans 8 with a quiz behind a fake Postern
    When he taps the number of verse 11
    Then the Verse view offers the actions "Listen", "Read it aloud", "Ask the tutor", "Quiz me" and "Diagram"
    When he chooses "Quiz me" and taps "Start the quiz"
    Then the mill received one grist for the lampas app, kind bible-talk, in quiz mode about "Romans 8:11"
    And that grist carries the Greek of verse 11 and the English, and no Hebrew

  @uc-drill-it @hebrew
  Scenario: A Hebrew question the mill wrote is drawn right to left and graded
    Given the Hebrew article is due in Review and the mill wrote a Hebrew item for it
    When he starts a Review round
    Then the question "Tap a word with the article" is drawn with Hebrew words, right to left, in the Hebrew face
    When he taps the word with the article
    Then the card says "Right."

  @uc-drill-it @hebrew
  Scenario: A Hebrew idea he knows comes due in Review and is asked in Hebrew
    Given he marked the Hebrew article known a month ago
    When he starts a Review round
    Then Review asks the Hebrew article with Hebrew words, right to left, in the Hebrew face
