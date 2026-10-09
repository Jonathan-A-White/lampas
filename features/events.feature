Feature: Screens talk through the event bus
  The reader tells the rest of the app what he does through one typed bus (src/events/bus.ts)
  instead of calling other screens: which verse he selected, which language he reads, whether the
  weave is on. The Verse view learns the selected verse from the bus. Nothing he can see changes.

  Scenario: Selecting verse 28 publishes verse-selected and the Verse view opens on verse 28
    Given Lampas is opened on Romans 8 and the bus is listened to
    When he selects verse 28
    Then verse-selected was published for chapter 8 verse 28
    And the Verse view shows verse 28

  Scenario: Closing the Verse view publishes that no verse is selected
    Given Lampas is opened on Romans 8 and the bus is listened to
    And he selects verse 28
    When he closes the Verse view
    Then verse-selected was last published with no verse
    And no Verse view shows

  Scenario: Switching to Greek publishes view-changed
    Given Lampas is opened on Romans 8 and the bus is listened to
    When he switches to Greek
    Then view-changed was published with greek

  Scenario: Switching the weave on publishes weave-changed
    Given Lampas is opened on Romans 8 and the bus is listened to
    When he switches the weave to Solid words
    Then weave-changed was published with solid

  Scenario: Switching the weave grammar publishes weave-grammar-changed
    Given Lampas is opened on Romans 8 and the bus is listened to
    When he switches the weave grammar to Solid
    Then weave-grammar-changed was published with solid
