Feature: Old Testament chapters open in Logos
  Lampas has no Old Testament text. The Reader's chapter picker also lists the 39 Old Testament books, in canon order before
  Matthew, each marked as opening in Logos. Picking one and then a chapter opens that chapter in the Bible he chose in Settings
  (Bible in Logos, the Legacy Standard Bible to start), by the Logos app's own link, and never changes the chapter Lampas has open.
  With Logos off in Settings the books still show; picking one says Logos is off and turns it on in one tap.

  Scenario: The picker lists the Old Testament before Matthew, each book marked as opening in Logos
    Given Lampas is opened on Romans 8 with Logos on
    When he taps the title
    Then the picker lists the 39 Old Testament books from "Genesis" to "Malachi" in order, before "Matthew"
    And every Old Testament book is marked as opening in Logos
    And no New Testament book is marked as opening in Logos

  Scenario: Genesis 1 opens in Logos in his default Bible and Lampas stays on Romans 8
    Given Lampas is opened on Romans 8 with Logos on
    When he taps the title
    And he chooses the book "Genesis"
    Then the picker lists chapters 1 to 50
    When he picks chapter 1
    Then Logos is asked for "logosres:lgcystndrdbblsb;ref=Bible.Ge1"
    And the reader is headed "Romans 8"
    And the address names no other book

  Scenario: The https address is the fallback only when the phone cannot open the app
    Given Lampas is opened on Romans 8 with Logos on
    When he taps the title
    And he chooses the book "Psalms"
    And he picks chapter 23
    And the page stays in front for the wait
    Then the address "https://ref.ly/logosres/lgcystndrdbblsb?ref=Bible.Ps23" was opened

  Scenario: The Bible he chose in Settings is the one that opens
    Given Lampas is opened on Romans 8 with Logos on and the Bible in Logos "LLS:NASB95"
    When he taps the title
    And he chooses the book "Malachi"
    And he picks chapter 4
    Then Logos is asked for "logosres:nasb95;ref=Bible.Mal4"

  Scenario: With Logos off the books still show, and picking one says so and turns Logos on in one tap
    Given Lampas is opened on Romans 8 with Logos off
    When he taps the title
    Then the picker lists the 39 Old Testament books from "Genesis" to "Malachi" in order, before "Matthew"
    When he chooses the book "Exodus"
    Then the picker says "Logos is off"
    And no chapter is offered
    When he taps "Turn on Logos"
    Then the setting "resource.logos" holds "on"
    And the picker lists chapters 1 to 40
    And the reader is headed "Romans 8"

  Scenario: Settings has Bible in Logos, the Legacy Standard Bible to start
    Given Lampas is opened on Romans 8 with Logos on
    When he taps the gear in the reader's header
    Then Bible in Logos shows "LSB (Legacy Standard Bible)"
    And the Resource ID field holds "LLS:LGCYSTNDRDBBLSB"

  Scenario: A Bible picked from the short list is kept across a close
    Given Lampas is opened on Romans 8 with Logos on
    When he taps the gear in the reader's header
    And he picks the Bible "ESV (English Standard Version)" for Logos
    And the app is closed and opened again at the Settings address
    Then Bible in Logos shows "ESV (English Standard Version)"

  Scenario: A typed Resource ID is kept across a close, and a malformed one is not
    Given Lampas is opened on Romans 8 with Logos on
    When he taps the gear in the reader's header
    And he types the Resource ID "esv"
    Then the Resource ID field says "That is not a Resource ID. It looks like LLS:LGCYSTNDRDBBLSB."
    And the setting "logosBible" holds nothing
    When he types the Resource ID "LLS:1.0.91"
    And the app is closed and opened again at the Settings address
    Then Bible in Logos shows "Another Bible (typed below)"
    And the Resource ID field holds "LLS:1.0.91"
