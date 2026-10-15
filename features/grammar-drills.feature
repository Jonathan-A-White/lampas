Feature: Review asks grammar ideas, and asks them before words
  A grammar idea he is drilling comes back on the same back-off schedule as a word. Review draws the due ideas first,
  from the passage of his goal (or the chapter he has open), and asks each one as a question about that passage: the
  ending of a form, the form to tap in a verse, a letter, the stressed syllable. A weak idea is multiple choice; a strong
  one is a flashcard he grades himself.

  Scenario: Review counts ideas before words
    Given the idea "case-genitive" is due
    And 2 of his words are due
    When Lampas is opened on the Reader
    And he opens Review from Settings
    Then the Review screen says "Due today: 1 idea, 2 words"

  Scenario: A paradigm ending asked and answered right moves the idea on the schedule
    Given his goal is "1 John 1"
    And the idea "case-genitive" is due and was right once before
    And he has opened the table "noun-endings"
    And the draw asks "case-genitive" as a paradigm ending
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the question blanks the end of a form and offers four endings
    When he taps the right ending
    Then the right ending turns green
    And "case-genitive" is on step 1 and due in 3 days
    And "case-genitive" is at the frontier

  # mw-svw421.5: an ending is asked only of a form whose table he has opened, and the table is one tap away after the answer.
  Scenario: An ending is asked only once its table is open
    Given his goal is "1 John 1"
    And the idea "case-genitive" is due
    And the draw would ask "case-genitive" as a paradigm ending if its table were open
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the question is to tap the form
    When he opens the table "Noun endings" on the Paradigms screen
    And he opens Review from Settings again
    And he starts the review again
    Then the question blanks the end of a form and offers four endings
    And there is no "See the table" button
    When he taps the right ending
    Then "See the table" is shown
    When he taps "See the table"
    Then the Paradigms screen shows the table "Noun endings" in Study mode
    When he goes Back
    Then the Review question is still on screen, answered

  Scenario: Tap the form shows the verse's words and the right one turns green
    Given his goal is "1 John 1"
    And the idea "case-dative" is due
    And the draw asks "case-dative" as tap the form
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the question shows the words of one verse as buttons
    When he taps the right word
    Then the right word turns green
    And "case-dative" has one right review and no lapse

  Scenario: A preposition is asked by the case of a real phrase
    Given his goal is "1 John 1"
    And the idea "preposition-dia" is due
    And the draw asks "preposition-dia" as a preposition's meaning
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the question shows a New Testament phrase with διά and four meanings
    When he taps the meaning that goes with the phrase's case
    Then the right meaning turns green
    And "preposition-dia" has one right review and no lapse

  Scenario: A strong idea is asked with Show and I knew it
    Given his goal is "1 John 1"
    And the idea "case-genitive" is due on step 3
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the idea is a flashcard with a Show control and no options
    When he taps Show
    Then the answer is shown with "I knew it" and "Not yet"
    When he taps "I knew it"
    Then "case-genitive" has one right review and no lapse

  Scenario: A wrong answer brings the idea back tomorrow
    Given his goal is "1 John 1"
    And the idea "case-dative" is due
    And the draw asks "case-dative" as tap the form
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he taps a wrong word
    Then the wrong word turns red and the right one green
    And "case-dative" is on step 0 and due in 1 day with one lapse

  Scenario: With no goal the question comes from the chapter he has open
    Given he has 1 John 2 open and no goal
    And the idea "case-genitive" is due
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the question is about a verse of 1 John 2
