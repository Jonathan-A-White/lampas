Feature: An app that is not on the phone says so
  A Study link to an app (Logos, Accordance) opens the app by its own scheme. When the page is still in front about 1.5 seconds after
  the tap, the app did not open: a small sheet says "<App> isn't on this phone" with two buttons, "Get <App>" (the Play Store on Android,
  the App Store on iOS) and "Turn off <App>" (the resource goes off in Settings at once and its links leave the word sheet). A link that
  has an https fallback (Logos) opens that instead and shows no sheet. The Study links sit in a grid of equal tiles with short labels,
  grouped under the app's name.

  Scenario: Accordance does not open, so the sheet says it is not on this phone
    Given Lampas is opened on Romans 8 with Accordance on and the phone is an Android phone
    When he taps the word "work together" in verse 28
    And he taps the Study link "Open in Accordance"
    And the page stays in front for the wait
    Then a sheet says "Accordance isn't on this phone"
    And the sheet has a "Get Accordance" link to the Play Store
    And the sheet has a "Turn off Accordance" button

  Scenario: On an iPhone Get Accordance goes to the App Store
    Given Lampas is opened on Romans 8 with Accordance on and the phone is an iPhone
    When he taps the word "work together" in verse 28
    And he taps the Study link "Open in Accordance"
    And the page stays in front for the wait
    Then a sheet says "Accordance isn't on this phone"
    And the sheet has a "Get Accordance" link to the App Store

  Scenario: The wait is about one and a half seconds
    Given Lampas is opened on Romans 8 with Accordance on and the phone is an Android phone
    Then the wait for an app to open is 1500 milliseconds

  Scenario: Turn off Accordance switches it off and its link leaves the word sheet
    Given Lampas is opened on Romans 8 with Accordance on and the phone is an Android phone
    When he taps the word "work together" in verse 28
    And he taps the Study link "Open in Accordance"
    And the page stays in front for the wait
    And he taps "Turn off Accordance" on the sheet
    Then the sheet is closed
    And the word sheet has no Study row
    And the setting "resource.accordance" holds "off"

  Scenario: Done leaves Accordance on
    Given Lampas is opened on Romans 8 with Accordance on and the phone is an Android phone
    When he taps the word "work together" in verse 28
    And he taps the Study link "Open in Accordance"
    And the page stays in front for the wait
    And he taps Done on the sheet
    Then the sheet is closed
    And the Study row still has the link "Open in Accordance"

  Scenario: Back closes the sheet and leaves the word sheet open
    Given Lampas is opened on Romans 8 with Accordance on and the phone is an Android phone
    When he taps the word "work together" in verse 28
    And he taps the Study link "Open in Accordance"
    And the page stays in front for the wait
    And he taps the phone's Back
    Then the sheet is closed
    And the Study row still has the link "Open in Accordance"

  Scenario: When the app takes the page away there is no sheet
    Given Lampas is opened on Romans 8 with Accordance on and the phone is an Android phone
    When he taps the word "work together" in verse 28
    And he taps the Study link "Open in Accordance"
    And the app takes the page away
    And the page stays in front for the wait
    Then there is no sheet about a missing app

  Scenario: A Logos link opens its https address and shows no sheet
    Given Lampas is opened on Romans 8 with Logos on and the phone is an Android phone
    When he taps the word "work together" in verse 28
    And he taps the Study link "Open in Logos: BDAG"
    And the page stays in front for the wait
    Then the address "https://ref.ly/logosres/LLS%3A46.30.18?hw=%CF%83%CF%85%CE%BD%CE%B5%CF%81%CE%B3%CE%AD%CF%89" was opened
    And there is no sheet about a missing app

  Scenario: The Study links are short tiles grouped by app
    Given Lampas is opened on Romans 8 with Logos and Accordance on and Lexham ticked
    When he taps the word "condemnation" in verse 1
    Then the Study group "Logos" has the tiles "BDAG", "Lexham Theological Wordbook", "Bible Word Study"
    And the Study group "Accordance" has the tiles "BDAG"
    And the tile "Lexham Theological Wordbook" is still named "Open in Logos: Lexham Theological Wordbook"
