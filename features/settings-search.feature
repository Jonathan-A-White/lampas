Feature: Settings has a search field and one registry behind every row
  As Settings grows, a search field at the top finds a setting by what it is called or what its one-line hint says, ignoring
  capitals and accents. A section with nothing that matches is hidden; clearing the search shows every setting again. A setting
  whose details are hidden while it is off (Bible in Logos while Logos is Off) is reached through the setting that turns it on.
  Every row Settings draws comes from the one registry in src/settings/registry.ts (its name, one-line hint, longer help and
  what it depends on), the same list the tutor is given.

  Scenario: Typing logos shows only the Logos settings
    Given Lampas is opened on Settings with Logos On
    When he types "logos" in the Settings search
    Then Settings shows the switch "Logos"
    And Settings shows the section "Bible in Logos"
    And Settings has no sections "Appearance" or "Greek pronunciation"
    And Settings has no group "Theme"

  Scenario: Clearing the search shows every setting again
    Given Lampas is opened on Settings with Logos On
    When he types "logos" in the Settings search
    And he clears the Settings search
    Then Settings shows the sections "Appearance" and "Greek pronunciation"
    And Settings shows the group "Theme"

  Scenario: The search matches a setting's hint, ignoring capitals and accents
    Given Lampas is opened on Settings with nothing chosen
    When he types "DÁRK" in the Settings search
    Then Settings shows the group "Theme"
    And Settings has no section "Section headings"

  Scenario: A search that matches nothing says so
    Given Lampas is opened on Settings with nothing chosen
    When he types "zzzz" in the Settings search
    Then Settings says "Nothing in Settings matches"
    And Settings has no section "Appearance"

  Scenario: A hidden detail is found through the setting that turns it on
    Given Lampas is opened on Settings with nothing chosen
    When he types "bible in logos" in the Settings search
    Then Settings shows the switch "Logos"
    And Settings has no section "Bible in Logos"
