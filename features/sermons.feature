Feature: Sermons on the screen (mw-qtu3zvz.2, docs/sermons.md)
  A quiet door "Sermons · N" opens the sermons preached on the place he reads, on the Verse view only (a verse, a passage opened from a section heading, or the whole chapter opened from the place line),
  after the Maps door, in the English view and in the source's own. It is never in the verse text and is drawn only while the place has sermons. The sheet is headed "Sermons for Romans 5:8" and groups the rows
  "On this verse" and "In this chapter"; each row is a plain link that opens the sermon where it lives, and nothing is fetched until one is tapped. These scenarios use sermon sources of the tests' own
  (tests/support/test-sermons.ts): no data file is read and no page is fetched. Romans 5 and Jonah 1 are the committed chapters.

  @uc-sermons @greek
  Scenario: A verse with sermons has the door on the Verse view
    Given Lampas is opened on "Romans 5"
    When he taps verse 8
    Then the Verse view has a button "Sermons · 4"
    And no verse of the text holds a Sermons door

  @uc-sermons @greek
  Scenario: The door is there in the source view too
    Given Lampas is opened on "Romans 5" with the saved view "greek"
    When he taps verse 8
    Then the Verse view has a button "Sermons · 4"

  @uc-sermons @hebrew
  Scenario: An Old Testament verse read in the Hebrew has the door
    Given Lampas is opened on "Jonah 1" with the saved view "greek"
    When he taps verse 1
    Then the Verse view has a button "Sermons · 2"
    When he taps "Sermons · 2"
    Then the sheet is headed "Sermons for Jonah 1:1"
    And the part "On this verse" holds "Running from God"
    And after it the part "In this chapter" holds "The Storm at Sea"

  @uc-sermons @greek
  Scenario: The door comes after the Maps door
    Given Lampas is opened on "Romans 5" with the Maps door
    When he taps verse 8
    Then the tools line reads "Maps · 1" and then "Sermons · 4"

  @uc-sermons @greek
  Scenario: A chapter whose sermons are none has no door
    Given Lampas is opened on "Romans 8"
    When he taps verse 1
    Then the Verse view has no Sermons door

  @uc-sermons @greek
  Scenario: Sources that answer nothing leave no door
    Given Lampas is opened on "Romans 5" with sources that have no sermons
    When he taps verse 8
    Then the Verse view has no Sermons door

  @uc-sermons @greek
  Scenario: Sources that are all Off leave no door
    Given Lampas is opened on "Romans 5" with every source Off
    When he taps verse 8
    Then the Verse view has no Sermons door

  @uc-sermons @greek
  Scenario: The sheet groups the sermons on the verse and in the chapter
    Given Lampas is opened on "Romans 5"
    When he taps verse 8
    And he taps "Sermons · 4"
    Then the sheet is headed "Sermons for Romans 5:8"
    And the sheet opens with "On this verse" and then "In this chapter"
    And the part "On this verse" holds "Love Commended" and "Peace with God"
    And after it the part "In this chapter" holds "Reigning in Life" and "Death in Adam, Life in Christ"

  @uc-sermons @greek
  Scenario: A row gives the preacher, the date and where the sermon opens
    Given Lampas is opened on "Romans 5"
    When he taps verse 8
    And he taps "Sermons · 4"
    Then the row "Love Commended" reads "Test Preacher · 14 Mar 1880 · Opens on the web"
    And the row "Love Commended" is a link to "https://sermons.test/testsermons/love" that opens in a new tab and is 44 px tall
    And the row "Reigning in Life" reads "Test Preacher · 1872 · Opens on the web"

  @uc-sermons @greek
  Scenario: Two sources are counted together, each in its own order
    Given Lampas is opened on "Romans 5" with the second test source
    When he taps verse 8
    Then the Verse view has a button "Sermons · 5"
    When he taps "Sermons · 5"
    Then the part "On this verse" holds "Love Commended", "Peace with God" and "God’s Love Shown"
    And the sheet names the credit of "Test Sermons" and "Test Second Sermons"

  @uc-sermons @greek
  Scenario: A passage opened from a section heading says On these verses
    Given Lampas is opened on "Romans 5"
    When he taps the heading "Christ’s Sacrifice for the Ungodly"
    Then the Verse view has a button "Sermons · 4"
    When he taps "Sermons · 4"
    Then the sheet is headed "Sermons for Romans 5:6-11"
    And the sheet opens with "On these verses" and then "In this chapter"
    And the part "On these verses" holds "Love Commended" and "Peace with God"
    And after it the part "In this chapter" holds "Reigning in Life" and "Death in Adam, Life in Christ"

  @uc-sermons @greek
  Scenario: The place line opens the whole chapter, and its sheet is headed with the chapter
    Given Lampas is opened on "Romans 5"
    When he taps the place line
    Then the Verse view has a button "Sermons · 4"
    When he taps "Sermons · 4"
    Then the sheet is headed "Sermons for Romans 5"
    And the sheet opens with "In this chapter" and then nothing
    And the part "In this chapter" holds "Peace with God", "Love Commended", "Reigning in Life" and "Death in Adam, Life in Christ"

  @uc-sermons @greek
  Scenario: Offline the rows stay and say they need the internet
    Given Lampas is opened on "Romans 5"
    When he taps verse 8
    And he taps "Sermons · 4"
    And the phone goes offline
    Then the row "Love Commended" reads "Test Preacher · 14 Mar 1880 · Needs the internet"
    And the sheet still has 4 rows

  @uc-sermons @greek
  Scenario: Back closes the sheet and leaves the Verse view
    Given Lampas is opened on "Romans 5"
    When he taps verse 8
    And he taps "Sermons · 4"
    And he goes Back
    Then no sheet is open and the Verse view shows

  @uc-sermons @greek
  Scenario: Tapping a sermon asks for nothing before it is tapped
    Given Lampas is opened on "Romans 5"
    When he taps verse 8
    And he taps "Sermons · 4"
    Then no page outside the app has been asked for
