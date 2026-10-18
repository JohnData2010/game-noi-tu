const fs = require('fs');
const path = require('path');
const { isInterjection, isProfanity } = require('./data/forbidden');

const mapOldToNew = {
  'oá': 'óa', 'oà': 'òa', 'oả': 'ỏa', 'oã': 'õa', 'oạ': 'ọa',
  'oé': 'óe', 'oè': 'òe', 'oẻ': 'ỏe', 'oẽ': 'õe', 'oẹ': 'ọe',
  'uý': 'úy', 'uỳ': 'ùy', 'uỷ': 'ủy', 'uỹ': 'ũy', 'uỵ': 'ụy'
};
const mapNewToOld = {};
for (const [k, v] of Object.entries(mapOldToNew)) {
  mapNewToOld[v] = k;
}

function getDualVariants(word) {
  if (!word || typeof word !== 'string') return ['', ''];
  let wNew = word.normalize('NFC');
  for (const [from, to] of Object.entries(mapOldToNew)) {
    wNew = wNew.replaceAll(from, to);
  }
  let wOld = word.normalize('NFC');
  for (const [from, to] of Object.entries(mapNewToOld)) {
    wOld = wOld.replaceAll(from, to);
  }
  return [wNew, wOld];
}

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
          const [f, s] = parts;
          const [fNew, fOld] = getDualVariants(f);
          const [sNew, sOld] = getDualVariants(s);
          const fVars = fNew === fOld ? [fNew] : [fNew, fOld];
          const sVars = sNew === sOld ? [sNew] : [sNew, sOld];

          for (const fv of fVars) {
            for (const sv of sVars) {
              this.wordSet.add(`${fv} ${sv}`);
              if (!this.graph.has(fv)) this.graph.set(fv, []);
              const list = this.graph.get(fv);
              if (!list.includes(sv)) list.push(sv);
            }
          }
        }
      }
    }

    this.loaded = true;
    console.log(`[Dictionary] Loaded ${this.wordSet.size} words across ${this.graph.size} root syllables.`);
  }

  getDualVariants(word) {
    return getDualVariants(word);
  }

  /**
   * Normalize input to lower case NFC unicode
   */
  normalize(word) {
    if (!word || typeof word !== 'string') return '';
    return word.trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFC');
  }

  /**
   * Check if a word exists in the dictionary (supports both tone mark styles)
   */
  has(word) {
    const normalized = this.normalize(word);
    if (this.wordSet.has(normalized)) return true;
    const [wNew, wOld] = getDualVariants(normalized);
    return this.wordSet.has(wNew) || this.wordSet.has(wOld);
  }

  /**
   * Check if two syllables match (supports both new and traditional orthography)
   */
  areSyllablesMatching(s1, s2) {
    if (!s1 || !s2) return false;
    const n1 = this.normalize(s1);
    const n2 = this.normalize(s2);
    if (n1 === n2) return true;
    const [n1New, n1Old] = getDualVariants(n1);
    const [n2New, n2Old] = getDualVariants(n2);
    return n1New === n2New || n1Old === n2Old;
  }

  /**
   * Get all valid words starting with headSyllable that haven't been used yet
   */
  getNextOptions(headSyllable, usedWordsSet = new Set()) {
    const head = this.normalize(headSyllable);
    const [hNew, hOld] = getDualVariants(head);
    const headsToCheck = hNew === hOld ? [head] : [hNew, hOld];

    const tailsSet = new Set();
    for (const h of headsToCheck) {
      const list = this.graph.get(h);
      if (list) {
        for (const t of list) tailsSet.add(t);
      }
    }

    if (tailsSet.size === 0) return [];

    const options = [];
    for (const tail of tailsSet) {
      const full = `${head} ${tail}`;
      const [fNew, fOld] = getDualVariants(full);
      if (!usedWordsSet.has(full) && !usedWordsSet.has(fNew) && !usedWordsSet.has(fOld) && !isInterjection(full) && !isProfanity(full)) {
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
