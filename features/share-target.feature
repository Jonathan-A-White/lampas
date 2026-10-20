Feature: Lampas is a share target
  Share > Lampas from another app (the Photos app, Logos) opens Lampas on 'Share to Lampas', a sheet that asks which tutor talk the shared pictures and
  words go to: 'Continue: <the newest talk> · <when>' first, then 'New talk', then 'Choose a talk' (the recent talks, newest first, each with its first
  question and date). The pictures wait in that talk's composer and the words in its field, NOT sent. Cancel and the phone's Back drop the share. A share
  of words or a link alone works the same. The worker's half (the manifest, the parked share) is tests/unit/sw-share.test.ts and manifest.test.ts.

  Scenario: The sheet offers Continue first, then New talk, then Choose a talk
    Given the Share screen is opened with two past talks and a share of two pictures and some words
    Then the sheet "Share to Lampas" offers, in order, "Continue: Romans 8:28 · 2 hours ago", "New talk" and "Choose a talk"

  Scenario: Continue opens the newest talk with the share waiting in its composer
    Given the Share screen is opened with two past talks and a share of two pictures and some words
    When he taps "Continue: Romans 8:28 · 2 hours ago"
    Then the talk sheet "Talk about Romans 8:28" is open with his earlier question in it
    And the composer shows two thumbnails and the field holds "ἀγάπη in BDAG"
    And the mill received no message of the talk and no share is waiting

  Scenario: New talk opens an empty talk with the share
    Given the Share screen is opened with two past talks and a share of two pictures and some words
    When he taps "New talk"
    Then the talk sheet "Talk with the tutor" is open with nothing said yet
    And the composer shows two thumbnails and the field holds "ἀγάπη in BDAG"
    And the mill received no message of the talk and no share is waiting

  Scenario: Choose a talk lists the talks newest first and opens the picked one
    Given the Share screen is opened with two past talks and a share of two pictures and some words
    When he taps "Choose a talk"
    Then the talks listed are "Romans 8:28" then "Romans 8", each with its first question and its date
    When he picks "Romans 8"
    Then the talk sheet "Talk about Romans 8" is open with his earlier question in it
    And the composer shows two thumbnails and the field holds "ἀγάπη in BDAG"

  Scenario: Cancel drops the share
    Given the Share screen is opened with two past talks and a share of two pictures and some words
    When he taps "Cancel"
    Then no share is waiting and the Reader is open

  Scenario: The phone's Back drops the share
    Given the Share screen is opened with two past talks and a share of two pictures and some words
    When he presses the phone's Back
    Then no share is waiting and the Reader is open

  Scenario: The phone's Back drops the share on a slow host
    Given the Share screen is opened with two past talks and a share of two pictures and some words
    And the host is slow to deliver Back and to forget the share
    When he presses the phone's Back
    Then no share is waiting and the Reader is open

  Scenario: A share of words alone works the same
    Given the Share screen is opened with two past talks and a share of words alone
    When he taps "Continue: Romans 8:28 · 2 hours ago"
    Then the talk sheet "Talk about Romans 8:28" is open with his earlier question in it
    And the composer shows no thumbnails and the field holds "https://example.org/entry"

  Scenario: With no past talk the sheet offers New talk alone
    Given the Share screen is opened with no past talk and a share of two pictures and some words
    Then the sheet "Share to Lampas" offers, in order, "New talk"

  Scenario: After leaving the app and coming back, the talk he was in is where he left it
    Given the Share screen is opened with two past talks and a share of two pictures and some words
    When he taps "Continue: Romans 8:28 · 2 hours ago"
    And he leaves the app and comes back
    Then the talk sheet "Talk about Romans 8:28" is open with his earlier question in it
    And the composer shows no thumbnails

  Scenario: Back from the talk leaves the share screen for the Reader
    Given the Share screen is opened with two past talks and a share of two pictures and some words
    When he taps "New talk"
    And he presses the phone's Back
    Then no share is waiting and the Reader is open

  Scenario: A shared GIF is not counted as a picture to read, and the sheet says so
    Given the Share screen is opened with two past talks and a shared GIF
    Then the sheet says Lampas leaves the GIF out because it reads only JPEG, PNG or WebP, and does not count it as a picture
    And the sheet offers no "Continue: Romans 8:28 · 2 hours ago", "New talk" or "Choose a talk", only "Cancel"
    And no picture was sent to the mill to be read

  Scenario: A share of nothing Lampas can read offers only Cancel, whatever the file is
    Given the Share screen is opened with two past talks and a shared PDF
    Then the sheet says "1 picture left out: Lampas reads only JPEG, PNG or WebP."
    And the sheet offers no "Continue: Romans 8:28 · 2 hours ago", "New talk" or "Choose a talk", only "Cancel"

  Scenario: A share of a file of an unknown type offers only Cancel
    Given the Share screen is opened with two past talks and a shared file of no known type
    Then the sheet says "1 picture left out: Lampas reads only JPEG, PNG or WebP."
    And the sheet offers no "Continue: Romans 8:28 · 2 hours ago", "New talk" or "Choose a talk", only "Cancel"

  Scenario: With no past talk a shared GIF offers only Cancel
    Given the Share screen is opened with no past talk and a shared GIF
    Then the sheet offers no "New talk" or "Choose a talk", only "Cancel"

  Scenario: Cancel on a share of nothing readable drops it
    Given the Share screen is opened with two past talks and a shared GIF
    When he taps "Cancel"
    Then no share is waiting and the Reader is open

  Scenario: A shared GIF with some words still offers the talks, and leaves the GIF out
    Given the Share screen is opened with two past talks and a shared GIF with some words
    Then the sheet "Share to Lampas" offers, in order, "Continue: Romans 8:28 · 2 hours ago", "New talk" and "Choose a talk"
    When he taps "New talk"
    Then the talk sheet "Talk with the tutor" is open with nothing said yet
    And the composer shows no thumbnails and the field holds "ἀγάπη in BDAG"
