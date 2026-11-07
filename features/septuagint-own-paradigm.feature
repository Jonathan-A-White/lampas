@uc-paradigms @greek
Feature: A Septuagint word's own paradigm
  A table opened from the word sheet of a Septuagint word (mw-u2w5klk.289; the wording PROVISIONAL, the Governor to confirm) has the same switch, This word | The pattern.
  This word lays the forms of the word's lemma found in Swete's Septuagint as well as the New Testament's, each cell saying which text it was found in (a short caption under the form: 'LXX', 'NT', 'LXX + NT';
  the cell's name says it in full, 'in the Septuagint and NT', and the table fits a phone, mw-u2w5klk.313). The form he tapped has its cell, and a cell neither text has says so ('not in the Septuagint or NT'), never 'not in the NT' for a form the Septuagint has.
  A word of the New Testament is read as before, the New Testament's forms alone, unless the Septuagint is On (Old Testament in Greek, mw-u2w5klk.314): then the forms its lemma file lists under the Septuagint are laid too, marked 'LXX'.

  Background:
    Given his grammar levels have every adjective and noun ending solid

  Scenario: The form he tapped in Genesis 1:2 has its cell, found in the Septuagint, beside the New Testament's forms
    When he opens "adjective-endings" from the Septuagint word "ἀόρατος" of "ἀόρατος" parsed "A-NSF" in Learn
    And he chooses "This word"
    Then the word line says "Its form is outlined in the table."
    And the outlined cell holds "ἀόρατος" and says "LXX"
    And the cell holding "ἀοράτου" says "NT"
    And no cell says "not in the NT"
    And an empty cell says "not in the Septuagint or NT"

  Scenario: The form he tapped says where the Septuagint uses it, and a New Testament form where the New Testament does
    When he opens "adjective-endings" from the Septuagint word "ἀόρατος" of "ἀόρατος" parsed "A-NSF" in Learn
    And he chooses "This word"
    Then the form's note says "Used 2 times in the Septuagint, first at Genesis 1:2."
    When he taps the cell holding "ἀοράτου"
    And the form's note says "Used once in the New Testament, first at Colossians 1:15."

  Scenario: The same word read in the New Testament has the New Testament's forms alone
    When he opens "adjective-endings" from the New Testament word "ἀοράτου" of "ἀόρατος" parsed "A-GSM" in Learn
    And he chooses "This word"
    Then the table shows these forms: "ἀόρατα, ἀοράτου, ἀοράτῳ, ἀόρατον" among its empty cells
    And no cell says "in the Septuagint"
    And an empty cell says "not in the NT"

  Scenario: With the Septuagint On, a New Testament word's table lays the Septuagint's forms of its lemma too
    Given the Septuagint is "on"
    When he opens "third-declension" from the New Testament word "ὕδατι" of "ὕδωρ" parsed "N-DSN" in Learn
    And he chooses "This word"
    Then the outlined cell holds "ὕδατι" and says "NT"
    And the cell holding "ὕδασι" says "LXX"
    And no cell says "not in the NT"
    And an empty cell says "not in the Septuagint or NT"

  Scenario: With the Septuagint Off, the same New Testament word's table has the New Testament's forms alone
    Given the Septuagint is "off"
    When he opens "third-declension" from the New Testament word "ὕδατι" of "ὕδωρ" parsed "N-DSN" in Learn
    And he chooses "This word"
    Then the table shows these forms: "ὕδωρ, ὕδατα, ὕδατος, ὑδάτων, ὕδατι, ὕδασιν, ὕδωρ, ὕδατα" among its empty cells
    And no cell says "in the Septuagint"
