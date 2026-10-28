Feature: A Bible reference in the tutor's answer opens a card first
  A reference the tutor writes ('Ps. 110', 'Heb 7:1-3', 'Romans 8:28') is a link. A tap opens a small card under it with the reference as its heading, the
  verse's text as the Reader draws it now (English in the Majority Standard Bible, the Weave, or Greek; tests/unit/reference-card-mode.test.tsx) and Open, which opens the reader on that verse's chapter with the verse brought to the top, never the Verse view. A tap outside the card or Back closes
  it and nothing moves. A whole chapter shows its first verse. Whether Lampas holds a passage is read from the data it has, not from the testament: an Old Testament
  reference (Daniel 2:28-29) opens in the Reader like a New Testament one, and with Logos linked in Settings its card also has Open in Logos, in the Bible he chose there, second to Open.
  A book Lampas holds no data for says 'Not in Lampas yet', with Open in Logos or a link to Settings where Logos is linked, and no Open
  (tests/unit/reference-card-unheld.test.tsx: every book the tutor can name is held today, so no feature reaches that card).

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

  Scenario: Open opens the reader on Hebrews 7 with verse 1 at the top, not the Verse view, and the card is gone
    Given a tutor answer says "Compare Ps. 110 with Heb 7:1-3 and Romans 8:28 today."
    When he taps the link "Heb 7:1-3"
    And he taps Open on the card
    Then the reader is opened on Hebrews 7 with verse 1 brought to the top
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

  Scenario: An Old Testament passage Lampas holds has Open, not "Not in Lampas yet"
    Given a tutor answer says "The mystery is told in Daniel 2:28-29 to the king."
    And no Bible app is linked
    When he taps the link "Daniel 2:28-29"
    Then a card headed "Daniel 2:28-29" shows the text "there is a God in heaven who reveals mysteries"
    And the card has an Open button
    And the card does not say "Not in Lampas yet"
    And the card has no Open in Logos link

  Scenario: Open on an Old Testament card opens the reader on Daniel 2 with verse 28 at the top
    Given a tutor answer says "The mystery is told in Daniel 2:28-29 to the king."
    When he taps the link "Daniel 2:28-29"
    And he taps Open on the card
    Then the reader is opened on Daniel 2 with verse 28 brought to the top
    And no card is showing

  Scenario: With Logos linked an Old Testament card has Open in Logos second to Open
    Given a tutor answer says "Hear the end of it in Ecclesiastes 12:13."
    And Logos is linked and his Bible is the LSB
    When he taps the link "Ecclesiastes 12:13"
    Then the card has an Open button
    And the card has an Open in Logos link to "logosres:lgcystndrdbblsb;ref=Bible.Ec12.13" after Open
    And the card does not say "Not in Lampas yet"

  Scenario: A whole Old Testament chapter opens in Logos at its first verse
    Given a tutor answer says "See Psalm 110 as well."
    And Logos is linked and his Bible is the LSB
    When he taps the link "Psalm 110"
    Then the card has an Open in Logos link to "logosres:lgcystndrdbblsb;ref=Bible.Ps110.1"

  Scenario: A New Testament passage still has no Open in Logos
    Given a tutor answer says "Compare Ps. 110 with Heb 7:1-3 and Romans 8:28 today."
    And Logos is linked and his Bible is the LSB
    When he taps the link "Romans 8:28"
    Then the card has an Open button
    And the card has no Open in Logos link
