Feature: What a passage needs
  The Governor wants a goal such as "Read 1 John", "Read 1 John 1" or "Read 1 John 1:1", and to be tested "on the grammar
  required". A goal names a book, a chapter or a verse; from the chapter files alone the app works out which words and
  which grammar ideas the passage needs, and how far he is toward them (src/data/goal.ts, src/data/grammar/needs.ts,
  docs/grammar.md). No tutor and no network beyond the app's own data.

  Scenario: A goal can be a book, a chapter or a verse
    Given the book index
    Then the goal "1 John" is the whole book of 1 John
    And the goal "1 John 1" is chapter 1 of 1 John
    And the goal "Read 1 John 1:1" is verse 1 of chapter 1 of 1 John and is titled "Read 1 John 1:1"
    And the goal "1 John 9" is refused

  Scenario: The app knows what 1 John 1:1 needs
    Given the goal "1 John 1:1"
    When the app works out what it needs
    Then it needs 16 words, "ὅς" being the commonest, 4 times
    And it needs the ideas "The relative pronoun", "The imperfect tense", "The perfect tense" and "The aorist tense"
    And it does not need "The subjunctive mood" or "The imperative mood"
    And with "λόγος" being learned and nothing else known, 1 word is on the frontier and 15 are not yet

  Scenario: Settings > Goal sets Read 1 John 1:1 from the three pickers
    Given Settings is open and no goal is set
    Then the Goal says "Goal: none" and the Chapter and Verse pickers wait for a book
    When he picks the book "1 John"
    Then the Goal says "Read 1 John" and the Chapter picker offers "Whole book" and the chapters 1 to 5
    When he picks the chapter "1"
    Then the Goal says "Read 1 John 1" and the Verse picker offers "Whole chapter" and the verses 1 to 10
    When he picks the verse "1"
    Then the Goal says "Read 1 John 1:1"
    And the bus has heard the goal is verse 1 of chapter 1 of 1 John

  Scenario: The goal survives a reopen
    Given Settings is open and no goal is set
    When he picks the book "1 John"
    And he picks the chapter "1"
    And he picks the verse "1"
    And Settings is opened again
    Then the Goal says "Read 1 John 1:1"
    And the Book picker shows "1 John", the Chapter picker "1" and the Verse picker "1"

  Scenario: Clear leaves no goal
    Given Settings is open and no goal is set
    When he picks the book "1 John"
    And he picks the chapter "1"
    And he taps Clear
    Then the Goal says "Goal: none" and the Chapter and Verse pickers wait for a book
    And the bus has heard there is no goal
