Feature: Lampas draws a verse as a Reed-Kellogg diagram
  The renderer of the sentence diagram (mw-souyao.1): a diagram the tutor has worked out is drawn as the classic school diagram, a base line
  carrying the subject, the verb and what completes it, modifiers on slanted lines beneath, a subordinate clause on a base line below joined
  by a dotted line. It is wide, so it scrolls sideways in its own box and never shrinks its type. Every word is a button that reports which
  word was tapped; a word the sentence only understands is in parentheses and is no button. The renderer is proven here on the hand-written
  diagrams of Colossians 3:1 in English and in Greek (tests/fixtures/diagrams); no screen shows it yet.

  Scenario: Colossians 3:1 in English
    Given the English diagram of Colossians 3:1 is drawn
    Then every English word of the verse is on the screen once
    And the understood "you" is in parentheses and is not a button
    And the English diagram has 3 base lines and 9 slanted lines
    And the English diagram scrolls sideways and is named by its reference and mode
    When he taps the first "Christ"
    Then the diagram reports word 7
    When he taps the second "Christ"
    Then the diagram goes on to report word 14

  Scenario: Colossians 3:1 in Greek
    Given the Greek diagram of Colossians 3:1 is drawn
    Then every Greek word of the verse is on the screen once
    And the understood "ὑμεῖς" is in parentheses and is not a button
    And the Greek diagram has 3 base lines and 8 slanted lines
    And the Greek diagram scrolls sideways and is named by its reference and mode
    When he taps the Greek "χριστῷ"
    Then the diagram reports word 4

  Scenario: The Greek words are tagged as Greek and the English words are not
    Given the Greek diagram of Colossians 3:1 is drawn
    Then the Greek words carry the Greek language and the understood word too
    When the English diagram of Colossians 3:1 is drawn again
    Then no English word carries the Greek language

  Scenario: The picture is as wide as its words make it
    Given the English diagram of Colossians 3:1 is drawn
    Then the picture is exactly as wide as the layout says and is not scaled
