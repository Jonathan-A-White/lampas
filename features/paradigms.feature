@uc-paradigms @greek
Feature: Paradigms
  The Paradigms screen (#/paradigms, reached from Settings > More, beside Review) lists twenty tables: The article, Noun endings, εἰμί,
  Verb endings, The third declension, Adjective endings, Personal pronouns, Demonstrative and relative pronouns, Interrogative
  and indefinite pronouns, Future and aorist, Aorist and future passive, Perfect and pluperfect, Second aorist, Contract verbs,
  Verbs in -μι, οἶδα, The subjunctive, The imperative, The infinitive and The participle (src/data/paradigms/, docs/paradigms.md), each with 'Available forms: N of M' and a progress bar. A form is
  available once every grammar idea it needs is at the frontier or solid (grammarLevels); a locked form shows as locked, not hidden,
  so the table keeps its shape. A table opens to Learn (every available cell shows its form) or to Drill (each available cell is
  blank; a tap shows its form and asks Had it or Missed; after the last, 'N of M' and Drill the missed again); a Learn | Drill switch
  changes it (mw-irpgqi.2; the old addresses mode=review and mode=study still open Learn and Drill). How much of a table (Settings >
  Greek, and a switch in the table's header) says which cells are shown: Any (locked cells too, marked not yet), Solid and frontier (the
  default: his cells, the rest locked) or Solid only (the frontier cells hidden). Ask the tutor (on the list too) opens the tutor's sheet over the screen and tells it the table, the mode, the forms
  showing, the cell he is on and the word he came from; the talk is kept per table (mw-irpgqi.3).

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
    And the table "future-and-aorist" is open to Learn
    Then the table says "Available forms: 12 of 24"
    And the cell "1st person singular Aorist Active" shows "ἔλυσ-α"
    And the 12 future cells are locked and their accessible names name "The future tense"
    And the cell "1st person singular Future Active" is locked and shows no form

  Scenario: The participle table stays shut while the participle idea is not yet, and opens with it
    Given every idea of the table "participle" except "mood-participle" is at the frontier
    And the table "participle" is open to Learn
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
    Given the table "third-declension" is open to Learn
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
    Given the table "article" is open to Learn
    Then the cell "Dative Singular Feminine" is locked and shows no form
    And the cell "Genitive Singular Feminine" shows "τῆς"
    When the idea "case-dative" moves to frontier
    Then the cell "Dative Singular Feminine" now shows "τῇ"
    And the table still has 24 cells

  # mw-irpgqi.2: Drill leaves a cell blank until he taps it; the tap shows the form and asks Had it or Missed
  Scenario: Drill leaves an available cell blank until it is tapped, then asks whether he had it
    Given the table "article" is open to Drill
    Then the cell "Genitive Singular Masculine" is blank and shows no form
    And nothing asks Had it or Missed
    When he taps the cell "Genitive Singular Masculine"
    Then the cell "Genitive Singular Masculine" shows "τοῦ"
    And he is asked "Had it" or "Missed" under that row, the cell named "Genitive singular masculine of the article"
    And the cell "Nominative Singular Masculine" is still blank and shows no form
    And the cell "Dative Singular Masculine" is locked and shows no form
    When he taps "Had it"
    Then the cell "Genitive Singular Masculine" stays shown, marked "had"
    And Had it and Missed are gone

  Scenario: A Drill ends on its score, and Drill the missed again asks only the missed
    Given the table "article" is open to Drill
    When he drills "Nominative Singular Masculine" as had, "Nominative Singular Feminine" as had, "Genitive Singular Masculine" as missed and "Genitive Singular Feminine" as had
    Then the score reads "3 of 4"
    And the cell "Genitive Singular Masculine" is shown, marked "missed"
    When he taps "Drill the missed again"
    Then the cell "Genitive Singular Masculine" is blank and shows no form
    And the cell "Nominative Singular Masculine" stays shown, marked "had"
    And the score is not shown
    When he drills "Genitive Singular Masculine" as had
    Then the score now reads "1 of 1"
    And there is no "Drill the missed again" button

  Scenario: Start again blanks every cell of the drill
    Given the table "article" is open to Drill
    When he drills "Nominative Singular Masculine" as had
    And he taps "Start again"
    Then the cell "Nominative Singular Masculine" is blank and shows no form
    And there is no "Start again" button

  Scenario: With every cell locked, the Drill line does not tell him to tap a cell
    Given the table "participle" is open to Drill
    Then the table says "Available forms: 0 of 30"
    And the mode line does not say "tap a blank cell"
    And the mode line says "Every form is locked. Mark the grammar ideas a form needs to open it."

  Scenario: Learn shows every available cell
    Given the table "article" is open to Drill
    When he taps "Learn" in the mode switch
    Then the cell "Genitive Singular Masculine" shows "τοῦ"
    And the cell "Nominative Singular Feminine" also shows "ἡ"
    And the cell "Dative Singular Masculine" is locked and shows no form
    And the mode line says "Learn: every available form is shown."
    And the address is for the table "article" in Learn

  # mw-irpgqi.2: the old addresses, kept or linked, still open the same views
  Scenario: An old link with mode=study still opens Drill
    Given the address "#/paradigms?t=article&mode=study" is opened
    Then "Drill" is the mode pressed
    And the cell "Genitive Singular Masculine" is blank and shows no form

  Scenario: An old link with mode=review still opens Learn
    Given the address "#/paradigms?t=article&mode=review" is opened
    Then "Learn" is the mode pressed
    And the cell "Genitive Singular Masculine" shows "τοῦ"

  Scenario: The table says how many of its forms are available
    Given the table "article" is open to Drill
    Then the table says "Available forms: 4 of 24"

  # mw-irpgqi.2: How much of a table
  Scenario: Any shows a locked cell filled in Learn, marked not yet with what it needs
    Given How much of a table is "any"
    And the table "article" is open to Learn
    Then the table says "All 24 forms shown, 4 available"
    And the cell "Dative Singular Masculine" shows "τῷ", marked not yet
    And the cell "Genitive Singular Masculine" shows "τοῦ"
    When he taps the cell "Dative Singular Masculine"
    Then the note under the table says "Needs the dative case"
    And no cell is locked

  Scenario: Any leaves a not-yet cell blank in Drill, and asks it with what it needs
    Given How much of a table is "any"
    And the table "article" is open to Drill
    Then the cell "Dative Singular Masculine" is blank and shows no form, marked not yet
    When he taps the cell "Dative Singular Masculine"
    Then the cell "Dative Singular Masculine" shows "τῷ"
    And he is asked "Had it" or "Missed" under that row, the cell named "Dative singular masculine of the article"
    And the note under the table says "Needs the dative case"

  Scenario: Solid only hides the frontier cells and keeps the locked ones locked
    Given How much of a table is "solid"
    And the table "article" is open to Learn
    Then the table says "Solid forms: 1 of 24"
    And the cell "Nominative Singular Masculine" shows "ὁ"
    And the cells "Genitive Singular Masculine" and "Nominative Singular Feminine" are hidden by the extent
    And the cell "Dative Singular Masculine" is locked and shows no form
    And the table still has 24 cells

  Scenario: The Paradigms list follows How much of a table at Solid only
    Given How much of a table is "solid"
    When he opens the Paradigms screen
    Then the list reads "The article: Solid forms: 1 of 24", "Noun endings: Solid forms: 2 of 40", "εἰμί: Solid forms: 0 of 70" and "Verb endings: Solid forms: 0 of 24"

  Scenario: The Paradigms list follows How much of a table at Any
    Given How much of a table is "any"
    When he opens the Paradigms screen
    Then the list reads "The article: All 24 forms shown, 4 available", "Noun endings: All 40 forms shown, 8 available", "εἰμί: All 70 forms shown, 0 available" and "Verb endings: All 24 forms shown, 0 available"

  Scenario: The setting shows in Settings and in the table's header switch, and a change in one shows in the other
    Given Lampas is open on Settings
    And he opens the Greek page
    Then the row "How much of a table" offers "Any", "Solid and frontier" and "Solid only", and "Solid and frontier" is chosen
    When he taps "Solid only" under How much of a table
    Then "Solid only" is chosen under How much of a table and is kept as "solid"
    When the table "article" is opened
    Then the header switch "How much of a table" has "Solid only" pressed
    And the table says "Solid forms: 1 of 24"
    When he taps "Any" in the header switch
    Then the table now says "All 24 forms shown, 4 available"
    And the setting is kept as "any"
    When he goes back to Settings, to the Greek page
    Then "Any" is chosen under How much of a table

  Scenario: Ask the tutor hands the table, the mode, the revealed forms and the cell he is on to the tutor
    Given the table "article" is open to Drill, with a fake Postern
    And he drills "Genitive Singular Masculine" as had and "Nominative Singular Feminine" as had
    When he taps Ask the tutor
    Then the table is still open and the Talk sheet is titled "Ask the tutor: Paradigms"
    And the mill received 1 grist for the lampas app, kind bible-talk
    And the grist carries the focus paradigm "The article" in Drill with the revealed forms "Nominative Singular Feminine: ἡ" and "Genitive Singular Masculine: τοῦ", on the cell "Nominative Singular Feminine"
    And the grist question names the table "The article"
    And no request was made of the Reader

  # mw-svw421.25: a lock says which ideas it still needs, each with a Go to button that opens that idea's sheet, the lowest on the ladder first.
  Scenario: A locked cell names the ideas it still needs, each with a button to its sheet
    Given only the idea "mood-participle" is solid
    And the table "participle" is open to Learn
    When he taps the locked cell "Present active Nominative singular Masculine"
    Then the note under the table says "Needs the singular, the nominative case, the masculine gender, the third declension, the verb, the present tense and the active voice"
    And the note offers "Go to The singular" first and "Go to The verb"
    When he taps the button "Go to The verb"
    Then the idea sheet of "The verb" is open over the table
    When he goes back
    Then no idea sheet is open and the table "The participle" is on screen
