@uc-diagram @greek
Feature: Lampas draws a verse as a Reed-Kellogg diagram
  The renderer of the sentence diagram (mw-souyao.1): a diagram the tutor has worked out is drawn as the classic school diagram, a base line
  carrying the subject, the verb and what completes it, modifiers on slanted lines beneath, a subordinate clause on a base line below joined
  by a dotted line. It is wide, so it scrolls sideways in its own box and never shrinks its type. Every word is a button that reports which
  word was tapped; a word the sentence only understands is in parentheses and is no button. The renderer is proven here on the hand-written
  diagrams of Colossians 3:1 in English and in Greek (tests/fixtures/diagrams). The Verse view of a licensed phone offers it as the Diagram action
  (mw-souyao.3): the pane asks the tutor for the verse's diagram in the Reader's mode, says it is working while the tutor thinks, draws it, opens a tapped
  word's word sheet, offers Redraw and, when the tutor could not, says so and offers Try again.

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

  Scenario: Diagram draws the verse once the tutor has worked it out
    Given a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor is slow to answer
    When he taps Diagram
    Then the pane says "Working it out…"
    When the tutor answers with the English diagram
    Then the pane draws the English diagram of Colossians 3:1 with Redraw and the line "Drawn by the tutor; Redraw if a word sits wrong"
    And the tutor was asked once

  Scenario: A tap on a word of the diagram opens its word sheet and Back returns to the diagram
    Given a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers at once
    When he taps Diagram
    And he taps the first "Christ" of the diagram
    Then the word sheet opens with the Greek "χριστῷ"
    When he goes Back
    Then the word sheet is closed and the English diagram is still drawn

  Scenario: A diagram the tutor could not make shows why and offers Try again
    Given a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers a tree that leaves words out
    When he taps Diagram
    Then the pane says "The tutor could not diagram this verse" and offers Try again
    And no diagram is drawn
    And nothing is kept for Colossians 3:1

  Scenario: A kept diagram opens with no ask
    Given a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers at once
    When he taps Diagram
    Then the pane draws the English diagram of Colossians 3:1 with Redraw and the line "Drawn by the tutor; Redraw if a word sits wrong"
    When he leaves the Verse view and opens it again on Diagram
    Then the pane shows the kept diagram with the line "Drawn by the tutor; Redraw if a word sits wrong" and never says "Working it out…"
    And the tutor was asked once

  Scenario: Redraw asks the tutor again and Greek is drawn for the Greek
    Given a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers at once
    When he taps Diagram
    And he taps Redraw
    Then the tutor was asked 2 times
    When he switches the Reader to Greek
    Then the pane draws the Greek diagram of Colossians 3:1

  Scenario: With the Weave on, a word it shows in Greek is drawn in Greek and opens its word sheet
    Given a licensed phone has the Verse view of Colossians 3:1 open in English with the Weave on for his solid words, and the tutor answers at once
    When he taps Diagram
    Then the diagram draws the Greek "χριστῷ" and "χριστός" in Greek and not the English "Christ"
    And the English "strive" of the diagram is drawn in English
    When he taps the Greek "χριστῷ" of the diagram
    Then the word sheet opens with the Greek "χριστῷ"
    And the tutor was asked once

  Scenario: With the Weave off the diagram is all English as before
    Given a licensed phone has the Verse view of Colossians 3:1 open in English with the Weave off and his words kept, and the tutor answers at once
    When he taps Diagram
    Then every word of the diagram is English

  Scenario: Switching the Weave redraws the diagram from the same tree
    Given a licensed phone has the Verse view of Colossians 3:1 open in English with the Weave on for his solid words, and the tutor answers at once
    When he taps Diagram
    And the diagram draws the Greek "χριστῷ"
    When he switches the Weave off
    Then the diagram draws the English "Christ" twice and no Greek
    When he switches the Weave on again
    Then the diagram draws the Greek "χριστῷ" again
    And the tutor was asked once

  Scenario: In the Greek view the Greek tree is drawn whatever the Weave
    Given a licensed phone has the Verse view of Colossians 3:1 open in English with the Weave on for his solid words, and the tutor answers at once
    When he taps Diagram
    And he switches the Reader to Greek
    Then the pane draws the Greek diagram of Colossians 3:1

  Scenario: How to read this opens the lesson and Done comes back to the same diagram
    Given a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers at once
    When he taps Diagram
    Then the pane draws the English diagram of Colossians 3:1 with Redraw and the line "Drawn by the tutor; Redraw if a word sits wrong"
    And the pane offers "How to read this"
    When he taps "How to read this"
    Then the lesson "How to read a sentence diagram" is open
    When he goes through the lesson to Done
    Then the Verse view of Colossians 3:1 is open again on its drawn English diagram with "How to read this"
    And the tutor was asked once

  Scenario: A first diagram invites him to the lesson, and Not now hides the invitation for good
    Given a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers at once
    When he taps Diagram
    Then the pane draws the English diagram of Colossians 3:1 with Redraw and the line "Drawn by the tutor; Redraw if a word sits wrong"
    And the pane invites him with "New to diagrams? Learn to read one, about 3 minutes" and Learn and Not now
    When he taps "Not now"
    Then the pane no longer invites him and still offers "How to read this"
    When he leaves the Verse view and opens it again on Diagram
    Then the pane still has no invitation and offers "How to read this"
    And the tutor was asked once

  Scenario: Learn opens the lesson and a finished lesson hides the invitation
    Given a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers at once
    When he taps Diagram
    Then the pane invites him with "New to diagrams? Learn to read one, about 3 minutes" and Learn and Not now
    When he taps "Learn"
    Then the lesson "How to read a sentence diagram" is open
    When he goes through the lesson to Done
    Then the Verse view of Colossians 3:1 is open again on its drawn English diagram with "How to read this"
    And the pane no longer invites him and still offers "How to read this"

  Scenario: The invitation and the link wait for a drawn diagram
    Given a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor is slow to answer
    When he taps Diagram
    Then the pane says "Working it out…"
    And the pane has neither the invitation nor "How to read this"
    When the tutor answers with the English diagram
    Then the pane invites him with "New to diagrams? Learn to read one, about 3 minutes" and Learn and Not now

  Scenario: A diagram the tutor could not make has neither the invitation nor the link
    Given a licensed phone has the Verse view of Colossians 3:1 open in English, and the tutor answers a tree that leaves words out
    When he taps Diagram
    Then the pane says "The tutor could not diagram this verse" and offers Try again
    And the pane has neither the invitation nor "How to read this"
