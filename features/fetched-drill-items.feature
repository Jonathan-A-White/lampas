Feature: More drill items from the mill, in the background
  After a Review round that shows a gap in an idea, Lampas asks the mill, without making him wait, for more short items on his weakest ideas, made from
  verses of the passage he reads. They are kept on the phone and the next round starts with one of them on that idea. The round and its end card never depend on the mill.

  Scenario: Misses on the second declension bring a fetched item into the next round
    Given the second declension is due in Review and the mill will answer a drill-items grist
    When he misses the second declension in a Review round
    Then the mill is sent one drill-items grist naming "declension-2"
    When the mill answers it with items made from the verses it was sent
    Then the items are kept for "declension-2"
    When he starts the next Review round
    Then the round asks the second declension with an item the mill wrote
    And the kept items for "declension-2" are used up

  Scenario: The end card is drawn while the mill has not answered
    Given the second declension is due in Review and the mill will answer a drill-items grist
    When he misses the second declension in a Review round
    Then the end card of the round shows
    And the mill is sent one drill-items grist naming "declension-2"
    And nothing is kept for "declension-2" yet

  Scenario: Items that do not match the verses are dropped
    Given the second declension is due in Review and the mill will answer a drill-items grist
    When he misses the second declension in a Review round
    And the mill answers it with items that do not match the verses it was sent
    Then nothing is kept for "declension-2"

  Scenario: With no licence a finished round asks the mill for no More drill items
    Given the second declension is due in Review and this phone has no licence
    When he misses the second declension in a Review round
    Then the end card of the round shows
    And the mill is sent no drill-items grist
