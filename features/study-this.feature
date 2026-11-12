# mw-indx1x6.6: the Governor's words (2026-11-12): "If I get something wrong in a drill, can you link to the specific paradigm(s)/lesson(s)/word card(s),
# mnemonic,... That would help me the most. If nothing is available, tutor should have enough context to help."
@uc-review @greek
Feature: A wrong answer links to what teaches it
  After a wrong answer in Review, Drill it, the short drill and Prove it, a 'Study this' row under the answer has one link for each thing that teaches
  what the question asked: the table, opened at the cell asked; the idea's lesson; the word's card; how to remember the word. Where nothing teaches it,
  the row has 'Ask the tutor', and the tutor's talk opens with the question, his answer, the right answer and the idea already said. A right answer
  shows no row.

  Scenario: A missed cell of a table in Review links to the table at that cell
    Given the table "noun-endings" is due in Review and the round asks "First declension, feminine in η (φωνή) dative singular of noun endings" first
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
    Then Review is on the question "First declension, feminine in η (φωνή) dative singular of noun endings" with its "Study this" row

  Scenario: A right answer shows no row
    Given the table "noun-endings" is due in Review and the round asks "First declension, feminine in η (φωνή) dative singular of noun endings" first
    When he opens Review and starts the round
    And he answers with the right ending
    Then there is no "Study this" row
    And Next is there to go on

  Scenario: The lesson link opens the idea's lesson over Review
    Given the table "noun-endings" is due in Review and the round asks "First declension, feminine in η (φωνή) dative singular of noun endings" first
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

  Scenario: A right answer in Drill it shows no row
    Given Drill it is open on the idea "noun"
    When he answers the drill's question right
    Then there is no "Study this" row

  Scenario: A wrong answer in a short drill opens the table over the drill, at the cell
    Given a short drill is open on the cell "First declension, feminine in η (φωνή) dative singular of noun endings"
    When he answers with a wrong ending
    Then a "Study this" row is under the answer
    When he taps the link "Table: Noun endings"
    Then the table "Noun endings" is open over the drill
    And the cell "First declension, feminine in η (φωνή) Dative Singular" is lit and reads "-ῃ"
    When he taps "Back to the drill"
    Then the short drill is still on "Question 1 of 2"
