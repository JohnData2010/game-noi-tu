// Forbidden word lists: Interjections (từ cảm thán) and Profanity (từ tục tĩu / nhạy cảm)

const INTERJECTIONS = new Set([
  'chao ôi', 'ôi chao', 'than ôi', 'hỡi ôi', 'trời ơi', 'trời đất', 'trời phật',
  'ái chà', 'úi chà', 'ối giời', 'ối trời', 'ối dào', 'úi dào', 'ối a', 'ôi thôi',
  'hỡi than', 'a ha', 'ô hô', 'chà chà', 'ơ kìa', 'ái ái', 'ối ối', 'hơ hơ',
  'hừm hừm', 'ối cha', 'úi dồi', 'ối dồi', 'u chu choa', 'ôi a', 'úi chao',
  'úi trời', 'ối mẹ', 'mẹ ơi', 'bố ơi', 'con ơi', 'anh ơi', 'em ơi', 'chị ơi',
  'ông ơi', 'bà ơi', 'chúa ơi', 'phật ơi', 'ối ba', 'ô kìa', 'ơ hay', 'kìa kìa',
  'này này', 'này đây', 'dạ thưa', 'thưa vâng', 'vâng ạ', 'dạ vâng', 'vâng dạ',
  'ha ha', 'hô hô', 'hì hì', 'hơ hơ', 'hic hic', 'oa oa', 'ú oà', 'ối dào'
]);

// Single interjection syllables that should never form a valid word in chain game
const INTERJECTION_ROOTS = new Set([
  'ôi', 'úi', 'ối', 'ái', 'hỡi', 'kìa', 'chao'
]);

// Profanity / Vulgar terms and slurs
const PROFANITY = new Set([
  'địt mẹ', 'địt cha', 'địt cụ', 'địt bà', 'đụ má', 'đụ mẹ', 'đụ cha',
  'lồn mẹ', 'lồn bà', 'lồn què', 'hãm lồn', 'ngu lồn', 'mặt lồn', 'vãi lồn', 'xàm lồn',
  'cặc ngựa', 'cặc lợn', 'thằng cặc', 'vãi cặc', 'đầu buồi', 'buồi dái',
  'đĩ mẹ', 'đĩ chó', 'đĩ thõa', 'đĩ điếm', 'chó đẻ', 'chó má', 'chó chết', 'thằng chó', 'con chó',
  'óc chó', 'não chó', 'đồ chó', 'khốn nạn', 'đồ khốn', 'mẹ kiếp', 'chết tiệt',
  'bú cu', 'bú liếm', 'vãi đái', 'hiếp dâm', 'cưỡng dâm', 'loạn luân', 'ấu dâm',
  'gian dâm', 'tà dâm', 'dâm tặc', 'bệnh hoạn', 'biến thái', 'súc sinh', 'súc vật',
  'mất dạy', 'mất nết', 'mạt hạng', 'đê tiện', 'bỉ ổi', 'đốn mạt', 'tiện nhân'
]);

const PROFANITY_ROOTS = new Set([
  'lồn', 'cặc', 'buồi', 'dái', 'địt', 'đụ', 'đĩ'
]);

function isInterjection(word) {
  if (!word) return false;
  const clean = word.trim().toLowerCase();
  if (INTERJECTIONS.has(clean)) return true;
  const parts = clean.split(' ');
  if (parts.length === 2) {
    if (INTERJECTIONS.has(parts[0] + ' ' + parts[1])) return true;
    // Words starting with exclamation tokens like "ôi", "úi", "ối", "ái", "hỡi"
    if (INTERJECTION_ROOTS.has(parts[0]) || INTERJECTION_ROOTS.has(parts[1])) {
      return true;
    }
  }
  return false;
}

function isProfanity(word) {
  if (!word) return false;
  const clean = word.trim().toLowerCase();
  if (PROFANITY.has(clean)) return true;
  const parts = clean.split(' ');
  for (const part of parts) {
    if (PROFANITY_ROOTS.has(part)) return true;
  }
  return false;
}

module.exports = {
  isInterjection,
  isProfanity,
  INTERJECTIONS,
  PROFANITY
};
