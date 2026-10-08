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
