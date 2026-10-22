Feature: Your Logos library, a screen of its own
  His Logos library has a screen (docs/design/library-at-scale.md 3.3 and 3.4, mw-rfjjzd.4): #/library draws a card, a search field and seven kind rows with counts from his shelf;
  #/library?kind=lexicon draws the kind's page, every book of the kind in a control of Off, On or Pin, pinned books first, then those on, then those off. A kind holds at most 3
  pins, Bibles hold one at a time and a Devotional cannot be pinned.

  Scenario: The home shows the card and the seven kinds with counts from the shelf
    Given his shelf holds the lexicons "BDAG, Louw-Nida, DBL Greek" On with "BDAG" pinned, the grammar "Kairos" On and the Bible "LSB" chosen
    When he opens the Library
    Then the page "Your Logos library" is open
    And the card counts 5 books on out of all the books of the catalogue
    And the kinds listed are "Lexicons, Grammars, Greek texts, Interlinears, Commentaries, Bibles, Devotionals"
    And the rows read
      | kind        | reads           |
      | Lexicons    | 3 on · 1 pinned |
      | Grammars    | 1 on            |
      | Greek texts | none on         |
      | Bibles      | 1 chosen: LSB   |
      | Devotionals | none on         |
    When the shelf puts "DBL Greek" Off
    Then the row "Lexicons" reads "2 on · 1 pinned"

  Scenario: A kind page lists its books pinned first, then on, then off
    Given his shelf holds the lexicons "Louw-Nida, DBL Greek" On with "DBL Greek" pinned
    When he opens the Library at the kind "lexicon"
    Then the page "Lexicons" is open
    And the page says "2 on"
    And the books are listed with "DBL Greek" first, then "Louw-Nida", then those that are off
    And "DBL Greek" is set to "Pin" and "Louw-Nida" is set to "On" and "BDAG" is set to "Off"
    When he sets "BDAG" to "On"
    Then "BDAG" is set to "On"
    And the count now reads "3 on"
    And the books are still where they were, "DBL Greek" first, then "Louw-Nida"

  Scenario: All on turns a kind On and All off turns it Off
    Given his shelf holds the lexicons "BDAG" On with "BDAG" pinned
    When he opens the Library at the kind "lexicon"
    And he taps "All on"
    Then every lexicon is set to On or Pin
    And "BDAG" is set to "Pin"
    And the page says "21 on"
    When he then taps "All off"
    Then every lexicon is set to "Off"
    And the count reads "none on"

  Scenario: Search finds by title and by author across kinds and opens the kind page at the book
    Given his shelf holds nothing
    When he opens the Library
    And he searches the Library for "Calvin"
    Then the results include the commentary "CC Jn" and the devotional "365 Days with Calvin"
    When he then searches for "Beeke"
    Then the results are only the devotional "365 Days with Calvin"
    When he searches again for "BDAG"
    Then the results are only the lexicon "BDAG"
    When he taps the result "365 Days with Calvin"
    Then the page "Devotionals" is open
    And the address names the book "365 Days with Calvin"
    And the book "365 Days with Calvin" is marked as the one he came for

  Scenario: A fourth pin is refused with its line
    Given his shelf holds the lexicons "BDAG, Louw-Nida, DBL Greek" On and pinned
    When he opens the Library at the kind "lexicon"
    And he sets "EDNT" to "Pin"
    Then the line "Three pinned already: unpin one first" is shown
    And "EDNT" is set to "Off"
    When he then sets "DBL Greek" to "On"
    And he pins "EDNT" again
    Then "EDNT" now shows "Pin"
    And the line "Three pinned already: unpin one first" is not shown

  Scenario: Bibles hold one
    Given his shelf holds the Bible "LSB" chosen
    When he opens the Library at the kind "bible"
    Then the page "Bibles" is open
    And "LSB" is set to "Chosen"
    And the page has no button "All on"
    And no book of the kind offers "Pin"
    When he sets "ESV" to "Chosen"
    Then "ESV" now shows "Chosen"
    And "LSB" is no longer chosen
    And the page says "1 chosen"

  Scenario: Devotionals shows no Pin
    Given his shelf holds nothing
    When he opens the Library at the kind "devotional"
    Then the page "Devotionals" is open
    And no book of the kind offers "Pin"
    And every book of the kind offers "Off" and "On"

  Scenario: A kind with no book in the catalogue says so
    Given his shelf holds nothing
    When he opens the Library at the kind "interlinear"
    Then the page "Interlinears" is open
    And the page says "No interlinears yet"
