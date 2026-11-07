Feature: Your Logos library, a screen of its own
  His Logos library has a screen (docs/design/library-at-scale.md 3.3 and 3.4, mw-rfjjzd.4): #/library draws a card, a search field and eight kind rows with counts from his shelf;
  #/library?kind=lexicon draws the kind's page, every book of the kind in a control of Off, On or Pin, pinned books first, then those on, then those off. A kind holds at most 3
  pins, a Bible shows the parts it is set for (read from Settings, never kept apart) and a Devotional cannot be pinned.

  Scenario: The home shows the card and the nine kinds with counts from the shelf
    Given his shelf holds the lexicons "BDAG, Louw-Nida, DBL Greek" On with "BDAG" pinned, the grammar "Kairos" On and Settings sets the Bible "LSB" for every part
    When he opens the Library
    Then the page "Your Logos library" is open
    And the card counts 4 books on out of all the books of the catalogue
    And the kinds listed are "Lexicons, Grammars, Greek texts, Hebrew texts, Interlinears, Commentaries, Bibles, Devotionals, Sermons"
    And the rows read
      | kind        | reads           |
      | Lexicons    | 3 on · 1 pinned |
      | Grammars    | 1 on            |
      | Greek texts | none on         |
      | Bibles      | NT LSB · OT LSB · Apocrypha NRSV |
      | Devotionals | none on         |
    When the shelf puts "DBL Greek" Off
    Then the row "Lexicons" reads "2 on · 1 pinned"

  Scenario: A kind page lists its books pinned first, then on, then off
    Given his shelf holds the lexicons "Louw-Nida, DBL Greek" On with "DBL Greek" pinned
    When he opens the Library at the kind "lexicon"
    Then the page "Lexicons" is open
    And the page says "2 on"
    And the Greek books are listed with "DBL Greek" first, then "Louw-Nida", then those that are off
    And "DBL Greek" is set to "Pin" and "Louw-Nida" is set to "On" and "BDAG" is set to "Off"
    When he sets "BDAG" to "On"
    Then "BDAG" is set to "On"
    And the count now reads "3 on"
    And the Greek books are still where they were, "DBL Greek" first, then "Louw-Nida"

  Scenario: All on turns a kind On and All off turns it Off
    Given his shelf holds the lexicons "BDAG" On with "BDAG" pinned
    When he opens the Library at the kind "lexicon"
    And he taps "All on"
    Then every lexicon is set to On or Pin
    And "BDAG" is set to "Pin"
    And the page says "29 on"
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
    Then the line "Three Greek lexicons pinned already: unpin one first" is shown
    And "EDNT" is set to "Off"
    When he then sets "DBL Greek" to "On"
    And he pins "EDNT" again
    Then "EDNT" now shows "Pin"
    And the line "Three Greek lexicons pinned already: unpin one first" is not shown

  Scenario: Bibles show the parts they are set for, read from Settings
    Given his shelf holds nothing
    And Settings sets the New Testament to "NKJV", the Old Testament to "LSB" and the Apocrypha to "NRSV"
    When he opens the Library at the kind "bible"
    Then the page "Bibles" is open
    And "NKJV" is marked "Set for NT"
    And the mark of "LSB" reads "Set for OT"
    And the line under "NRSV" says "Set for Apocrypha"
    And "ESV" has no mark
    And the page says "3 in use"
    And the page has no button "All on"
    And no book of the kind offers "Pin"
    When Settings sets the Old Testament to "ESV"
    Then "ESV" is now marked "Set for OT"
    And "LSB" now carries no mark

  Scenario: Choosing a Bible asks which part and sets only that part
    Given his shelf holds nothing
    And Settings sets the New Testament to "NKJV", the Old Testament to "LSB" and the Apocrypha to "NRSV"
    When he opens the Library at the kind "bible"
    And he taps Set for on "LES"
    Then the parts offered for "LES" are "Old Testament, Apocrypha, All three"
    When he sets "LES" for "Old Testament"
    Then Settings holds the New Testament "NKJV", the Old Testament "LES" and the Apocrypha "NRSV"
    And "LES" is marked "Set for OT"
    And "LSB" has no mark

  Scenario: Choosing All three sets every part the Bible holds and leaves the rest
    Given his shelf holds nothing
    And Settings sets the New Testament to "NKJV", the Old Testament to "LSB" and the Apocrypha to "NRSV"
    When he opens the Library at the kind "bible"
    And he taps Set for on "ESV"
    And he sets "ESV" for "All three"
    Then "ESV" is marked "Set for NT · OT"
    And "NKJV" has no mark
    And the mark of "NRSV" reads "Set for Apocrypha"

  Scenario: Devotionals shows no Pin
    Given his shelf holds nothing
    When he opens the Library at the kind "devotional"
    Then the page "Devotionals" is open
    And no book of the kind offers "Pin"
    And every book of the kind offers "Off" and "On"
