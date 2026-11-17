# mw-indx1x6.8: the Governor's words (2026-11-12): "They should be available after each question, but the aggragate should be deduped and prioritized at the end of the drill/review."
# mw-indx1x6.6: the Governor's words (2026-11-12): "If I get something wrong in a drill, can you link to the specific paradigm(s)/lesson(s)/word card(s),
# mnemonic,... That would help me the most. If nothing is available, tutor should have enough context to help."
@uc-review @greek
Feature: A wrong answer links to what teaches it
  After a wrong answer in Review, Drill it, the short drill and Prove it, a 'Study this' row under the answer has one link for each thing that teaches
  what the question asked: the table, opened at the cell asked; the idea's lesson; the word's card; how to remember the word. Where nothing teaches it,
  the row has 'Ask the tutor', and the tutor's talk opens with the question, his answer, the right answer and the idea already said. A right answer
  shows no row.

  Scenario: A missed cell of a table in Review links to the table at that cell
    Given the table "noun-endings" is due in Review and the round asks "Noun endings: first declension, feminine in η (φωνή), dative singular" first
    When he opens Review and starts the round
    And he answers with a wrong ending
    Then a "Study this" row is under the answer
    And the row has the link "Table: Noun endings"
    And the row has the lesson of the idea "declension-1"
    And there is no "See the table" button beside it
    When he taps the link "Table: Noun endings"
    Then the Paradigms screen shows "Noun endings" in Learn
    And the cell "First declension, feminine in η (φωνή) Dative Singular" is lit and reads "-ῃ"
    When he goes Back
    Then Review is on the question "Noun endings: first declension, feminine in η (φωνή), dative singular" with its "Study this" row

  Scenario: A right answer shows no row
    Given the table "noun-endings" is due in Review and the round asks "Noun endings: first declension, feminine in η (φωνή), dative singular" first
    When he opens Review and starts the round
    And he answers with the right ending
    Then there is no "Study this" row
    And Next is there to go on

  Scenario: The lesson link opens the idea's lesson over Review
    Given the table "noun-endings" is due in Review and the round asks "Noun endings: first declension, feminine in η (φωνή), dative singular" first
    When he opens Review and starts the round
    And he answers with a wrong ending
    And he taps the lesson of the idea "declension-1"
    Then the lesson of the idea "declension-1" is open over Review

  Scenario: A miss that nothing teaches offers the tutor, who is told the miss
    Given a phone with a licence and a fake Postern
    And the English word "blessed" he misread is due in Review
    When he opens Review and starts the round
    And he says he did not know it
    Then a "Study this" row is under the answer
    And the row has only "Ask the tutor"
    When he taps "Ask the tutor" in the row
    Then the tutor's talk is open
    And the tutor's first turn names the question "Say this word aloud: blessed", his answer "Not yet", the right answer "blessed" and the idea "Saying the word blessed"
    And the tutor is sent the miss as the screen's facts

  Scenario: A miss with no licence and nothing to link shows no row
    Given a phone with no licence
    And the English word "blessed" he misread is due in Review
    When he opens Review and starts the round
    And he says he did not know it
    Then there is no "Study this" row

  Scenario: A wrong answer in Drill it links to the idea's lesson, which opens over the drill
    Given Drill it is open on the idea "noun"
    When he answers the drill's question wrong
    Then a "Study this" row is under the answer
    And the row has the lesson of the idea "noun"
    When he taps the lesson of the idea "noun"
    Then the lesson of the idea "noun" is open over the drill
    And the drill is still on the question he missed

  # mw-indx1x6.28: the lesson's own 'Table: ...' link opens the Paradigms screen, a page of its own, and the drill and its run would go with the screen under it; over a drill the
  # lesson has no such link (the row's own Table link opens the table over the drill). The idea is one that has a table: "noun" has none, so it could not show the fault.
  Scenario: The lesson opened over a drill has no Table link, which would leave the drill
    Given Drill it is open on the idea "article"
    When he answers the drill's question wrong
    And he taps the lesson of the idea "article"
    Then the lesson of the idea "article" is open over the drill
    And the lesson has no Table link, though "The article" teaches the idea "article"
    And the drill is still on the question he missed

  # mw-indx1x6.29: the lesson's own Drill it button would start a second drill over the one he is in, and Try it on a verse a second run of questions whose 'Read it' leaves
  # for the verse; over a drill the lesson has neither. mw-indx1x6.57 (its item 5, from mw-indx1x6.59): nor its level slider, whose 'I know it' also starts a drill, nor
  # 'Mark known without a drill': a lesson over a drill is for reading, and the level still shows as its chip under the title.
  Scenario: The lesson opened over a drill has no Drill it button, which would start a second drill over the first
    Given Drill it is open on the idea "noun"
    When he answers the drill's question wrong
    And he taps the lesson of the idea "noun"
    Then the lesson of the idea "noun" is open over the drill
    And the lesson has no "Drill it" button, no "Try it on a verse" button, no "Mark known without a drill" and no level slider
    And the drill is still on the question he missed

  # the same lesson anywhere else (a list of ideas such as Settings > Grammar approach, the Goal, Review) keeps both
  Scenario: The same lesson opened from a list of ideas keeps its Drill it button
    Given the lesson of the idea "noun" is open as it is from a list of ideas
    Then the lesson has the buttons "Drill it" and "Try it on a verse"

  # Review holds its round when the address leaves it (src/ReviewScreen.tsx, mw-indx1x6.56), so leaving it for a table loses nothing: there the lesson keeps its link,
  # and Back from the table is the question he missed, not the next one
  Scenario: The lesson opened over Review keeps its Table link
    Given the table "noun-endings" is due in Review and the round asks "Noun endings: first declension, feminine in η (φωνή), dative singular" first
    When he opens Review and starts the round
    And he answers with a wrong ending
    And he taps the lesson of the idea "declension-1"
    Then the lesson of the idea "declension-1" is open over Review
    And the lesson has the link "Table: Noun endings"
    And the lesson also has its "Drill it" button
    When he taps the lesson's link "Table: Noun endings", sees the table "Noun endings" and goes Back
    Then Review is on the question "Noun endings: first declension, feminine in η (φωνή), dative singular" with its "Study this" row
    And the round is on its first question of more than one

  # the sheet's other link to a page of its own, a letter's Hard sounds lesson, goes the same way
  Scenario: A letter's lesson over a drill has no link to its Hard sounds lesson
    Given the lesson of the idea "letter-rho" is open as it is over a drill
    Then the lesson has no "Learn to roll your r (optional)" link, though the letter has that lesson
    When the lesson of the idea "letter-rho" is open as it is over Review
    Then the lesson has the "Learn to roll your r (optional)" link

  # mw-indx1x6.57: one guard for whatever is drawn over a run (src/overRun.ts useOffRun): a sheet written for a plain screen, opened over a drill, offered links to pages of
  # their own, and one tap left the drill and lost the run. Over a run nothing that changes the page's address is drawn.
  Scenario: The word's sheet opened over a drill has no link that leaves the drill
    Given a short drill is open on an ending of a word of 1 John 2
    When he answers the ending wrong
    And he taps the row's Word link
    Then the word's sheet is open over the drill
    And All lexicons of the word has no "Manage" button, which opens the Library
    And no control of the word's sheet changes the page's address
    And the short drill is still on "Question 1 of 1"

  # a word of the text, opened by an example of the lesson, has a Paradigm row: over a drill it names the table and is no link (the row's own Table link opens the table over the drill)
  Scenario: A word of the lesson's examples opened over a drill names its table without a link to it
    Given Drill it is open on the idea "noun"
    When he answers the drill's question wrong
    And he taps the lesson of the idea "noun"
    And he taps the first example of the lesson
    Then the word's sheet is open over the drill
    And its Paradigm row names a table and is no link
    And no control of the word's sheet changes the page's address
    And the drill is still on the question he missed

  # the same word's sheet over no run keeps its link to the table
  Scenario: A word of the lesson's examples opened from a list of ideas keeps the link to its table
    Given the lesson of the idea "noun" is open as it is from a list of ideas
    When he taps the first example of the lesson
    Then its Paradigm row is a link to a table

  # mw-indx1x6.80 (the sweep of the word sheet's openers of a page, each asked of the one guard): a Hebrew word's sheet has an opener of its own for its table, and a
  # Septuagint word's has 'About this reading', which opens a Help page. Neither was held by a scenario; each sheet is drawn as it is over a drill (inside the run's guard) and then over no run, where the link is.
  Scenario: A Hebrew word's sheet over a drill names its table without a link to it
    Given the sheet of the second word of Genesis 1:1, a Hebrew verb, is open as it is over a drill for a reader of Hebrew
    Then the word's sheet is of a Hebrew word
    And its Paradigm row names a table and is no link
    And no control of the word's sheet changes the page's address
    When the sheet of the same word is open as it is over no run
    Then its Paradigm row is a link to a table

  Scenario: A Septuagint word's sheet over a drill has no About this reading link, which opens a Help page
    Given the sheet of the word "ἐποίησεν" of the Septuagint's Genesis 1 is open as it is over a drill
    Then the word's sheet says how Lampas read the word and has no "About this reading" button
    And no control of the word's sheet changes the page's address
    When the sheet of the same word is open as it is over no run
    Then the word's sheet has the "About this reading" button

  # the end card of a Review is held only by the screen too (useStudyPlaces opens its table as a layer): the lesson of its Study list has no Try it on a verse, whose
  # 'Read it' closes every sheet and opens the verse, and no Drill it or level slider either
  Scenario: The lesson opened from a Review's Study list has no Try it on a verse, whose Read it would leave the end card
    Given the table "noun-endings" is due in Review and the round asks "Noun endings: first declension, feminine in η (φωνή), dative singular" first
    When he opens Review and starts the round
    And he misses every question of the round
    And he taps the list's lesson of the idea "declension-1"
    Then the lesson of the idea "declension-1" is open over the end card
    And the lesson has no "Drill it" button, no "Try it on a verse" button, no "Mark known without a drill" and no level slider
    And the end card still shows its "Study list"

  # the tutor may answer with a link to a table, a verse or a setting, each a page of its own: in a talk over a drill those chips are not drawn, and the links that open
  # another app or copy a text still are
  Scenario: A table the tutor links in a talk over a drill is no chip, which would leave the drill
    Given a phone with a licence and a fake Postern whose answer links the table "article", the verse "1 John 2:1" and a copy of "1 John 2:2"
    And Drill it is open there on the idea "article"
    When he asks the tutor about the drill
    Then the tutor's answer has the Copy chip of "1 John 2:2"
    And the answer has no "Table: The article" chip and no chip that opens the Reader
    And the page's address is as it was
    And the drill is still on its first question

  # the same answer in a talk over no run keeps the chip
  Scenario: The same answer in the lesson's talk from a list of ideas keeps the Table chip
    Given a phone with a licence and a fake Postern whose answer links the table "article", the verse "1 John 2:1" and a copy of "1 John 2:2"
    And the lesson of the idea "article" is open there as it is from a list of ideas
    When he asks the tutor about the lesson
    Then the tutor's answer has the Copy chip of "1 John 2:2"
    And the answer has the "Table: The article" chip

  Scenario: A right answer in Drill it shows no row
    Given Drill it is open on the idea "noun"
    When he answers the drill's question right
    Then there is no "Study this" row

  Scenario: A wrong answer in a short drill opens the table over the drill, at the cell
    Given a short drill is open on the cell "Noun endings: first declension, feminine in η (φωνή), dative singular"
    When he answers with a wrong ending
    Then a "Study this" row is under the answer
    When he taps the link "Table: Noun endings"
    Then the table "Noun endings" is open over the drill
    And the cell "First declension, feminine in η (φωνή) Dative Singular" is lit and reads "-ῃ"
    When he taps "Back to the drill"
    Then the short drill is still on "Question 1 of 2"

  # mw-indx1x6.8: at the end of the session, a Study list of everything the misses linked to, one row each, most-missed first
  Scenario: A Review with misses ends with a Study list that shows a table once, first
    Given the table "noun-endings" is due in Review and the round asks "Noun endings: first declension, feminine in η (φωνή), dative singular" first
    When he opens Review and starts the round
    And he misses every question of the round
    Then the end card shows a "Study list"
    And the list's first row is "Table: Noun endings" for 3 misses
    And the list has the link "Table: Noun endings" once
    And the rows are ordered by how many misses pointed to them
    When he taps the list's link "Table: Noun endings"
    Then the table "Noun endings" is open over the end card
    And one cell is lit

  Scenario: Three misses in a short drill, two on one table, show that table once, first
    Given a short drill of three questions is open: two cells of "noun-endings" and one of "article"
    When he misses every question
    Then the drill's result shows a "Study list"
    And the list's first row is "Table: Noun endings" for 2 misses
    And the list has the link "Table: Noun endings" once
    And the list also has the link "Table: The article" once
    And the "Table: The article" row comes after the "Table: Noun endings" row

  Scenario: A drill with no misses shows no Study list
    Given a short drill of three questions is open: two cells of "noun-endings" and one of "article"
    When he answers every question right
    Then the drill's result shows no "Study list"

  Scenario: A Review with no misses shows no Study list
    Given the table "noun-endings" is due in Review and the round asks "Noun endings: first declension, feminine in η (φωνή), dative singular" first
    When he opens Review and starts the round
    And he answers every question of the round right
    Then the end card shows no "Study list"

  Scenario: A miss that nothing teaches ends in one row that asks the tutor about it
    Given a phone with a licence and a fake Postern
    And the English word "blessed" he misread is due in Review
    When he opens Review and starts the round
    And he says he did not know it
    And he finishes the round
    Then the end card shows a "Study list"
    And the list has only "Ask the tutor about these"
    When he taps "Ask the tutor about these" in the list
    Then the tutor's talk is open
    And the tutor's first turn names the question "Say this word aloud: blessed", his answer "Not yet", the right answer "blessed" and the idea "Saying the word blessed"
    And the tutor is sent the misses as the screen's facts

  Scenario: Without a licence a miss that nothing teaches leaves no Study list
    Given a phone with no licence
    And the English word "blessed" he misread is due in Review
    When he opens Review and starts the round
    And he says he did not know it
    And he finishes the round
    Then the end card shows no "Study list"
