Feature: The Verse view of an Old Testament verse reads in the Hebrew
  A verse of an Old Testament chapter opened from the Reader's Hebrew view shows the Hebrew, as big as the Greek is, right to left, in the app's Hebrew face. Listen says it in the
  phone's Hebrew voice (the cantillation marks taken off), and says "No Hebrew voice on this phone" where there is none. From the English view the verse is English, as it was. The Verse view
  follows the Reader's view and weave for a Hebrew chapter as for a Greek one; at Hebrew 0 the Reader reads the English, so the verse is English. Read it aloud is offered on the English
  verse only (its Hebrew is scored in a later story). A Review card's verse shows in the Hebrew too, its Tap to hear says the Hebrew word, and Today's Read in Lampas opens an Old
  Testament plan chapter. Jonah 1 is the copy in tests/fixtures/data/jon/1.json. A Greek verse's Verse view is as it was (features/verse-view.feature).

  Scenario: Jonah 1:1 opened from the Hebrew view shows the Hebrew verse right to left
    Given Lampas is opened on Jonah 1 with the saved view "greek"
    When he taps the number of verse 1
    Then the Verse view is headed "Jonah 1:1"
    And the Verse view shows the Hebrew of Jonah 1:1 in the Hebrew face, right to left
    And the Verse view's words are Hebrew words

  Scenario: A section heading opens its passage in the Hebrew, each block right to left with the verse number first
    Given Lampas is opened on Jonah 1 with the saved view "greek"
    When he taps the section heading "The Great Storm"
    Then the Verse view shows the passage of verses 4 to 10 in Hebrew, each block right to left

  Scenario: Listen in the Verse view says the Hebrew in the Hebrew voice
    Given Lampas is opened on Jonah 1 with the saved view "greek" on a phone with an English, a Greek and a Hebrew voice
    When he taps the number of verse 1
    And he taps Play on the Verse view
    Then the phone speaks the Hebrew of Jonah 1:1 without its cantillation marks in "he-IL"

  Scenario: With no Hebrew voice Listen says so and nothing breaks
    Given Lampas is opened on Jonah 1 with the saved view "greek" on a phone with an English and a Greek voice
    When he taps the number of verse 1
    And he taps Play on the Verse view
    Then the Verse view says "No Hebrew voice on this phone"
    And the Verse view is still open

  Scenario: Jonah 1:1 opened from the English view shows the English
    Given Lampas is opened on Jonah 1 with the saved view "english"
    When he taps the number of verse 1
    Then the Verse view shows the English of Jonah 1:1, left to right

  Scenario: With the Weave on the Verse view's verse is woven as the Reader's
    Given Lampas is opened on Jonah 1 with the Weave on Solid words and the solid Hebrew words "דָּבָר" and "יוֹנָה"
    When he taps the number of verse 1
    Then the Verse view's verse reads as verse 1 does in the Reader
    And the Verse view's verse holds a Hebrew word

  Scenario: At Hebrew 0 the Verse view of an Old Testament verse is English
    Given Lampas is opened on Jonah 1 with the saved view "greek" and Hebrew at 0
    When he taps the number of verse 1
    Then the Verse view shows the English of Jonah 1:1, left to right

  Scenario: Read it aloud is offered on the English verse and on the Hebrew one
    Given Lampas is opened on Jonah 1 with the saved view "english" and a licence
    When he taps the number of verse 1
    Then the Verse view offers the actions "Listen", "Read it aloud", "Ask the tutor" and "Copy"
    When he closes the Verse view and chooses "Hebrew" in the language switch
    And he taps the number of verse 1
    Then the Verse view still offers the actions "Listen", "Read it aloud", "Ask the tutor" and "Copy"

  Scenario: The Hebrew view does not carry Listen in Audible
    Given Lampas is opened on Jonah 1 with the saved view "greek" and the Audible Bible on
    When he taps the number of verse 1
    Then the Verse view has no "Listen in Audible" link

  Scenario: A Greek verse's Verse view is as it was
    Given Lampas is opened on Romans 8 with the saved view "greek"
    When he taps the number of verse 28
    Then the Verse view shows Greek, left to right, in the Greek face

  Scenario: A Review card of Jonah 1:1 shows the Hebrew verse and its Tap to hear says the Hebrew
    Given a Review card for the Hebrew word "יוֹנָה" in Jonah 1:1 that he has answered, with the Hebrew view saved on a phone with a Hebrew voice
    When he taps the reference "Jonah 1:1"
    Then a card headed "Jonah 1:1" shows the Hebrew verse right to left with "יוֹנָה" marked
    When he closes the card and taps Tap to hear
    Then the phone speaks "יוֹנָה" in "he-IL"

  Scenario: Today's Read in Lampas opens the Old Testament chapter of the plan
    Given Lampas is opened with a reading plan started at Psalms 23
    When he opens Today from the Reader
    And he taps Read in Lampas on Today
    Then the Reader is showing "Psalms 23"
