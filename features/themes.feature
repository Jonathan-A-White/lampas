Feature: Themes on the Sermons sheet (mw-qtu3zvz.4, docs/sermons.md 'The themes')
  The Sermons sheet of a verse or a passage gains a "Themes" line under its title: the topics that carry the verse, each with the part label the list gives ("Love-Hatred: Of God"), and after
  "In this chapter" the sermons "On the same theme": sermons whose preaching text shares a topic of at most 300 verses with the verse, a sermon once with its narrowest topic, headed by the topic ("On Atonement"),
  at most 12, never one the passage groups already hold. Settings > Study resources > Themes has an On | Off row for each theme list, both On to start. These scenarios use theme lists and sermon sources
  of the tests' own (tests/support/test-themes.ts, test-sermons.ts): Romans 5:8 has the topics Atonement and Love-Hatred: Of God and a whole-subject one (God, over the cap); the sermons on Jonah 1 are on them.

  @uc-sermons @greek
  Scenario: The sheet names the topics of the verse under its title
    Given Lampas is opened on "Romans 5"
    When he taps verse 8
    And he taps "Sermons · 4"
    Then the sheet is headed "Sermons for Romans 5:8"
    And the Themes line reads "Themes Atonement: Doctrine of · Love-Hatred: Of God · God"

  @uc-sermons @greek
  Scenario: A passage names the topics of any of its verses
    Given Lampas is opened on "Romans 5"
    When he taps the heading "Christ’s Sacrifice for the Ungodly"
    And he taps "Sermons · 4"
    Then the sheet is headed "Sermons for Romans 5:6-11"
    And the Themes line reads "Themes Atonement: Doctrine of · Love-Hatred: Of God · God"

  @uc-sermons @greek
  Scenario: A whole chapter has no Themes line and no sermons on the same theme
    Given Lampas is opened on "Romans 5"
    When he taps the place line
    And he taps "Sermons · 4"
    Then the sheet is headed "Sermons for Romans 5"
    And the sheet has no Themes line
    And the sheet opens with "In this chapter" and then nothing

  @uc-sermons @greek
  Scenario: The sermons on the same theme follow In this chapter, headed by their topic
    Given Lampas is opened on "Romans 5"
    When he taps verse 8
    And he taps "Sermons · 4"
    Then the sheet opens with "On this verse", "In this chapter" and "On the same theme"
    And the theme "On Love-Hatred" holds "The Storm at Sea"
    And after it the theme "On Atonement" holds "Running from God"
    And no sermon of the passage is repeated on the same theme

  @uc-sermons @greek
  Scenario: A sermon on two topics is on the narrower one, across two lists
    Given Lampas is opened on "Romans 5" with a second theme list
    When he taps verse 8
    And he taps "Sermons · 4"
    Then the theme "On Commendation" holds "Running from God"
    And after it the theme "On Love-Hatred" holds "The Storm at Sea"
    And the sheet names the credit of "Test Themes" and "Test More Themes"

  @uc-sermons @greek
  Scenario: A theme list that is Off leaves no line and no rows
    Given Lampas is opened on "Romans 5" with every theme list Off
    When he taps verse 8
    And he taps "Sermons · 4"
    Then the sheet has no Themes line
    And the sheet opens with "On this verse" and then "In this chapter"

  @uc-sermons @greek
  Scenario: A sermon on the same theme is a plain link out like the others
    Given Lampas is opened on "Romans 5"
    When he taps verse 8
    And he taps "Sermons · 4"
    Then the theme "On Love-Hatred" holds "The Storm at Sea"
    And the row "The Storm at Sea" reads "Test Preacher · 1856 · Opens on the web"
    And the row "The Storm at Sea" is a link to "https://sermons.test/testsermons/storm"

  @uc-sermons @greek
  Scenario: Settings has an On or Off row for each theme list, both On to start
    Given Settings is open at Study resources
    Then the Themes section shows "Thompson Chain Topics" On
    And the Themes section shows "Torrey's New Topical Textbook" On

  @uc-sermons @greek
  Scenario: Turning a theme list Off is kept
    Given Settings is open at Study resources
    When he turns "Torrey's New Topical Textbook" Off in the Themes section
    Then the Themes section shows "Torrey's New Topical Textbook" Off
    And the setting "themes.themes-torrey" is kept as "off"
