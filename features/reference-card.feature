Feature: A Bible reference in the tutor's answer opens a card first
  A reference the tutor writes ('Ps. 110', 'Heb 7:1-3', 'Romans 8:28') is a link. A tap opens a small card under it with the reference as its heading, the
  verse's text in the Majority Standard Bible and the translation's name, and Open, which opens the reader on that verse. A tap outside the card or Back closes
  it and nothing moves. A whole chapter shows its first verse. A book Lampas has no text for shows the card with 'Not in Lampas yet' and no Open.

  Scenario: Each reference in an answer is a link and the words around them are unchanged
    Given a tutor answer says "Compare Ps. 110 with Heb 7:1-3 and Romans 8:28 today."
    Then the answer's links are "Ps. 110", "Heb 7:1-3" and "Romans 8:28"
    And the answer reads "Compare Ps. 110 with Heb 7:1-3 and Romans 8:28 today."

  Scenario: A tap on Heb 7:1-3 opens a card with the passage, its translation and Open, and the address has not moved
    Given a tutor answer says "Compare Ps. 110 with Heb 7:1-3 and Romans 8:28 today."
    When he taps the link "Heb 7:1-3"
    Then a card headed "Hebrews 7:1-3" shows the text "This Melchizedek was king of Salem"
    And the card names the translation "Majority Standard Bible"
    And the card has an Open button
    And the address is still where it was

  Scenario: Open opens the reader on Hebrews 7:1 and the card is gone
    Given a tutor answer says "Compare Ps. 110 with Heb 7:1-3 and Romans 8:28 today."
    When he taps the link "Heb 7:1-3"
    And he taps Open on the card
    Then the reader is opened on Hebrews 7 verse 1
    And no card is showing

  Scenario: A tap outside the card closes it and nothing moves
    Given a tutor answer says "Compare Ps. 110 with Heb 7:1-3 and Romans 8:28 today."
    When he taps the link "Romans 8:28"
    And he taps outside the card
    Then no card is showing
    And the address is still where it was

  Scenario: Back closes the card and nothing moves
    Given a tutor answer says "Compare Ps. 110 with Heb 7:1-3 and Romans 8:28 today."
    When he taps the link "Romans 8:28"
    And he goes back
    Then no card is showing
    And the address is still where it was

  Scenario: A whole chapter shows its first verse
    Given a tutor answer says "See Hebrews 7 for the whole story."
    When he taps the link "Hebrews 7"
    Then a card headed "Hebrews 7:1" shows the text "This Melchizedek was king of Salem"

  Scenario: A book Lampas has no text for says so and cannot be opened
    Given a tutor answer says "Compare Ps. 110 with Heb 7:1-3 and Romans 8:28 today."
    When he taps the link "Ps. 110"
    Then a card headed "Psalm 110" says "Not in Lampas yet"
    And the card has no Open button
