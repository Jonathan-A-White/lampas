Feature: A table can be drilled in Review
  A table he is learning by heart has a 'Drill this table' button at its foot. It puts the table on the back-off schedule as the kind
  'paradigm'. Review then asks a few of its available cells (at most three a round) by their name, 'Genitive singular masculine of the
  article', among four forms of the same table; a locked form is never asked, though it may be a wrong option. A weak table is multiple
  choice and a strong one a flashcard. A right cell credits the letters, sounds and marks of its form, and a wrong one is a wrong review.

  Background:
    Given his grammar levels are the article, the nominative, the singular and nouns solid, the genitive and the feminine at the frontier, the masculine solid, the dative, the accusative, the plural and the neuter not yet

  Scenario: Drill this table puts the article in Review
    Given the round would ask "Genitive singular masculine of the article" first
    When he opens the table "The article"
    And he taps "Drill this table"
    Then the button now reads "In Review"
    When he opens Review
    Then the Review screen says "Due today: 1 table"
    When he starts the review
    Then the round asks "Genitive singular masculine of the article" with four forms, the right "τοῦ" among them
    When he taps the form "τοῦ"
    Then the form "τοῦ" turns green
    And the review "paradigm" "article" has 1 right and no lapse

  Scenario: A locked cell is never asked
    Given the table "article" is on the schedule and due
    When he opens Review
    And he starts the review
    And he answers every question of the round
    Then the round asked at most 3 cells
    And every cell asked is one of the 4 available article forms
    And every option is a form of the article
