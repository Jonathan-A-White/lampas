Feature: New words are chosen at my grammar level, and the level moves with how I do
  Lampas offers new words to learn. Settings > New words says at which grammar level they are offered: Solid grammar (only
  words with a form whose grammar I have solid) or Frontier grammar (also the grammar I am working on). When my last 20 grammar
  answers go well, or badly, Lampas offers to move that level, makes the move and says so, or leaves it alone, as I set it.
  The rule is PROVISIONAL: 85 percent of the last 20 right moves up, under 60 percent moves down, Ask is the default.

  Scenario: Settings offers New words at Solid grammar | Frontier grammar and Move it Ask | Auto | Off
    Given Lampas is opened on Settings with nothing chosen
    Then New words at offers "Solid grammar" and "Frontier grammar", and "Frontier grammar" is chosen
    And Move it offers "Ask", "Auto" and "Off", and "Ask" is chosen
    When he taps "Solid grammar" under New words at and "Off" under Move it
    Then "Solid grammar" and "Off" are chosen and are kept

  Scenario: at Solid grammar a word whose forms use the not-yet genitive is not offered
    Given a chapter in which "ἀγάπη" always stands in the genitive and "θεός" in the nominative
    And the nominative ideas are solid and the genitive is not yet known
    When Lampas picks the new words of the chapter at Solid grammar
    Then "θεός" is offered and "ἀγάπη" is not
    When the genitive is at the frontier and Lampas picks at Frontier grammar
    Then "ἀγάπη" is offered too

  Scenario: after a strong round with Ask the end card offers the move and Yes sets Frontier grammar
    Given New words at is Solid grammar and Move it is Ask
    And his last 19 grammar answers were right and a grammar idea is due
    When he finishes a round, getting the idea right
    Then the end card asks "Move new words to frontier grammar?" with "Yes" and "Not now"
    When he taps "Yes"
    Then the end card says "Moved new words to frontier grammar"
    And New words at is "Frontier grammar" and the move was told as "ask"

  Scenario: with Auto the move is made and said
    Given New words at is Solid grammar and Move it is Auto
    And his last 19 grammar answers were right and a grammar idea is due
    When he finishes a round, getting the idea right
    Then the end card says "Moved new words to frontier grammar"
    And New words at is "Frontier grammar" and the move was told as "auto"

  Scenario: with Off nothing is offered
    Given New words at is Solid grammar and Move it is Off
    And his last 19 grammar answers were right and a grammar idea is due
    When he finishes a round, getting the idea right
    Then the end card offers no move and says nothing of one
    And New words at is "Solid grammar" and no move was told

  Scenario: a weak round at Frontier grammar moves down
    Given New words at is Frontier grammar and Move it is Auto
    And his last 19 grammar answers were wrong and a grammar idea is due
    When he finishes a round, getting the idea wrong
    Then the end card says "Moved new words to solid grammar"
    And New words at is "Solid grammar" and the move was told as "auto"
