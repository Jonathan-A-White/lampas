Feature: Import his Logos list, read on the phone
  He can bring his whole Logos library in one step (docs/design/library-at-scale.md 5, mw-rfjjzd.6): #/library?import takes the list Logos saved as a spreadsheet, reads and matches it on
  the phone, and shows counts and the reasons, not 4,795 rows. 'Turn on N books' writes the shelf (On, the pins, his Bible) and keeps the list, so a second import keeps what he set by
  hand and a new catalogue version matches it again ('N new since'). Nothing is sent.

  Scenario: The list is read and the counts and the reasons are shown
    Given his shelf holds nothing
    When he opens the import and chooses the file "tests/fixtures/logos-export-head.csv"
    Then the screen says "60 books read from your Logos list."
    And the screen shows "22 open from Lampas"
    And the kinds line reads "22 devotionals"
    And the screen counts "38 Lampas cannot use yet"
    And the button reads "Turn on 22 books"
    When he taps "What they are"
    Then the reasons page lists "Interactive and pronunciation tools (22): Lampas has its own."
    And the reasons page lists "Datasets, media and cross-references (16): they open only inside Logos."

  Scenario: A file that is not a Logos list is refused with one plain line
    Given his shelf holds nothing
    When he opens the import and chooses a file that is not a Logos list
    Then the screen says "This is not a Logos list: its first line has no ResourceId column."
    And the shelf is still empty

  Scenario: Turn on writes the shelf with the pins and his Bible and keeps the list
    Given his shelf holds nothing
    When he opens the import and chooses a list of "BDAG, Louw-Nida, DBL Greek, Black, LSB, ESV, CC Jn" and a book Lampas cannot use
    Then the screen says "7 open from Lampas"
    And the screen shows "BDAG, Louw-Nida and Black are pinned"
    And the kinds line reads "3 lexicons · 1 grammar · 1 commentary · 2 Bibles (LSB chosen)"
    And the button reads "Turn on 6 books"
    When he taps the button "Turn on 6 books"
    Then the page "Your Logos library" is open
    And the shelf holds "BDAG, Louw-Nida, Black" Pinned and "DBL Greek, CC Jn, LSB" On and nothing else
    And the Bible in Logos is "LSB"
    And the kept list has 8 books, 7 of them matched
    And the card says it was imported from a list of 8 books
    And nothing was sent

  Scenario: A state he set by hand survives a second import
    Given he has imported the list "BDAG, Louw-Nida, DBL Greek, Black, LSB, ESV, CC Jn"
    When he sets "DBL Greek" to Off and "BDAG" to On
    And he opens the import and chooses a list of "BDAG, Louw-Nida, DBL Greek, Black, LSB, ESV, CC Jn, Kairos" and a book Lampas cannot use
    Then the screen says "7 books are already on your shelf or set by you, and stay as you have them."
    And the button reads "Turn on 1 book"
    When he taps the button "Turn on 1 book"
    Then the shelf holds "Louw-Nida, Black" Pinned and "BDAG, CC Jn, LSB, Kairos" On and nothing else
    And the kept list has 9 books, 8 of them matched

  Scenario: The list is matched again after the catalogue changes
    Given he imported a list under an older catalogue that did not list "DBL Greek" or "Kairos"
    When he opens the Library
    Then the card says "2 new since"
    And the shelf holds "DBL Greek, Kairos" On and nothing else
    When he opens the Library again
    Then the card still says "2 new since"
