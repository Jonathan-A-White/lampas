Feature: Settings checks an app is on the phone when he turns it on
  A web page cannot list the apps on a phone, so turning Logos or Accordance On in Settings tries to open the app once, by its own
  scheme. When the page goes away (the app opened) the switch stays On, and the next return to Lampas says "<App> found". When the
  page stays in front for about 1.5 seconds, the app is not there: the switch goes back to Off, and a switch that is Off shows
  nothing of the app (features/settings-details.feature): no notice, no Install. (Install <App> is left to the word sheet's own sheet.)
  The word sheet's Study row lists only the resources that are On, so a missing app is caught here and not at the point of use.

  Scenario: Accordance is not on the phone, so the switch goes back Off
    Given Lampas is opened on Settings and the phone is an Android phone
    When he turns the switch "Accordance" On
    And the page stays in front for the wait
    Then the switch "Accordance" is Off
    And Settings does not say "Accordance isn't on this phone"
    And the setting "resource.accordance" holds "off"

  Scenario: Accordance is on the phone, so the switch stays On and the return says it was found
    Given Lampas is opened on Settings and the phone is an Android phone
    When he turns the switch "Accordance" On
    And the app takes the page away
    And he comes back to Lampas
    And the page stays in front for the wait
    Then the switch "Accordance" is On
    And Settings says "Accordance found"
    And Settings does not say "Accordance isn't on this phone"
    And the setting "resource.accordance" holds "on"

  Scenario: Turning on Logos opens the app once, by its own scheme
    Given Lampas is opened on Settings and the phone is an Android phone
    When he turns the switch "Logos" On
    Then the app was asked to open with an address that starts "logos4:"

  Scenario: Strong's needs no app, so it is not checked
    Given Lampas is opened on Settings and the phone is an Android phone
    When he turns the switch "Strong's" On
    Then no app was asked to open
    And the switch "Strong's" is On

  Scenario: Turning an app Off is not checked
    Given Lampas is opened on Settings and the phone is an Android phone with Accordance on
    When he turns the switch "Accordance" Off
    Then no app was asked to open
    And the switch "Accordance" is Off

  Scenario: The word sheet's Study lists only the resources that are On
    Given Lampas is opened on Settings and the phone is an Android phone
    When he turns the switch "Accordance" On
    And the app takes the page away
    And he goes back to the reader
    And he taps the word "work together" in verse 28
    Then the Study group "Accordance" is listed
    And the Study group "Logos" is not listed
