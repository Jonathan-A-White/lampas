Feature: A Bible reference in the tutor's answer opens a card first
  A reference the tutor writes ('Ps. 110', 'Heb 7:1-3', 'Romans 8:28') is a link. A tap opens a small card under it with the reference as its heading, the
  verse's text in the Majority Standard Bible and the translation's name, and Open, which opens the reader on that verse. A tap outside the card or Back closes
  it and nothing moves. A whole chapter shows its first verse. A book Lampas has no text for shows the card with 'Not in Lampas yet'; with Logos linked in Settings it
  has Open in Logos, in the Bible he chose there, and without it a link to Settings where Logos is linked. It has no Open for the reader.

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

  Scenario: A book Lampas has no text for says so and cannot be opened in the reader
    Given a tutor answer says "Compare Ps. 110 with Heb 7:1-3 and Romans 8:28 today."
    And no Bible app is linked
    When he taps the link "Ps. 110"
    Then a card headed "Psalm 110" says "Not in Lampas yet. Link Logos in Settings to open it there."
    And the card has no Open button

  Scenario: With Logos linked an Old Testament verse opens in his Bible in Logos
    Given a tutor answer says "Hear the end of it in Ecclesiastes 12:13."
    And Logos is linked and his Bible is the LSB
    When he taps the link "Ecclesiastes 12:13"
    Then a card headed "Ecclesiastes 12:13" says "Not in Lampas yet"
    And the card has an Open in Logos link to "logosres:lgcystndrdbblsb;ref=Bible.Ec12.13"
    And the card has no Open button

  Scenario: A whole Old Testament chapter opens in Logos at its first verse
    Given a tutor answer says "See Psalm 110 as well."
    And Logos is linked and his Bible is the LSB
    When he taps the link "Psalm 110"
    Then the card has an Open in Logos link to "logosres:lgcystndrdbblsb;ref=Bible.Ps110.1"

  Scenario: With no Bible app linked the card links to Settings
    Given a tutor answer says "Hear the end of it in Ecclesiastes 12:13."
    And no Bible app is linked
    When he taps the link "Ecclesiastes 12:13"
    And he taps "Link Logos in Settings" on the card
    Then the address is the Settings study resources
    And no card is showing

  Scenario: A New Testament passage still has no Open in Logos
    Given a tutor answer says "Compare Ps. 110 with Heb 7:1-3 and Romans 8:28 today."
    And Logos is linked and his Bible is the LSB
    When he taps the link "Romans 8:28"
    Then the card has an Open button
    And the card has no Open in Logos link
