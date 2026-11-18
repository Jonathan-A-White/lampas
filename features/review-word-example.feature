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

  Scenario: The Example of a singular word is not a form of its plural, which is another of his words
    Given his goal is "Read Romans 8" and Review asks the word "σύ"
    When he answers the word question
    Then the Example line says it is a verse of "Romans 8" that has "σύ"
    And the Example shows a singular form of "σύ" and none of its plural "ὑμεῖς"

  Scenario: The Example of ἐγώ is not a form of ἡμεῖς
    Given his goal is "Read Romans 8" and Review asks the word "ἐγώ"
    When he answers the word question
    Then the Example line says it is a verse of "Romans 8" that has "ἐγώ"
    And the Example shows a singular form of "ἐγώ" and none of its plural "ἡμεῖς"

  Scenario: The Example of ἡμεῖς is a Romans 8 verse with a form of ἡμεῖς
    Given his goal is "Read Romans 8" and Review asks the word "ἡμεῖς"
    When he answers the word question
    Then the Example says "Romans 8:4" as a form of "ἡμεῖς" and of none of "μου, ὑμεῖς"

  Scenario: The Example of ὑμεῖς is a Romans 8 verse with a form of ὑμεῖς
    Given his goal is "Read Romans 8" and Review asks the word "ὑμεῖς"
    When he answers the word question
    Then the Example says "Romans 8:9" as a form of "ὑμεῖς" and of none of "μου, ἡμεῖς"

  Scenario: The Example of μου is a Romans 8 verse with a form of μου
    Given his goal is "Read Romans 8" and Review asks the word "μου"
    When he answers the word question
    Then the Example says "Romans 8:2" as a form of "μου" and of none of "ἡμεῖς, ὑμεῖς"

  Scenario: The Example of εἶπεν is a John 1 verse with the form εἶπεν, though the data lists it under λέγω, another of his words
    Given his goal is "Read John 1" and Review asks the word "εἶπεν"
    When he answers the word question
    Then the Example says a verse of "John 1" with the form "εἶπεν"
    And the Quick test of "εἶπεν" in "John 1" offers the form "εἶπεν"
