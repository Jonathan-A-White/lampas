Feature: Grammar books in Logos on the idea sheet
  An idea sheet links the section that teaches its idea in the grammar books of his Logos library that he ticked (mw-5r3p30.381,
  PROVISIONAL): one data entry a book in src/resources/grammarBooks.ts, David Alan Black's Learn to Read New Testament Greek first.
  With Logos on in Settings and a ticked book that teaches the idea, the sheet shows Read more, one line a book with a link for each
  of its sections, at most three books in view and the rest folded under More books. Each link opens Logos at the section by the
  logosres scheme, with the ref.ly address as the fallback. A book is a reference inside the learning, never a grammar approach:
  the same lines show on an idea, whichever approach's lesson it comes from.

  Scenario: With Logos on and Black ticked, The noun shows Read more with Black's section
    Given Lampas has Logos on and the grammar books "black" ticked
    When he opens the idea sheet of "noun"
    Then the idea sheet shows Read more with 1 book line
    And the line of "Black, Learn to Read NT Greek" links "Lesson 4: Nouns of the Second Declension" to "logosres:LLS:LRNTOREADNTGRK;ref=Page.p+26"
    And that link falls back to "https://ref.ly/logosres/LLS%3ALRNTOREADNTGRK?ref=Page.p+26"

  Scenario: With four books ticked and mapped, three lines show and More books unfolds the fourth
    Given Lampas has Logos on and the four test books "one, two, three, four" ticked, each mapping "noun"
    When he opens the idea sheet of "noun" with the four test books
    Then the idea sheet shows Read more with 3 book lines and a button "More books (1)"
    When he taps "More books (1)"
    Then the idea sheet shows Read more with 4 book lines and no More books button

  Scenario: With Black unticked there is no Read more
    Given Lampas has Logos on and no grammar book ticked
    When he opens the idea sheet of "noun"
    Then the idea sheet shows no Read more

  Scenario: With Logos off there is no Read more
    Given Lampas has Logos off and the grammar books "black" ticked
    When he opens the idea sheet of "noun"
    Then the idea sheet shows no Read more

  Scenario: Settings ticks Black among the grammar books once Logos is on, and unticking it is kept
    Given Lampas is opened on Romans 8 with no study resources on
    When he turns Logos on in Settings
    Then Settings shows the grammar book "Learn to Read New Testament Greek (Black)" ticked
    When he taps the grammar book "Learn to Read New Testament Greek (Black)"
    Then the grammar books kept are none

  Scenario: An idea from a lesson of the BMA Tutor order shows the same Read more lines
    Given Lampas has Logos on and the grammar books "black" ticked
    When he opens the idea sheet of the first idea Black maps in the BMA Tutor order's lessons
    Then the idea sheet shows the lines Black gives that idea
    And no grammar approach is named for a grammar book
