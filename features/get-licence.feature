Feature: The Licence page explains what a licence unlocks and has Get a licence
  A person with no licence opens the Licence page (#/unlock). It says in three plain sentences what a licence unlocks (the AI tutor), that it is
  free, that an email and a phone are checked by Twilio and that Lampas keeps them only as scrambled fingerprints, and it has Get a licence.
  Get a licence asks for an email and a phone (with its country code), sends a code to each, takes the two codes, and says "Licensed. Tap Check
  again." when the site issuer has licensed this phone's key; Check again then finds the licence on the chain. A refusal from the backend is
  shown in its own words (mw-cvwm1u.4).

  Scenario: The Licence page says what a licence unlocks and has Get a licence
    Given this phone has no licence and the Licence page is open
    Then the Licence page says what a licence unlocks in three sentences
    And the Licence page has a Get a licence button
    And the Licence page has no coming soon

  Scenario: A licensed phone is not offered Get a licence
    Given this phone has a licence and the Licence page is open
    Then the Licence page has no Get a licence button

  Scenario: Registering with an email, a phone and two codes licenses this phone
    Given this phone has no licence and the Licence page is open
    When he taps Get a licence
    And he types the email "reader@example.com" and the phone "+1 415 555 0101"
    And he taps Send codes
    Then the backend was asked to start with this phone's key
    When he types the email code "123456" and the phone code "654321"
    And he taps Confirm
    Then the page says "Licensed. Tap Check again."
    When he taps Check again
    Then the Licence page says "Licensed"

  Scenario: The backend's refusal is shown in its own words
    Given this phone has no licence and the Licence page is open
    When he taps Get a licence
    And he types the email "reader@example.com" and the phone "+1 415 555 0101"
    And the backend refuses to start with 409 "that email is already registered"
    And he taps Send codes
    Then the page shows "that email is already registered"
    And the email and phone are still there to change

  Scenario: A wrong code says how many tries are left and lets him try again
    Given this phone has no licence and the Licence page is open
    When he taps Get a licence
    And he types the email "reader@example.com" and the phone "+1 415 555 0101"
    And he taps Send codes
    And he types the email code "111111" and the phone code "222222"
    And the backend refuses to confirm with 400 "that code is not right" and 4 tries left
    And he taps Confirm
    Then the page shows "that code is not right (4 tries left)"
    And the two code fields are still there

  Scenario: A phone that already has three devices is told so
    Given this phone has no licence and the Licence page is open
    When he taps Get a licence
    And he types the email "reader@example.com" and the phone "+1 415 555 0101"
    And he taps Send codes
    And he types the email code "123456" and the phone code "654321"
    And the backend refuses to confirm with 409 "This licence already has 3 devices. Remove one first."
    And he taps Confirm
    Then the page shows "This licence already has 3 devices. Remove one first."

  Scenario: A closed registration is shown as the backend says it
    Given this phone has no licence and the Licence page is open
    When he taps Get a licence
    And he types the email "reader@example.com" and the phone "+1 415 555 0101"
    And the backend refuses to start with 503 "registration closed"
    And he taps Send codes
    Then the page shows "registration closed"
