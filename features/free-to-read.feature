Feature: Lampas is free to read
  Lampas opens for anyone, with or without a licence. The licence check still runs as it always did, but its answer
  is only a state the app reads (licensed, not licensed, or still checking); it no longer stands in front of the
  app, and a shared verse link opens for anybody.

  Scenario: With no licence the app opens on the Reader and the word sheet, a lesson and the quiz open
    Given this phone has no licence and Lampas is opened
    Then the app opens on the Reader
    When he taps a word in verse 1
    Then the word sheet opens
    When he opens a lesson on the Goal screen
    Then the idea sheet opens
    When he opens the Quick test
    Then the first question is shown

  Scenario: With no licence a shared verse link opens that verse
    Given this phone has no licence and the link "#/?ref=Rom.8.28" is opened
    Then the reader is headed "Romans 8"
    And the Verse view shows verse 28

  Scenario: useLicence reports licensed when the chain says the key holds a licence
    Given the issuer minted a licence to this phone's key on a stub chain
    When the licence state is read
    Then the licence state is "licensed"

  Scenario: useLicence reports not-licensed when the key has no licence
    Given this phone's key has no licence on a stub chain
    When the licence state is read
    Then the licence state is "not-licensed"

  Scenario: useLicence reports not-licensed when the licence was revoked
    Given the issuer minted a licence to this phone's key on a stub chain
    And the issuer then signed a revoke for it
    When the licence state is read
    Then the licence state is "not-licensed"

  Scenario: useLicence reports checking until the chain answers
    Given the chain has not answered yet
    When the licence state is read
    Then the licence state is "checking"

  Scenario: useLicence reports not-licensed when the chain cannot be reached and no licence is remembered
    Given the chain cannot be reached
    When the licence state is read
    Then the licence state is "not-licensed"

  Scenario: useLicence reports licensed from a remembered licence while the chain cannot be reached
    Given this phone held a licence an hour ago and the chain cannot be reached
    When the licence state is read
    Then the licence state is "licensed"
