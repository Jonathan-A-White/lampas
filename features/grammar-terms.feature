Feature: Grammar terms
  Every grammar word in the Parsing of a word's sheet (conjunction, aorist, genitive ...) is a link. A tap opens a Grammar sheet
  over the word sheet: a plain explanation, how it shows in Koine Greek, up to three examples from the chapter (each opens its
  own word sheet), an I know this mark and Ask the tutor. A term marked I know this is kept on the phone, still a link, but shown
  plain (no underline) on every sheet. Opening a sheet publishes grammar-term-opened and marking publishes grammar-term-known
  (docs/events.md). Ask the tutor opens the Talk sheet on the word's verse and sends a bible-talk grist whose focus is
  {term, kind: grammar-term} to a fake Postern (tests/support/fake-postern.ts).

  Scenario: Tapping conjunction on the sheet of γάρ in Romans 8 opens a Grammar sheet with its explanation and up to three examples from the chapter
    Given Lampas is opened on Romans 8 with grammar terms behind a fake Postern and no term known
    And he taps "For" in verse 2
    Then the Parsing on the word sheet shows "conjunction" as a link
    When he taps the term "conjunction" on the word sheet
    Then a Grammar sheet opens over the word sheet titled "conjunction"
    And the Grammar sheet explains it in plain words and says how it shows in Greek
    And the Grammar sheet shows 3 examples from Romans 8, each a conjunction other than "γάρ"
    And a grammar-term-opened event for "conjunction" was published

  Scenario: An example opens its own word sheet
    Given Lampas is opened on Romans 8 with grammar terms behind a fake Postern and no term known
    And he taps "For" in verse 2
    And he taps the term "conjunction" on the word sheet
    When he taps the first example on the Grammar sheet
    Then the Grammar sheet is gone and the word sheet is of that example
    And its Parsing names a conjunction

  Scenario: I know this survives a reload and shows the term plain on every sheet
    Given Lampas is opened on Romans 8 with grammar terms behind a fake Postern and no term known
    And he taps "For" in verse 2
    And he taps the term "conjunction" on the word sheet
    When he marks I know this on the Grammar sheet
    Then I know this is pressed and a grammar-term-known event for "conjunction" was published
    And the term "conjunction" is shown plain on the word sheet behind it
    When Lampas is opened again on Romans 8
    And he opens the word sheet of "but" in verse 1
    Then the term "conjunction" is shown plain, with no underline, and is still a link
    When he taps "conjunction" again on the word sheet
    Then I know this is pressed
    When he closes the Grammar sheet and the word sheet
    And he then opens the word sheet of "work together" in verse 28
    Then the term "verb" is shown underlined

  Scenario: Marking it again takes the mark off
    Given Lampas is opened on Romans 8 with grammar terms behind a fake Postern and no term known
    And he taps "For" in verse 2
    And he taps the term "conjunction" on the word sheet
    And he marks I know this on the Grammar sheet
    When he marks I know this on the Grammar sheet again
    Then I know this is not pressed and a grammar-term-known event for "conjunction" saying he does not know it was published
    And the term "conjunction" is shown underlined on the word sheet behind it

  Scenario: Ask the tutor opens the Talk sheet and sends a bible-talk grist whose focus is the term
    Given Lampas is opened on Romans 8 with grammar terms behind a fake Postern and no term known
    And he taps "For" in verse 2
    And he taps the term "conjunction" on the word sheet
    When he taps Ask the tutor on the Grammar sheet
    Then the Grammar sheet and the word sheet are gone and the sheet is titled "Talk about Romans 8:2"
    And the mill received 1 grist for the lampas app, kind bible-talk
    And the grist carries the focus term "conjunction" and kind grammar-term
    And the grist question names the term and the reference and asks to explain the grammar term
    And the answer shows in the Talk sheet under the question about the term
