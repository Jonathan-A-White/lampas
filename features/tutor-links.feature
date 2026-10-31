@uc-logos-links @greek
Feature: The tutor links the reader's study resources
  A Bible talk answer may carry up to three links (mw-5r3p30.75): a word (its lemma) or a verse (its reference). Each shows under the
  answer as a group of chips that open in the study resources he switched on in Settings (Strong's, Logos): a word
  link in the first link of each, such as his first ticked Logos lexicon at that lemma; a verse link of any book Lampas holds in Lampas's own Reader and, with
  Logos on, in his Bible in Logos. A link to a resource he has not switched on is not shown, and nothing says so.
  An answer may also link a work of his Logos library that he ticked in Settings > Study resources > Works (mw-5r3p30.675): John Calvin's commentaries, opened at the
  passage, or his Institutes, opened at the start. The request names the ticked works (with Black's grammar first, which starts pinned), and a link to a work he did not tick is dropped.

  Scenario: A word link opens his ticked Logos lexicon at that lemma
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the word "ἀγάπη"
    And the study resource "Logos" is switched on
    When he asks the tutor about verse 28
    Then the answer shows the study link "Open in Logos: BDAG for ἀγάπη" to "logosres:LLS:46.30.18;hw=%E1%BC%80%CE%B3%CE%AC%CF%80%CE%B7"
    And that link has the fallback "https://ref.ly/logosres/LLS%3A46.30.18?hw=%E1%BC%80%CE%B3%CE%AC%CF%80%CE%B7"

  Scenario: A word link shows the first link of each resource he switched on
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the word "ἀγάπη"
    And the study resource "Strong's" is switched on
    And the study resource "Logos" is also switched on
    When he asks the tutor about verse 28
    Then the answer shows the study link "G26 for ἀγάπη" to "https://www.stepbible.org/?q=version=ESV|strong=G0026"
    And the answer also shows the study link "Open in Logos: BDAG for ἀγάπη" to "logosres:LLS:46.30.18;hw=%E1%BC%80%CE%B3%CE%AC%CF%80%CE%B7"

  Scenario: A verse link opens the verse in the Reader
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the verse "Romans 8:31"
    When he asks the tutor about verse 28
    And he taps the study link "Open Romans 8:31 in Lampas"
    Then the Talk sheet is closed
    And the Reader is open on verse 31 of Romans 8

  Scenario: A verse link also opens the verse in his Bible in Logos when Logos is on
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the verse "Romans 8:31"
    And the study resource "Logos" is switched on
    When he asks the tutor about verse 28
    Then the answer shows the study link "Open Romans 8:31 in Logos" to "logosres:lgcystndrdbblsb;ref=Bible.Ro8.31"
    And the answer also shows a button "Open Romans 8:31 in Lampas"

  Scenario: A link to a resource he has not switched on is not shown
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the word "ἀγάπη"
    And the study resource "Strong's" is switched on
    When he asks the tutor about verse 28
    Then the answer shows the study link "G26 for ἀγάπη" to "https://www.stepbible.org/?q=version=ESV|strong=G0026"
    And the answer shows no Logos link

  Scenario: With no study resource on, a word link shows nothing and the answer is still there
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the word "ἀγάπη"
    When he asks the tutor about verse 28
    Then the answer shows no study links
    And the answer text is shown

  Scenario: An answer with an empty list of links shows no link row, even with a resource on
    Given Lampas is opened on Romans 8 and the tutor answers with an empty list of links
    And the study resource "Strong's" is switched on
    When he asks the tutor about verse 28
    Then the answer shows no study links
    And the answer text is shown

  Scenario: An answer carries at most three links
    Given Lampas is opened on Romans 8 and the tutor answers with links to the words "ἀγάπη", "πίστις", "ἐλπίς" and "χάρις"
    And the study resource "Strong's" is switched on
    When he asks the tutor about verse 28
    Then the answer shows 3 study links

  Scenario: An Old Testament verse link opens in his Bible in Logos and in the Reader, which holds it
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the verse "Genesis 15:6"
    And the study resource "Logos" is switched on
    When he asks the tutor about verse 28
    Then the answer shows the study link "Open Genesis 15:6 in Logos" to "logosres:lgcystndrdbblsb;ref=Bible.Ge15.6"
    And the answer also shows a button "Open Genesis 15:6 in Lampas"

  Scenario: An Old Testament verse link follows the Bible he picked in Settings
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the verse "Genesis 15:6"
    And the study resource "Logos" is switched on
    And his Bible in Logos is "LLS:1.0.710"
    When he asks the tutor about verse 28
    Then the answer shows the study link "Open Genesis 15:6 in Logos" to "logosres:1.0.710;ref=Bible.Ge15.6"

  Scenario: An Old Testament verse link with no study resource on shows only its Reader button
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the verse "Genesis 15:6"
    When he asks the tutor about verse 28
    Then the answer shows only the button "Open Genesis 15:6 in Lampas"

  Scenario: An Old Testament verse link the tutor adds with no study resource on still has its Reader button
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the verse "Genesis 14:18"
    When he asks the tutor about verse 28
    Then the answer shows only the button "Open Genesis 14:18 in Lampas"

  Scenario: A link to Calvin's commentaries opens them at the passage in his Logos library
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the work "calvin-commentaries" at "John 3:16"
    And the work "calvin-commentaries" is switched on
    When he asks the tutor "Where does John Calvin say that God loved the world?" about verse 28
    Then the answer shows the study link "Open in Logos: Calvin's Commentaries at John 3:16" to "logosres:LLS:CALCOM64JN;ref=Bible.Jn3.16"
    And that link has the fallback "https://ref.ly/logosres/LLS%3ACALCOM64JN?ref=Bible.Jn3.16"
    And the request named the works "LLS:LRNTOREADNTGRK,calvin-commentaries"

  Scenario: A link to Calvin's Institutes opens the book at its start
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the work "calvin-institutes-lcc"
    And the work "calvin-institutes-lcc" is switched on
    When he asks the tutor "What does Calvin say about the Spirit?" about verse 28
    Then the answer shows the study link "Open in Logos: Institutes of the Christian Religion (Library of Christian Classics)" to "logosres:LLS:ICRWJKC"
    And that link has the fallback "https://ref.ly/logosres/LLS%3AICRWJKC"

  Scenario: A link to a work he did not tick is dropped
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the work "calvin-commentaries" at "John 3:16"
    And the work "calvin-institutes-lcc" is switched on
    When he asks the tutor "Where does John Calvin say that God loved the world?" about verse 28
    Then the answer shows no study links
    And the request named the works "LLS:LRNTOREADNTGRK,calvin-institutes-lcc"

  Scenario: A link to a commentary for a book it does not cover is dropped
    Given Lampas is opened on Romans 8 and the tutor answers with a link to the work "calvin-commentaries" at "Revelation 1:1"
    And the work "calvin-commentaries" is switched on
    When he asks the tutor "Where does John Calvin say that?" about verse 28
    Then the answer shows no study links
