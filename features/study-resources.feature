Feature: Study resources
  Settings has a Study resources section that lists every resource registered in src/resources/ with an on/off switch,
  all off to start with. A word's sheet shows a Study row with the links of every resource switched on (Strong's: its
  G-number as a link to the public STEPBible entry; Logos and Accordance: Open in Logos / Open in Accordance, to his
  own copy of a lexicon, BDAG by default), and no row when none is on. Only links are built; no lexicon text is bundled
  or fetched. The switches are kept in the settings store and survive a close.

  Scenario: Settings lists Strong's, Logos and Accordance, all switched off
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    Then the Study resources section lists Strong's, Logos and Accordance
    And every study resource is switched off

  Scenario: With Strong's on, the word sheet shows the word's G-number as a link to its entry
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Strong's"
    And he taps Back on the Settings screen
    And he taps the word "work together" in verse 28
    Then the Study row has a link "G4903" to "https://www.stepbible.org/?q=strong=G4903"

  Scenario: With Logos on and BDAG named, the word sheet shows Open in Logos built from the lemma
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Logos"
    And he names the Logos resource "bdag"
    And he taps Back on the Settings screen
    And he taps the word "work together" in verse 28
    Then the Study row has a link "Open in Logos" to "https://ref.ly/logosres/bdag?hw=%CF%83%CF%85%CE%BD%CE%B5%CF%81%CE%B3%CE%AD%CF%89"

  Scenario: With Accordance on, the word sheet shows Open in Accordance built from the lemma
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Accordance"
    And he taps Back on the Settings screen
    And he taps the word "work together" in verse 28
    Then the Study row has a link "Open in Accordance" to "accord://search/BDAG?%CF%83%CF%85%CE%BD%CE%B5%CF%81%CE%B3%CE%AD%CF%89"

  Scenario: With none on, the word sheet has no Study row
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the word "work together" in verse 28
    Then the word sheet has no Study row

  Scenario: The switches survive a reload
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Strong's"
    And he names the Logos resource "lsj"
    And Lampas is opened again
    And he opens Settings again
    Then the study resource "Strong's" is switched on
    And the study resource "Logos" is switched off
    And the Logos resource is named "lsj"
