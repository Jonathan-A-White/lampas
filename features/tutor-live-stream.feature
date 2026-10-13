Feature: The phone hears a tutor answer the moment it is ready
  While a tutor answer is awaited, Lampas listens on the backend's live event stream (GET /api/events) and fetches the answer as soon as the stream
  names it, instead of waiting for the next poll. The stream is open only while an answer is awaited. A poll stays as a backstop: every 3 s while the
  stream is not up, every 15 s while it is. A dropped stream is reconnected with a backoff of 1 s doubling to 30 s.

  Scenario: An answer announced on the stream is fetched at once
    Given a backend with a live event stream
    When he asks the tutor and the stream is up
    And the mill answers
    Then the answer is shown within 0.5 s of the announcement

  Scenario: A dropped stream is reconnected and an answer delivered meanwhile is still shown
    Given a backend with a live event stream
    When he asks the tutor and the stream is up
    And the stream drops
    And the mill answers
    Then the stream is reconnected and the answer is shown within 1.5 s

  Scenario: Polls carry the wait while the stream cannot be reopened
    Given a backend with a live event stream
    When he asks the tutor and the stream is up
    And the stream drops and the backend refuses a new one
    And the mill answers
    Then the answer is shown within 3.5 s

  Scenario: No stream is open when no answer is awaited
    Given a backend with a live event stream
    Then no stream is open
    When he asks the tutor and the stream is up
    And the mill answers
    Then the answer is shown within 0.5 s of the announcement
    And no stream is open any more

  Scenario: A wait that is abandoned closes the stream
    Given a backend with a live event stream
    When he asks the tutor and the stream is up
    And he leaves before the answer comes
    Then no stream is open

  Scenario: Two waits at once share one stream
    Given a backend with a live event stream
    When he asks the tutor twice and the stream is up
    Then one stream is open

  Scenario: A stream that goes quiet is read as dropped and opened again
    Given a backend with a live event stream
    When he asks the tutor and the stream is up
    And the stream says nothing for over a minute
    Then the stream was opened a second time

  Scenario: A backend that offers no event stream is polled
    Given a backend with no event stream
    When he asks the tutor
    And the mill answers
    Then the answer is shown at the next poll
    And no stream was ever asked for
