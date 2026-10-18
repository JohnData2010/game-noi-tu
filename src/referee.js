const dictionary = require('./dictionary');
const { isInterjection, isProfanity } = require('./data/forbidden');

class Referee {
  /**
   * Validate a word submitted by a player.
   *
   * @param {string} rawWord - The word submitted by the player
   * @param {string|null} expectedSyllable - The syllable required to start with (from previous word)
   * @param {Set<string>} usedWords - Set of words already played in this match
   * @returns {{
   *   valid: boolean,
   *   word: string,
   *   headSyllable?: string,
   *   tailSyllable?: string,
   *   reason?: string,
   *   code?: string
   * }}
   */
  validate(rawWord, expectedSyllable, usedWords = new Set()) {
    if (!rawWord || typeof rawWord !== 'string') {
      return {
        valid: false,
        word: '',
        code: 'EMPTY_WORD',
        reason: 'Bạn chưa nhập từ nào!'
      };
    }

    const cleanWord = dictionary.normalize(rawWord);
    const parts = cleanWord.split(' ');

    // Rule 1: Exactly 2 syllables
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return {
        valid: false,
        word: cleanWord,
        code: 'INVALID_SYLLABLE_COUNT',
        reason: `"${cleanWord}" không đúng 2 âm tiết.`
      };
    }

    const [head, tail] = parts;

    // Rule 2: Must not be vulgar or sensitive
    if (isProfanity(cleanWord)) {
      return {
        valid: false,
        word: cleanWord,
        headSyllable: head,
        tailSyllable: tail,
        code: 'PROFANITY_FORBIDDEN',
        reason: 'Từ ngữ vi phạm chuẩn mực văn hóa (tục tĩu, nhạy cảm)!'
      };
    }

    // Rule 3: Interjections (từ cảm thán) are forbidden in competitive word chains
    if (isInterjection(cleanWord)) {
      return {
        valid: false,
        word: cleanWord,
        headSyllable: head,
        tailSyllable: tail,
        code: 'INTERJECTION_FORBIDDEN',
        reason: 'Từ cảm thán không được chấp nhận trong luật chơi!'
      };
    }

    // Rule 2: Must connect with the expected syllable from previous turn
    if (expectedSyllable) {
      const normalizedExpected = dictionary.normalize(expectedSyllable);
      if (!dictionary.areSyllablesMatching(head, normalizedExpected)) {
        return {
          valid: false,
          word: cleanWord,
          headSyllable: head,
          tailSyllable: tail,
          code: 'CHAIN_MISMATCH',
          reason: `Lạc âm tiết! Tiếng "${head}" không khớp với "${normalizedExpected}".`
        };
      }
    }

    // Rule 3: Word cannot be repeated in the same game (including orthographic variants)
    const [wordNew, wordOld] = dictionary.getDualVariants(cleanWord);
    if (usedWords.has(cleanWord) || usedWords.has(wordNew) || usedWords.has(wordOld)) {
      return {
        valid: false,
        word: cleanWord,
        headSyllable: head,
        tailSyllable: tail,
        code: 'WORD_ALREADY_USED',
        reason: `Từ "${cleanWord}" đã được dùng trước đó trong ván này!`
      };
    }

    // Rule 4: Word must exist in Vietnamese dictionary
    if (!dictionary.has(cleanWord)) {
      return {
        valid: false,
        word: cleanWord,
        headSyllable: head,
        tailSyllable: tail,
        code: 'NOT_IN_DICTIONARY',
        reason: `Từ "${cleanWord}" không có trong từ điển tiếng Việt!`
      };
    }

    // Word is valid!
    return {
      valid: true,
      word: cleanWord,
      headSyllable: head,
      tailSyllable: tail
    };
  }

  /**
   * Check if the next player has any available moves.
   */
  checkFollowupAvailable(tailSyllable, usedWords = new Set()) {
    return dictionary.getNextOptions(tailSyllable, usedWords).length > 0;
  }
}

module.exports = new Referee();
