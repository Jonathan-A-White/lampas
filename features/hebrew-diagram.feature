Feature: Lampas draws a Hebrew verse as a Reed-Kellogg diagram
  Diagram on an Old Testament verse (mw-5r3p30.887): the Verse view of Genesis 1:1 in the Hebrew view offers Diagram as a Greek verse does. The request the tutor is sent
  cuts each Hebrew word into its pieces, the article, a prefixed preposition and vav apart from the word they are written on; the answer is drawn with the Hebrew
  right to left, pointed, the gloss under each word. A tapped word opens the word sheet, and the lesson 'How to read this' works from a Hebrew diagram too.

  Scenario: Diagram draws Genesis 1:1 in Hebrew
    Given a licensed phone has the Verse view of Genesis 1:1 open in Hebrew, and the tutor answers at once
    When he taps Diagram
    Then the pane draws the Hebrew diagram of Genesis 1:1
    And the tutor was asked once, in Hebrew, for 11 pieces of the verse
    And the Hebrew words are set right to left with a gloss under each
    And the pane offers Redraw and "How to read this"

  Scenario: A tap on a piece of a Hebrew word opens that word's sheet
    Given a licensed phone has the Verse view of Genesis 1:1 open in Hebrew, and the tutor answers at once
    When he taps Diagram
    And he taps the piece "שָּׁמַ֖יִם" of the diagram
    Then the word sheet opens on the Hebrew word "הַשָּׁמַ֖יִם"

  Scenario: How to read this opens the lesson from a Hebrew diagram and Done comes back to it
    Given a licensed phone has the Verse view of Genesis 1:1 open in Hebrew, and the tutor answers at once
    When he taps Diagram
    And he taps "How to read this" in the pane
    Then the lesson "How to read a sentence diagram" is open
    When he goes through the lesson to Done
    Then he is back on the Hebrew diagram of Genesis 1:1
