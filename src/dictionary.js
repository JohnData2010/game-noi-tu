const fs = require('fs');
const path = require('path');
const { isInterjection, isProfanity } = require('./data/forbidden');

class Dictionary {
  constructor() {
    this.wordSet = new Set();
    this.graph = new Map(); // firstSyllable -> Array of secondSyllables
    this.loaded = false;
    this.load();
  }

  load() {
    const dictPath = path.join(__dirname, 'data', 'dictionary.json');
    if (!fs.existsSync(dictPath)) {
      throw new Error(`Dictionary file not found at ${dictPath}. Run scripts/build-dictionary.js first.`);
    }

    const raw = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
    this.wordSet = new Set(raw.words);

    this.graph = new Map();
    for (const [k, v] of Object.entries(raw.graph)) {
      this.graph.set(k, v);
    }

    // Load custom extra words if file exists
    const customPath = path.join(__dirname, 'data', 'custom_words.txt');
    if (fs.existsSync(customPath)) {
      const lines = fs.readFileSync(customPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const clean = line.trim().toLowerCase().normalize('NFC');
        const parts = clean.split(/\s+/);
        if (parts.length === 2) {
          this.wordSet.add(clean);
          const [f, s] = parts;
          if (!this.graph.has(f)) this.graph.set(f, []);
          const list = this.graph.get(f);
          if (!list.includes(s)) list.push(s);
        }
      }
    }

    this.loaded = true;
    console.log(`[Dictionary] Loaded ${this.wordSet.size} words across ${this.graph.size} root syllables.`);
  }

  /**
   * Normalize input to lower case NFC unicode
   */
  normalize(word) {
    if (!word || typeof word !== 'string') return '';
    return word.trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFC');
  }

  /**
   * Check if a word exists in the dictionary
   */
  has(word) {
    const normalized = this.normalize(word);
    return this.wordSet.has(normalized);
  }

  /**
   * Get all valid words starting with headSyllable that haven't been used yet
   */
  getNextOptions(headSyllable, usedWordsSet = new Set()) {
    const head = this.normalize(headSyllable);
    const tails = this.graph.get(head);
    if (!tails || tails.length === 0) return [];

    const options = [];
    for (const tail of tails) {
      const full = `${head} ${tail}`;
      if (!usedWordsSet.has(full) && !isInterjection(full) && !isProfanity(full)) {
        options.push(full);
      }
    }
    return options;
  }

  /**
   * Check if headSyllable is a dead-end (no valid words or all used)
   */
  isDeadEnd(headSyllable, usedWordsSet = new Set()) {
    return this.getNextOptions(headSyllable, usedWordsSet).length === 0;
  }

  /**
   * Pick a good random starting word that has plenty of follow-up options
   */
  getRandomStartWord() {
    const popularStarters = [
      'học sinh', 'hoa hồng', 'yêu thương', 'bóng đá', 'mặt trời',
      'cà phê', 'sóng biển', 'thời gian', 'bầu trời', 'con người',
      'ngày mai', 'thành phố', 'quê hương', 'gia đình', 'bạn bè',
      'cuộc sống', 'công việc', 'tri thức', 'văn hóa', 'nghệ thuật'
    ];
    // Filter to those in dictionary
    const validStarters = popularStarters.filter(w => this.has(w));
    if (validStarters.length > 0) {
      return validStarters[Math.floor(Math.random() * validStarters.length)];
    }
    // Fallback: any word from wordSet
    const all = Array.from(this.wordSet);
    return all[Math.floor(Math.random() * all.length)];
  }
}

module.exports = new Dictionary();
