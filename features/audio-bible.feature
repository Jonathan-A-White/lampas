Feature: Listen in Audible
  The first audio Bible a reader can turn on: Settings > Study resources > Audio Bible, Off to start, or The Word of Promise (NKJV), in
  Audible. With it on, the Verse view's Listen shows a "Listen in Audible" link that opens the Audible app and plays from the start of the chapter
  (Audible's own smart link with position_from_start, from the chapter start times in src/resources/audibleStarts.json, built once from Audible's
  public catalogue by npm run audible:build), a line that names the Audible chapter ("Chapters > Luke 15"), and the credit under it. Free to read:
  no licence is needed for any of it. A verse is not a place Audible can be sent to (only the chapter is timed).

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

  Scenario: Tapping Listen in Audible opens Audible's own link at the start of the chapter
    Given Lampas is opened with the Audio Bible on
    When he opens the Verse view of Luke 15:11
    And he taps "Listen in Audible"
    Then the link's address is Audible's smart link for "B003UC45I8" at 300423039 ms, stamped with the time of the tap

  Scenario: Each tap stamps the link with its own time
    Given Lampas is opened with the Audio Bible on
    When he opens the Verse view of Luke 15:11
    And he taps "Listen in Audible"
    And a second goes by
    And he taps "Listen in Audible" again
    Then the second tap's time is later than the first's

  Scenario: Audible's own link needs no fallback page from Lampas
    Given Lampas is opened with the Audio Bible on
    When he opens the Verse view of Luke 15:11
    And he taps "Listen in Audible"
    And the page stays in front for the wait
    Then no address was opened
