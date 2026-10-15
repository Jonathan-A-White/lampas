Feature: A new install starts empty
  Lampas used to put the Governor's own progress on every phone at the first open: the 63 BMA words with lessons 1-9
  solid, their schedule and the grammar ideas they cover (mw-5r3p30.385). A new reader starts with nothing solid or
  learning, nothing scheduled and no grammar idea solid or learning, and Words says so and points to Placement and
  Import. A phone that already has data keeps every row of it: the upgrade deletes and rewrites nothing.

  Scenario: A new install has no words, no schedule and no grammar levels
    Given Lampas is opened on a phone with nothing on it
    When he opens Words
    Then the count line reads "0 solid, 0 learning"
    And no word is listed
    And nothing is scheduled for review
    And no grammar idea has a level

  Scenario: Words on a new install says so and points to Placement and Import
    Given Lampas is opened on a phone with nothing on it
    When he opens Words
    Then Words says he has no words yet
    And Words offers Placement and Import

  Scenario: Review on a new install has nothing due
    Given Lampas is opened on a phone with nothing on it
    When he opens Review
    Then Review says nothing is due

  Scenario: A phone that was seeded the old way keeps every row
    Given a phone seeded the old way, with a word he dropped and an idea he marked
    When Lampas is opened
    Then every row of the words, the schedule, the grammar levels, the settings and the flags is as it was

  Scenario: A phone with only one word of its own gets no seed on top
    Given a phone with one word of his own and no flags
    When Lampas is opened
    Then every word, review and level row is as it was
