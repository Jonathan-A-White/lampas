Feature: Words he knows
  Lampas keeps the Greek words he has learned, starts from his own Biblical Mastery Academy list,
  shows them by lesson, lets him change what he knows with a tap, and takes more from a pasted list.

  Scenario: First open seeds 63 words, 54 solid and 9 learning
    Given Lampas is opened for the first time
    When he opens Words
    Then the count line reads "54 solid, 9 learning"
    And 63 words are listed

  Scenario: The Words screen lists them by lesson
    Given Lampas is opened for the first time
    When he opens Words
    Then the lessons are headed from Lesson 1 to Lesson 10 in order
    And Lesson 1 lists δέ, εἰ, ἐν and καί
    And Lesson 10 lists 9 words, all learning

  Scenario: Tapping a solid word makes it learning, tapping again drops it after a confirm
    Given Lampas is opened for the first time
    And he opens Words
    When he taps the word "ἀγαθός"
    Then "ἀγαθός" is learning
    When he taps "ἀγαθός" again
    Then he is asked to confirm dropping "ἀγαθός"
    And "ἀγαθός" is still learning
    When he confirms
    Then "ἀγαθός" is dropped
    And the count line reads "53 solid, 9 learning, 1 dropped"

  Scenario: Keeping a word at the drop confirm leaves it learning
    Given Lampas is opened for the first time
    And he opens Words
    When he taps the word "ἀγαθός"
    And he taps "ἀγαθός" again
    And he chooses to keep it
    Then "ἀγαθός" is still learning

  Scenario: Importing two pasted lines adds two words as learning and shows them
    Given Lampas is opened for the first time
    And he opens Import
    When he pastes these lines
      """
      ἀνάστασις — resurrection
      πνεῦμα, spirit
      """
    Then the preview shows 2 words to add
    When he taps Add
    Then Words shows "ἀνάστασις" as learning with the gloss "resurrection"
    And Words shows "πνεῦμα" as learning with the gloss "spirit"
    And the count line reads "54 solid, 11 learning"

  Scenario: A pasted line that is not a Greek word is flagged and not added
    Given Lampas is opened for the first time
    And he opens Import
    When he pastes these lines
      """
      ἀνάστασις — resurrection
      spirit
      """
    Then the preview shows 1 word to add
    And the preview flags "spirit" with "Not a Greek word"

  Scenario: Import accepts a pasted row of the example table
    Given Lampas is opened for the first time
    And he opens Import
    When he pastes these lines
      """
      | 72 | ἀνάστασις, -εως, ἡ | 1 | 11 | resurrection | Noun | |
      """
    Then the preview shows 1 word to add
    When he taps Add
    Then Words shows "ἀνάστασις" as learning with the gloss "resurrection"

  Scenario Outline: Normalising the BMA headwords
    Given the BMA lemma "<shown>"
    When it is normalised
    Then the headword is "<headword>"
    And the lexicon lemmas are "<lemmas>"

    Examples:
      | shown                                                | headword  | lemmas         |
      | δέ (δ΄ - when followed by a word beginning with a vowel) | δέ        | δέ             |
      | εἰ μή                                                | εἰ μή     | εἰ,μή          |
      | εἶπεν                                                | εἶπεν     | λέγω,εἶπον     |
      | ἐκ, ἐξ + gen                                         | ἐκ        | ἐκ,ἐξ          |
      | ὁ, ἡ, τό                                             | ὁ         | ὁ              |
      | οὐ (οὐκ, οὐχ, οὐχί)                                  | οὐ        | οὐ,οὐχί        |
      | σύ, σοῦ, σοί, σέ                                     | σύ        | σύ             |
      | μου, ἐμοῦ                                            | μου       | ἐγώ,ἐμοῦ,μου  |
      | ἀλλά, ἀλλ᾽                                           | ἀλλά      | ἀλλά           |
      | ἄνθρωπος, -ου, ὁ                                     | ἄνθρωπος  | ἄνθρωπος       |
      | Δαυίδ, ὁ (or Δαωείδ)                                 | Δαυίδ     | Δαυίδ          |

  Scenario: No row of the seed yields an empty lemma
    Given the 63 words of the seed
    When every one is normalised
    Then no headword is empty and no lexicon lemma list is empty
    And the headwords are all different
