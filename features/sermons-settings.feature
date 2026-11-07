Feature: Sermons in Settings (mw-qtu3zvz.3, docs/sermons.md 'Choosing the sources')
  Settings > Study resources > Sermons has one On/Off row for each sermon source, made from the registry of sources, every bundled source On to start. A source that needs Logos is drawn only while Logos is On.
  A switch is kept like any setting, and a source switched Off gives the Sermons door no rows. These scenarios register three sources of the tests' own (tests/support/sermon-sources.ts): "Test Sermons"
  and "Test Second Sermons", which start On, and "Test Logos Archive", which rides on Logos.

  Scenario: The Sermons section shows each source On to start
    Given Settings is open at Study resources with Logos Off
    Then the Sermons section shows "Test Sermons" On
    And it also holds a row "Test Second Sermons" that is On

  Scenario: Turning a source Off is kept
    Given Settings is open at Study resources with Logos Off
    When he turns "Test Second Sermons" Off in the Sermons section
    Then the Sermons section shows "Test Second Sermons" Off
    And the setting "sermons.testsecond" is kept as "off"

  Scenario: A source that needs Logos has no row while Logos is Off
    Given Settings is open at Study resources with Logos Off
    Then the Sermons section has no row "Test Logos Archive"

  Scenario: A source that needs Logos has its row once Logos is On
    Given Settings is open at Study resources with Logos On
    Then the Sermons section shows "Test Logos Archive" On

  Scenario: The Sermons door's count falls when a source goes Off
    Given Lampas is opened on "Romans 5"
    When he taps verse 8
    Then the Verse view has a button "Sermons · 5"
    When "Test Second Sermons" is turned Off in Settings
    Then the door now reads "Sermons · 4"
    When he also turns "Test Sermons" Off in Settings
    Then the Verse view has no Sermons door
