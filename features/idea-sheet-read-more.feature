Feature: The idea sheet reads the shelf
  Read more on an idea sheet draws the grammars of his shelf (docs/design/library-at-scale.md 3.7, mw-rfjjzd.16, PROVISIONAL): the grammars he Pinned first,
  then the On ones, each group in the catalogue's order, three lines in view and the rest under More books. A grammar with no sections table in the
  catalogue never appears, however the shelf holds it, because it has nothing to open at. Under Read more, 'Ask for a grammar ›' opens the one ask,
  Ask for a book, with the kind of book set to Grammar.

  Scenario: Two Pinned grammars come first, then the On ones, and the rest wait under More books
    Given Lampas has Logos on and a shelf of seven test grammars, "six, seven" Pinned and "one, two, three, four, five" On, each teaching "noun"
    When he opens the idea sheet of "noun" with the seven test grammars
    Then the idea sheet shows Read more with the book lines "six, seven, one" and a button "More books (4)"
    When he taps "More books (4)"
    Then the idea sheet shows Read more with the book lines "six, seven, one, two, three, four, five" and no More books button

  Scenario: A grammar with no sections table is on the shelf and never appears
    Given Lampas has Logos on and a shelf holding "BDF" and "Black, Learn to Read NT Greek", both Pinned
    When he opens the idea sheet of "noun"
    Then the idea sheet shows Read more with the book lines "Black, Learn to Read NT Greek" and no More books button

  Scenario: Ask for a grammar opens the one ask with the kind Grammar
    Given Lampas has Logos on and a licence
    When he opens the idea sheet of "noun"
    And he taps "Ask for a grammar ›" on the idea sheet
    Then the sheet "Ask for a book" is open with the kind "Grammar"
