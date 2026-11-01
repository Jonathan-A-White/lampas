Feature: Practise a verse
  The Verse view's Practise action (mw-5r3p30.899) is one door for the ways of working a verse in Susan Wise Bauer's order: copywork, narration,
  dictation, summary, and the quiz. Copywork is live: the verse is shown in the script he picks (English always, Greek on a New Testament verse,
  Hebrew on an Old Testament verse), he copies it by hand, photographs the page, and the tutor (the copywork grind) marks each word right, missing or
  wrong, with the one thing to fix first. Dictation is live in the same languages (mw-5r3p30.900): the verse is hidden, the app reads it a phrase at a
  time (Start dictation, Again, Next), he writes it by hand, photographs the page, and the tutor judges what he heard and wrote; then the verse is shown
  beside the marks and Try again restarts. Narration and Summary say "soon" until their stories land. The quiz is the existing Verse quiz.

  @uc-practise @greek
  Scenario: The Practise door lists copywork, narration, dictation, summary and the quiz, and two of them say soon
    Given Lampas is opened on John 1 with a copywork tutor behind a fake Postern
    When he taps the number of verse 1
    And he chooses "Practise"
    Then the Practise door lists "Copywork", "Narration", "Dictation", "Summary" and "Quiz" in that order
    And "Narration" and "Summary" say soon and cannot be opened

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

  @uc-practise @greek
  Scenario: Dictation on John 1:1 in English: the verse is hidden and the app reads it a phrase at a time
    Given Lampas is opened on John 1 with a dictation tutor behind a fake Postern and a phone that speaks
    When he taps the number of verse 1
    And he chooses "Practise"
    And he opens "Dictation"
    Then dictation offers the languages "English" and "Greek"
    And the verse is hidden while he writes
    And nothing is said yet
    When he starts with "Start dictation"
    Then the phone says "In the beginning was the Word," in English
    And dictation says "Phrase 1 of 3"
    When he asks for it again with "Again"
    Then the phone repeats "In the beginning was the Word," in English
    When he goes on with "Next"
    Then the phone now says "and the Word was with God," in English
    And dictation now says "Phrase 2 of 3"
    When he goes on to the last phrase with "Next"
    Then the phone last says "and the Word was God." in English
    And dictation last says "Phrase 3 of 3"
    And "Take a photo" is offered in place of "Next"
    And the verse is still hidden while he writes

  @uc-practise @greek
  Scenario: Dictation on John 1:1 in Greek is cut into phrases of at most six words, read in the Greek voice
    Given Lampas is opened on John 1 with a dictation tutor behind a fake Postern and a phone that speaks
    When he taps the number of verse 1
    And he chooses "Practise"
    And he opens "Dictation"
    And he picks the language "Greek"
    Then the verse is cut into the phrases "Ἐν ἀρχῇ ἦν ὁ λόγος", "καὶ ὁ λόγος ἦν", "πρὸς τὸν θεόν" and "καὶ θεὸς ἦν ὁ λόγος"
    When he starts with "Start dictation"
    Then the phone says its first phrase in the Greek voice
    When he goes on with "Next"
    Then dictation says "Phrase 2 of 4"
    And the phone has spoken only in the Greek voice

  @uc-practise @hebrew
  Scenario: Dictation on Genesis 1:1 in Hebrew is cut into phrases of at most six words, read in the Hebrew voice
    Given Lampas is opened on Genesis 1 with a dictation tutor behind a fake Postern and a phone that speaks Hebrew
    When he taps the number of verse 1
    And he chooses "Practise"
    And he opens "Dictation"
    Then dictation offers the languages "English" and "Hebrew"
    When he picks the language "Hebrew"
    Then the verse is cut into the phrases "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת" and "הַשָּׁמַיִם וְאֵת הָאָרֶץ"
    When he starts with "Start dictation"
    Then the phone says its first phrase in the Hebrew voice

  @uc-practise @greek
  Scenario: A dictated page in Greek is judged, the verse is shown beside the marks, and Try again restarts
    Given Lampas is opened on John 1 with a dictation tutor behind a fake Postern and a phone that speaks
    When he taps the number of verse 1
    And he chooses "Practise"
    And he opens "Dictation"
    And he picks the language "Greek"
    And he starts with "Start dictation"
    And he listens through all 4 phrases
    Then "Take a photo" is offered in place of "Next"
    When he attaches a picture of the page
    Then the mill received one grist for the lampas app, kind copywork, dictation in Greek about "John 1:1"
    And that grist carries the verse's Greek words and one picture
    And the result marks the words: right, with the second wrong and the eleventh missing
    And the result says what to fix first
    And the result says the second word sounds alike
    And the verse is shown beside the marks, in Greek
    And a "Try again" button is offered
    When he taps "Try again"
    Then the verse is hidden while he writes
    And "Start dictation" is offered

  @uc-practise @greek
  Scenario: A dictated page the tutor cannot read says so, keeps the verse hidden and offers another photo
    Given Lampas is opened on John 1 with a dictation tutor that cannot read the page
    When he taps the number of verse 1
    And he chooses "Practise"
    And he opens "Dictation"
    And he starts with "Start dictation"
    And he listens through all 3 phrases
    And he attaches a picture of the page
    Then the result says the page could not be read, with no word marked
    And the verse is still hidden while he writes
    And a "Take a photo" button is offered
