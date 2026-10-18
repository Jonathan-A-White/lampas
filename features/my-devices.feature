Feature: My devices on the Licence page
  A phone licensed by the site issuer (a self-registered licence, mw-cvwm1u) shows My devices on the Licence page: each device of the licence by name and
  last use, with Rename and Remove. Remove asks first ("Lampas on that device loses its licence"), has the backend revoke that key's licence and free its
  slot, and removing this phone returns it to Not licensed. A line under the list says a new phone joins by Get a licence with the same phone number.
  A licence from the Governor's own issuer has no person behind it, so no My devices (mw-cvwm1u.5).

  Scenario: A site-licensed phone lists its devices by name and last use
    Given this phone is licensed by the site issuer with two devices and the Licence page is open
    Then My devices lists "Pixel" as this phone and "Old tablet"
    And each device shows when it was last used
    And My devices says a new phone joins with the same phone number

  Scenario: Removing the other device asks first and leaves one
    Given this phone is licensed by the site issuer with two devices and the Licence page is open
    When he taps Remove on "Old tablet"
    Then he is asked and told "Lampas on that device loses its licence"
    When he confirms Remove
    Then My devices lists only "Pixel"
    And the backend was told to remove "Old tablet"
    And the Licence page says "Licensed"

  Scenario: Keeping a device after all changes nothing
    Given this phone is licensed by the site issuer with two devices and the Licence page is open
    When he taps Remove on "Old tablet"
    And he taps Keep
    Then My devices lists "Pixel" as this phone and "Old tablet"

  Scenario: Removing this phone returns it to Not licensed
    Given this phone is licensed by the site issuer with two devices and the Licence page is open
    When he taps Remove on "Pixel"
    And he confirms Remove
    Then the Licence page says "Not licensed"
    And there is no My devices

  Scenario: Renaming a device is kept by the backend
    Given this phone is licensed by the site issuer with two devices and the Licence page is open
    When he taps Rename on "Old tablet"
    And he types the name "Kitchen tablet" and saves
    Then My devices lists "Pixel" as this phone and "Kitchen tablet"
    And the backend was told to rename "Old tablet" to "Kitchen tablet"

  Scenario: The backend's refusal of a removal is shown in its own words
    Given this phone is licensed by the site issuer with two devices and the Licence page is open
    When he taps Remove on "Old tablet"
    And the backend refuses the removal with 502 "the licence could not be revoked just now; try again in a minute"
    And he confirms Remove
    Then the page shows "the licence could not be revoked just now; try again in a minute"
    And My devices lists "Pixel" as this phone and "Old tablet"

  Scenario: The backend's refusal of a rename is shown in its own words
    Given this phone is licensed by the site issuer with two devices and the Licence page is open
    When he taps Rename on "Old tablet"
    And the backend refuses the rename with 404 "that device is not on this licence"
    And he types the name "Kitchen tablet" and saves
    Then the page shows "that device is not on this licence"

  Scenario: The backend's refusal of the list is shown in its own words
    Given the backend refuses to list devices with 403 "only a device on this licence can remove one of its devices"
    And this phone is licensed by the site issuer and the Licence page is open
    Then the page shows "only a device on this licence can remove one of its devices"

  Scenario: A licence from the Governor's own issuer shows no My devices
    Given this phone is licensed by the Governor's own issuer and the Licence page is open
    Then there is no My devices
    And the backend was not asked for devices

  Scenario: A phone with no licence shows no My devices
    Given this phone has no licence and the Licence page is open
    Then there is no My devices
