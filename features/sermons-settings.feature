Feature: Sermons in Settings: the one list of sermon sources (mw-qtu3zvz.92, docs/design/sermon-sources.md; first mw-qtu3zvz.3)
  Settings > Study resources > Sermons holds one row, "Sermon sources", with how many are on, and under it "Open web sermons in". The row opens a page in the look of the Library's pages: a search field,
  All on and All off, a count, and one row for each source with Off and On: the passage lists and the Logos sermon books his import holds, a list standing for the books it is made from. A Logos source is
  listed only while Logos is On. A switch is kept at once, and a source switched Off gives the Sermons door no rows. These scenarios register four sources of the tests' own (tests/support/sermon-sources.ts):
  "Test Sermons" and "Test Second Sermons", which start On, "Test Logos Archive", which rides on Logos, and "Test Laurie's sermons (Logos archive)", a list made from Greg Laurie's Logos archive, which starts Off.

  Scenario: The Sermons section holds one row for every source, with its count
    Given Settings is open at Study resources with Logos Off
    Then the Sermons section holds the rows "Sermon sources" and "Open web sermons in"
    And the row "Sermon sources" reads "2 of 2 on"
    And the Sermons section has no switch for "Test Sermons"

  Scenario: The row opens the page of sermon sources, each Off or On and none with a Pin
    Given Settings is open at Study resources with Logos Off
    When he opens the row "Sermon sources"
    Then the page of sermon sources is open with "2 on" in its header
    And the list shows "Test Sermons" as "On"
    And "Test Second Sermons" is in the list too, "On"
    And no source has a Pin
    And two sources have no search field
    And the back button "‹ Study resources" returns to the Sermons section

  Scenario: Turning a source Off is kept and counted at once
    Given the page of sermon sources is open with Logos Off
    When he turns "Test Second Sermons" to "Off"
    Then the list shows "Test Second Sermons" as "Off"
    And the setting "sermons.testsecond" is kept as "off"
    And the status line reads "1 of 2 on"
    And the header count reads "1 on"

  Scenario: A Logos source is not listed while Logos is Off
    Given the page of sermon sources is open with Logos Off
    Then the list has no source "Test Logos Archive"
    And the list has no group heading
    And no card speaks of Logos

  Scenario: With Logos On and no import a card says how to import
    Given the page of sermon sources is open with Logos On
    Then the list shows "Test Logos Archive" as "On"
    And the list has no source "Test Laurie's sermons"
    And a card reads "Sermon books in Logos? Import your Logos list, and the ones Lampas can open join this list."
    And the card's button "Import" opens the Library's Import

  Scenario: His sermon books are in the same list, a list standing for the book it is made from
    Given the page of sermon sources is open with Logos On and an import of ten sermon books and Greg Laurie's archive
    Then the search field reads "Search 14 sermon sources"
    And the status line reads "3 of 14 on"
    And the group "Listed by passage" reads "3 of 4 on" and holds "Test Laurie's sermons"
    And the second group "Logos books, at the verse" reads "none of 10 on"
    And the list has no source "Greg Laurie Sermon Archive"
    And a sermon book his import lacks is not listed
    And no source has a Pin

  Scenario: A sermon book switched On is kept on his shelf
    Given the page of sermon sources is open with Logos On and an import of ten sermon books and Greg Laurie's archive
    When he turns the first sermon book to "On"
    Then that sermon book is "on" on his shelf
    And the header count reads "4 on"
    And the second group "Logos books, at the verse" reads "1 of 10 on"

  Scenario: With a search typed the two buttons act on what is shown, and Undo puts it back
    Given the page of sermon sources is open with Logos On and an import of ten sermon books and Greg Laurie's archive
    When he types "test s" in the search
    Then the status line reads "3 of 14 on · 2 shown"
    And the two buttons read "These 2 on" and "These 2 off"
    When he taps the button "These 2 off"
    Then the count under the search becomes "1 of 14 on · 2 shown"
    And the line "Turned off 2." stands with an Undo
    And the source "sermons.testlogos", which the search does not show, is not written
    When he chooses "Undo"
    Then the count is back at "3 of 14 on · 2 shown"
    And the setting "sermons.testsecond" is kept as "on"

  Scenario: All off says no verse has a Sermons door, and Undo brings the sources back
    Given the page of sermon sources is open with Logos Off
    When he taps the button "All off"
    Then the status line reads "none of 2 on"
    And the header count reads "none on"
    And the line "Turned off 2." stands with an Undo
    And the line "No source is on, so no verse has a Sermons door." is shown
    When he chooses "Undo"
    Then the count is back at "2 of 2 on"

  Scenario: All on turns every source on, the books on his shelf too
    Given the page of sermon sources is open with Logos On and an import of ten sermon books and Greg Laurie's archive
    When he taps the button "All on"
    Then the status line reads "14 of 14 on"
    And the line "Turned on 11." stands with an Undo
    And ten sermon books are on his shelf

  Scenario: A search with no match offers Ask for a preacher
    Given the page of sermon sources is open with Logos On and an import of ten sermon books and Greg Laurie's archive
    When he types "qqqqzzzz" in the search
    Then the line "No sermon source matches" is shown
    And "Ask for a preacher" is offered under it

  Scenario: A book with more than sermons is in the list and in the Library, with one switch
    Given the page of sermon sources is open with Logos On and Augustine's Homilies on John pinned in his Library
    Then the list shows "Homilies on the Gospel according to St. John, and His First Epistle, Vols. 1 & 2: Hom. 1–124, S. John 1–21 and Hom. 1–10, 1 S. John" as "On"
    And that row says "Also in your Library: Commentaries"
    When he turns "Homilies on the Gospel according to St. John, and His First Epistle, Vols. 1 & 2: Hom. 1–124, S. John 1–21 and Hom. 1–10, 1 S. John" to "Off"
    Then the book "LLS:SLSRHMTRTSTGSTN" is off his shelf, so it is Off in the Library too

  Scenario: Logos turned Off after sources were on
    Given the page of sermon sources is open with Logos Off and an import of ten sermon books, one of them On
    Then the list has no group heading
    And the foot line reads "10 sources in your Logos library are not offered while Logos is off in Study resources. Your switches stay as they are."

  Scenario: The old Library > Sermons address opens the one list
    Given Lampas is opened at "#/library?kind=sermons" with Logos On
    Then the page of sermon sources is open with "3 on" in its header
    And the address is "#/settings?sources=sermons"

  Scenario: A link to a source's setting opens the list at its row
    Given Lampas is opened at "#/settings?setting=sermons.testsecond" with Logos Off
    Then the page of sermon sources is open with "2 on" in its header
    And the row of "Test Second Sermons" is marked
    And that row is the row of the setting "sermons.testsecond", highlighted as a setting's row is

  Scenario: A link to a Logos list his import lacks says why it is not listed
    Given Lampas is opened at "#/settings?setting=sermons.testlaurie" with Logos On
    Then the page of sermon sources is open with "3 on" in its header
    And the list has no source "Test Laurie's sermons"
    And a note reads "“Test Laurie's sermons” is listed only while Logos is on and your Library import says you own it in Logos. Import your Logos library first."

  Scenario: The Library has no Sermons row
    Given Lampas is opened at "#/library" with Logos On
    Then the Library lists "Lexicons, Grammars, Greek texts, Hebrew texts, Interlinears, Commentaries, Bibles, Devotionals"

  Scenario: The Sermons door's count falls when a source goes Off
    Given Lampas is opened on "Romans 5"
    When he taps verse 8
    Then the Verse view has a button "Sermons · 5"
    When "Test Second Sermons" is turned Off in Settings
    Then the door now reads "Sermons · 4"
    When he also turns "Test Sermons" Off in Settings
    Then the Verse view has no Sermons door
