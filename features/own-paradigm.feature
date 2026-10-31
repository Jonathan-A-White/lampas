@uc-paradigms @greek
Feature: A word's own paradigm
  A table opened from a word's sheet has a switch, This word | The pattern (mw-irpgqi.4; the names PROVISIONAL, the Governor to confirm). The pattern is the table as it
  is, the model words' forms. This word lays the table with the forms of the word's own lemma that the New Testament text uses (ἀγαπάω's, not the model verb's): each
  form is one found in the text, never made up. A cell the text never uses says 'not in the NT'. A tap on a form says where the text first uses it and opens the Reader
  there, and keeps the pattern's form beside. The Drill asks only the cells that have a form.

  Background:
    Given his grammar levels have the present active of the contract verbs solid

  Scenario: This word shows the lemma's own forms in its own row, and The pattern gives the model verbs back
    When he opens the table "contract-verbs" from the word "ἀγαπῶ" of "ἀγαπάω" in Learn
    Then the table shows 18 cells
    When he chooses "This word"
    Then the table shows these forms: "ἀγαπῶ, ἀγαπᾷς, ἀγαπᾷ, ἀγαπῶμεν, ἀγαπᾶτε, ἀγαπῶσιν"
    And the table says "Available forms: 6 of 6"
    When he switches back to "The pattern"
    Then the table is the pattern's 18 cells again

  Scenario: A cell the text lacks says not in the NT and holds no form
    When he opens the table "contract-verbs" from the word "τηρῶ" of "τηρέω" in Learn
    And he chooses "This word"
    Then the table shows these forms: "τηρῶ, not in the NT, τηρεῖ, τηροῦμεν, not in the NT, not in the NT"

  Scenario: A tap on a form says where the text first uses it and opens the Reader there
    When he opens the table "contract-verbs" from the word "ἀγαπῶ" of "ἀγαπάω" in Learn
    And he chooses "This word"
    And he taps the form "ἀγαπᾶτε"
    Then the form's note says "Luke 6:32" and "In the pattern: ἀγαπᾶτε"
    When he taps "Open Luke 6:32"
    Then the Reader is on Luke 6

  Scenario: The Drill asks only the cells that have a form
    When he opens the table "contract-verbs" from the word "τηρῶ" of "τηρέω" in Drill
    And he chooses "This word"
    Then 3 cells are blank to be asked and 3 say "not in the NT"
