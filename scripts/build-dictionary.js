const fs = require('fs');
const path = require('path');
const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', err => reject(err));
    }).on('error', err => reject(err));
  });
}

const VIETNAMESE_SYLLABLE_REGEX = /^[a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]+$/i;

function isValidSyllable(s) {
  return VIETNAMESE_SYLLABLE_REGEX.test(s);
}

// Extra common colloquial & daily Vietnamese words that players commonly use
const EXTRA_POPULAR_WORDS = [
  'viên gạch', 'gạch men', 'men gốm', 'gốm sứ', 'sứ mệnh', 'mệnh lệnh',
  'trà sữa', 'sữa tươi', 'sữa đặc', 'sữa chua', 'chua cay', 'cay đắng',
  'bún đậu', 'mắm tôm', 'tôm khô', 'tôm hùm', 'hùm xám', 'xám xịt',
  'bún bò', 'bò khô', 'bò né', 'bò bía', 'bánh mì', 'mì tôm', 'mì xào',
  'chạy bộ', 'bộ đồ', 'đồ chơi', 'chơi game', 'đọc sách', 'sách vở',
  'xem phim', 'phim ảnh', 'nghe nhạc', 'nhạc sống', 'đá bóng', 'bóng đá',
  'đá banh', 'con mèo', 'con chó', 'con gà', 'con heo', 'cái bàn', 'cái ghế',
  'bông hoa', 'hoa hồng', 'hoa mai', 'hoa đào', 'ly nước', 'nước ngọt',
  'nước mía', 'nước cam', 'cà phê', 'phê duyệt', 'phim truyện', 'truyện tranh',
  'tranh vẽ', 'vẽ tranh', 'rửa chén', 'rửa bát', 'quét nhà', 'lau nhà',
  'đi ngủ', 'ngủ say', 'thức dậy', 'đi chợ', 'chợ búa', 'mua sắm',
  'siêu thị', 'thị trường', 'xe máy', 'xe đạp', 'xe hơi', 'xe bus',
  'máy bay', 'bay lượn', 'lượn sóng', 'sóng biển', 'biển cả', 'cả ngày',
  'ngày mai', 'mai sau', 'sau này', 'này nọ', 'nọ kia', 'bài tập',
  'tập làm', 'làm bài', 'viết thư', 'thư viện', 'viện bảo', 'bảo tàng',
  'tàng hình', 'hình ảnh', 'ảnh chụp', 'chụp hình', 'hình học', 'học hỏi',
  'hỏi thăm', 'thăm hỏi', 'hỏi han', 'han gỉ', 'gỉ sét', 'sét đánh',
  'đánh chén', 'chén bát', 'bát đũa', 'đũa ăn', 'ăn cơm', 'cơm tấm',
  'cơm rang', 'cơm nguội', 'nguội lạnh', 'lạnh giá', 'giá cả', 'cả đời',
  'đời sống', 'sống còn', 'còn lại', 'lại đây', 'đây đó', 'đó đây'
];

async function main() {
  console.log('Downloading Vietnamese dictionaries from open-source repositories...');
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let wordsJsData = '';
  let viet74kData = '';

  try {
    wordsJsData = await fetchUrl('https://raw.githubusercontent.com/NNBnh/noi-tu/master/words/words.js');
    console.log('Downloaded words.js successfully.');
  } catch (e) {
    console.warn('Could not fetch words.js:', e.message);
  }

  try {
    viet74kData = await fetchUrl('https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet74K.txt');
    console.log('Downloaded Viet74K.txt successfully.');
  } catch (e) {
    console.warn('Could not fetch Viet74K.txt:', e.message);
  }

  const wordSet = new Set();
  const graph = {}; // { firstSyllable: Set(secondSyllables) }

  function addWord(first, second) {
    first = first.trim().toLowerCase().normalize('NFC');
    second = second.trim().toLowerCase().normalize('NFC');
    if (!isValidSyllable(first) || !isValidSyllable(second)) return;

    const fullWord = `${first} ${second}`;
    wordSet.add(fullWord);

    if (!graph[first]) graph[first] = new Set();
    graph[first].add(second);
  }

  // 1. Process words.js
  if (wordsJsData) {
    const sandbox = {};
    try {
      new Function('sandbox', wordsJsData + '; sandbox.words = words;')(sandbox);
      if (sandbox.words) {
        for (const first of Object.keys(sandbox.words)) {
          const list = sandbox.words[first];
          if (Array.isArray(list)) {
            for (const second of list) {
              if (typeof second === 'string' && second) {
                addWord(first, second);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error parsing words.js:', e.message);
    }
  }

  // 2. Process Viet74K
  if (viet74kData) {
    const lines = viet74kData.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim().toLowerCase().normalize('NFC');
      const parts = line.split(/\s+/);
      if (parts.length === 2) {
        addWord(parts[0], parts[1]);
      }
    }
  }

  // 3. Process extra popular words
  for (const item of EXTRA_POPULAR_WORDS) {
    const parts = item.split(/\s+/);
    if (parts.length === 2) {
      addWord(parts[0], parts[1]);
    }
  }

  // Convert graph sets to arrays
  const serializableGraph = {};
  for (const k of Object.keys(graph)) {
    serializableGraph[k] = Array.from(graph[k]);
  }

  const resultWords = Array.from(wordSet).sort();
  console.log(`Dictionary compiled: ${resultWords.length} unique 2-syllable Vietnamese words.`);
  console.log(`Graph contains ${Object.keys(serializableGraph).length} unique head syllables.`);

  const outputPath = path.join(dataDir, 'dictionary.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    count: resultWords.length,
    words: resultWords,
    graph: serializableGraph
  }));
  console.log(`Saved dictionary to: ${outputPath}`);
}

main().catch(err => {
  console.error('Failed to build dictionary:', err);
  process.exit(1);
});
