Feature: Settings has a search field and one registry behind every row
  Settings is a home that lists a few groups (Reading, Learning, The tutor, Listening, Daily, Study resources, Account), each its own page. A search
  field at the top of the home finds a setting by what it is called or what its one-line hint says, ignoring capitals and accents, and lists
  what it found, each saying its group; choosing one opens its page at that row. Clearing the search lists the groups again. A setting whose
  details are hidden while it is off (Bible in Logos while Logos is Off) is reached through the setting that turns it on.
  Every row Settings draws comes from the one registry in src/settings/registry.ts (its name, one-line hint, longer help and
  what it depends on), the same list the tutor is given.

  Scenario: The home lists the groups and no setting
    Given Lampas is opened on Settings with nothing chosen
    Then Settings lists the groups "Reading", "Learning", "The tutor", "Listening", "Daily", "Study resources" and "Account"
    And Settings has no group "Theme"

  Scenario: Typing logos lists the Logos settings with their group
    Given Lampas is opened on Settings with Logos On
    When he types "logos" in the Settings search
    Then Settings finds "Logos" in "Study resources"
    And Settings finds "Bible in Logos" in "Study resources"
    And Settings finds no "Theme"
    And Settings lists no groups

  Scenario: Clearing the search lists the groups again
    Given Lampas is opened on Settings with Logos On
    When he types "logos" in the Settings search
    And he clears the Settings search
    Then Settings lists the groups "Reading", "Learning", "The tutor", "Listening", "Daily", "Study resources" and "Account"

  Scenario: The search matches a setting's hint, ignoring capitals and accents
    Given Lampas is opened on Settings with nothing chosen
    When he types "DÁRK" in the Settings search
    Then Settings finds "Theme" in "Reading"
    And Settings finds no "Section headings"

  Scenario: A search that matches nothing says so
    Given Lampas is opened on Settings with nothing chosen
    When he types "zzzz" in the Settings search
    Then Settings says "Nothing in Settings matches"
    And Settings lists no groups

  Scenario: A hidden detail is found through the setting that turns it on
    Given Lampas is opened on Settings with nothing chosen
    When he types "bible in logos" in the Settings search
    Then Settings finds "Logos" in "Study resources"
    And Settings finds no "Bible in Logos"

  Scenario: A choice's name finds its setting
    Given Lampas is opened on Settings with nothing chosen
    When he types "Audible" in the Settings search
    Then Settings finds "Audio Bible" in "Study resources"
    And Settings finds no "Theme"

  Scenario: Choosing a found setting opens its page at that row
    Given Lampas is opened on Settings with nothing chosen
    When he types "text size" in the Settings search
    And he chooses "Text size" among the found
    Then the "Reading" page is open
    And the group "Text size" is shown

  Scenario: Typing counted finds What Lampas has counted and choosing it opens its page
    Given Lampas is opened on Settings with nothing chosen
    When he types "counted" in the Settings search
    Then Settings finds "What Lampas has counted" in "Settings"
    And Settings lists no groups
    When he chooses "What Lampas has counted" among the found
    Then the "What Lampas has counted" page is open

  Scenario: The search matches the hint of What Lampas has counted
    Given Lampas is opened on Settings with nothing chosen
    When he types "OPENED each" in the Settings search
    Then Settings finds "What Lampas has counted" in "Settings"
    And Settings finds no "Theme"

  Scenario: The search keeps what he typed when he comes back from What Lampas has counted
    Given Lampas is opened on Settings with nothing chosen
    When he types "counted" in the Settings search
    And he chooses "What Lampas has counted" among the found
    Then the "What Lampas has counted" page is open
    When he taps the back arrow "‹ Settings"
    Then the Settings search holds "counted"
    And Settings finds "What Lampas has counted" in "Settings"
    And Settings lists no groups

  Scenario: The search keeps what he typed when he comes back from the sermon sources
    Given Lampas is opened on Settings with nothing chosen
    When he types "sermon" in the Settings search
    And he taps the row of sermon sources among the found
    Then the "Sermon sources" page is open
    When he taps the back arrow "‹ Settings"
    Then the Settings search holds "sermon"
    And Settings lists no groups

  # mw-qtu3zvz.281: the search answers in layers. A list too long to read among the settings (the sermon sources, the books of his library) is one row with its count, never its members one by one
  Scenario: Typing sermons lists the settings first and the sermon sources as one row with their count
    Given Lampas is opened on Settings with nothing chosen
    When he types "sermons" in the Settings search
    Then Settings finds "Sermon sources" in "Study resources"
    And Settings finds "Open web sermons in" in "Study resources"
    And the sermon sources are one row that says how many match
    And that row comes after the found settings
    And no single sermon source is listed

  Scenario: Tapping the row of sermon sources opens the list filtered, and Back returns to the same search
    Given Lampas is opened on Settings with nothing chosen
    When he types "sermons" in the Settings search
    And he taps the row of sermon sources among the found
    Then the "Sermon sources" page is open
    And the page lists only the sources the row said matched
    When he taps the back arrow "‹ Settings"
    Then the Settings search holds "sermons"
    And the sermon sources are one row that says how many match
    And Settings finds "Open web sermons in" in "Study resources"

  Scenario: A search that matches one sermon source still answers it as the row of sermon sources
    Given Lampas is opened on Settings with nothing chosen
    When he types "Spurgeon" in the Settings search
    Then the sermon sources are one row that says how many match
    And no single sermon source is listed

  Scenario: The books of his library that match are one row that opens the Library filtered
    Given Lampas is opened on Settings with Logos On and a library import holding every book
    When he types "lexicon" in the Settings search
    Then the books of his library are one row that says how many match
    And no single book of the library is listed
    When he taps the row of the books of his library among the found
    Then the "Your Logos library" page is open
    And the Library search holds "lexicon" and lists as many books as the row said
    When he taps the back arrow "‹ Settings"
    Then the Settings search holds "lexicon"
    And the books of his library are one row that says how many match

  Scenario: The search keeps what he typed when he comes back from a group's page
    Given Lampas is opened on Settings with nothing chosen
    When he types "text size" in the Settings search
    And he chooses "Text size" among the found
    Then the "Reading" page is open
    When he taps the back arrow "‹ Settings"
    Then the Settings search holds "text size"
    And Settings finds "Text size" in "Reading"
