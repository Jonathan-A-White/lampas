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

  # mw-9ji6ek0.25: Read as, the reading set in force, and saving, renaming and deleting his own
  Scenario: Settings offers Read as with the three built-in sets, Byzantine chosen, and says what ECM is
    Given Settings is open at Reading with nothing chosen
    Then Read as offers "Byzantine", "NA" and "ECM" with "Byzantine" chosen
    And the Reading sets row says "ECM where the apparatus gives it (18 places in Acts); elsewhere NA"

  Scenario: Choosing NA under Read as is kept across a reload
    Given Settings is open at Reading with nothing chosen
    When he chooses "NA" in the group "Read as"
    Then the setting "readingSet" is kept as "na"
    When Settings is opened again at Reading
    Then Read as has "NA" chosen

  Scenario: Save as names a copy of the set in force, which can be switched to and from
    Given Settings is open at Reading with nothing chosen
    When he chooses "NA" in the group "Read as"
    And he taps "Save as…" and names the set "My Rev"
    Then Read as offers "Byzantine", "NA", "ECM" and "My Rev" with "My Rev" chosen
    When he switches Read as to "Byzantine"
    Then Read as has "Byzantine" chosen
    When he switches Read as back to "My Rev"
    Then "My Rev" is chosen under Read as

  Scenario: Save as with a blank name or Cancel saves nothing
    Given Settings is open at Reading with nothing chosen
    When he taps "Save as…"
    Then he is asked "Name this set" and Save is off while the name is blank
    When he cancels
    Then Read as offers "Byzantine", "NA" and "ECM" with "Byzantine" chosen

  Scenario: His own set can be renamed
    Given Settings is open at Reading with nothing chosen
    When he chooses "NA" in the group "Read as"
    And he taps "Save as…" and names the set "My Rev"
    And he taps "Rename" and renames the set "Revelation"
    Then Read as offers "Byzantine", "NA", "ECM" and "Revelation" with "Revelation" chosen

  Scenario: The built-in sets have no Rename or Delete
    Given Settings is open at Reading with nothing chosen
    Then there is no "Rename" or "Delete" button
    When he chooses "ECM" in the group "Read as"
    Then there is still no "Rename" or "Delete" button under "ECM"

  Scenario: His own set is deleted after asking, and Byzantine is read again
    Given Settings is open at Reading with nothing chosen
    When he chooses "NA" in the group "Read as"
    And he taps "Save as…" and names the set "My Rev"
    And he taps "Delete"
    Then he is asked "Delete this set?"
    When he cancels
    Then Read as offers "Byzantine", "NA", "ECM" and "My Rev" with "My Rev" chosen
    When he taps "Delete" and confirms with "Delete my set"
    Then Read as offers "Byzantine", "NA" and "ECM" with "Byzantine" chosen
