const referee = require('../src/referee');
const dictionary = require('../src/dictionary');
const assert = require('assert');

console.log('--- RUNNING REFEREE TESTS ---');

// Test 1: Syllable count validation
const test1 = referee.validate('học', null, new Set());
assert.strictEqual(test1.valid, false, 'Should reject 1-syllable word');
assert.strictEqual(test1.code, 'INVALID_SYLLABLE_COUNT');
console.log('✓ Rejects 1-syllable word');

const test2 = referee.validate('học sinh giỏi', null, new Set());
assert.strictEqual(test2.valid, false, 'Should reject 3-syllable word');
assert.strictEqual(test2.code, 'INVALID_SYLLABLE_COUNT');
console.log('✓ Rejects 3-syllable word');

// Test 2: Dictionary existence
const test3 = referee.validate('học sinh', null, new Set());
assert.strictEqual(test3.valid, true, 'Should accept valid word in dictionary');
console.log('✓ Accepts "học sinh"');

const test4 = referee.validate('cơm dép', null, new Set());
assert.strictEqual(test4.valid, false, 'Should reject gibberish word "cơm dép"');
assert.strictEqual(test4.code, 'NOT_IN_DICTIONARY');
console.log('✓ Rejects non-dictionary word "cơm dép"');

// Test 3: Chain continuity
const test5 = referee.validate('sinh viên', 'sinh', new Set(['học sinh']));
assert.strictEqual(test5.valid, true, 'Should accept valid chained word');
console.log('✓ Accepts "sinh viên" after "sinh"');

const test6 = referee.validate('giáo viên', 'sinh', new Set(['học sinh']));
assert.strictEqual(test6.valid, false, 'Should reject mismatched head syllable');
assert.strictEqual(test6.code, 'CHAIN_MISMATCH');
console.log('✓ Rejects "giáo viên" when expected is "sinh"');

// Test 4: Word duplication
const usedWords = new Set(['học sinh', 'sinh viên']);
const test7 = referee.validate('học sinh', 'học', usedWords);
assert.strictEqual(test7.valid, false, 'Should reject already used word');
assert.strictEqual(test7.code, 'WORD_ALREADY_USED');
console.log('✓ Rejects repeated word "học sinh"');

// Test 5: Unicode NFC and Case Insensitivity
const test8 = referee.validate('  SINH VIÊN  ', 'sinh', new Set());
assert.strictEqual(test8.valid, true, 'Should handle whitespace and uppercase');
console.log('✓ Handles uppercase and whitespace normalization');

// Test 6: Interjections (từ cảm thán)
const test9 = referee.validate('chao ôi', null, new Set());
assert.strictEqual(test9.valid, false, 'Should reject interjection "chao ôi"');
assert.strictEqual(test9.code, 'INTERJECTION_FORBIDDEN');
assert.strictEqual(test9.reason, 'Từ cảm thán không được chấp nhận trong luật chơi!');
console.log('✓ Rejects interjection "chao ôi"');

const test10 = referee.validate('trời ơi', null, new Set());
assert.strictEqual(test10.valid, false, 'Should reject interjection "trời ơi"');
assert.strictEqual(test10.code, 'INTERJECTION_FORBIDDEN');
console.log('✓ Rejects interjection "trời ơi"');

// Test 7: Profanity & Vulgar terms (từ tục tĩu / nhạy cảm)
const test11 = referee.validate('địt mẹ', null, new Set());
assert.strictEqual(test11.valid, false, 'Should reject profanity');
assert.strictEqual(test11.code, 'PROFANITY_FORBIDDEN');
assert.strictEqual(test11.reason, 'Từ ngữ vi phạm chuẩn mực văn hóa (tục tĩu, nhạy cảm)!');
console.log('✓ Rejects profanity and vulgar terms');

// Test 8: Real-life action-object compounds & modern words
const test12 = referee.validate('trồng cây', 'trồng', new Set(['trời trồng']));
assert.strictEqual(test12.valid, true, 'Should accept "trồng cây" after "trồng"');
console.log('✓ Accepts "trồng cây" after "trồng"');

const test13 = referee.validate('cây xanh', 'cây', new Set(['trồng cây']));
assert.strictEqual(test13.valid, true, 'Should accept "cây xanh" after "cây"');
console.log('✓ Accepts "cây xanh" after "cây"');

const test14 = referee.validate('bắt trend', 'bắt', new Set());
assert.strictEqual(test14.valid, true, 'Should accept modern word "bắt trend"');
console.log('✓ Accepts modern word "bắt trend"');

const test15 = referee.validate('đu trend', 'đu', new Set());
assert.strictEqual(test15.valid, true, 'Should accept modern word "đu trend"');
console.log('✓ Accepts modern word "đu trend"');

const test16 = referee.validate('sống ảo', 'sống', new Set());
assert.strictEqual(test16.valid, true, 'Should accept modern word "sống ảo"');
console.log('✓ Accepts modern word "sống ảo"');

const test17 = referee.validate('chữa lành', 'chữa', new Set());
assert.strictEqual(test17.valid, true, 'Should accept modern word "chữa lành"');
console.log('✓ Accepts modern word "chữa lành"');

const test18 = referee.validate('trà sữa', 'trà', new Set());
assert.strictEqual(test18.valid, true, 'Should accept modern word "trà sữa"');
console.log('✓ Accepts modern word "trà sữa"');

// Test 9: Unicode NFD (Decomposed from mobile keyboards)
const nfdTrongCay = 'trồng cây'.normalize('NFD');
const test19 = referee.validate(nfdTrongCay, 'trồng', new Set());
assert.strictEqual(test19.valid, true, 'Should accept decomposed NFD input from mobile keyboards');
console.log('✓ Accepts decomposed NFD "trồng cây" from iOS/mobile keyboards');

console.log('All Referee tests passed successfully! 🎉');
