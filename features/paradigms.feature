Feature: Paradigms
  The Paradigms screen (#/paradigms, reached from Settings > More, beside Review) lists four tables: The article, Noun endings, εἰμί
  and Verb endings (src/data/paradigms/, docs/paradigms.md), each with 'Available forms: N of M' and a progress bar. A form is
  available once every grammar idea it needs is at the frontier or solid (grammarLevels); a locked form shows as locked, not hidden,
  so the table keeps its shape. A table opens in Study mode (an available cell says reveal and a tap shows its form) or Review mode
  (every available cell shows its form); one button switches. Ask the tutor sends the table's name and the forms he has revealed
  to the tutor, on the chapter that is open.

  Background:
    Given his grammar levels are the article, the nominative, the singular and nouns solid, the genitive and the feminine at the frontier, the masculine solid, the dative, the accusative, the plural and the neuter not yet

  Scenario: The list shows each table with how many of its forms are available
    When he opens the Paradigms screen
    Then the list reads "The article: Available forms: 4 of 24", "Noun endings: Available forms: 8 of 40", "εἰμί: Available forms: 0 of 36" and "Verb endings: Available forms: 0 of 24"
    And the progress bar of "The article" is at 4 of 24

  Scenario: Settings reaches the Paradigms screen and a table opens from the list
    Given Lampas is open on Settings
    When he taps Paradigms in Settings
    And he taps "The article" in the list
    Then the table "The article" is on screen with 24 cells
    And the address is for the table "article"

  Scenario: A form whose idea is not yet shows locked, and is available once its idea reaches the frontier
    Given the table "article" is open in Review mode
    Then the cell "Dative Singular Feminine" is locked and shows no form
    And the cell "Genitive Singular Feminine" shows "τῆς"
    When the idea "case-dative" moves to frontier
    Then the cell "Dative Singular Feminine" now shows "τῇ"
    And the table still has 24 cells

  Scenario: Study mode hides an available cell until it is tapped
    Given the table "article" is open in Study mode
    Then the cell "Genitive Singular Masculine" says reveal and shows no form
    When he taps the cell "Genitive Singular Masculine"
    Then the cell "Genitive Singular Masculine" shows "τοῦ"
    And the cell "Nominative Singular Masculine" still says reveal and shows no form
    And the cell "Dative Singular Masculine" is locked and shows no form

  Scenario: Review mode shows an available cell
    Given the table "article" is open in Study mode
    When he taps the button to switch to Review mode
    Then the cell "Genitive Singular Masculine" shows "τοῦ"
    And the cell "Nominative Singular Feminine" also shows "ἡ"
    And the cell "Dative Singular Masculine" is locked and shows no form
    And the address is for the table "article" in Review mode

  Scenario: The table says how many of its forms are available
    Given the table "article" is open in Study mode
    Then the table says "Available forms: 4 of 24"

  Scenario: Ask the tutor hands the table's name and the revealed forms to the tutor
    Given the table "article" is open in Study mode, with a fake Postern
    And he taps the cells "Genitive Singular Masculine" and "Nominative Singular Feminine"
    When he taps Ask the tutor
    Then the reader is open on Romans 8 and the Talk sheet is titled "Talk about Romans 8"
    And the mill received 1 grist for the lampas app, kind bible-talk
    And the grist carries the focus paradigm "The article" with the revealed forms "Nominative Singular Feminine: ἡ" and "Genitive Singular Masculine: τοῦ"
    And the grist question names the table "The article"
    And a reader request for the table "The article" was published
