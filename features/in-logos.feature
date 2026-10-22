Feature: A verse in his Logos library: In Logos, and In another book…
  Where a verse is shown with an Open in Logos (docs/design/library-at-scale.md 3.6, mw-rfjjzd.9) the one button keeps opening it in his Bible; beside it, when a Greek text, an interlinear or a
  commentary that covers the book is On, a second button "In another book…" opens a chooser: Pinned, Commentaries on the book, Greek texts and Interlinears, each folded to its first three with
  "N more", a search that opens them all, and Manage at the foot. Every row is a Logos link at the verse. For an Old Testament verse the chooser lists Bibles and interlinears only.

  Scenario: The groups and counts follow the shelf and the place
    Given his shelf holds 5 commentaries on Romans, 1 commentary on John, 4 Greek texts and 2 interlinears, all On, with 1 interlinear pinned
    When he opens the chooser at "Romans 8:31"
    Then the chooser is headed "Romans 8:31 in Logos"
    And the groups read "Pinned, Commentaries on Romans (5), Greek texts (4), Interlinears (1)"
    And each group draws 3 rows at most, and "Commentaries on Romans" has "2 more" waiting
    When he taps "2 more" under "Commentaries on Romans"
    Then "Commentaries on Romans" draws 5 rows

  Scenario: Search opens every group
    Given his shelf holds 5 commentaries on Romans, 1 commentary on John, 4 Greek texts and 2 interlinears, all On, with 1 interlinear pinned
    When he opens the chooser at "Romans 8:31"
    And he searches the chooser for "Romans"
    Then "Commentaries on Romans" draws 5 rows
    And no "more" button is drawn

  Scenario: A commentary whose volume lacks the book is absent
    Given his shelf holds 5 commentaries on Romans, 1 commentary on John, 4 Greek texts and 2 interlinears, all On, with 1 interlinear pinned
    When he opens the chooser at "Romans 8:31"
    Then the chooser has no row for "Commentary on John 1"
    When he moves the chooser to "John 3:16"
    Then "Commentaries on John" draws 1 rows
    And the chooser has a row for "Commentary on John 1"

  Scenario: A book that is Off is absent
    Given his shelf holds 5 commentaries on Romans, 1 commentary on John, 4 Greek texts and 2 interlinears, all On, with 1 interlinear pinned
    And the Greek text "Greek text 2" is Off
    When he opens the chooser at "Romans 8:31"
    Then the groups read "Pinned, Commentaries on Romans (5), Greek texts (3), Interlinears (1)"
    And the chooser has no row for "Greek text 2"

  Scenario: The Old Testament card lists Bibles and interlinears only
    Given his shelf holds 5 commentaries on Romans, 1 commentary on John, 4 Greek texts and 2 interlinears, all On, with 1 interlinear pinned
    And the Bible "Bible 1" is chosen
    When he opens the chooser at "Psalm 23:1"
    Then the groups read "Pinned, Bibles (1), Interlinears (1)"
    And the chooser has no row for "Greek text 1"

  Scenario: With no verse-kind On the second door is absent
    Given his shelf holds only 3 lexicons On, and Logos is On
    When the verse's doors are drawn at "Romans 8:31"
    Then the door "In Logos" is drawn
    And the door "In another book…" is not drawn

  Scenario: With a Greek text On the second door opens the chooser
    Given his shelf holds 5 commentaries on Romans, 1 commentary on John, 4 Greek texts and 2 interlinears, all On, with 1 interlinear pinned
    When the verse's doors are drawn at "Romans 8:31"
    Then the door "In another book…" is drawn
    When he taps the door "In another book…"
    Then the chooser is headed "Romans 8:31 in Logos"

  Scenario: With Logos Off neither door is drawn
    Given his shelf holds 5 commentaries on Romans, 1 commentary on John, 4 Greek texts and 2 interlinears, all On, with 1 interlinear pinned
    And Logos is Off
    When the verse's doors are drawn at "Romans 8:31"
    Then the door "In Logos" is not drawn
    And the door "In another book…" is not drawn
