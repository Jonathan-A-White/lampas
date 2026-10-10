Feature: A setting's details show only while it is on
  Settings does not show the details of something that is off. Accordance Off is its row and nothing else: its one-line help and the
  On | Off control. Turning it On shows the Accordance resource field and a Get Accordance link (features/app-on-phone.feature; nothing is opened or checked); turning it Off hides them
  again, and the value typed in the field is kept. The same holds for every setting with details: Bible in Logos is shown only
  while Logos is On, the Weave's Grammar row only while the Weave is not Off, and New words at and Move it only while New words a
  day is not Off. (A reader who wants to know why he would turn one on can ask the tutor from Settings.)

  Scenario: Accordance Off is its row and nothing else
    Given Lampas is opened on Settings with nothing chosen
    Then Settings shows the switch "Accordance" Off with its help "Adds Open in Accordance: the word in your own lexicon in the Accordance app."
    And Settings has no field "Accordance resource"
    And Settings does not say "Don't have Accordance?"
    And Settings has no link "Install Accordance"

  Scenario: Turning Accordance On shows its details and Off hides them, keeping what was typed
    Given Lampas is opened on Settings with Accordance On and the Accordance resource "TDNT"
    Then Settings has a field "Accordance resource" holding "TDNT"
    When he turns the switch "Accordance" Off
    Then Settings has no field "Accordance resource"
    And the setting "resourceOption.accordance" holds "TDNT"
    When he turns the switch "Accordance" On
    Then Settings again has a field "Accordance resource" holding "TDNT"
    And Settings says "Don't have Accordance?"

  Scenario: Bible in Logos is shown only while Logos is On
    Given Lampas is opened on Settings with nothing chosen
    Then Settings has no section "Bible in Logos"
    When he turns the switch "Logos" On
    Then Settings has the section "Bible in Logos"
    When he turns the switch "Logos" Off
    Then Settings no longer has the section "Bible in Logos"

  Scenario: The Weave's Grammar row is shown only while the Weave is not Off
    Given Lampas is opened on Settings with nothing chosen
    Then Settings has the group "Weave" and no group "Grammar"
    When he taps "Solid" under "Weave"
    Then Settings has the group "Grammar"
    When he sets "Weave" back to "Off"
    Then Settings is back to the group "Weave" and no group "Grammar"

  Scenario: New words at and Move it are shown only while New words a day is not Off
    Given Lampas is opened on Settings with nothing chosen
    Then Settings has the groups "New words a day", "New words at" and "Move it"
    When he taps "Off" under "New words a day"
    Then Settings has the group "New words a day" and no group "New words at" or "Move it"
    When he sets "New words a day" back to "5"
    Then Settings shows the groups "New words a day", "New words at" and "Move it" again
