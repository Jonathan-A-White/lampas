Feature: More drill items from the mill, in the background
  After a Review round that shows a gap in an idea, Lampas asks the mill, without making him wait, for more short items on his weakest ideas, made from
  verses of the passage he reads. They are kept on the phone and the next round starts with one of them on that idea. The round and its end card never depend on the mill.
  The Drill it screens (Drill it, the short drill, Prove it) ask a kept item too, once, and never wait for the mill; the phone keeps the questions he has been asked, and none is asked again.

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

  Scenario: A kept item is asked in a short drill and then used up
    Given the mill wrote an item for the second declension and it is kept
    When he starts a short drill on the second declension
    Then the short drill asks the item the mill wrote
    And the kept items for "declension-2" are used up
    And the mill's item is noted as asked on "declension-2"

  Scenario: A drill with nothing kept asks built questions without waiting for the mill
    Given nothing is kept for the second declension
    When he starts a short drill on the second declension
    Then the short drill asks a built question at once
    And the mill is sent no drill-items grist

  Scenario: A right answer on an idea he missed before is confirmed on a question he has not been asked
    Given the genitive case is due in Review, he missed it before, and the mill will answer a drill-items grist
    When he answers the genitive case right in a Review round
    Then the genitive case is marked to confirm
    And the mill is sent one drill-items grist naming "case-genitive" with the question he saw
    When the mill answers it with items made from the verses it was sent
    Then the items are kept for "case-genitive"
    When he starts the next Review round
    Then the round asks the genitive case with an item the mill wrote
    And the genitive case is known: it is no longer to confirm and its row has moved up

  Scenario: Prove it does not prove an idea whose questions he has all seen, and proves it on fresh ones
    Given he has been asked every question of the top step of Drill it on the genitive case but one
    When he starts Prove it on the genitive case
    Then Prove it says more questions are on their way
    And the mill is sent one drill-items grist naming "case-genitive"
    And the genitive case is not proved
    When the mill answers it with two items made from the verses it was sent
    And he starts Prove it on the genitive case again
    And he answers every question of Prove it right
    Then Drill it says it is proved
    And Prove it asked no question he had been asked before

  Scenario: Misses on the Hebrew article ask the mill for Hebrew items from Hebrew verses
    Given the Hebrew article is due in Review and the mill will answer a drill-items grist
    When he misses the Hebrew article in a Review round
    Then the mill is sent one drill-items grist naming "he-article" in Hebrew, with Hebrew verses and words and no Greek
    When the mill answers it with Hebrew items made from the verses it was sent
    Then the items are kept for "he-article"
    And the item kept for "he-article" is a Hebrew question
