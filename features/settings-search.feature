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
