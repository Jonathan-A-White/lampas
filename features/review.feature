Feature: Review brings back the words that are due
  The words he has met come back on the back-off schedule. Today (opened by the Reader's Today chip) shows how many are due, Review asks
  them first (then other words, up to ten), each answer moves the word along the schedule, and the end card
  says how many come back tomorrow and how many later.

  Scenario: Today shows how many are due and opens Review
    Given 3 of his words are due
    When Lampas is opened on the Reader
    And he opens Today from the Reader
    Then Today shows "3 due"
    When he taps "3 due" on Today
    Then the Review screen says "Due today: 3 words"

  Scenario: A word he drops is no longer counted or asked
    Given 2 of his words are due
    When Lampas is opened on the Reader
    And he opens Today from the Reader
    And he drops the word "εἰμί"
    Then Today shows "1 due"
    When he taps "1 due" on Today
    Then the Review screen says "Due today: 1 word"
    When he starts the review
    Then the first question is "λέγω" and "εἰμί" is never asked

  Scenario: A word taken up again comes back on its schedule
    Given the word "λέγω" is due on step 3
    And the word "εἰμί" is also due on step 3
    When Lampas is opened on the Reader
    And he opens Today from the Reader
    And he drops the word "εἰμί"
    Then Today shows "1 due"
    When he takes up the word "εἰμί" again
    Then Today is back to "2 due"

  Scenario: Today shows no count when nothing is due
    Given none of his words is due
    When Lampas is opened on the Reader
    And he opens Today from the Reader
    Then Today shows "Nothing due"

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

  Scenario: A phone Back in the middle of a round keeps the round
    Given 4 words are due, 2 of them on step 3
    When Lampas is opened on the Reader
    And he opens Today from the Reader
    And he taps "4 due" on Today
    And he starts the review
    And he answers the first question, goes on to "2 of 10", then goes Back to Today and Forward
    Then the counter reads "2 of 10"
    And the first question's answer is kept on the schedule

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

  Scenario: Show reveals the meaning and Kind of records a right review
    Given the word "λέγω" is due on step 3
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he taps Show
    Then the flashcard shows the gloss of "λέγω" with "Know it well", "Kind of" and "Don't know"
    When he taps "Kind of"
    Then "λέγω" has one right review and no lapse

  Scenario: Know it well on a flashcard moves the word up a step at once
    Given the word "λέγω" is due on step 3
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he taps Show
    And he taps "Know it well"
    Then "λέγω" is on step 4 with no right in a row

  Scenario: Don't know records a wrong review
    Given the word "λέγω" is due on step 3
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he taps Show
    And he taps "Don't know"
    Then "λέγω" is on step 1 and has lapsed once

  Scenario: Know it well after a right pick on multiple choice puts the word up a step
    Given the word "λέγω" is due on step 1
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he picks the right meaning of "λέγω"
    Then "Know it well", "Kind of" and "Don't know" are offered under "Right."
    When he taps "Know it well"
    Then "λέγω" is on step 2 with no right in a row

  Scenario: Kind of after a right pick leaves the word on its step with one right
    Given the word "λέγω" is due on step 1
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he picks the right meaning of "λέγω"
    And he taps "Kind of"
    Then "λέγω" is on step 1 with one right in a row

  Scenario: Going on without a grade counts as Kind of
    Given the word "λέγω" is due on step 1
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he picks the right meaning of "λέγω"
    And he goes on without grading it
    Then "λέγω" is on step 1 with one right in a row

  Scenario: Don't know after a right pick drops the word as a wrong does and shows its heart
    Given the word "θέλω" is due on step 2
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he picks the right meaning of "θέλω"
    And he taps "Don't know"
    Then "θέλω" is on step 0 and has lapsed once
    And the question shows the heart of the word

  Scenario: A wrong pick is a wrong with no grade to give
    Given the word "λέγω" is due on step 1
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he picks a wrong meaning of "λέγω"
    Then no grade buttons are offered
    And "λέγω" is on step 0 and has lapsed once

  Scenario: A word that slips is asked as multiple choice again
    Given the word "λέγω" is due on step 3
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he taps Show
    And he taps "Don't know"
    And he goes on to the end of the round
    And "λέγω" is due again
    And he starts another round
    Then the question for "λέγω" has four options and no Show control

  Scenario: Another round after letter gaps is still a round of ten
    Given 13 words are due
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he answers every question right and goes on to the end
    And the card says "3 more are still due"
    When he starts another round with four letters to ask
    Then the counter reads "1 of 10"

  Scenario: A flashcard shows the dictionary form and tap-to-hear says it
    Given the word "λέγω" is due on step 3
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the flashcard shows only the lemma "λέγω"
    When he taps the Tap to hear bar
    Then the Greek voice says "λέγω"

  Scenario: A word question on a link word shows its picture
    Given the word "ὅτι" is due on step 0
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the question for "ὅτι" shows its picture beside the word
