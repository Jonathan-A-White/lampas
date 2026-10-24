Feature: An app that is not on the phone says so
  A Study link to an app (Logos; Lexapp here is a made-up app, tests/support/sample-app.ts, because no listed app has a link without an https fallback) opens the app by its own scheme. When the page is still in front about 1.5 seconds after
  the tap, the app did not open: a small sheet says "<App> isn't on this phone" with two buttons, "Get <App>" (the Play Store on Android,
  the App Store on iOS) and "Turn off <App>" (the resource goes off in Settings at once and its links leave the word sheet). A link that
  has an https fallback (Logos) opens that instead and shows no sheet. The Study links sit in a grid of equal tiles with short labels,
  grouped under the app's name.

  Scenario: Lexapp does not open, so the sheet says it is not on this phone
    Given Lampas is opened on Romans 8 with Lexapp on and the phone is an Android phone
    When he taps the word "work together" in verse 28
    And he taps the Study link "Open in Lexapp"
    And the page stays in front for the wait
    Then a sheet says "Lexapp isn't on this phone"
    And the sheet has a "Get Lexapp" link to the Play Store
    And the sheet has a "Turn off Lexapp" button

  Scenario: On an iPhone Get Lexapp goes to the App Store
    Given Lampas is opened on Romans 8 with Lexapp on and the phone is an iPhone
    When he taps the word "work together" in verse 28
    And he taps the Study link "Open in Lexapp"
    And the page stays in front for the wait
    Then a sheet says "Lexapp isn't on this phone"
    And the sheet has a "Get Lexapp" link to the App Store

  Scenario: The wait is about one and a half seconds
    Given Lampas is opened on Romans 8 with Lexapp on and the phone is an Android phone
    Then the wait for an app to open is 1500 milliseconds

  Scenario: Turn off Lexapp switches it off and its link leaves the word sheet
    Given Lampas is opened on Romans 8 with Lexapp on and the phone is an Android phone
    When he taps the word "work together" in verse 28
    And he taps the Study link "Open in Lexapp"
    And the page stays in front for the wait
    And he taps "Turn off Lexapp" on the sheet
    Then the sheet is closed
    And the word sheet has no Study row
    And the setting "resource.sampleapp" holds "off"

  Scenario: Done leaves Lexapp on
    Given Lampas is opened on Romans 8 with Lexapp on and the phone is an Android phone
    When he taps the word "work together" in verse 28
    And he taps the Study link "Open in Lexapp"
    And the page stays in front for the wait
    And he taps Done on the sheet
    Then the sheet is closed
    And the Study row still has the link "Open in Lexapp"

  Scenario: Back closes the sheet and leaves the word sheet open
    Given Lampas is opened on Romans 8 with Lexapp on and the phone is an Android phone
    When he taps the word "work together" in verse 28
    And he taps the Study link "Open in Lexapp"
    And the page stays in front for the wait
    And he taps the phone's Back
    Then the sheet is closed
    And the Study row still has the link "Open in Lexapp"

  Scenario: When the app takes the page away there is no sheet
    Given Lampas is opened on Romans 8 with Lexapp on and the phone is an Android phone
    When he taps the word "work together" in verse 28
    And he taps the Study link "Open in Lexapp"
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
    Given Lampas is opened on Romans 8 with Logos and Lexapp on and Lexham ticked
    When he taps the word "condemnation" in verse 1
    Then the Study group "Logos" has the tiles "BDAG", "Lexham Theological Wordbook", "Bible Word Study"
    And the Study group "Lexapp" has the tiles "BDAG"
    And the tile "Lexham Theological Wordbook" is still named "Open in Logos: Lexham Theological Wordbook"
