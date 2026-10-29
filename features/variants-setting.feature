Feature: Variants in Settings (mw-9ji6ek0.4)
  Settings > Reading > Variants says whether the Reader shows where the manuscripts differ: Off (the default), Those that change the English, or All. A second row, Witnesses, says
  whose readings count: Byzantine splits only, also Nestle-Aland, or also ECM (every witness, the default). The Witnesses row is drawn only while Variants is not Off. Both are kept
  across a reload.

  Scenario: Settings shows Variants Off with its help line and no Witnesses row
    Given Settings is open at Reading with nothing chosen
    Then Variants offers "Off", "Those that change the English" and "All" with "Off" chosen
    And Variants has its help line
    And there is no Witnesses row

  Scenario Outline: Each Variants choice survives a reload
    Given Settings is open at Reading with nothing chosen
    When he chooses <choice> in the group "Variants"
    Then the setting "variants" is kept as <kept>
    When Settings is opened again at Reading
    Then Variants has <choice> chosen

    Examples:
      | choice                         | kept    |
      | Those that change the English  | english |
      | All                            | all     |

  Scenario: Witnesses appears once Variants is on and offers three values with every witness chosen
    Given Settings is open at Reading with nothing chosen
    When he chooses "All" in the group "Variants"
    Then Witnesses offers "Byzantine splits only", "also Nestle-Aland" and "also ECM" with "also ECM" chosen
    And Witnesses has its help line naming the Byzantine split, Nestle-Aland 27/28 and ECM

  Scenario Outline: Each Witnesses choice survives a reload
    Given Settings is open at Reading with Variants set to "english"
    When he chooses <choice> in the group "Witnesses"
    Then the setting "variantWitnesses" is kept as <kept>
    When Settings is opened again at Reading
    Then Witnesses has <choice> chosen

    Examples:
      | choice                | kept |
      | Byzantine splits only | byz  |
      | also Nestle-Aland     | na   |
      | also ECM              | ecm  |

  Scenario: Turning Variants Off hides the Witnesses row again
    Given Settings is open at Reading with Variants set to "all"
    When he chooses "Off" in the group "Variants"
    Then there is no Witnesses row

  # mw-9ji6ek0.19: the offer of the lessons on variant readings, and the way back to them
  Scenario: Settings offers the lessons whatever Variants is, On to start, with a row that opens them
    Given Settings is open at Reading with nothing chosen
    Then Offer the lessons offers "On" and "Off" with "On" chosen
    And there is a row "Lessons on variant readings" that opens the lessons

  Scenario: Offer the lessons survives a reload
    Given Settings is open at Reading with nothing chosen
    When he chooses "Off" in the group "Offer the lessons"
    Then the setting "variantLessonsOffer" is kept as "off"
    When Settings is opened again at Reading
    Then Offer the lessons has "Off" chosen

  Scenario: The Lessons row opens the lessons
    Given Settings is open at Reading with nothing chosen
    When he taps the row "Lessons on variant readings"
    Then the lessons on variant readings are open
