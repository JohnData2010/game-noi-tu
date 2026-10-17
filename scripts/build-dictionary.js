const fs = require('fs');
const path = require('path');
const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false }, (res) => {
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

// ==============================================================================
// COMPREHENSIVE CURATED DICTIONARY OF MODERN, DAILY, GEN Z & COLLOQUIAL VIETNAMESE
// ==============================================================================
const MODERN_AND_DAILY_WORDS = [
  // --- 1. THỜI TRANG, TRANG PHỤC, LÀM ĐẸP & DIỆN ĐỒ (FASHION & GROOMING) ---
  'diện đồ', 'diện váy', 'diện áo', 'diện quần', 'diện cánh', 'diện giày', 'diện guốc', 'diện xịn', 'diện đẹp', 'diện sang', 'diện bảnh',
  'diện mạo', 'diện kiến', 'diện chẩn', 'diện rộng', 'diện hẹp', 'diện tích', 'diện đàm', 'diện mục', 'diện phẳng', 'diện thể', 'diện mộc', 'diện tiền',
  'lên đồ', 'phối đồ', 'thử đồ', 'thay đồ', 'sắm đồ', 'mua đồ', 'bán đồ', 'dọn đồ', 'xếp đồ', 'giặt đồ', 'phơi đồ', 'ủi đồ', 'vá đồ',
  'gửi đồ', 'lấy đồ', 'chở đồ', 'vác đồ', 'khuân đồ', 'mất đồ', 'quên đồ', 'trộm đồ', 'cất đồ', 'thu đồ', 'gói đồ', 'soạn đồ',
  'đồ bộ', 'đồ ngủ', 'đồ bơi', 'đồ lót', 'đồ jean', 'đồ vest', 'đồ da', 'đồ hiệu', 'đồ si', 'đồ cũ', 'đồ mới', 'đồ đôi', 'đồ nhóm',
  'đồ gym', 'đồ cưới', 'đồ tết', 'đồ tiệc', 'đồ xinh', 'đồ đẹp', 'đồ xịn', 'đồ sang', 'đồ rách', 'đồ vá', 'đồ ấm', 'đồ mát',
  'đồ đạc', 'đồ dùng', 'đồ nghề', 'đồ chơi', 'đồ ăn', 'đồ uống', 'đồ ngọt', 'đồ mặn', 'đồ chay', 'đồ hộp', 'đồ khô', 'đồ tươi',
  'đồ gia', 'đồ sứ', 'đồ gốm', 'đồ gỗ', 'đồ sắt', 'đồ nhôm', 'đồ nhựa', 'đồ đồng', 'đồ bạc', 'đồ vàng', 'đồ nướng', 'đồ xào', 'đồ luộc',
  'mặc đồ', 'mặc áo', 'mặc quần', 'mặc váy', 'mặc đầm', 'mặc yếm', 'mặc ấm', 'mặc đẹp', 'mặc kệ', 'mặc định', 'mặc cả', 'mặc cảm',
  'áo thun', 'áo phông', 'áo sơ', 'sơ mi', 'áo khoác', 'áo len', 'áo dài', 'áo ba', 'ba lỗ', 'áo phao', 'áo dạ', 'áo croptop', 'áo blazer',
  'áo hoodie', 'áo polo', 'áo nỉ', 'áo mưa', 'áo vest', 'áo choàng', 'áo vét', 'áo yếm', 'áo tấc', 'áo cánh', 'áo lót', 'áo quây',
  'áo hai', 'hai dây', 'áo bó', 'áo rộng', 'áo lửng', 'áo giáp', 'áo bông', 'áo ngực',
  'quần jean', 'quần bò', 'quần âu', 'quần tây', 'quần sooc', 'quần short', 'quần đùi', 'quần lót', 'quần ống', 'ống loe', 'ống rộng',
  'ống suông', 'quần suông', 'quần thun', 'quần dù', 'quần vải', 'quần lửng', 'quần ngố', 'quần bó', 'quần baggy', 'quần yếm',
  'quần cạp', 'cạp cao', 'quần dài', 'quần ngắn', 'quần tất', 'quần áo', 'quần chúng', 'quần đảo',
  'chân váy', 'váy xòe', 'váy ôm', 'váy suông', 'váy cưới', 'váy ngắn', 'váy dài', 'váy hoa', 'váy dạ', 'váy lụa', 'váy voan', 'váy ren',
  'váy midi', 'váy maxi', 'váy chữ', 'chữ a', 'váy tầng', 'váy bầu', 'váy ngủ', 'váy đầm', 'váy yếm', 'váy xếp', 'xếp ly',
  'đầm xòe', 'đầm ôm', 'đầm dạ', 'dạ hội', 'đầm suông', 'đầm cưới', 'đầm ren', 'đầm ngắn', 'đầm dài', 'đầm bầu', 'đầm ngủ',
  'giày thể', 'thể thao', 'giày bốt', 'giày lười', 'giày cao', 'cao gót', 'giày bệt', 'giày vải', 'giày da', 'giày tây', 'giày sneaker',
  'giày búp', 'búp bê', 'giày sục', 'giày lội', 'dép lào', 'dép lê', 'dép kẹp', 'dép bệt', 'dép quai', 'quai hậu', 'quai ngang',
  'quai chéo', 'dép tông', 'dép bánh', 'bánh mì', 'dép tổ', 'tổ ong', 'dép xốp', 'dép nhựa',
  'túi xách', 'túi tote', 'túi đeo', 'đeo chéo', 'ba lô', 'ví tiền', 'bóp tiền', 'thắt lưng', 'dây nịt', 'kính râm', 'kính mát', 'kính cận',
  'kính lão', 'kính áp', 'áp tròng', 'đồng hồ', 'khuyên tai', 'hoa tai', 'bông tai', 'vòng tay', 'vòng cổ', 'dây chuyền', 'nhẫn cưới',
  'nhẫn kim', 'kim cương', 'vàng bạc', 'ngọc trai', 'ngọc bích', 'cài áo', 'kẹp tóc', 'băng đô', 'chun buộc', 'dây chun', 'nơ tóc', 'bờm tóc',
  'son môi', 'son lì', 'son bóng', 'son kem', 'son dưỡng', 'phấn má', 'phấn nền', 'kem lót', 'chuốt mi', 'kẻ mắt', 'chân mày', 'phun mày',
  'xăm môi', 'uốn mi', 'nối mi', 'sơn móng', 'làm móng', 'tẩy trang', 'nước hoa', 'sữa tắm', 'dầu gội', 'dầu xả', 'kem chống', 'chống nắng',
  'mặt nạ', 'serum', 'dưỡng ẩm', 'kem dưỡng', 'tẩy da', 'da chết', 'toner', 'nước thần', 'làm đẹp', 'thẩm mỹ', 'nâng mũi', 'nhấn mí',

  // --- 2. TỪ VỰNG GEN Z, MẠNG XÃ HỘI, INTERNET, GAMING & TRENDING ---
  'bắt trend', 'đu trend', 'chạy trend', 'tạo trend', 'hết trend', 'trend mới', 'trend cũ', 'trend xịn', 'trend hot', 'bài trend',
  'check var', 'var nhau', 'var chạm', 'bị var', 'pha var',
  'flex đồ', 'flex tiền', 'flex xe', 'flex nhà', 'flex bài', 'flex điểm', 'flex nhẹ', 'flex dáng', 'flex khéo',
  'cháy phố', 'cháy máy', 'cháy ví', 'cháy túi', 'cháy vé', 'cháy khét', 'khét lẹt', 'cháy quá', 'cháy hết',
  'vô tri', 'hết cứu', 'sập nguồn', 'cạn lời', 'đứng hình', 'bật ngửa', 'ngơ ngác', 'ngỡ ngàng', 'chết lặng', 'câm nín', 'hóa đá',
  'cà khịa', 'cà chớn', 'đá đểu', 'đá xéo', 'xỏ xiên', 'mỉa mai', 'châm biếm', 'nói móc', 'chọc ngoáy',
  'ô dề', 'ố dề', 'ra dẻ', 'ra vẻ', 'làm màu', 'làm nét', 'tạo nét', 'làm dáng', 'điệu đà', 'bánh bèo',
  'keo lỳ', 'keo lì', 'mãi mận', 'mận keo', 'mãi đỉnh', 'đỉnh nóc', 'kịch trần', 'bay phới', 'đỉnh chóp', 'đỉnh cao', 'quá đỉnh',
  'slay quá', 'slay vãi', 'slay chúa', 'quá slay', 'cực slay',
  'bóc phốt', 'hóng phốt', 'hóng biến', 'nổ biến', 'hít drama', 'dính phốt', 'dính chưởng', 'phốt to', 'phốt căng', 'tẩy chay',
  'chữa lành', 'chữa rách', 'tổn thương', 'thao túng', 'tâm lý', 'chấp niệm', 'sầu muộn', 'suy đét', 'suy sụp', 'overthinking',
  'cưng xỉu', 'xỉu ngang', 'xỉu up', 'xỉu down', 'mê xỉu', 'đẹp xỉu', 'chill chill', 'chill phết', 'quá đã', 'đã cái',
  'simp chúa', 'simp lỏ', 'lỏ vãi', 'lỏ quá', 'ảo ma', 'ảo tưởng', 'ảo diệu', 'cay cú', 'ấm ức', 'tức tối',
  'trà xanh', 'tiểu tam', 'chính thất', 'cờ đỏ', 'cờ xanh', 'trap boy', 'trap girl', 'đào mỏ', 'lừa tình', 'bắt cá',
  'gánh team', 'tạ team', 'bóp team', 'còng lưng', 'out trình', 'tay to', 'tay mơ', 'lên trình', 'xuống trình', 'chấp hết',
  'lật kèo', 'quay xe', 'bẻ lái', 'cua gắt', 'lạng lách', 'đánh võng', 'văng cua',
  'lụm lúa', 'lượm tiền', 'bào tiền', 'bào ví', 'rỗng ví', 'viêm màng', 'màng túi', 'hết tiền', 'kẹt tiền', 'túng tiền',
  'đu idol', 'đu concert', 'đu show', 'săn vé', 'săn sale', 'chốt đơn', 'nổ đơn', 'bão đơn', 'bùng hàng', 'boom hàng', 'huỷ đơn', 'hoàn đơn',
  'ting ting', 'quét mã', 'quét qr', 'bắn tiền', 'chuyển khoản', 'nạp ví', 'quẹt thẻ', 'chạm thẻ', 'sao kê',
  'sống ảo', 'quay tóp', 'tóp tóp', 'lướt phây', 'lướt tóp', 'cày view', 'cày phim', 'thả tim', 'thả like', 'đăng bài', 'đăng story',
  'livestream', 'chốt deal', 'bán hàng', 'ăn gậy', 'bay kênh', 'bay màu', 'khóa nick', 'report kênh',
  'nạp game', 'mở rương', 'quay hòm', 'đập đồ', 'ép đồ', 'leo rank', 'tụt rank', 'kéo rank', 'ghép trận', 'combat tổng', 'ăn mạng',
  'mỏ hỗn', 'nết na', 'cơm chó', 'phát cẩu', 'cẩu lương', 'thả thính', 'dính thính', 'bật đèn', 'nóc nhà', 'sợ vợ', 'đội vợ',
  'rich kid', 'soái ca', 'mỹ nam', 'mỹ nữ', 'tổng tài', 'ngầu đét', 'ngầu lòi', 'xịn sò', 'chanh sả', 'sang chảnh',
  'xin vía', 'nhả vía', 'trộm vía', 'vía lành', 'vía may', 'bói bài', 'thần số', 'bão like', 'triệu view', 'độc lạ',
  'tấu hài', 'cây hài', 'chúa hề', 'cười bò', 'cười xỉu', 'cười ẻ', 'đập hộp', 'khui hộp', 'khui quà',
  'đu đỉnh', 'bắt đáy', 'cắt lỗ', 'chốt lời', 'học bá', 'thủ khoa', 'ngủ nướng', 'ngái ngủ', 'ngủ kỹ',
  'ghiền quá', 'cuốn quá', 'ngon xỉu', 'bánh cuốn', 'chất lượng', 'uy tín', 'chuẩn đét', 'đúng điệu', 'hết nước', 'nước chấm', 'mười điểm',

  // --- 3. ẨM THỰC, MÓN ĂN, ĐỒ UỐNG, TRÀ SỮA & ĂN VẶT ---
  'cà phê', 'phê đen', 'phê sữa', 'phê muối', 'phê trứng', 'phê phin', 'đen đá', 'nâu đá', 'bạc xỉu', 'pha phin', 'pha máy',
  'trà sữa', 'trà đào', 'trà chanh', 'trà tắc', 'trà quất', 'trà dâu', 'trà vải', 'trà sen', 'trà măng', 'măng cụt', 'trà mãng', 'mãng cầu',
  'trà ổi', 'ổi hồng', 'trà xoài', 'trà táo', 'trà xanh', 'trà đen', 'trà ô', 'ô long', 'trà lài', 'trà nhài', 'hồng trà', 'bạch trà',
  'lục trà', 'matcha', 'trân châu', 'đường đen', 'thạch dừa', 'thạch đen', 'thạch phô', 'phô mai', 'kem cheese', 'kem mặn', 'kem trứng',
  'pudding', 'khúc bạch', 'sương sáo', 'cốt dừa', 'sữa hạt', 'sữa tươi', 'sữa bắp', 'sữa đậu', 'đậu nành',
  'phở bò', 'phở gà', 'phở tái', 'phở nạm', 'phở gầu', 'phở sốt', 'sốt vang', 'phở xào', 'phở cuốn', 'phở trộn',
  'bún bò', 'bún chả', 'bún đậu', 'mắm tôm', 'mắm nêm', 'bún riêu', 'bún ốc', 'bún cá', 'bún thang', 'bún sườn', 'bún mọc',
  'bún mắm', 'bún thịt', 'thịt nướng', 'hủ tiếu', 'bánh canh', 'canh cua', 'canh ghẹ', 'mì quảng', 'mì tôm', 'mì xào', 'mì cay', 'mì trộn', 'mì ý',
  'cơm tấm', 'cơm sườn', 'cơm gà', 'cơm chiên', 'cơm rang', 'cơm niêu', 'cơm lam', 'cơm nắm', 'cơm cháy', 'cơm hộp',
  'xôi xéo', 'xôi gà', 'xôi khúc', 'xôi gấc', 'xôi vò', 'xôi lạc', 'xôi đỗ', 'xôi ngô', 'xôi mặn',
  'bánh mì', 'bánh bao', 'bánh cuốn', 'bánh ướt', 'bánh xèo', 'bánh khọt', 'bánh bèo', 'bánh bột', 'bột lọc', 'bánh giò', 'bánh đúc',
  'bánh chưng', 'bánh tét', 'bánh tráng', 'tráng trộn', 'tráng nướng', 'tráng cuộn', 'tráng bơ', 'bánh tiêu', 'bánh rán', 'bánh gối',
  'bánh su', 'su kem', 'bông lan', 'trứng muối', 'bánh quy', 'bánh kem', 'bánh sinh', 'sinh nhật', 'bánh pía', 'bánh đậu', 'đậu xanh', 'bánh cốm',
  'nem chua', 'nem nướng', 'nem lụi', 'chả lụa', 'chả giò', 'chả ram', 'chả quế', 'chả cá', 'chả mực', 'chả bò', 'dồi sụn', 'lạp xưởng',
  'xúc xích', 'chân gà', 'sả tắc', 'rút xương', 'tai heo', 'da heo', 'heo quay', 'vịt quay', 'gà luộc', 'gà ủ', 'ủ muối', 'gà rán',
  'bò né', 'bò kho', 'bò bít', 'bít tết', 'lẩu thái', 'lẩu bò', 'lẩu dê', 'lẩu gà', 'lẩu riêu', 'riêu cua', 'lẩu nấm', 'lẩu cá', 'lẩu mắm',
  'hải sản', 'sốt thái', 'ốc hương', 'cút lộn', 'vịt lộn', 'khoai tây', 'tây chiên', 'khoai lang', 'lang kén', 'lang lắc',
  'bắp xào', 'ngô luộc', 'ngô nướng', 'khoai nướng', 'khô gà', 'khô bò', 'khô heo', 'khô mực', 'mực rim', 'me ngào',
  'xoài lắc', 'cóc lắc', 'mận lắc', 'chè bưởi', 'chè thái', 'chè đậu', 'đậu đỏ', 'chè sen', 'chè chuối', 'chè khoai', 'kem dừa', 'kem que', 'kem ly',

  // --- 4. HÀNH ĐỘNG SINH HOẠT, CÔNG VIỆC & CUỘC SỐNG ---
  'đi làm', 'đi học', 'tăng ca', 'tan ca', 'chấm công', 'nhận lương', 'thưởng tết', 'tăng lương', 'họp hành', 'làm slide', 'thuyết trình',
  'nghỉ phép', 'nhảy việc', 'phỏng vấn', 'thử việc', 'hợp đồng', 'sa thải', 'đuổi việc', 'viết code', 'lập trình', 'sửa lỗi', 'fix bug',
  'chạy server', 'gửi mail', 'lỗi mạng', 'lag mạng', 'máy tính', 'bàn phím', 'chuột máy', 'màn hình', 'tai nghe', 'sạc pin', 'điện thoại', 'laptop',
  'tập gym', 'tập tạ', 'chạy bộ', 'đi bộ', 'bơi lội', 'đạp xe', 'leo núi', 'gập bụng', 'hít đất', 'kéo xà', 'đá bóng', 'đá banh', 'bóng rổ',
  'bóng chuyền', 'cầu lông', 'bóng bàn', 'pickleball', 'đánh gôn', 'quần vợt', 'lái xe', 'đi xe', 'xe máy', 'xe đạp', 'xe hơi', 'xe buýt',
  'tàu hỏa', 'máy bay', 'kẹt xe', 'tắc đường', 'đèn đỏ', 'bắn tốc', 'tốc độ', 'bằng lái', 'giao thông', 'đường phố',
  'nấu ăn', 'nấu cơm', 'nấu nướng', 'nấu canh', 'nấu lẩu', 'luộc rau', 'kho cá', 'kho thịt', 'rán cá', 'chiên cơm', 'xào rau', 'nướng thịt',
  'hấp bánh', 'pha trà', 'pha sữa', 'thái thịt', 'băm thịt', 'nhặt rau', 'gọt vỏ', 'bóc vỏ', 'vắt chanh', 'nêm nếm', 'nếm thử',
  'tưới cây', 'chăm cây', 'chặt cây', 'tỉa cây', 'chiết cành', 'ghép cành', 'nhổ cỏ', 'bón phân', 'leo cây', 'trèo cây', 'hái hoa', 'nuôi cá', 'bắt sâu',
  'trồng cây', 'trồng hoa', 'trồng rau', 'trồng lúa', 'trồng rừng', 'trồng nấm', 'trồng ngô', 'trồng khoai', 'trồng cỏ', 'trồng sen', 'trồng dâu', 'trồng dưa',
  'cây xanh', 'cây cối', 'cây cảnh', 'cây hoa', 'cây cỏ', 'cây rừng', 'cây lúa', 'cây đa', 'cây đề', 'cây bàng', 'cây phượng', 'cây thông', 'cây tre',
  'cành cây', 'lá cây', 'hoa hồng', 'hoa mai', 'hoa đào', 'hoa cúc', 'hoa sen', 'hoa lan', 'quả ngọt', 'quả chua', 'trái cây', 'trái tim', 'trái đất'
];

async function main() {
  console.log('====================================================');
  console.log('🚀 COMPILING MEGA DICTIONARY FOR GAME NỐI TỪ 🚀');
  console.log('====================================================');

  const dataDir = path.join(__dirname, '..', 'src', 'data');
  const dictPath = path.join(dataDir, 'dictionary.json');
  const customTxtPath = path.join(dataDir, 'custom_words.txt');

  const wordSet = new Set();
  const graph = {}; // headSyllable -> Set(tailSyllables)

  function addWord(first, second) {
    if (!first || !second) return;
    first = first.trim().toLowerCase().normalize('NFC');
    second = second.trim().toLowerCase().normalize('NFC');
    if (!isValidSyllable(first) || !isValidSyllable(second)) return;

    const fullWord = `${first} ${second}`;
    wordSet.add(fullWord);

    if (!graph[first]) graph[first] = new Set();
    graph[first].add(second);
  }

  // 1. Fetch undertheseanlp words.txt (~79,226 entries)
  try {
    console.log('📦 1/6 Downloading undertheseanlp words.txt...');
    const utsData = await fetchUrl('https://raw.githubusercontent.com/undertheseanlp/dictionary/master/dictionary/words.txt');
    const lines = utsData.split(/\r?\n/);
    for (const l of lines) {
      if (!l) continue;
      try {
        const obj = JSON.parse(l);
        if (obj && typeof obj.text === 'string') {
          const parts = obj.text.trim().toLowerCase().normalize('NFC').split(/\s+/);
          if (parts.length === 2) addWord(parts[0], parts[1]);
        }
      } catch (e) {}
    }
    console.log(`   ✓ Loaded undertheseanlp: ${wordSet.size} unique 2-syllable words so far.`);
  } catch (err) {
    console.warn('   ⚠️ Failed to fetch undertheseanlp:', err.message);
  }

  // 2. Fetch duyet/vietnamese-wordlist (Viet74K.txt & Viet39K.txt)
  try {
    console.log('📦 2/6 Downloading Viet74K.txt...');
    const v74k = await fetchUrl('https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet74K.txt');
    for (const l of v74k.split(/\r?\n/)) {
      const parts = l.trim().toLowerCase().normalize('NFC').split(/\s+/);
      if (parts.length === 2) addWord(parts[0], parts[1]);
    }
    console.log(`   ✓ Loaded Viet74K: ${wordSet.size} words.`);
  } catch (err) {
    console.warn('   ⚠️ Failed to fetch Viet74K:', err.message);
  }

  try {
    console.log('📦 3/6 Downloading Viet39K.txt...');
    const v39k = await fetchUrl('https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet39K.txt');
    for (const l of v39k.split(/\r?\n/)) {
      const parts = l.trim().toLowerCase().normalize('NFC').split(/\s+/);
      if (parts.length === 2) addWord(parts[0], parts[1]);
    }
    console.log(`   ✓ Loaded Viet39K: ${wordSet.size} words.`);
  } catch (err) {
    console.warn('   ⚠️ Failed to fetch Viet39K:', err.message);
  }

  // 3. Fetch NNBnh/noi-tu words.js
  try {
    console.log('📦 4/6 Downloading NNBnh/noi-tu words.js...');
    const wjs = await fetchUrl('https://raw.githubusercontent.com/NNBnh/noi-tu/master/words/words.js');
    const sandbox = {};
    new Function('sandbox', wjs + '; sandbox.words = words;')(sandbox);
    if (sandbox.words) {
      for (const f of Object.keys(sandbox.words)) {
        for (const s of sandbox.words[f]) {
          addWord(f, s);
        }
      }
    }
    console.log(`   ✓ Loaded words.js: ${wordSet.size} words.`);
  } catch (err) {
    console.warn('   ⚠️ Failed to fetch words.js:', err.message);
  }

  // 4. Fetch winstonleedev POS-tagged dictionaries
  const wFiles = ['dongtu.txt', 'danhtu.txt', 'tinhtu.txt', 'tudien.txt'];
  for (const f of wFiles) {
    try {
      console.log(`📦 Fetching winstonleedev/${f}...`);
      const txt = await fetchUrl(`https://raw.githubusercontent.com/winstonleedev/tudien/master/${f}`);
      for (const l of txt.split(/\r?\n/)) {
        const parts = l.trim().toLowerCase().normalize('NFC').split(/\s+/);
        if (parts.length === 2) addWord(parts[0], parts[1]);
      }
    } catch (e) {}
  }
  console.log(`   ✓ Loaded winstonleedev dictionaries: ${wordSet.size} words.`);

  // 5. Fetch HuggingFace tsdocode/vietnamese-dictionary
  try {
    console.log('📦 5/6 Downloading HuggingFace vi_dictionary.csv...');
    const csv = await fetchUrl('https://huggingface.co/datasets/tsdocode/vietnamese-dictionary/raw/main/vi_dictionary.csv');
    const lines = csv.split(/\r?\n/);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      let w = '';
      if (line.startsWith('"')) {
        const q = line.indexOf('"', 1);
        if (q !== -1) w = line.substring(1, q);
      } else {
        w = line.split(',')[0];
      }
      w = (w || '').trim().toLowerCase().normalize('NFC');
      const parts = w.split(/\s+/);
      if (parts.length === 2) addWord(parts[0], parts[1]);
    }
    console.log(`   ✓ Loaded HuggingFace vi_dictionary: ${wordSet.size} words.`);
  } catch (err) {
    console.warn('   ⚠️ Failed to fetch HuggingFace dictionary:', err.message);
  }

  // 6. Load existing custom words
  if (fs.existsSync(customTxtPath)) {
    const lines = fs.readFileSync(customTxtPath, 'utf8').split(/\r?\n/);
    for (const l of lines) {
      const parts = l.trim().toLowerCase().normalize('NFC').split(/\s+/);
      if (parts.length === 2) addWord(parts[0], parts[1]);
    }
  }

  // 7. Inject Curated Modern, Daily & Gen Z Vocabulary
  console.log('📦 6/6 Injecting Curated Modern, Daily & Gen Z Vocabulary...');
  for (const item of MODERN_AND_DAILY_WORDS) {
    const parts = item.trim().toLowerCase().normalize('NFC').split(/\s+/);
    if (parts.length === 2) addWord(parts[0], parts[1]);
  }

  // Convert graph sets to sorted arrays
  const serializableGraph = {};
  for (const k of Object.keys(graph)) {
    serializableGraph[k] = Array.from(graph[k]).sort();
  }

  const resultWords = Array.from(wordSet).sort();
  console.log('====================================================');
  console.log(`🎉 COMPILATION COMPLETE!`);
  console.log(`📚 Total 2-syllable Vietnamese words: ${resultWords.length}`);
  console.log(`🌐 Total root syllables in graph: ${Object.keys(serializableGraph).length}`);
  console.log('====================================================');

  // Save dictionary.json
  fs.writeFileSync(dictPath, JSON.stringify({
    count: resultWords.length,
    words: resultWords,
    graph: serializableGraph
  }));
  console.log(`✓ Saved ${resultWords.length} words to: ${dictPath}`);

  // Save custom_words.txt
  const allCustomWords = Array.from(new Set([
    ...MODERN_AND_DAILY_WORDS.map(w => w.trim().toLowerCase().normalize('NFC')),
    ...(fs.existsSync(customTxtPath) ? fs.readFileSync(customTxtPath, 'utf8').split(/\r?\n/).filter(Boolean) : [])
  ])).sort();

  fs.writeFileSync(customTxtPath, allCustomWords.join('\n') + '\n', 'utf8');
  console.log(`✓ Saved ${allCustomWords.length} custom words to: ${customTxtPath}`);

  // CRITICAL VERIFICATION: Check 'diện đồ' and connectivity
  console.log('----------------------------------------------------');
  console.log('🔎 VERIFICATION TESTS:');
  console.log('Has "diện đồ":', wordSet.has('diện đồ') ? '✅ YES' : '❌ NO');
  console.log('Next words from "diện":', serializableGraph['diện']);
  console.log('Next words from "đồ":', serializableGraph['đồ']?.slice(0, 15));
  console.log('Has "trồng cây":', wordSet.has('trồng cây') ? '✅ YES' : '❌ NO');
  console.log('Has "bắt trend":', wordSet.has('bắt trend') ? '✅ YES' : '❌ NO');
  console.log('Has "chữa lành":', wordSet.has('chữa lành') ? '✅ YES' : '❌ NO');
  console.log('Has "vô tri":', wordSet.has('vô tri') ? '✅ YES' : '❌ NO');
  console.log('Has "flex đồ":', wordSet.has('flex đồ') ? '✅ YES' : '❌ NO');
  console.log('----------------------------------------------------');
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
