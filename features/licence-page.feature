Feature: Settings shows the AI as off until a licence, and the Licence page is where to get one
  Lampas is free to read; a licence unlocks the AI (the tutor and everything sent to the mill). With no licence, Settings lists each AI option
  off and greyed with "Needs a licence", which opens the Licence page: this phone's key as a QR code and as text, and Check again. A licence
  found there turns the AI on at once, with no reload. With a licence the options work as they always did.

  Scenario: With no licence each AI option is off and greyed with Needs a licence
    Given this phone has no licence and Settings is open
    Then each AI option is off and greyed
    And each AI option says "Needs a licence"

  Scenario: Tapping a greyed AI option does not turn it on
    Given this phone has no licence and Settings is open
    When he taps the greyed switch of "Tips"
    Then "Tips" is still off and nothing is saved for it
    And Settings is still open

  Scenario: Needs a licence opens the Licence page with the key and Check again
    Given this phone has no licence and Settings is open
    When he taps "Needs a licence" under "Tips"
    Then the Licence page says "Not licensed"
    And the Licence page shows this phone's key as a QR code and as text
    And the Licence page has Check again

  Scenario: A licence found on Check again turns the AI options on
    Given this phone has no licence and Settings is open
    When he taps "Needs a licence" under "Tips"
    And the issuer then issues a licence to this phone's key
    And he taps Check again
    Then the Licence page says "Licensed"
    When he goes back to Settings
    Then no AI option says "Needs a licence"
    And "Tips" can be switched on and off

  Scenario: With a licence the Licence page says Licensed and the AI options work
    Given this phone has a licence and Settings is open
    Then no AI option says "Needs a licence"
    And "Tips" can be switched on and off
    When he opens the Licence page
    Then the Licence page says "Licensed"
