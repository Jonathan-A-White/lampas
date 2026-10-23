Feature: The tutor is told his shelf by the place, and links a book on it
  The tutor is told a digest of his Logos shelf chosen by the place he is on (mw-rfjjzd.10, docs/design/library-at-scale.md section 7): the pinned books first,
  then the commentaries that cover the chapter, then, for a question about a form or a reading, the grammars and the Greek texts, never a lexicon. An answer
  may link one of them as a `work`; a link to a book that is not on his shelf draws nothing, and a commentary opens in Logos at the verse.

  Scenario: A link to a book that is not on his shelf draws nothing
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the work "LLS:SBLGNT" at "Romans 8:28"
    And the shelf holds "LLS:CALCOM66RO"
    When he asks the tutor "Is there a variant reading in this verse?" about verse 28
    Then the answer shows no study links

  Scenario: A commentary chip opens in Logos at the verse
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the work "calvin-commentaries" at "Romans 8:28"
    And the shelf holds "LLS:CALCOM66RO"
    When he asks the tutor "What does Calvin make of this verse?" about verse 28
    Then the answer shows the study link "Open in Logos: Calvin's Commentaries at Romans 8:28" to "logosres:LLS:CALCOM66RO;ref=Bible.Ro8.28"
    And that link has the fallback "https://ref.ly/logosres/LLS%3ACALCOM66RO?ref=Bible.Ro8.28"

  Scenario: A Greek text on his shelf opens in Logos at the verse
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the work "LLS:SBLGNT" at "Romans 8:28"
    And the shelf holds "LLS:SBLGNT"
    When he asks the tutor "Is there a variant reading in this verse?" about verse 28
    Then the answer shows the study link "Open in Logos: SBLGNT at Romans 8:28" to "logosres:LLS:SBLGNT;ref=Bible.Ro8.28"

  Scenario: The request carries the pinned book first and the books that fit the place, and no lexicon
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the work "calvin-commentaries" at "Romans 8:28"
    And the shelf holds all of "LLS:CALCOM66RO", "LLS:CALCOM64JN", "LLS:SBLGNT" and "LLS:46.30.18"
    And the shelf holds "LLS:LRNTOREADNTGRK" pinned
    When he asks the tutor "Is there a variant reading in this verse?" about verse 28
    Then the request named the books "LLS:LRNTOREADNTGRK,calvin-commentaries,LLS:SBLGNT"
