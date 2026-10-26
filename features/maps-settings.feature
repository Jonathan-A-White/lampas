Feature: Maps in Settings (mw-zbjgn3r.6, docs/maps.md)
  Settings > Study resources > Maps has one On/Off row for each map source, made from the registry of sources: Bible Mapper is On. A source that needs Logos is drawn only while Logos is On
  (these scenarios register a second source of the tests' own, "Test Logos Atlas", that does). A switch is kept like any setting.

  Scenario: The Maps section shows Bible Mapper On
    Given Settings is open at Study resources with Logos Off
    Then the Maps section shows "Bible Mapper" On

  Scenario: Turning Bible Mapper Off is kept
    Given Settings is open at Study resources with Logos Off
    When he turns "Bible Mapper" Off in the Maps section
    Then the Maps section shows "Bible Mapper" Off
    And the setting "maps.biblemapper" is kept as "off"

  Scenario: A source that needs Logos has no row while Logos is Off
    Given Settings is open at Study resources with Logos Off
    Then the Maps section has no row "Test Logos Atlas"

  Scenario: A source that needs Logos has its row once Logos is On
    Given Settings is open at Study resources with Logos On
    Then the Maps section shows "Test Logos Atlas" On
