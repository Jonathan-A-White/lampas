@uc-review @greek
Feature: A Review word question gives an Example verse from his goal, after he has answered
  After he answers a word question in Review, right or wrong, an 'Example' line under the word names a verse that uses the word and links to it with the word marked.
  The verse is looked for in his goal first: the goal's verse, then its pericope, then its chapter, then its book, then the chapter he last read.
  Before he answers there is no line, so the link cannot be tapped. A word that stands nowhere there has no line and no empty row.

  Scenario: With the goal John 1 the Example is a verse of John 1 that has the word, and only after the answer
    Given his goal is "Read John 1" and Review asks the word "ἀπό"
    Then the card has no Example line and no link to a verse
    When he answers the word question
    Then the Example line says it is a verse of "John 1" that has "ἀπό"
    And the Example link opens that verse with "ἀπό" marked

  Scenario: A goal verse without the word widens to its chapter
    Given his goal is "Read John 1:1" and Review asks the word "ἀπό"
    When he answers the word question
    Then the Example line says it is a verse of "John 1" that has "ἀπό"

  Scenario: A word the goal's book lacks is looked for in the chapter he last read
    Given his goal is "Read Philemon" and he last read "Romans 8" and Review asks the word "κτίσις"
    When he answers the word question
    Then the Example line says it is a verse of "Romans 8" that has "κτίσις"

  Scenario: A word that stands nowhere has no Example line
    Given his goal is "Read John 1" and Review asks the word "ζζζζ"
    When he answers the word question
    Then there is no Example line

  Scenario: A flashcard shows the Example once he has graded it
    Given his goal is "Read John 1" and Review asks the word "ἀπό" as a flashcard
    Then the card has no Example line and no link to a verse
    When he shows the flashcard and grades it
    Then the Example line says it is a verse of "John 1" that has "ἀπό"
