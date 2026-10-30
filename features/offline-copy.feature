Feature: Keep on this phone (mw-lcv9z3g.2)
  Settings > Reading has a row, Keep on this phone, that keeps the chapters on the phone to read with no signal: Nothing extra (to start), New Testament (34 MB) or Whole Bible (113 MB).
  Choosing a scope starts the offline copy (src/data/offlineCopy.ts); the row counts the chapters kept and the megabytes fetched while the run goes, says Keep the app open, says
  Paused: offline while the phone is offline and, when every chapter is kept, Up to date with the time of the check. Choosing Nothing extra stops the run and deletes nothing. The
  choice is kept across a reload.

  Scenario: Settings offers three choices with their sizes, Nothing extra to start
    Given Settings is open at Reading with nothing chosen
    Then Keep on this phone offers "Nothing extra", "New Testament (34 MB)" and "Whole Bible (113 MB)" with "Nothing extra" chosen
    And the row says nothing about progress

  Scenario: Choosing New Testament starts the run and the row shows progress
    Given Settings is open at Reading with nothing chosen
    When he chooses "New Testament (34 MB)" in the group "Keep on this phone"
    Then the row reads "5 of 260 chapters · 1 MB"
    And the row says "Keep the app open"
    And the setting "offlineCopy" is kept as "nt"

  Scenario: The row says Up to date with the time of the check when every chapter is kept
    Given Settings is open at Reading with nothing chosen
    When he chooses "New Testament (34 MB)" in the group "Keep on this phone"
    And the rest of the chapters arrive
    Then the row reads "Up to date · checked" and a time
    And the row no longer says "Keep the app open"

  Scenario: The row says Paused: offline while the phone is offline and goes on when it is back
    Given Settings is open at Reading with nothing chosen
    When he chooses "New Testament (34 MB)" in the group "Keep on this phone"
    And the phone goes offline
    Then the row says "Paused: offline"
    When the phone is back online
    And the rest of the chapters arrive
    Then the row reads "Up to date · checked" and a time

  Scenario: Choosing Nothing extra stops the run and deletes nothing
    Given Settings is open at Reading with a chapter already kept
    When he chooses "New Testament (34 MB)" in the group "Keep on this phone"
    And he chooses "Nothing extra" in the group "Keep on this phone"
    Then no more chapters are fetched
    And the chapter already kept is still kept and nothing was deleted
    And the setting "offlineCopy" is kept as "none"
    And the row says nothing about progress

  Scenario Outline: The choice is there after a reload
    Given Settings is open at Reading with nothing chosen
    When he chooses <choice> in the group "Keep on this phone"
    Then the setting "offlineCopy" is kept as <kept>
    When Settings is opened again at Reading
    Then Keep on this phone has <choice> chosen

    Examples:
      | choice                 | kept |
      | New Testament (34 MB)  | nt   |
      | Whole Bible (113 MB)   | all  |
      | Nothing extra          | none |

  Scenario: A phone that kept the New Testament checks it again when Settings opens
    Given Settings is open at Reading with the New Testament chosen and every chapter kept
    Then the row reads "Up to date · checked" and a time

  Scenario: With the New Testament kept and the browser offline, a lesson's passage card opens and reads
    Given the New Testament is kept and the browser is offline
    When he opens the passage card "Acts 18:7"
    Then the card reads the verse
    And the card says nothing about being offline or about a fetch
