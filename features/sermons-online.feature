Feature: Sermons online (mw-qtu3zvz.5, docs/sermons.md 'When online')
  The Sermons sheet opens on the bundled rows at once, then asks the sermon index service (free: no licence, no key, never the mill) for the chapter with the sources that are On and merges what it gives:
  a row of the same source and id is replaced by the service's, rows the bundle lacks are added under their groups, and the line under the title says "Latest from the index · N new" (or
  "Offline: the bundled index" when the service cannot be reached). A source the service has that the bundle lacks gets its own On | Off row in Settings the first time it is seen, Off to start unless the
  service says it is on by default. A search field at the head of the sheet is answered by the service alone. These scenarios stub the service with the examples of the sermon-index repository's docs/api.md
  (tests/fixtures/sermons) and use sermon sources of the tests' own (tests/support/test-sermons.ts); Romans 5 is a committed chapter.

  @uc-sermons @greek
  Scenario: The service's newer rows replace and add to the bundled ones
    Given Lampas is opened on "Romans 5" with the sermon index answering
    When he taps verse 8
    And he taps "Sermons · 4"
    Then the sheet is headed "Sermons for Romans 5:8"
    And the sheet says "Latest from the index · 1 new"
    And the part "On this verse" holds "Love Commended, Revised" and "Peace with God"
    And after it the part "In this chapter" holds "Reigning in Life", "Death in Adam, Life in Christ" and "Reigning Grace"
    And the sermon "Love Commended, Revised" opens at the service's newer address

  @uc-sermons @greek
  Scenario: The service is asked for the chapter with the sources that are On, and for nothing of his
    Given Lampas is opened on "Romans 5" with the sermon index answering
    When he taps verse 8
    And he taps "Sermons · 4"
    Then the sheet says "Latest from the index · 1 new"
    And the service was asked for "rom.5" in the source "testsermons"
    And the service was sent no cookie, key or header

  @uc-sermons @greek
  Scenario: When the service cannot be reached the bundled rows stand and the sheet says so
    Given Lampas is opened on "Romans 5" with the sermon index not answering
    When he taps verse 8
    And he taps "Sermons · 4"
    Then the sheet says "Offline: the bundled index"
    And the part "On this verse" holds "Love Commended" and "Peace with God"

  @uc-sermons @greek
  Scenario: A source the bundle lacks gets an Off row in Settings, and its rows show only when it is On
    Given Lampas is opened on "Romans 5" with the sermon index answering
    When he taps verse 8
    And he taps "Sermons · 4"
    Then the sheet says "Latest from the index · 1 new"
    And the service was asked for no source but "testsermons"
    When Settings is opened at Study resources
    Then the Sermons section shows "C. H. Spurgeon's sermons" Off
    When he turns "C. H. Spurgeon's sermons" On in the Sermons section
    And the Verse view of Romans 5:8 is opened again with its Sermons sheet
    Then the line under the title reads "Latest from the index · 2 new"
    And the part "On this verse" holds "Love Commended, Revised", "Peace with God" and "Love's Commendation"
    And the service was asked for the sources "testsermons" and "spurgeon-20"

  @uc-sermons @greek
  Scenario: A source the service says is on by default shows its rows the first time it is seen
    Given Lampas is opened on "Romans 5" with the sermon index answering with a source that is on by default
    When he taps verse 8
    And he taps "Sermons · 4"
    Then the part "On this verse" holds "Love Commended, Revised", "Peace with God" and "Love's Commendation"
    When Settings is opened at Study resources
    Then the Sermons section shows "C. H. Spurgeon's sermons" On

  @uc-sermons @greek
  Scenario: The search is answered by the service, after a pause, with sermons and themes
    Given Lampas is opened on "Romans 5" with the sermon index answering
    When he taps verse 8
    And he taps "Sermons · 4"
    And he searches the sheet for "spurgeon grace"
    Then the part "Found" holds "Law and Grace", "Justification by Grace", "Reigning Grace", "Exposition of the Doctrines of Grace" and "Atonement"
    And the service was asked to search once, for "spurgeon grace"
    And the sermon "Law and Grace" opens at "https://ccel.org/ccel/spurgeon/sermons01/sermons01.xxxvi.html"

  @uc-sermons @greek
  Scenario: A theme found by the search lists its sermons in the same sheet when it is tapped
    Given Lampas is opened on "Romans 5" with the sermon index answering
    When he taps verse 8
    And he taps "Sermons · 4"
    And he searches the sheet for "spurgeon grace"
    And he taps the theme "Atonement"
    Then the theme "Atonement" lists "For Whom Did Christ Die?"

  @uc-sermons @greek
  Scenario: Offline the search field is greyed and says it needs the internet
    Given Lampas is opened on "Romans 5" with the sermon index not answering
    When he taps verse 8
    And he taps "Sermons · 4"
    Then the search field is greyed and says "Needs the internet"

  # mw-qtu3zvz.59.2 (PROVISIONAL, the Governor to confirm): a sermon its source linked to a topic from the sermon notes is on the same theme, asked of the service when the sheet is online. The service's answer is the Example of
  # the sermon-index repository's docs/api.md 'Direct links' (tests/fixtures/sermons/api-direct-theme.json), its topic given the tests' own Atonement.
  @uc-sermons @greek
  Scenario: A sermon linked from its notes is on the same theme
    Given Lampas is opened on "Romans 5" with the sermon index answering a sermon linked from its notes
    When he taps verse 8
    And he taps "Sermons · 4"
    Then under "On the same theme" the topic "On Atonement" comes first and holds "The Peculiar Sleep of the Beloved" then "Running from God"
    And the row "The Peculiar Sleep of the Beloved" reads "From the sermon notes · preached on Psalms 127:2"
    And the row "Running from God" has no such line
    And the sheet credits "C. H. Spurgeon's sermons (twenty, a fixture)" for it, as its only row there is on the same theme
    And the service was asked for the theme tier of "rom.5.8" in the sources "testsermons" and "spurgeon-20"

  @uc-sermons @greek
  Scenario: Offline the same sheet has no sermon linked from its notes
    Given Lampas is opened on "Romans 5" with the sermon index not answering, and the themes read
    When he taps verse 8
    And he taps "Sermons · 4"
    Then the sheet says "Offline: the bundled index"
    And under "On the same theme" the topic "On Love-Hatred" comes first and holds "The Storm at Sea"
    And no row of the sheet reads "From the sermon notes"
