Feature: Listen in Audible
  The first audio Bible a reader can turn on: Settings > Study resources > Audio Bible, Off to start, or The Word of Promise (NKJV), in
  Audible. With it on, the Verse view's Listen shows a "Listen in Audible" link that opens the book in the Audible app and a line that says
  which Audible chapter to pick ("Chapters > Luke 15"), with the credit under it. Free to read: no licence is needed for any of it.
  Audible takes no chapter or time from outside, so Lampas can only open the book and name the chapter.

  Scenario: Settings offers an Audio Bible, Off to start
    Given Lampas is opened with the Audio Bible Off
    When he opens Settings
    Then the Audio Bible shows the choices "Off" and "The Word of Promise (NKJV), in Audible"
    And "Off" is the one chosen

  Scenario: Choosing The Word of Promise in Settings keeps it
    Given Lampas is opened with the Audio Bible Off
    When he opens Settings
    And he chooses "The Word of Promise (NKJV), in Audible" for the Audio Bible
    Then the setting "audioBible" holds "word-of-promise"

  Scenario: With the Audio Bible Off the Verse view has no Listen in Audible
    Given Lampas is opened with the Audio Bible Off
    When he opens the Verse view of Luke 15:11
    Then there is no "Listen in Audible" link

  Scenario: With it on the Verse view of Luke 15:11 says which chapter to pick, with the credit, and needs no licence
    Given Lampas is opened with no licence and the Audio Bible on
    When he opens the Verse view of Luke 15:11
    Then the Verse view shows the link "Listen in Audible"
    And the line "In Audible: Chapters > Luke 15" is shown
    And the credit line "The Word of Promise, Thomas Nelson. Needs the book in your Audible library." is shown

  Scenario: The link is named for a screen reader and the credit is plain text under it
    Given Lampas is opened with the Audio Bible on
    When he opens the Verse view of Luke 15:11
    Then the link is named "Listen in Audible: The Word of Promise, Luke 15"
    And the credit line is plain text under the link, not part of it

  Scenario: Tapping Listen in Audible asks the phone to open the Audible app, with the book's page as the fallback
    Given Lampas is opened with the Audio Bible on
    When he opens the Verse view of Luke 15:11
    And he taps "Listen in Audible"
    Then the link's address is the Android intent for the Audible app searching "The Word of Promise Audio Bible", falling back to "https://www.audible.com/pd/B003UC45I8"

  Scenario: The book's page opens only when the phone stays on Lampas
    Given Lampas is opened with the Audio Bible on
    When he opens the Verse view of Luke 15:11
    And he taps "Listen in Audible"
    And the page stays in front for the wait
    Then the address "https://www.audible.com/pd/B003UC45I8" was opened

  Scenario: The book's page does not open when Audible took the tap
    Given Lampas is opened with the Audio Bible on
    When he opens the Verse view of Luke 15:11
    And he taps "Listen in Audible"
    And the page goes away
    And the page stays in front for the wait
    Then no address was opened
