Feature: Install Lampas on a phone
  Lampas installs from the browser like an app, never zooms or scrolls under the reader's thumb,
  and takes a new build only when he taps.

  Scenario: The manifest makes Lampas installable
    Given the app is built
    Then the manifest names the app Lampas, display standalone, with 192 and 512 icons

  Scenario: The page cannot be zoomed or scrolled
    Given the document and its root stylesheet
    Then the document forbids pinch zoom and double-tap zoom and the body never scrolls under the app

  Scenario: An update waits for a tap
    Given the service worker registers with the prompt flow
    And a newer build is waiting behind the one in control
    Then the banner says Update
    And nothing is taken yet
    When he taps Update
    Then the waiting build is told to take over
