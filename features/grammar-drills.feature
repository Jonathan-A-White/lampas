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
    And the draw asks "case-genitive" as a paradigm ending
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the question blanks the end of a form and offers four endings
    When he taps the right ending
    Then the right ending turns green
    And "case-genitive" is on step 1 and due in 3 days
    And "case-genitive" is at the frontier

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
