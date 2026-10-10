Feature: A long press on any word says it aloud
  Holding a finger half a second on a word of prose anywhere in the app says that word alone in its own language,
  worked out from its letters: Greek in a Greek voice, Hebrew in a Hebrew voice, Latin letters in English. A press that is
  shorter, or wanders more than 10 px, says nothing. A control that has a press of its own (a button, a link, a field, a
  hold bar) keeps it; the reader's words, which are buttons, are spoken by the reader and not twice.

  Scenario: A long press on a Greek word of a tutor answer says it in Greek
    Given a tutor answer is on screen on a phone with Greek, Hebrew and English voices
    When he long presses the word "ἀγαθόν" of the answer
    Then the phone is told to speak "ἀγαθόν" in "greek"
    And the word is marked while it speaks
    And no text is selected

  Scenario: A long press on a Hebrew word of a tutor answer says it in Hebrew and does not open the guide
    Given a tutor answer is on screen on a phone with Greek, Hebrew and English voices
    When he long presses the word "צֶדֶק" of the answer
    Then the phone is told to speak "צֶדֶק" in "hebrew"
    And no pronunciation guide is open

  Scenario: A short tap on a Hebrew word of a tutor answer still opens the guide
    Given a tutor answer is on screen on a phone with Greek, Hebrew and English voices
    When he taps the word "צֶדֶק" of the answer
    Then the pronunciation guide is open

  Scenario: A short tap on a Greek word of a tutor answer says it in Greek, as a Hebrew word's tap does
    Given a tutor answer is on screen on a phone with Greek, Hebrew and English voices
    When he taps the word "ἀγαθόν" of the answer
    Then the phone is told to speak "ἀγαθόν" in "greek"

  Scenario: A short tap on a Greek word with no Greek voice on the phone says so instead of speaking
    Given a tutor answer is on screen on a phone with only an English voice
    When he taps the word "ἀγαθόν" of the answer
    Then nothing is spoken
    And the notice "No Greek voice" is shown

  Scenario: A long press on an English word of a tutor answer says it in English
    Given a tutor answer is on screen on a phone with Greek, Hebrew and English voices
    When he long presses the word "righteousness" of the answer
    Then the phone is told to speak "righteousness" in "english"

  Scenario: A long press on a word of the About page says it in English
    Given the About page is on screen on a phone with Greek, Hebrew and English voices
    When he long presses the word "Newton" of the page
    Then the phone is told to speak "Newton" in "english"

  Scenario: The click that ends a long press does not reach the answer's own tap, which would stop the speech
    Given a tutor answer is on screen on a phone with Greek, Hebrew and English voices
    When he long presses the word "ἀγαθόν" of the answer
    Then the phone is told to speak "ἀγαθόν" in "greek"
    And the speech was not cancelled after it began

  Scenario: A press shorter than half a second says nothing
    Given a tutor answer is on screen on a phone with Greek, Hebrew and English voices
    When he presses the word "righteousness" of the answer for 200 ms
    Then nothing is spoken

  Scenario: A press that moves more than 10 px says nothing
    Given a tutor answer is on screen on a phone with Greek, Hebrew and English voices
    When he presses the word "righteousness" of the answer and drags 20 px before the half second is up
    Then nothing is spoken

  Scenario: A long press on a number or a mark says nothing
    Given a tutor answer is on screen on a phone with Greek, Hebrew and English voices
    When he long presses the word "28" of the answer
    Then nothing is spoken

  Scenario: A long press on a Greek word with no Greek voice on the phone says so instead of speaking
    Given a tutor answer is on screen on a phone with only an English voice
    When he long presses the word "ἀγαθόν" of the answer
    Then nothing is spoken
    And the notice "No Greek voice" is shown

  Scenario Outline: A long press on a control with a press of its own is left to it
    Given a tutor answer is on screen on a phone with Greek, Hebrew and English voices
    When he long presses the <control> beside the answer
    Then nothing is spoken

    Examples:
      | control   |
      | button    |
      | link      |
      | field     |
      | hold bar  |
