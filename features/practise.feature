Feature: Practise a verse
  The Verse view's Practise action (mw-5r3p30.899) is one door for the ways of working a verse in Susan Wise Bauer's order: copywork, narration,
  dictation, summary, and the quiz. Copywork is live: the verse is shown in the script he picks (English always, Greek on a New Testament verse,
  Hebrew on an Old Testament verse), he copies it by hand, photographs the page, and the tutor (the copywork grind) marks each word right, missing or
  wrong, with the one thing to fix first. Narration, Dictation and Summary say "soon" until their stories land. The quiz is the existing Verse quiz.

  @uc-practise @greek
  Scenario: The Practise door lists copywork, narration, dictation, summary and the quiz, and three of them say soon
    Given Lampas is opened on John 1 with a copywork tutor behind a fake Postern
    When he taps the number of verse 1
    And he chooses "Practise"
    Then the Practise door lists "Copywork", "Narration", "Dictation", "Summary" and "Quiz" in that order
    And "Narration", "Dictation" and "Summary" say soon and cannot be opened

  @uc-practise @greek
  Scenario: Copywork on John 1:1 in Greek: the page is photographed and each word is marked
    Given Lampas is opened on John 1 with a copywork tutor behind a fake Postern
    When he taps the number of verse 1
    And he chooses "Practise"
    And he opens "Copywork"
    Then copywork offers the languages "English" and "Greek"
    When he chooses the copywork language "Greek"
    Then the verse to copy is shown in Greek
    When he attaches a picture of the page
    Then the mill received one grist for the lampas app, kind copywork, in Greek about "John 1:1"
    And that grist carries the verse's Greek words and one picture
    And the result marks the words: right, with the second wrong and the eleventh missing
    And the result says what to fix first
    And a "Try again" button is offered

  @uc-practise @greek
  Scenario: A photo the tutor cannot read says so and offers Try again
    Given Lampas is opened on John 1 with a copywork tutor that cannot read the page
    When he taps the number of verse 1
    And he chooses "Practise"
    And he opens "Copywork"
    And he attaches a picture of the page
    Then the result says the page could not be read, with no word marked
    And a "Try again" button is offered

  @uc-practise @hebrew
  Scenario: Copywork on Genesis 1:1 is offered in English and Hebrew, and the Hebrew is copied with its points
    Given Lampas is opened on Genesis 1 with a copywork tutor behind a fake Postern
    When he taps the number of verse 1
    And he chooses "Practise"
    And he opens "Copywork"
    Then copywork offers the languages "English" and "Hebrew"
    When he chooses the copywork language "Hebrew"
    Then the verse to copy is shown in Hebrew, pointed, right to left
    When he attaches a picture of the page
    Then the mill received one grist for the lampas app, kind copywork, in Hebrew about "Genesis 1:1"
    And that grist carries the verse's pointed Hebrew words and one picture
