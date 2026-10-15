Feature: Paradigms
  The Paradigms screen (#/paradigms, reached from Settings > More, beside Review) lists twenty tables: The article, Noun endings, εἰμί,
  Verb endings, The third declension, Adjective endings, Personal pronouns, Demonstrative and relative pronouns, Interrogative
  and indefinite pronouns, Future and aorist, Aorist and future passive, Perfect and pluperfect, Second aorist, Contract verbs,
  Verbs in -μι, οἶδα, The subjunctive, The imperative, The infinitive and The participle (src/data/paradigms/, docs/paradigms.md), each with 'Available forms: N of M' and a progress bar. A form is
  available once every grammar idea it needs is at the frontier or solid (grammarLevels); a locked form shows as locked, not hidden,
  so the table keeps its shape. A table opens in Study mode (an available cell says reveal and a tap shows its form) or Review mode
  (every available cell shows its form); one button switches. Ask the tutor sends the table's name and the forms he has revealed
  to the tutor, on the chapter that is open.

  Background:
    Given his grammar levels are the article, the nominative, the singular and nouns solid, the genitive and the feminine at the frontier, the masculine solid, the dative, the accusative, the plural and the neuter not yet

  Scenario: The list shows each table with how many of its forms are available
    When he opens the Paradigms screen
    Then the list reads "The article: Available forms: 4 of 24", "Noun endings: Available forms: 8 of 40", "εἰμί: Available forms: 0 of 70" and "Verb endings: Available forms: 0 of 24"
    And the progress bar of "The article" is at 4 of 24

  # mw-svw421.5: the list is grouped by the ladder's tiers, and opening a table is kept: Review asks the endings of a form only once its table has been opened.
  Scenario: The list groups the tables by tier under the tier's title
    When he opens the Paradigms screen
    Then the list has the groups "Nouns", "Pronouns" and "Verbs", in that order
    And the group "Nouns" holds "The article, Noun endings, The third declension, Adjective endings"
    And the group "Verbs" holds 13 tables, the first "εἰμί" and the last "The participle"

  Scenario: Opening a table keeps that he opened it
    When he opens the Paradigms screen
    And he taps "Noun endings" in the list
    Then the tables he has opened are "noun-endings"
    When he goes back to the list and opens "The article"
    Then the tables he has opened are "noun-endings" and "article"

  Scenario: The list shows the five tables of the nouns and pronouns, each with how many of its forms are available
    When he opens the Paradigms screen
    Then the list also reads "The third declension: Available forms: 0 of 48", "Adjective endings: Available forms: 0 of 48", "Personal pronouns: Available forms: 0 of 40", "Demonstrative and relative pronouns: Available forms: 0 of 48" and "Interrogative and indefinite pronouns: Available forms: 0 of 32"

  Scenario: The count follows the ideas he has, and the interrogative table stays shut while its idea is not yet
    Given the ideas "declension-3" and "pronoun-interrogative" are at the frontier
    When he opens the Paradigms screen
    Then the list also reads "The third declension: Available forms: 8 of 48", "Adjective endings: Available forms: 0 of 48", "Personal pronouns: Available forms: 0 of 40", "Demonstrative and relative pronouns: Available forms: 0 of 48" and "Interrogative and indefinite pronouns: Available forms: 2 of 32"

  Scenario: The list shows the seven tables of the verb, with the tenses he has not met still locked
    Given the ideas "tense-aorist, voice-active, voice-middle, mood-indicative, person-1st, person-2nd, person-3rd, number-plural, verb, augment, tense-signs" are at the frontier
    When he opens the Paradigms screen
    Then the verb tables read "Future and aorist: Available forms: 12 of 24, Aorist and future passive: Available forms: 0 of 12, Perfect and pluperfect: Available forms: 0 of 18, Second aorist: Available forms: 0 of 12, Contract verbs: Available forms: 0 of 18, Verbs in -μι: Available forms: 0 of 36, οἶδα: Available forms: 0 of 12"

  Scenario: The future cells of Future and aorist stay locked, naming the future tense, while the aorist cells open
    Given the ideas "tense-aorist, voice-active, voice-middle, mood-indicative, person-1st, person-2nd, person-3rd, number-plural, verb, augment, tense-signs" are at the frontier
    And the table "future-and-aorist" is open in Review mode
    Then the table says "Available forms: 12 of 24"
    And the cell "1st person singular Aorist Active" shows "ἔλυσ-α"
    And the 12 future cells are locked and their accessible names name "The future tense"
    And the cell "1st person singular Future Active" is locked and shows no form

  Scenario: The participle table stays shut while the participle idea is not yet, and opens with it
    Given every idea of the table "participle" except "mood-participle" is at the frontier
    And the table "participle" is open in Review mode
    Then the table says "Available forms: 0 of 30"
    And all 30 cells of the table are locked
    And every lock names "The participle"
    When the idea "mood-participle" moves to frontier
    Then the table now says "Available forms: 30 of 30"
    And the cell "Present active Nominative singular Masculine" now shows "λύων"
    And the cell "Present active Nominative singular Feminine" also shows "λύουσα"
    And the cell "Present active Nominative singular Neuter" likewise shows "λῦον"

  Scenario: Opening The third declension shows its 48 cells, every one locked while its idea is not yet
    When he opens the Paradigms screen
    And he taps "The third declension" in the list
    Then the table "The third declension" is on screen with 48 cells
    And the address is for the table "third-declension"
    And all 48 cells of the table are locked

  Scenario: A third declension form opens with its ideas and stays locked without them
    Given the table "third-declension" is open in Review mode
    Then the cell "σάρξ, feminine Genitive Singular" is locked and shows no form
    When the idea "declension-3" moves to frontier
    Then the cell "σάρξ, feminine Genitive Singular" now shows "σαρκός"
    And the cell "πατήρ, masculine Genitive Singular" also shows "πατρός"
    And the cell "σάρξ, feminine Dative Singular" is locked and shows no form
    And the cell "γένος, neuter Nominative Singular" is also locked and shows no form
    And the table still has 48 cells

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
