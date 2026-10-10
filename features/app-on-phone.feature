Feature: Turning a study app On never opens it, and Settings offers to get it
  The Governor (2026-10-09): turning Logos Off and On again opened Logos on an empty Bible Word Study page ("it shouldn't actually open
  Logos, so it should just see"), and Accordance, which he does not have, turned itself Off with no chance to get it. A web page cannot
  quietly see which native apps a phone has, so turning Logos or Accordance On only turns the switch On: it opens nothing, checks nothing,
  and the switch stays On. While it is On the row says "Don't have <App>?" with a Get <App> link to the phone's store. Off shows only the row.
  (PROVISIONAL, Governor to confirm.) The word sheet's own "App isn't on this phone" after a failed open is unchanged (features/app-missing.feature).

  Scenario: Turning Logos On opens nothing and offers Get Logos
    Given Lampas is opened on Settings and the phone is an Android phone
    When he turns the switch "Logos" On
    Then nothing was opened: no navigation, no window.open and no app address
    And the switch "Logos" is On
    And Settings has the group "Logos lexicons"
    And Settings says "Don't have Logos?"
    And Settings has a link "Get Logos"

  Scenario: Accordance On offers Get Accordance on Google Play and stays On
    Given Lampas is opened on Settings and the phone is an Android phone
    When he turns the switch "Accordance" On
    And 5 seconds pass
    Then the switch "Accordance" is On
    And Settings says "Don't have Accordance?"
    And the link "Get Accordance" goes to "https://play.google.com/store/apps/details?id=com.accordancebible.accordance"
    And the setting "resource.accordance" holds "on"
    And nothing was opened: no navigation, no window.open and no app address

  Scenario: Turning an app Off hides its details and says nothing about looking for it
    Given Lampas is opened on Settings and the phone is an Android phone with Accordance on
    When he turns the switch "Accordance" Off
    Then the switch "Accordance" is Off
    And Settings has no link "Get Accordance"
    And Settings does not say "Don't have Accordance?"
    And Settings also does not say "Looking for Accordance on this phone…"
    And Settings has no text with "found"
    And nothing was opened: no navigation, no window.open and no app address

  Scenario: Settings never says it is looking for an app or that it found one
    Given Lampas is opened on Settings and the phone is an Android phone
    When he turns the switch "Accordance" On
    And he also turns the switch "Logos" On
    Then Settings has no text with "Looking for"
    And Settings has no text with " found" either

  Scenario: Strong's needs no app, so it offers no Get link
    Given Lampas is opened on Settings and the phone is an Android phone
    When he turns the switch "Strong's" On
    Then the switch "Strong's" is On
    And Settings has no link "Get Strong's"
    And nothing was opened: no navigation, no window.open and no app address

  Scenario: The word sheet's Study lists only the resources that are On
    Given Lampas is opened on Settings and the phone is an Android phone
    When he turns the switch "Accordance" On
    And he goes back to the reader
    And he taps the word "work together" in verse 28
    Then the Study group "Accordance" is listed
    And the Study group "Logos" is not listed
