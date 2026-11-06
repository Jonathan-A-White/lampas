@uc-paradigms @greek
Feature: A Septuagint word's own paradigm
  A table opened from the word sheet of a Septuagint word (mw-u2w5klk.289; the wording PROVISIONAL, the Governor to confirm) has the same switch, This word | The pattern.
  This word lays the forms of the word's lemma found in Swete's Septuagint as well as the New Testament's, each cell saying which text it was found in ('in the Septuagint',
  'in the NT'). The form he tapped has its cell, and a cell neither text has says so ('not in the Septuagint or NT'), never 'not in the NT' for a form the Septuagint has.
  A word of the New Testament is read as before: the New Testament's forms alone.

  Background:
    Given his grammar levels have every adjective ending solid

  Scenario: The form he tapped in Genesis 1:2 has its cell, found in the Septuagint, beside the New Testament's forms
    When he opens "adjective-endings" from the Septuagint word "ἀόρατος" of "ἀόρατος" parsed "A-NSF" in Learn
    And he chooses "This word"
    Then the word line says "Its form is outlined in the table."
    And the outlined cell holds "ἀόρατος" and says "in the Septuagint"
    And the cell holding "ἀοράτου" says "in the NT"
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
