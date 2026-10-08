Feature: Review brings back the words that are due
  The words he has met come back on the back-off schedule. The Reader shows how many are due, Review asks
  them first (then other words, up to ten), each answer moves the word along the schedule, and the end card
  says how many come back tomorrow and how many later.

  Scenario: The reader shows Due: N when words are due
    Given 3 of his words are due
    When Lampas is opened on the Reader
    Then the Reader shows "Due: 3"
    When he taps "Due: 3"
    Then the Review screen says "Due today: 3 words"

  Scenario: A word he drops is no longer counted or asked
    Given 2 of his words are due
    When Lampas is opened on the Reader
    And he drops the word "εἰμί"
    Then the Reader shows "Due: 1"
    When he taps "Due: 1"
    Then the Review screen says "Due today: 1 word"
    When he starts the review
    Then the first question is "λέγω" and "εἰμί" is never asked

  Scenario: A word taken up again comes back on its schedule
    Given the word "λέγω" is due on step 3
    And the word "εἰμί" is also due on step 3
    When Lampas is opened on the Reader
    And he drops the word "εἰμί"
    Then the Reader shows "Due: 1"
    When he takes up the word "εἰμί" again
    Then the Reader is back to "Due: 2"

  Scenario: The Reader shows no count when nothing is due
    Given none of his words is due
    When Lampas is opened on the Reader
    Then the Reader shows no Due count

  Scenario: Review draws due words before others
    Given 3 of his words are due
    When Lampas is opened on the Reader
    And he opens Review from Settings
    Then the Review screen says "Due today: 3 words"
    When he starts the review
    Then the first 3 questions are the due words, the longest overdue first
    And the rest of the round is 7 other words

  Scenario: A right answer twice in a row pushes the word to the next step
    Given the word "λέγω" is due and was right once before
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he answers "λέγω" right
    Then "λέγω" is on step 1 and due in 3 days

  Scenario: A wrong answer brings it back tomorrow
    Given the word "λέγω" is due on step 3
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he answers "λέγω" wrong
    Then "λέγω" is on step 1 and due in 1 day

  Scenario: The end card says how many come back tomorrow
    Given 4 words are due, 2 of them on step 3
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he answers every question right and goes on to the end
    Then the end card reads "10 of 10"
    And the end card says "8 come back tomorrow, 2 later"
    And the end card has a "Back to reading" button

  Scenario: Review is remembered across a reopen
    Given 3 of his words are due
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And the app is closed and opened again
    Then the Review screen says "Due today: 3 words"

  Scenario: A weak word is asked as multiple choice and a strong one as a flashcard
    Given the word "λέγω" is due on step 0
    And the word "εἰμί" is also due on step 3
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the question for "λέγω" has four options and no Show control
    When he answers "λέγω" right and goes on
    Then the question for "εἰμί" is a flashcard with the lemma "εἰμί", no options and a Show control
    And the flashcard does not show the gloss yet

  Scenario: Show reveals the meaning and I knew it records a right review
    Given the word "λέγω" is due on step 3
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he taps Show
    Then the flashcard shows the gloss of "λέγω" with "I knew it" and "Not yet"
    When he taps "I knew it"
    Then "λέγω" has one right review and no lapse

  Scenario: Not yet records a wrong review
    Given the word "λέγω" is due on step 3
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he taps Show
    And he taps "Not yet"
    Then "λέγω" is on step 1 and has lapsed once

  Scenario: A word that slips is asked as multiple choice again
    Given the word "λέγω" is due on step 3
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he taps Show
    And he taps "Not yet"
    And he goes on to the end of the round
    And "λέγω" is due again
    And he starts another round
    Then the question for "λέγω" has four options and no Show control

  Scenario: A flashcard shows the dictionary form and hold-to-hear says it
    Given the word "λέγω" is due on step 3
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the flashcard shows only the lemma "λέγω"
    When he holds the Hold to hear bar
    Then the Greek voice says "λέγω"
