Feature: The Hebrew paradigm tables
  Four tables for the Hebrew he reads (mw-gdcyf98.13, src/data/paradigms/hebrew/; names PROVISIONAL, the Governor to confirm): the qal verb (קָטַל in the perfect, the imperfect and the imperative), the Hebrew personal pronouns,
  the pronominal suffixes on a noun (סוּס) and the Hebrew article. Each cell is a pointed form tied to ideas of the Hebrew ladder, and the table is drawn right to left. The Paradigms list shows them
  when Hebrew is chosen (under the Greek | Hebrew segment where both are), and they Learn, Drill, follow How much of a table and lock their cells like the Greek ones. A Hebrew word's sheet has a Paradigm row,
  under the parsing, when a table holds its parsing; a tap opens the table with the word's cell outlined. Jonah 1 is the copy of the built chapter in tests/fixtures/data/jon/1.json. The Greek tables are as they were.

  Background:
    Given Hebrew is the only language chosen and his Hebrew grammar levels are the root, the qal stem, the perfect, the number and the person, gender and number solid, the gender at the frontier, the imperfect and the imperative not yet

  Scenario: With Hebrew chosen the Paradigms list shows the four Hebrew tables
    When he opens the Paradigms screen
    Then the list holds "The qal verb", "Hebrew personal pronouns", "Pronominal suffixes" and "The Hebrew article"
    And the list holds no Greek table
    And the list reads "The qal verb: Available forms: 10 of 24"

  Scenario: The qal perfect opens filled in, right to left, in Hebrew type
    When he opens the table "he-qal-strong" to Learn
    Then the table is drawn right to left
    And the cell "Perfect 3rd masculine Singular" shows "קָטַל" in Hebrew type
    And the cell "Perfect 1st common Plural" also shows "קָטַלְנוּ" in Hebrew type
    And the cell "Imperfect 3rd masculine Singular" is locked

  Scenario: A locked cell says which Hebrew ideas it still needs
    When he opens the table "he-qal-strong" to Learn
    And he taps the cell "Imperfect 3rd masculine Singular"
    Then the lock says "Needs the imperfect"
    And the lock offers "Go to The imperfect"

  Scenario: Drill blanks the qal perfect and a tap shows a form
    When he opens the table "he-qal-strong" to Drill
    Then the cell "Perfect 3rd masculine Singular" is blank
    When he taps the cell "Perfect 3rd masculine Singular"
    Then the cell "Perfect 3rd masculine Singular" shows "קָטַל" in Hebrew type
    When he says "Had it"
    Then the cell "Perfect 3rd masculine Singular" is graded "had"

  Scenario: How much of a table at its smallest shows the first persons only, at its largest the whole table
    When he opens the table "he-qal-strong" to Learn
    And he taps "Solid only" under How much of a table
    Then the perfect shows "Perfect 1st common Singular" and "Perfect 1st common Plural" and no other perfect cell
    When he taps "Any" under How much of a table
    Then all 24 cells of the table show their forms

  Scenario: The sheet of וַיְהִי names the qal verb and a tap opens its cell
    Given Jonah 1 is open
    When he taps the Hebrew word "וַֽיְהִי֙" of verse 1
    Then the Hebrew word sheet shows "Paradigm: The qal verb"
    When he taps the Paradigm row
    Then the table "The qal verb" opens with "Imperfect 3rd masculine Singular" outlined

  Scenario: A Hebrew word no table holds has no Paradigm row
    Given Jonah 1 is open
    When he taps the Hebrew word "יוֹנָ֥ה" of verse 1
    Then the Hebrew word sheet has no Paradigm row

  Scenario: With both languages chosen the segment chooses the tables
    Given both languages are chosen
    When he opens the Paradigms screen
    Then the list holds "The article" and 19 other Greek tables
    When he taps "Hebrew" in the segment
    Then the list holds "The qal verb", "Hebrew personal pronouns", "Pronominal suffixes" and "The Hebrew article"

  Scenario: With Greek only no Hebrew table is listed and the Greek tables are as they were
    Given Greek is the only language chosen
    When he opens the Paradigms screen
    Then the list holds 20 Greek tables and no Hebrew table
    And the table "article" opens to Learn left to right with its cells locked
