Feature: Ask for a preacher (mw-qtu3zvz.6, docs/sermons.md 'Ask for a preacher')
  At the foot of the Sermons sheet a 44 px row, "Ask for a preacher", tells the makers whom the sermon index lacks. It opens a small form: the preacher or collection, why (optional) and a link (optional).
  Send posts one feedback grist of the kind preacher through the one sender, forwarded to the Mayor, with the verse he was on and the sermon sources he has On; it is kept in Your requests as Ask for a book is,
  and the form then reads "Sent · the makers decide". It goes to the mill, so it is licence-gated as every mill call is: without a licence the row is greyed and says "Needs a licence". These scenarios use sermon
  sources of the tests' own (tests/support/test-sermons.ts) and a fake Postern.

  @uc-sermons-ask
  Scenario: He asks for a preacher from Romans 5:8 and the makers get his words with the verse and the sources
    Given Lampas is open on the Sermons sheet for "Romans 5:8" behind a fake Postern
    When he taps "Ask for a preacher"
    Then Send is disabled
    When he types the preacher "Martyn Lloyd-Jones", the reason "His Romans series" and the link "mljtrust.org"
    And he taps Send
    Then the mill received one feedback grist of kind preacher that names "Martyn Lloyd-Jones", the verse "Romans 5:8" and the source "Test Sermons"
    And the form says "Sent · the makers decide"
    And the phone keeps one request of kind preacher with the words "Martyn Lloyd-Jones"

  @uc-sermons-ask
  Scenario: Without a licence the row is greyed and says it needs one
    Given Lampas is open on the Sermons sheet for "Romans 5:8" behind a fake Postern with no licence
    Then the row "Ask for a preacher" is disabled and says "Needs a licence"
    And the mill has received no grist
