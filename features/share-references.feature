Feature: Share to Lampas lists the Bible references in the shared words
  Words shared to Lampas (a page of a book, a message) are searched for Bible references: 'Gen. 1:28 ESV', 'Rom 8:28-30', '1 John 1:1', 'Ps 23'. The sheet
  'Share to Lampas' shows them under 'Bible references (N)', each as it was printed and each a link that opens the Reader on the verse (a range at its first
  verse). They are in the order of the page by default, a reference named twice at its first place with '×2'; a switch 'Page order' | 'Bible order' puts them
  in Bible order under each book, and his choice is kept for the next share. Words with none say 'No Bible references found'. The finder is
  tests/unit/refs-in-text.test.ts.

  Scenario: Shared words with two references list two links
    Given the Share screen is opened with a share of the words "Love (Rom 8:28 NIV) and see 1 John 1:1."
    Then the sheet shows "Bible references (2)" with the links "Rom 8:28" and "1 John 1:1"
    And the link "Rom 8:28" goes to "https://lampas.allmymind.org/#/?ref=Rom.8.28"
    And the link "1 John 1:1" also goes to "https://lampas.allmymind.org/#/?ref=1John.1.1"

  Scenario: A link opens the Reader on the verse
    Given the Share screen is opened with a share of the words "See Rom 8:28-30."
    When he taps the link "Rom 8:28-30"
    Then the Reader is open at Romans 8 verse 28

  Scenario: The references keep the order of the page, a repeat at its first place
    Given the Share screen is opened with a share of the words "Rom 8:28 ... Gen 1:28 ... Rom 8:28 ... Rom 1:16"
    Then the links are, in order, "Rom 8:28 ×2", "Gen 1:28" and "Rom 1:16"

  Scenario: Bible order groups them under each book, and the choice is kept
    Given the Share screen is opened with a share of the words "Rom 8:28 ... Gen 1:28 ... Rom 8:28 ... Rom 1:16"
    When he taps "Bible order"
    Then the links are, in order, "Gen 1:28", "Rom 1:16" and "Rom 8:28 ×2"
    And the books listed are "Genesis" then "Romans"
    When the Share screen is opened again with a share of the words "Rom 8:28 ... Gen 1:28"
    Then the links are, in order, "Gen 1:28" and "Rom 8:28"

  Scenario: Words with no reference say so
    Given the Share screen is opened with a share of the words "Mark my words, 3:16 was late"
    Then the sheet says "No Bible references found"
