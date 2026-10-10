Feature: Lampas says what's new
  Every release says what changed. The Update ready banner names the waiting version and what is in it, a sheet
  tells him once after an update, About lists every version, and the version there links to CHANGELOG.md on GitHub.
  The words come from the changelog the build ships (public/changelog.json) through bsv-kit's whats-new.

  Scenario: The Update ready banner names the waiting version and what is in it
    Given a newer build is waiting and its changelog lists 1 new line and 1 fixed line for it
    Then the update banner still reads "Update ready, tap to reload"
    And the banner also says its version with "1 new, 1 fixed"

  Scenario: What's new in the banner opens the lines of the waiting version
    Given a newer build is waiting and its changelog lists 1 new line and 1 fixed line for it
    When he taps "What's new" in the banner
    Then the What's new sheet lists the new line, then the fixed line, of the waiting version
    And the What's new sheet does not list the version he is running
    When he closes the What's new sheet
    Then there is no What's new sheet

  Scenario: A waiting build with nothing new in its changelog shows the banner alone
    Given a newer build is waiting and its changelog has nothing after the running version
    Then the update banner still reads "Update ready, tap to reload"
    And the banner has no What's new button

  Scenario: After an update the sheet shows once
    Given the phone last saw an older version and the changelog lists lines since
    When Lampas opens
    Then the What's new sheet lists the lines of every version since, newest first
    When he closes the What's new sheet
    And Lampas opens again
    Then there is no What's new sheet

  Scenario: A first install is not told what's new
    Given the phone has never opened Lampas and the changelog lists lines
    When Lampas opens
    Then there is no What's new sheet

  Scenario: About lists every version and can check for updates
    Given the changelog lists three versions
    When he opens About
    Then About lists every version with its lines, newest first
    And About has a "Check for updates" button
    When he taps "Check for updates"
    Then About says "Up to date"

  Scenario: The version in About links to its place in CHANGELOG.md on GitHub
    Given the changelog lists three versions
    When he opens About
    Then the version link goes to CHANGELOG.md on GitHub at this version's heading
    And the version still shows the build's time and commit
