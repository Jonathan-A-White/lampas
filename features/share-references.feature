Feature: Share to Lampas lists the Bible references in the shared words
  Words shared to Lampas (a page of a book, a message) are searched for Bible references: 'Gen. 1:28 ESV', 'Rom 8:28-30', '1 John 1:1', 'Ps 23'. The sheet
  'Share to Lampas' shows them under 'Bible references (N)', each as it was printed and each a link that opens the verse's card over the list (the verses in the view he reads in, English, Weave or Greek; the Old Testament's card says 'Not in Lampas yet')
  and the card's Open goes to the Reader, the chapter with the verse at the top (a range at its first verse), never the Verse view. They are in the order of the page by default, a reference named twice at its first place with '×2'; a switch 'Page order' | 'Bible order' puts them
  in Bible order under each book, and his choice is kept for the next share. Words with none say 'No Bible references found'. The finder is
  tests/unit/refs-in-text.test.ts.
  A shared picture (a screenshot of a book's page) is read by the mill's find-refs grind (mw-s1dc0n.2): the sheet says 'Finding Bible references...' while
  the grist runs, then lists what it found in the same section. Each reference the grist answers is checked on the phone and one that is no book of the Bible
  is dropped (tests/unit/find-refs.test.ts). A grist that fails says so in one line, with 'Try again'.

  Scenario: Shared words with two references list two links
    Given the Share screen is opened with a share of the words "Love (Rom 8:28 NIV) and see 1 John 1:1."
    Then the sheet shows "Bible references (2)" with the links "Rom 8:28" and "1 John 1:1"
    And the link "Rom 8:28" goes to "https://lampas.allmymind.org/#/?ref=Rom.8.28"
    And the link "1 John 1:1" also goes to "https://lampas.allmymind.org/#/?ref=1John.1.1"

  Scenario: A link opens the verse's card over the list, and Open brings the verse to the top of its chapter in the Reader
    Given the Share screen is opened with a share of the words "See Rom 8:28-30."
    When he taps the link "Rom 8:28-30"
    Then a card headed "Romans 8:28-30" shows the text "all things work together"
    And the sheet shows the link "Rom 8:28-30"
    When he taps Open on the card
    Then the Reader is open at Romans 8 with verse 28 brought to the top
    And no verse is selected

  Scenario: An Old Testament reference opens the not-in-Lampas card, not another chapter
    Given the Share screen is opened with a share of the words "God said (Gen. 1:28 ESV) be fruitful."
    When he taps the link "Gen. 1:28"
    Then a card headed "Genesis 1:28" says "Not in Lampas yet"
    And the Reader is not opened
    When he closes the card
    Then the sheet shows the link "Gen. 1:28" again

  Scenario: With Logos on, the card for an Old Testament reference offers Open in Logos
    Given the Share screen is opened with a share of the words "God said (Gen. 1:28 ESV) be fruitful."
    And Logos is linked and his Bible is the LSB
    When he taps the link "Gen. 1:28"
    Then a card headed "Genesis 1:28" says "Not in Lampas yet"
    And the card has an Open in Logos link

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

  Scenario: A shared picture is read for its references, and a book that is not a book is dropped
    Given the Share screen is opened with a shared picture
    Then the sheet says "Finding Bible references..."
    When the mill answers with the references "Gen. 1:28" at "Gen.1.28" and "Hezekiah 3:1" at "Hez.3.1"
    Then the sheet shows "Bible references (1)" with the link "Gen. 1:28"
    And the link "Gen. 1:28" goes to "https://lampas.allmymind.org/#/?ref=Gen.1.28"
    And the picture went to the find-refs grind alone, with its language

  Scenario: A grist that fails says so, and Try again reads the picture again
    Given the Share screen is opened with a shared picture, and the mill fails the grist
    Then the sheet says "Could not find Bible references in the picture."
    When the mill will answer with the references "Rom 8:28-30" at "Rom.8.28"
    And he taps "Try again"
    Then the sheet shows "Bible references (1)" with the link "Rom 8:28-30"

  Scenario: While a picture is read, the references in its words are already listed
    Given the Share screen is opened with a shared picture and the words "Gen. 1:28 ESV", read slowly
    Then the sheet says "Finding Bible references..."
    And the sheet shows the link "Gen. 1:28"
    When the mill answers with the references "Rom. 8:28" at "Rom.8.28"
    Then the sheet shows "Bible references (2)" with the links "Gen. 1:28" and "Rom. 8:28"

  Scenario: A picture that fails keeps the references in the words it came with
    Given the Share screen is opened with a shared picture and the words "Gen. 1:28 ESV", and the mill fails the grist
    Then the sheet says "Could not find Bible references in the picture."
    And the sheet shows the link "Gen. 1:28"
    When the mill will answer with the references "Rom. 8:28" at "Rom.8.28"
    And he taps "Try again"
    Then the sheet shows "Bible references (2)" with the links "Gen. 1:28" and "Rom. 8:28"

  Scenario: Going back to a share after an opened reference sends no second grist
    Given the Share screen is opened with a shared picture, read at once with the reference "Rom. 8:28" at "Rom.8.28"
    When he taps the link "Rom. 8:28"
    And he taps Open on the card
    Then the Reader is open at Romans 8 with verse 28 brought to the top
    When he goes Back
    Then the sheet "Share to Lampas" is there
    And only one grist went to the mill

  Scenario: Offline, the line says the phone is offline and offers Try again
    Given the Share screen is opened with a shared picture, and the phone is offline
    Then the sheet says "You are offline. Check your connection and try again."
    And the sheet offers "Try again"
    When the phone is online again and the mill will answer with the references "Gen. 1:28" at "Gen.1.28"
    And he taps "Try again"
    Then the sheet shows "Bible references (1)" with the link "Gen. 1:28"

  Scenario: Going back from the card of an Old Testament reference sends no second grist
    Given the Share screen is opened with a shared picture, read at once with the reference "Gen. 1:28" at "Gen.1.28"
    When he taps the link "Gen. 1:28"
    Then a card headed "Genesis 1:28" says "Not in Lampas yet"
    When he goes Back
    Then the sheet "Genesis 1:28" is not there
    And the sheet shows the link "Gen. 1:28" again
    And only one grist went to the mill

  Scenario: Let the tutor do it saves the references as a list: the tutor fills where and the name, and its Send saves
    Given the Share screen is opened with a share of the words "Safe places: Rom 8:28 and John 3:16."
    When he taps "Save as a list"
    And he lets the tutor do it above the form
    Then the tutor asks one question: "Where should these go: a new list, or one you have?"
    When he answers "A new list" and the tutor fills where with "New list"
    Then the field "Save to" holds "New list" and is ringed
    And the tutor asks one question: "What should the list be called?"
    When he answers "Refuge" and the tutor fills name with "Refuge"
    Then the field "List name" holds "Refuge"
    And the panel shows "Save 2 references as a new list, Refuge?" with a Send button
    And no list is kept yet
    When he taps Send in the panel
    Then the sheet shows "Saved 2 references to Refuge" with Open
    And one list "Refuge" holds "Rom.8.28" then "John.3.16"
