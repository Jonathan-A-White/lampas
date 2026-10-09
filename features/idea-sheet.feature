Feature: The idea sheet
  A bottom sheet teaches one grammar idea of the ladder (src/data/grammar/ladder.ts): its title, its plain text, up to three
  example forms from the goal passage (one for each lemma, each with its verse; a speaker on each; a tap opens the word's
  sheet), a paradigm table for a case or a tense built from the passage's forms, and three buttons: Got it (the idea is on
  the frontier and due tomorrow), I know this (solid, at the 30-day step) and Ask the tutor. It opens from the Learn this idea
  button of a Grammar sheet. With no goal the examples come from the chapter that is open. Taught ideas are announced on
  the bus as idea-taught (docs/events.md).

  Scenario: The genitive idea's sheet shows its text and three examples from 1 John 1 with their verses
    Given Lampas is opened on Romans 8 with the goal "1 John 1", no idea level and a fake Postern
    When he opens the idea sheet from the Grammar sheet of "genitive" on the word "of the" in verse 2
    Then the idea sheet is titled "The genitive case" and shows the plain text of that idea
    And the idea sheet shows 3 examples "ἀρχῆς", "ἡμῶν" and "τοῦ" with the verses "1 John 1:1", "1 John 1:1" and "1 John 1:1"
    And each example has a speaker
    And the paradigm table of the genitive has "τοῦ" and "τῆς" in its cells
    And the idea sheet shows no level

  Scenario: With no goal the examples come from the open chapter
    Given Lampas is opened on Romans 8 with no goal, no idea level and a fake Postern
    When he opens the idea sheet from the Grammar sheet of "genitive" on the word "of the" in verse 2
    Then the idea sheet shows 3 examples that are genitives of "Romans 8"
    And the paradigm table of the genitive has "τοῦ" and "τῆς" in its cells

  Scenario: An example opens its own word sheet
    Given Lampas is opened on Romans 8 with the goal "1 John 1", no idea level and a fake Postern
    And he opens the idea sheet from the Grammar sheet of "genitive" on the word "of the" in verse 2
    When he taps the example "ἀρχῆς" on the idea sheet
    Then the word sheet is of "ἀρχῆς" and its Parsing names a genitive

  Scenario: Got it makes the idea frontier and due tomorrow
    Given Lampas is opened on Romans 8 with the goal "1 John 1", no idea level and a fake Postern
    And he opens the idea sheet from the Grammar sheet of "genitive" on the word "of the" in verse 2
    When he taps Got it on the idea sheet
    Then the idea "case-genitive" is frontier, set by the sheet, and its review is due in 1 day at step 0
    And an idea-taught event for "case-genitive" with the outcome "got-it" was published
    And the idea sheet shows the chip "Frontier since today"

  Scenario: I know this makes it solid at the 30-day step
    Given Lampas is opened on Romans 8 with the goal "1 John 1", no idea level and a fake Postern
    And he opens the idea sheet from the Grammar sheet of "genitive" on the word "of the" in verse 2
    When he taps I know this on the idea sheet
    Then the idea "case-genitive" is solid, set by the sheet, and its review is due in 30 days at the 30-day step
    And an idea-taught event for "case-genitive" with the outcome "known" was published
    And the idea sheet shows the chip "Solid since today"

  Scenario: Learn this idea on the Grammar sheet of genitive opens the idea sheet
    Given Lampas is opened on Romans 8 with the goal "1 John 1", no idea level and a fake Postern
    And he taps "of the" in verse 2 and the term "genitive" on the word sheet
    Then the Grammar sheet has a button Learn this idea
    When he taps Learn this idea
    Then the idea sheet opens over the Grammar sheet and the word sheet

  Scenario: Ask the tutor opens the Talk sheet with the term in focus
    Given Lampas is opened on Romans 8 with the goal "1 John 1", no idea level and a fake Postern
    And he opens the idea sheet from the Grammar sheet of "genitive" on the word "of the" in verse 2
    When he taps Ask the tutor on the idea sheet
    Then the idea, Grammar and word sheets are gone and the sheet is titled "Talk about Romans 8:2"
    And the grist carries the focus term "genitive" and kind grammar-term
