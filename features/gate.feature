Feature: The licence gate
  Lampas opens on an Unlock screen until this phone's key holds a lampas licence on chain. The phone makes
  its key once and shows it with a Copy, so the licence can be issued to it from Postern's Key screen.

  Scenario: First open shows Unlock with a device key and Copy
    Given Lampas is opened for the first time on a phone with no licence
    Then he sees the Unlock screen
    And the Unlock screen shows a device key
    And there is a Copy button
    When he taps Copy
    Then the clipboard holds the device key

  Scenario: A held licence opens the reader
    Given the chain says this phone's key holds a licence
    When Lampas is opened
    Then he sees the reader
    And the Unlock screen is gone

  Scenario: No licence shows No licence yet and the key
    Given the chain says this phone's key has no licence
    When Lampas is opened
    Then he sees "No licence yet"
    And the Unlock screen shows a device key

  Scenario: A revoked licence shows Licence revoked
    Given the chain says this phone's licence was revoked
    When Lampas is opened
    Then he sees "Licence revoked"
    And the reader is not shown

  Scenario: A held result is remembered through an offline open within the grace
    Given the chain says this phone's key holds a licence
    And Lampas is opened
    And he is in the reader
    When the phone is offline and Lampas is opened again 6 hours later
    Then he sees the reader

  Scenario: A held result older than the grace does not open an offline phone
    Given the chain says this phone's key holds a licence
    And Lampas is opened
    And he is in the reader
    When the phone is offline and Lampas is opened again 25 hours later
    Then he sees the Unlock screen
    And he sees "Can't reach the chain"
    And the reader is not shown

  Scenario: The key survives a reload
    Given Lampas is opened for the first time on a phone with no licence
    And he notes the device key
    When Lampas is opened again
    Then the Unlock screen shows the same device key

  Scenario: Coming back to the page checks the licence again
    Given the chain says this phone's key has no licence
    And Lampas is opened
    And he sees "No licence yet"
    When the licence is issued and the page comes back into view
    Then he sees the reader

  Scenario: A key stored through the test seam is the device key
    Given the private key "0000000000000000000000000000000000000000000000000000000000000001" is stored under "lampas.deviceKey" before Lampas boots
    When Lampas is opened
    Then the Unlock screen shows the public key "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"

  Scenario: No issuer set keeps the gate shut and says so
    Given no licence issuer is configured
    When Lampas is opened
    Then he sees "No licence issuer is set"
    And the reader is not shown
