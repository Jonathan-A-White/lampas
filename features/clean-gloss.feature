Feature: A gloss reads as plain English
  The dictionary Lampas draws its glosses from (STEPBible's TBESG) writes some of them in its own source form, a range of
  senses and then the one chosen ('spirit/breath: spirit'), and the Governor's own word list writes the case a preposition
  takes before its meanings ('dat: in, by, with'). Lampas shows every gloss as one plain list of meanings, the dictionary's
  range first and the chosen sense added when the range lacks it ('spirit, breath', 'to keep, observe'), and a case as a
  word after the meanings ('in, by, with (dative)'). It is cleaned once, where a gloss comes in (the data build, the seed,
  Import), and a gloss kept on the phone before this version is cleaned when Lampas next opens (mw-5r3p30.384).

  Scenario: πνεῦμα added to his words reads "spirit, breath" on Words
    Given Lampas is opened on a phone with no words
    And "πνεῦμα" is added to his words from the lexicon
    When he opens Words
    Then Words shows "πνεῦμα" with the gloss "spirit, breath"

  Scenario: The word sheet of πνεῦμα reads "spirit, breath"
    Given Lampas is opened on the link "#/?word=G4151"
    Then the word sheet shows "πνεῦμα" meaning "spirit, breath"

  Scenario: A word kept before this version in the dictionary's form reads clean
    Given his phone kept "πνεῦμα" as "spirit/breath: spirit" and "ἐν" as "dat: in, by, with" before this version
    When he opens Words
    Then Words shows "πνεῦμα" with the gloss "spirit, breath"
    And Words also shows "ἐν" with the gloss "in, by, with (dative)"

  Scenario: A row of his example table with a case before the meanings is imported clean
    Given Lampas is opened on a phone with no words
    And he opens Import
    When he pastes the line "| 34 | ἐν | 1 | 1 | dat: in, by, with | Preposition | (2763x) |"
    And he taps Add
    Then Words shows "ἐν" with the gloss "in, by, with (dative)"
