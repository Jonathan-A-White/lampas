Feature: Keep on this phone (mw-lcv9z3g.2)
  Settings > Reading has a row, Keep on this phone, that keeps the chapters on the phone to read with no signal: Nothing extra (to start), Old Testament: Hebrew, Old Testament: Septuagint, New Testament or All, each with its megabytes (mw-lcv9z3g.6; the Septuagint's from its index, which grows as books are added).
  Choosing a scope starts the offline copy (src/data/offlineCopy.ts); the row counts the chapters kept and the megabytes fetched while the run goes, says Keep the app open, says
  Paused: offline while the phone is offline and, when every chapter is kept, Up to date with the time of the check. Choosing Nothing extra stops the run and deletes nothing. The
  choice is kept across a reload.

  Scenario: Settings offers five choices with their sizes, Nothing extra to start
    Given Settings is open at Reading with nothing chosen
    Then Keep on this phone offers "Nothing extra", "Old Testament: Hebrew (77 MB)", "Old Testament: Septuagint (0.9 MB)", "New Testament (36 MB)" and "All (114 MB)" with "Nothing extra" chosen
    And the row says nothing about progress

  Scenario: Choosing New Testament starts the run and the row shows progress
    Given Settings is open at Reading with nothing chosen
    When he chooses "New Testament (36 MB)" in the group "Keep on this phone"
    Then the row reads "5 of 260 chapters · 1 MB"
    And the row says "Keep the app open"
    And the setting "offlineCopy" is kept as "nt"

  Scenario: The row says Up to date with the time of the check when every chapter is kept
    Given Settings is open at Reading with nothing chosen
    When he chooses "New Testament (36 MB)" in the group "Keep on this phone"
    And the rest of the chapters arrive
    Then the row reads "Up to date · checked" and a time
    And the row no longer says "Keep the app open"

  Scenario: The row says Paused: offline while the phone is offline and goes on when it is back
    Given Settings is open at Reading with nothing chosen
    When he chooses "New Testament (36 MB)" in the group "Keep on this phone"
    And the phone goes offline
    Then the row says "Paused: offline"
    When the phone is back online
    And the rest of the chapters arrive
    Then the row reads "Up to date · checked" and a time

  Scenario: Choosing Nothing extra stops the run and deletes nothing
    Given Settings is open at Reading with a chapter already kept
    When he chooses "New Testament (36 MB)" in the group "Keep on this phone"
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
      | New Testament (36 MB)               | nt   |
      | Old Testament: Hebrew (77 MB)       | hbo  |
      | Old Testament: Septuagint (0.9 MB)  | lxx  |
      | All (114 MB)                        | all  |
      | Nothing extra                       | none |

  Scenario: A phone that kept the New Testament checks it again when Settings opens
    Given Settings is open at Reading with the New Testament chosen and every chapter kept
    Then the row reads "Up to date · checked" and a time
    And no chapter is fetched again

  Scenario: A phone that saved the whole Bible before still has All chosen, and gains the Septuagint without fetching what it keeps
    Given Settings is open at Reading with All saved and the Hebrew and the New Testament chapters kept
    Then Keep on this phone has "All (114 MB)" chosen
    And the row reads "Up to date · checked" and a time
    And no chapter of the Old Testament or the New Testament is fetched again
    And the Septuagint's chapter and lexicon are fetched

  Scenario: Choosing Old Testament: Septuagint keeps the Septuagint's chapters and nothing of the Hebrew or Greek
    Given Settings is open at Reading with nothing chosen
    When he chooses "Old Testament: Septuagint (0.9 MB)" in the group "Keep on this phone"
    Then the row reads "Up to date · checked" and a time
    And the Septuagint's chapter and lexicon are fetched
    And no chapter of the Old Testament or the New Testament is fetched
    And the setting "offlineCopy" is kept as "lxx"

  Scenario: With the New Testament kept and the browser offline, a lesson's passage card opens and reads
    Given the New Testament is kept and the browser is offline
    When he opens the passage card "Acts 18:7"
    Then the card reads the verse
    And the card says nothing about being offline or about a fetch
