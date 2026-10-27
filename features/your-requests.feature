Feature: Your requests
  Settings and About each have a Your requests row. It opens a screen that lists every request he sent to the factory (an approach he
  asked for, an ask the tutor could not meet), the newest first, each with where it stands and since when: Sent to the factory, Filed as a story, Being built, Adopted in a version
  (a link to the commit), Declined with the reason, or Now a setting with the setting's name. The backend pushes nothing, so the screen
  pulls GET /api/messages?since= from a cursor it keeps, when it opens, every 20 seconds while it is up and at once when the phone shows
  the app again after hiding it, never while it is hidden, and believes only a
  request-status record the mill key sealed to this phone, for a request this phone sent. Postern's protocol section 19 says what a record holds.

  Scenario: A request nobody has answered yet reads Sent
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    Then the request "Add a sepia theme" reads "Sent to the factory · <date>"

  Scenario: A tap on any request opens it, and a second tap folds it again
    Given Your requests is open with one ask that keeps his words and one kept before the phone kept them
    Then both requests are buttons, folded to three lines
    When he taps the ask that keeps his words
    Then it shows his words, the tutor's summary and the kind, and is open
    When he taps it again
    Then it is folded to three lines and shows no summary of its own
    When he taps the ask kept before
    Then it shows its summary in full and no tutor's summary of its own

  Scenario: A filed request reads Filed
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    When the mill sends the status "filed" for "Add a sepia theme"
    Then the request "Add a sepia theme" reads "Filed as a story · <date>, waiting its turn"

  Scenario: A request being built reads Being built
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    When the mill sends the status "building" for "Add a sepia theme"
    Then the request "Add a sepia theme" reads "Being built · since <date>"

  Scenario: A landed request reads Adopted in the version and links to the commit
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    When the mill sends the status "landed" in version "0.1.86" for "Add a sepia theme"
    Then the request "Add a sepia theme" reads "Adopted in 0.1.86 · <date>"
    And "Adopted in 0.1.86 · <date>" is a link to the commit the record names

  Scenario: A declined request reads Declined with the reason
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    When the mill sends the status "declined" for "Add a sepia theme" because "outside what this app is for"
    Then the request "Add a sepia theme" reads "Declined · <date>: outside what this app is for"

  Scenario: A request adopted as a setting reads Now a setting with its name
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    When the mill sends the status "adopted-as-setting" for "Add a sepia theme" naming the setting "Settings > Appearance > Sepia"
    Then the request "Add a sepia theme" reads "Now a setting: Settings > Appearance > Sepia · <date>"

  Scenario: The newest status by its time wins, whatever order the records arrive in
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    When the mill sends the status "building" at a later time and then the status "filed" at an earlier time for "Add a sepia theme"
    Then the request "Add a sepia theme" reads "Being built · since <date>"

  Scenario: A status for a request this phone did not send changes nothing
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    When the mill sends a status for a request this phone never sent
    And the mill sends the status "filed" for "Add a sepia theme"
    Then the request "Add a sepia theme" reads "Filed as a story · <date>, waiting its turn"
    And the phone keeps only the one request

  Scenario: A status sealed by any key but the mill's changes nothing
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    When another key sends the status "declined" for "Add a sepia theme"
    And the mill sends the status "filed" for "Add a sepia theme"
    Then the request "Add a sepia theme" reads "Filed as a story · <date>, waiting its turn"

  Scenario: A record that is not a request status changes nothing
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    When the mill sends a record that is an answer, not a request status
    And the mill sends a status the screen has no words for
    And the mill sends the status "filed" for "Add a sepia theme"
    Then the request "Add a sepia theme" reads "Filed as a story · <date>, waiting its turn"

  Scenario: The list pulls when it opens and again while it is up, from a kept cursor
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    Then the first pull asked from the start
    When the mill sends the status "filed" for "Add a sepia theme"
    Then the request "Add a sepia theme" reads "Filed as a story · <date>, waiting its turn"
    And every later pull asked from the kept cursor, never from the start
    And the kept cursor is 1

  Scenario: A record already applied is not applied twice
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    When the mill sends the status "filed" for "Add a sepia theme"
    And the request "Add a sepia theme" reads "Filed as a story · <date>, waiting its turn"
    And the phone's row for "Add a sepia theme" is changed to building by hand
    Then after another pull the request "Add a sepia theme" still reads "Being built"

  Scenario: Opening the screen again goes on from the kept cursor
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    When the mill sends the status "filed" for "Add a sepia theme"
    And the request "Add a sepia theme" reads "Filed as a story · <date>, waiting its turn"
    And he leaves the screen and opens it again
    Then the first pull of the new visit asked from the kept cursor

  Scenario: The pulling stops when he leaves the screen
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    When he leaves the screen
    Then the backend is not asked again

  Scenario: Coming back to the app pulls at once, not at the next tick
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme", pulling only once a minute
    And the first pull has been made
    When the phone hides Lampas
    And the mill sends the status "filed" for "Add a sepia theme"
    And the phone shows Lampas again
    Then one pull is made at once
    And the request "Add a sepia theme" reads "Filed as a story · <date>, waiting its turn"

  Scenario: While the app is hidden the screen pulls nothing
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    And the first pull has been made
    When the phone hides Lampas
    And the mill sends the status "filed" for "Add a sepia theme"
    Then the backend is not asked while the app is hidden
    And the request "Add a sepia theme" still reads "Sent to the factory · <date>"

  Scenario: With no request sent the screen says so
    Given Your requests is open behind a fake Postern with no request
    Then the screen says nothing has been sent yet

  Scenario: The newest request is first
    Given Your requests is open behind a fake Postern with the requests "Older idea" and "Newer idea"
    Then "Newer idea" is listed above "Older idea"

  Scenario: Requests are grouped by kind, each group with its count, the newest first within a group
    Given Your requests is open with 3 books, 2 asks of the tutor and a library request
    Then the groups read "Asked the tutor (2)", "Your Logos library (1)" and "Books (3)", the group holding the newest request first
    And within "Books (3)" the newest book is listed first

  Scenario: A library request is one row with its count
    Given Your requests is open with 3 books, 2 asks of the tutor and a library request
    Then the "Your Logos library" group holds one row reading "My Logos library: 198 of 4597 books"

  Scenario: Twenty requests show no search field
    Given Your requests is open with 20 requests
    Then there is no search field

  Scenario: Twenty-one requests show a search field that filters by words
    Given Your requests is open with 21 requests, 14 of them books
    Then there is a search field for 21 requests
    When he types "guzik" in the search field
    Then only the requests with "guzik" in them are listed
    And the group headers count what is shown
    When he clears it and types "zzzz"
    Then the screen says no request matches

  Scenario: A backend that cannot be reached leaves the list as it was and says so
    Given Your requests is open behind a fake Postern with the request "Add a sepia theme"
    When the backend goes down
    Then the screen says it could not check for news
    And the request "Add a sepia theme" reads "Sent to the factory · <date>"

  Scenario: Settings has a Your requests row
    Given Settings is open
    When he taps Your requests
    Then the Your requests screen is open

  Scenario: About has a Your requests button
    Given About is open
    When he taps Your requests
    Then the Your requests screen is open

  Scenario: Opened from About, the back button goes back to About
    Given About is open
    When he taps Your requests
    Then the Your requests screen is open
    And the header button reads "‹ About"
    When he taps the header button
    Then About is open again

  Scenario: Opened from Settings, the back button goes back to Settings
    Given Settings is open
    When he taps Your requests
    Then the header button reads "‹ Settings"
    When he taps the header button
    Then Settings is open again

  Scenario: A double tap on the Settings row adds one history entry
    Given Settings is open
    When he double taps Your requests
    Then the Your requests screen is open
    And one history entry was added

  Scenario: A double tap on the back button does not skip past Settings
    Given Settings is open
    When he taps Your requests
    And he double taps the header button
    Then Settings is open again
