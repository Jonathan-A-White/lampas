Feature: Settings after the library
  His Logos library has a screen of its own (#/library), so Settings no longer lists books (mw-rfjjzd.5, docs/design/library-at-scale.md 3.8). Under Study resources, with Logos On,
  one row says "Your Logos library · N books on" and opens the Library; the lexicon list, Grammar books and the Works list are gone from Settings. Bible in Logos is a row that
  opens Library > Bibles, where the Resource ID can still be typed. Daily's Which devotional is a searchable picker of the devotionals that are on, with Random, and In the draw
  follows the shelf. The Settings search finds a book by its title and opens the Library at it.

  Scenario: Logos On says how many books are on and opens the Library
    Given the shelf holds the books "BDAG, Louw-Nida, LSB" and Settings is open at Study resources with Logos On
    Then the Study resources show the row "Your Logos library · 3 books on"
    And Study resources show no Logos lexicons, no Grammar books and no Works list
    When he taps the row "Your Logos library · 3 books on"
    Then the Library home opens

  Scenario: The count follows the shelf
    Given the shelf holds the books "BDAG" and Settings is open at Study resources with Logos On
    Then the Study resources show the row "Your Logos library · 1 book on"

  Scenario: With Logos Off there is no library row
    Given the shelf holds the books "BDAG" and Settings is open at Study resources with Logos Off
    Then the Study resources show no row "Your Logos library"

  Scenario: Bible in Logos opens Library > Bibles, where the Resource ID can be typed
    Given the shelf holds the books "BDAG" and Settings is open at Study resources with Logos On
    When he taps the row "Bible in Logos: LSB"
    Then the Library opens at Bibles
    When he types the Resource ID "LLS:MYOWNBIBLE.1" on the Bibles page
    Then the setting "logosBible" holds "LLS:MYOWNBIBLE.1"

  Scenario: Choosing a Bible in the Library is the Bible in Logos
    Given the shelf holds the books "BDAG" and Settings is open at Study resources with Logos On
    When he taps the row "Bible in Logos: LSB"
    And he chooses the Bible "ESV" on the Bibles page
    Then the setting "logosBible" holds "LLS:1.0.710"

  Scenario: Which devotional is a searchable picker of the devotionals that are on, with Random
    Given the shelf holds the devotionals "The Heart of Praise, Manual of Family Devotions: Arranged from the Book of Common Prayer" and Settings is open at Daily with Which devotional on Random
    Then the Which devotional picker offers "Random, The Heart of Praise, Manual of Family Devotions: Arranged from the Book of Common Prayer"
    When he searches the Which devotional picker for "praise"
    Then the Which devotional picker narrows to "The Heart of Praise"
    When he picks "The Heart of Praise" in the Which devotional picker
    Then the setting "devotional" holds "LLS:HEARTOFPRAISE"

  Scenario: In the draw follows the shelf
    Given the shelf holds the devotionals "The Heart of Praise, Manual of Family Devotions: Arranged from the Book of Common Prayer" and Settings is open at Daily with Which devotional on Random
    Then In the draw says "2 devotionals are in the draw"
    When he turns the devotional "Manual of Family Devotions: Arranged from the Book of Common Prayer" Off in the Library
    And Settings is open at Daily with Which devotional on Random
    Then In the draw now says "1 devotional is in the draw"

  Scenario: The Settings search finds a book by its title
    Given the shelf holds the books "BDAG" and Settings is open at its home
    When he searches Settings for "bdag"
    Then the search answers the book "BDAG · Your Logos library"
    When he taps the answer "BDAG · Your Logos library"
    Then the Library opens at Lexicons at the book "BDAG"
