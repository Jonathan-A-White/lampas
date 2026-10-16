Feature: The phone times every tutor answer
  Lampas times its part of each tutor answer: the tap to the request accepted, the answer waiting to be seen by a poll,
  and seen to drawn. It keeps the last answer's timing and reports it to the mill as client_timing on the NEXT grist,
  and Settings > About shows the last answer's split. Times are in milliseconds on the wire and seconds on the screen.

  Scenario: The next grist carries the phone's part of the last answer
    Given a phone that has never asked the tutor
    When he taps at 0 s and the mill accepts the request at 1.2 s
    And the mill delivers the answer at 7.0 s and the poll sees it at 8.5 s
    And the answer is drawn at 8.6 s
    And he asks again
    Then the grist carries client_timing for the first grist with tap to sent 1200, delivered to seen 1500 and seen to shown 100

  Scenario: About shows the split of the last answer
    Given a phone that has never asked the tutor
    When he taps at 0 s and the mill accepts the request at 1.2 s
    And the mill delivers the answer at 7.0 s and the poll sees it at 8.5 s
    And the answer is drawn at 8.6 s
    Then About says "Last tutor answer: 8.6 s (phone 1.3 s, waiting to see it 1.5 s, factory 5.8 s)"

  Scenario: The first grist after install carries no client_timing
    Given a phone that has never asked the tutor
    When he asks
    Then the grist carries no client_timing

  Scenario: A failed grist reports no timing for itself
    Given a phone that has never asked the tutor
    And the first answer was timed and drawn
    When the mill fails his next grist
    And he asks again
    Then the second grist carried the first answer's timing
    And the third grist carries no client_timing

  Scenario: An abandoned grist reports no timing for itself
    Given a phone that has never asked the tutor
    When he asks and leaves before the answer comes
    And he asks again
    Then the grist carries no client_timing

  Scenario: The network time rides with the report and shows in About
    Given a phone that has never asked the tutor
    When he taps at 0 s and the request takes 0.4 s to reach the mill and be accepted at 1.2 s
    And the mill delivers the answer at 7.0 s and the poll that sees it at 8.2 s takes 0.3 s
    And the answer is drawn at 8.6 s
    And he asks again
    Then the grist carries network 700
    And About says "Last tutor answer: 8.6 s (phone 0.9 s, network 0.7 s, waiting to see it 1.2 s, factory 5.8 s)"

  Scenario: A phone whose clock is ahead of the backend's never waits longer than the answer took
    Given a phone that has never asked the tutor
    When he taps at 0 s and the mill accepts the request at 1.2 s
    And the backend, its clock 30 s behind the phone's, delivers the answer at 7.0 s and the poll sees it at 8.5 s
    And the answer is drawn at 8.6 s
    And he asks again
    Then the grist carries a delivered to seen of at most 8500
    And About's line has parts that add up to its total of 8.6 s within 0.1
