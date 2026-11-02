Feature: The Reader reads an Old Testament book in the Septuagint
  Settings > Old Testament in Greek (Septuagint) (under How much Greek?, off to start) opens a shipped Old Testament book in Swete's Greek instead of the Hebrew, with Brenton's English
  as the one chunk of each verse. The header names the edition under the title and, where the Septuagint numbers a chapter differently, both numberings ('Psalms 23 (Greek 22)'); a verse
  that is numbered differently says both ('1 (22:1)'). A book not yet in public/data-lxx stays Hebrew and says so. The weave needs a Greek word to lay over an English chunk, and the
  Septuagint's English is one chunk a verse, so the Weave is off there. The chapters are the fixtures in tests/fixtures/data-lxx (a shipped Genesis 1 and Greek Psalm 22; Isaiah is not shipped).

  @uc-septuagint @greek
  Scenario: With the setting off Genesis 1 is the Hebrew
    Given Lampas is opened on Genesis 1 with the Septuagint off
    Then the language switch offers "English" and "Hebrew"
    And no header subtitle is shown

  @uc-septuagint @greek
  Scenario: With the setting on Genesis 1 is the Greek with Brenton's English under verse 1
    Given Lampas is opened on Genesis 1 with the Septuagint on and the saved view "greek"
    Then the language switch offers "English" and "Greek"
    And verse 1 begins with the Greek "ΕΝ"
    And the English under verse 1 is "In the beginning God made the heaven and the earth."
    And the header subtitle reads "Septuagint (Swete) · Brenton (LXX2012)"
    And the title reads "Genesis 1"

  @uc-septuagint @greek
  Scenario: In the English view the verse is Brenton's English
    Given Lampas is opened on Genesis 1 with the Septuagint on and the saved view "english"
    Then verse 1 reads "In the beginning God made the heaven and the earth."

  @uc-septuagint @greek
  Scenario: Psalms 23 is Greek Psalm 22 and its first verse says both numbers
    Given Lampas is opened on Psalms 23 with the Septuagint on and the saved view "greek"
    Then the title reads "Psalms 23 (Greek 22)"
    And the number of the first verse reads "1 (22:1)"
    And the header subtitle reads "Septuagint (Swete) · Brenton (LXX2012)"

  @uc-septuagint @greek
  Scenario: A book whose Septuagint is not shipped stays Hebrew and says so
    Given Lampas is opened on Isaiah 1 with the Septuagint on and the saved view "greek"
    Then the language switch offers "English" and "Hebrew"
    And the note reads "The Septuagint of Isaiah is not ready yet; this is the Hebrew."
    And no header subtitle is shown

  @uc-septuagint @greek
  Scenario: The Weave is off on a Septuagint chapter and a hint says why once
    Given Lampas is opened on Genesis 1 with the Septuagint on and the Weave "solid"
    Then the language switch offers "English" and "Greek"
    And the tip reads "The Septuagint has one line of English a verse, so the Weave is off here"
