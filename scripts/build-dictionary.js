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

// Comprehensive real-life, daily Vietnamese verbs, nouns, modern slang, foods, internet & lifestyle terms
const MODERN_AND_DAILY_WORDS = [
  // Trồng & Nông nghiệp & Cây cối
  'trồng cây', 'trồng hoa', 'trồng rau', 'trồng lúa', 'trồng rừng', 'trồng nấm', 'trồng ngô', 'trồng khoai',
  'trồng cỏ', 'trồng sen', 'trồng dâu', 'trồng dưa', 'trồng sắn', 'trồng kiểng', 'trồng chè', 'trồng đậu',
  'trồng trọt', 'trồng cấy', 'trồng chuối', 'trồng ớt', 'trồng tiêu', 'trồng mía', 'trồng bông', 'trồng xoài',
  'trồng mít', 'trồng ổi', 'trồng cà', 'trồng đỗ', 'trồng tỉa', 'trồng trỉa', 'trồng xen', 'trồng trái',
  'trồng cải', 'trồng tỏi', 'trồng hành', 'trồng gừng', 'trồng nghệ', 'trồng sả', 'trồng bí', 'trồng bầu',
  'trồng mướp', 'trồng cam', 'trồng chanh', 'trồng bưởi', 'trồng quất', 'trồng quýt', 'trồng táo', 'trồng mận',
  'trồng đào', 'trồng lê', 'trồng nhãn', 'trồng vải', 'trồng dừa', 'trồng cau', 'trồng thông', 'trồng keo',
  'trồng tre', 'trồng trúc', 'trồng măng',

  // Cây cối & Bộ phận của cây
  'cây xanh', 'cây cối', 'cây cảnh', 'cây hoa', 'cây cỏ', 'cây rừng', 'cây lúa', 'cây ngô', 'cây mía',
  'cây đa', 'cây đề', 'cây bàng', 'cây phượng', 'cây xoan', 'cây thông', 'cây tre', 'cây trúc', 'cây nứa',
  'cây cau', 'cây dừa', 'cây mít', 'cây xoài', 'cây ổi', 'cây bưởi', 'cây cam', 'cây chanh', 'cây quất',
  'cây đào', 'cây mai', 'cây sen', 'cây súng', 'cây thuốc', 'cây chè', 'cây cầu', 'cây xăng', 'cây số',
  'cây bút', 'cây viết', 'cây kim', 'cây đàn', 'cây gậy', 'cây cọc', 'cây rơm', 'cây củi', 'cây gỗ',
  'cây nến', 'cây kiểng', 'cây chổi', 'cây kéo', 'cây dù', 'cây quạt', 'cây nêu', 'cây rạ', 'cây gai',
  'cây giống', 'cây nhà', 'cây vườn', 'cây trái', 'cây lá', 'cây cành', 'cây ăn', 'cây bụi', 'cây leo',
  'cây mầm', 'cây con', 'cây chuối', 'cây quýt', 'cây bơ', 'cây na', 'cây điều', 'cây tiêu', 'cây đay',
  'cây ngót', 'cây râm', 'cây sấu', 'cây sung', 'cây vải', 'cây nhãn', 'cây dâu', 'cây khế', 'cây roi',
  'cây mận', 'cây vối', 'cây gấc', 'cây me', 'cây mọc', 'cây cao', 'cây ngã', 'cây đổ', 'cây khô', 'cây tươi',
  'cành cây', 'cành hoa', 'cành lá', 'cành chiết', 'cành ghép', 'cành đào', 'cành mai', 'cành tre',
  'lá cây', 'lá xanh', 'lá vàng', 'lá rụng', 'lá úa', 'lá non', 'lá sen', 'lá chuối', 'lá dong',
  'lá lốt', 'lá chanh', 'lá trầu', 'lá cỏ', 'lá dừa', 'lá dứa', 'lá tía', 'lá mía', 'lá tre',
  'hoa hồng', 'hoa mai', 'hoa đào', 'hoa cúc', 'hoa sen', 'hoa súng', 'hoa lan', 'hoa huệ', 'hoa ly',
  'hoa giấy', 'hoa phượng', 'hoa bưởi', 'hoa nhài', 'hoa quỳnh', 'hoa sưa', 'hoa sữa', 'hoa gạo', 'hoa dâm',
  'hoa ban', 'hoa sáp', 'hoa tươi', 'hoa khô', 'hoa giả', 'hoa cưới', 'hoa chúc', 'hoa viếng',
  'quả ngọt', 'quả chua', 'quả chín', 'quả non', 'quả xanh', 'quả bóng', 'quả chuối', 'quả cam', 'quả bưởi',
  'quả xoài', 'quả mít', 'quả táo', 'quả lê', 'quả dưa', 'quả bí', 'quả bầu', 'quả mướp', 'quả cà',
  'quả trứng', 'quả cầu', 'quả tim', 'quả đồi', 'quả núi', 'quả chanh', 'quả quất', 'quả na', 'quả dừa',
  'trái cây', 'trái ngọt', 'trái ngon', 'trái mùa', 'trái chuối', 'trái cam', 'trái dừa', 'trái ớt',
  'trái tim', 'trái banh', 'trái đất', 'trái ngược', 'trái chiều', 'trái phép', 'trái luật', 'trái tính', 'trái nết',

  // Hành động với thiên nhiên, vườn tược
  'tưới cây', 'tưới hoa', 'tưới rau', 'tưới nước', 'tưới tiêu', 'tưới gốc', 'tưới nhỏ', 'tưới phun',
  'chăm cây', 'chăm hoa', 'chăm sóc', 'chăm bón', 'chăm nuôi', 'chăm lo', 'chăm chỉ', 'chăm học', 'chăm làm',
  'chặt cây', 'chặt cành', 'chặt củi', 'chặt gỗ', 'chặt chém', 'chặt khúc', 'chặt đứt',
  'tỉa cây', 'tỉa cành', 'tỉa lá', 'tỉa hoa', 'tỉa tót', 'tỉa lông', 'tỉa râu', 'tỉa bớt',
  'chiết cành', 'chiết cây', 'ghép cành', 'ghép cây', 'ghép đôi', 'ghép hình', 'ghép ảnh', 'ghép chữ',
  'nhổ cỏ', 'nhổ lông', 'nhổ răng', 'nhổ râu', 'nhổ neo', 'nhổ cọc', 'nhổ rễ', 'nhổ cây',
  'bón phân', 'bón thúc', 'bón lót', 'bón cây', 'bón cơm', 'bón cháo',
  'leo cây', 'leo núi', 'leo dốc', 'leo thang', 'leo rào', 'leo trèo',
  'trèo cây', 'trèo đèo', 'trèo tường', 'trèo rào', 'trèo cao',
  'hái hoa', 'hái quả', 'hái lá', 'hái chè', 'hái nấm', 'hái lượm', 'hái sen', 'hái dừa', 'hái lộc',
  'nuôi cá', 'nuôi tôm', 'nuôi cua', 'nuôi ốc', 'nuôi gà', 'nuôi vịt', 'nuôi heo', 'nuôi lợn',
  'nuôi bò', 'nuôi dê', 'nuôi cừu', 'nuôi chó', 'nuôi mèo', 'nuôi chim', 'nuôi ong', 'nuôi tằm',
  'nuôi dạy', 'nuôi nấng', 'nuôi sống', 'nuôi dưỡng', 'nuôi con', 'nuôi thú',
  'bắt sâu', 'bắt bướm', 'bắt cá', 'bắt tôm', 'bắt cua', 'bắt ốc', 'bắt chuột', 'bắt chim',
  'bắt bóng', 'bắt đầu', 'bắt nhịp', 'bắt chước', 'bắt bài', 'bắt trend', 'bắt đáy', 'bắt sóng',
  'bắt nạt', 'bắt trộm', 'bắt đền', 'bắt tay', 'bắt chuyện', 'bắt gặp', 'bắt giam',
  'cắt tỉa', 'cắt cỏ', 'cắt tóc', 'cắt may', 'cắt dán', 'cắt nghĩa', 'cắt giảm', 'cắt lỗ',
  'cắt đứt', 'cắt ngang', 'cắt cơn', 'cắt thuốc', 'cắt bánh', 'cắt giấy',

  // Nấu nướng, Ẩm thực & Bữa ăn
  'nấu ăn', 'nấu cơm', 'nấu nướng', 'nấu canh', 'nấu lẩu', 'nấu cháo', 'nấu chè', 'nấu súp', 'nấu bếp', 'nấu chín', 'nấu xôi', 'nấu nước', 'nấu mì',
  'luộc rau', 'luộc trứng', 'luộc gà', 'luộc khoai', 'luộc ngô', 'luộc thịt', 'luộc ốc',
  'kho cá', 'kho thịt', 'kho quẹt', 'kho tàu', 'kho tộ',
  'rán cá', 'rán trứng', 'rán nem', 'rán bánh', 'rán chả',
  'chiên cơm', 'chiên trứng', 'chiên xù', 'chiên giòn', 'chiên gà', 'chiên cá',
  'xào rau', 'xào thịt', 'xào mì', 'xào lăn', 'xào chua', 'xào sả',
  'nướng thịt', 'nướng cá', 'nướng mực', 'nướng bánh', 'nướng khoai', 'nướng ngô', 'nướng gà',
  'hấp bánh', 'hấp cá', 'hấp gà', 'hấp tôm', 'hấp mực', 'hấp xôi',
  'pha trà', 'pha sữa', 'pha nước', 'pha chế', 'pha trộn', 'pha lẫn', 'pha màu', 'pha trò', 'pha phôi', 'pha cà',
  'cuốn nem', 'cuốn bánh', 'cuốn gỏi', 'cuốn chả',
  'thái thịt', 'thái rau', 'thái lát', 'thái mỏng', 'thái nhỏ', 'thái sợi',
  'băm thịt', 'băm nhỏ', 'nhặt rau', 'nhặt cỏ', 'gọt vỏ', 'bóc vỏ', 'bóc tôm', 'bóc trứng', 'vắt chanh', 'vắt cam', 'nêm nếm', 'nếm thử',
  'ăn cơm', 'ăn sáng', 'ăn trưa', 'ăn tối', 'ăn khuya', 'ăn quà', 'ăn vặt', 'ăn nhậu', 'ăn chơi', 'ăn tiệc',
  'ăn uống', 'ăn bám', 'ăn khớp', 'ăn ý', 'ăn ảnh', 'ăn diện', 'ăn chay', 'ăn mặn', 'ăn xin', 'ăn gian',
  'ăn trộm', 'ăn cắp', 'ăn lẩu', 'ăn bánh', 'ăn kẹo', 'ăn ốc', 'ăn kèm', 'ăn hàng', 'ăn đứt', 'ăn chắc', 'ăn mặc',
  'ăn phở', 'ăn bún', 'ăn mì', 'ăn xôi', 'ăn cháo', 'ăn no', 'ăn ngon',
  'uống nước', 'uống trà', 'uống bia', 'uống rượu', 'uống thuốc', 'uống sữa', 'uống say', 'uống cạn',

  // Đồ uống & Món ăn vặt hiện đại
  'trà sữa', 'trà đào', 'trà tắc', 'trà sen', 'trà măng', 'măng cụt', 'trà chanh', 'trà dâu', 'trà xanh',
  'trà ô', 'ô long', 'trà gạo', 'gạo lứt', 'hoa cúc', 'trà lài', 'trà đen', 'trà thảo', 'thảo mộc',
  'trà vải', 'trà ổi', 'trà táo', 'trà quất', 'trà gừng', 'trà búp', 'trà sâm', 'trà atiso',
  'cà phê', 'phê muối', 'phê trứng', 'phê sữa', 'phê đen', 'bạc xỉu', 'đen đá', 'nâu đá', 'sữa đá', 'sữa nóng',
  'cacao', 'sinh tố', 'nước ép', 'nước mía', 'nước dừa', 'nước cam', 'nước chanh', 'nước lọc', 'nước suối', 'nước khoáng', 'nước ngọt', 'tăng lực',
  'sữa hạt', 'sữa chua', 'chua nếp', 'nếp cẩm', 'sữa tươi', 'sữa đặc', 'sữa bắp', 'đậu nành', 'kem béo', 'kem cheese', 'trân châu', 'đường đen',
  'thạch rau', 'rau câu', 'thạch dừa', 'thạch đen', 'matcha',
  'bánh mì', 'bánh tráng', 'tráng trộn', 'tráng nướng', 'tráng cuộn', 'bánh cuốn', 'bánh bao', 'bánh xèo',
  'bánh khọt', 'bánh bèo', 'bột lọc', 'bánh đúc', 'bánh giò', 'bánh chưng', 'bánh tét', 'bánh pía',
  'bông lan', 'su kem', 'bánh tiêu', 'bánh rán', 'bánh quy', 'bánh kem', 'bánh flan', 'bánh gối', 'bánh cay', 'bánh chuối', 'bánh khoai', 'bánh quẩy',
  'mì cay', 'mì tôm', 'mì xào', 'mì trộn', 'mì ý', 'mì quảng',
  'bún đậu', 'mắm tôm', 'bún bò', 'bún chả', 'bún riêu', 'bún mắm', 'bún ốc', 'thịt nướng', 'bún cá', 'bún sườn',
  'phở bò', 'phở gà', 'phở tái', 'phở nạm', 'phở xào', 'phở cuốn', 'phở trộn', 'hủ tiếu', 'bánh canh',
  'cơm tấm', 'cơm sườn', 'cơm gà', 'cơm rang', 'cơm chiên', 'cơm lam', 'cơm nguội', 'cơm cuộn', 'cơm niêu', 'cơm nắm',
  'gà rán', 'khoai tây', 'tây chiên', 'khoai lang', 'lang kén', 'lang lắc', 'nem chua', 'nem nướng', 'nem rán', 'nem lụi',
  'chả giò', 'chả ram', 'chả lụa', 'chả cá', 'chả mực', 'chả quế', 'chả bò',
  'lẩu thái', 'lẩu bò', 'lẩu gà', 'lẩu nấm', 'lẩu cua', 'lẩu dê', 'lẩu cá', 'lẩu riêu',
  'hải sản', 'sốt thái', 'ốc hương', 'cút lộn', 'vịt lộn', 'chân gà', 'tai heo', 'dồi sụn', 'lạp xưởng', 'xúc xích',
  'bò kho', 'bò né', 'bò sốt', 'sốt vang', 'bò bít', 'bít tết', 'gà luộc', 'gà ủ', 'ủ muối', 'vịt quay', 'heo quay',
  'sườn xào', 'xào chua', 'chua ngọt', 'thịt kho', 'kho tàu', 'cá kho', 'canh chua',
  'rau muống', 'rau cải', 'rau ngót', 'rau mồng', 'mồng tơi', 'rau dền', 'rau đay', 'mướp đắng', 'khổ qua',
  'cà chua', 'cà tím', 'cà pháo', 'dưa chua', 'dưa muối', 'kim chi', 'bắp xào', 'ngô luộc', 'ngô nướng', 'khoai nướng',

  // Từ lóng, Mạng xã hội, Gen Z, Trending
  'đu trend', 'bắt trend', 'tạo trend', 'hot trend', 'đu idol', 'săn vé', 'săn sale', 'chốt đơn', 'bão đơn', 'nổ đơn',
  'giao hàng', 'nhận hàng', 'hoàn hàng', 'boom hàng', 'freeship', 'voucher', 'giảm giá', 'áp mã', 'khuyến mãi', 'mã giảm', 'tiền ship', 'phí ship',
  'ting ting', 'quét mã', 'chuyển khoản', 'nạp tiền', 'rút tiền', 'tài khoản', 'mật khẩu', 'đăng nhập', 'đăng xuất', 'bảo mật', 'hai lớp', 'chính chủ', 'xác thực', 'mã otp',
  'thả tim', 'thả like', 'bình luận', 'chia sẻ', 'đăng bài', 'đăng story', 'gắn thẻ', 'chặn tin', 'kết bạn', 'hủy kết', 'theo dõi', 'lượt xem', 'tương tác', 'tin nhắn', 'nhắn tin', 'gọi điện', 'gọi video',
  'livestream', 'phát trực', 'sống ảo', 'cà khịa', 'bóc phốt', 'hóng phốt', 'hóng biến', 'nổ biến', 'hít drama', 'chữa lành',
  'cháy phố', 'căng đét', 'căng cực', 'đỉnh chóp', 'đỉnh nóc', 'kịch trần', 'keo lì', 'mãi đỉnh', 'mãi mận', 'hết nước', 'nước chấm',
  'xanh chín', 'bật mood', 'tụt mood', 'bất ổn', 'chill chill', 'bốc phét', 'chém gió', 'lùa gà', 'úp bô', 'đu đỉnh', 'cắt lỗ', 'bắt đáy',
  'cháy ví', 'cháy túi', 'vạ miệng', 'ác khẩu', 'nói điêu', 'nói phét', 'nói dối', 'nói khoác', 'tự luyến', 'vô tri',
  'hài hước', 'lầy lội', 'nhây bựa', 'chín chắn', 'dễ thương', 'đáng yêu', 'thân thiện', 'ấm áp', 'lạnh lùng', 'soái ca', 'nữ thần',
  'trai xinh', 'gái đẹp', 'trai đẹp', 'gái xinh', 'nhan sắc', 'ngoại hình', 'vóc dáng',
  'hướng nội', 'hướng ngoại', 'nội tâm', 'tinh tế', 'độc lạ', 'ô dề', 'ra dẻ', 'mlem mlem', 'xu cà', 'cà na', 'cờ đỏ', 'cờ xanh',
  'bất lực', 'chằm dzn', 'ét o', 'simp lỏd', 'simp chúa', 'tay to', 'múa rìu', 'out trình', 'gà mờ', 'tay mơ', 'tay chơi',
  'trùm sò', 'trùm cuối', 'gánh team', 'tạ team', 'bóp team', 'cày cuốc', 'cày phim', 'cày view', 'chạy deadline', 'áp lực', 'trầm cảm',

  // Công việc, Công sở & Công nghệ
  'đi làm', 'tăng ca', 'tan ca', 'làm thêm', 'làm ca', 'chấm công', 'điểm danh', 'nhận lương', 'thưởng tết', 'tăng lương',
  'nghỉ phép', 'nghỉ việc', 'nhảy việc', 'xin việc', 'phỏng vấn', 'thử việc', 'biên chế', 'hợp đồng', 'bảo hiểm', 'công đoàn',
  'viết code', 'lập trình', 'sửa lỗi', 'fix bug', 'cài win', 'chạy server', 'gửi mail', 'họp nhóm', 'thuyết trình', 'làm báo', 'báo cáo',
  'máy tính', 'bàn phím', 'chuột máy', 'màn hình', 'tai nghe', 'sạc pin', 'dây cáp', 'ổ cứng', 'thẻ nhớ', 'điện thoại', 'laptop', 'máy in', 'máy chiếu', 'phần mềm', 'ứng dụng',

  // Sinh hoạt hàng ngày & Gia đình
  'rửa bát', 'rửa chén', 'rửa xe', 'rửa mặt', 'rửa tay', 'rửa chân', 'rửa rau', 'rửa ảnh', 'rửa sạch',
  'giặt giũ', 'giặt đồ', 'giặt áo', 'giặt quần', 'giặt là', 'giặt ủi', 'giặt máy', 'giặt tay',
  'phơi đồ', 'phơi áo', 'phơi quần', 'phơi nắng', 'phơi khô', 'phơi sương', 'phơi bày', 'phơi trải',
  'quét nhà', 'quét sân', 'quét dọn', 'quét rác', 'quét vôi', 'quét sơn', 'quét mã', 'quét thẻ', 'quét sạch',
  'lau nhà', 'lau bàn', 'lau ghế', 'lau kính', 'lau dọn', 'lau chùi', 'lau khô',
  'dọn dẹp', 'dọn nhà', 'dọn phòng', 'dọn cơm', 'dọn bàn', 'dọn rác', 'dọn đường', 'dọn cỗ',
  'tắm rửa', 'tắm gội', 'gội đầu', 'chải tóc', 'sấy tóc', 'cắt tóc', 'nhuộm tóc', 'uốn tóc', 'đánh răng',
  'đi chợ', 'đi học', 'đi ngủ', 'đi chơi', 'đi dạo', 'đi bộ', 'đi phượt', 'đi tour', 'đi thi', 'đi khám', 'đi lại',
  'ngủ say', 'ngủ trưa', 'ngủ gật', 'ngủ nướng', 'ngủ mê', 'ngủ nghê', 'ngủ mơ', 'ngủ muộn', 'ngủ ngon',
  'thức dậy', 'thức khuya', 'thức đêm', 'thức giấc', 'thức ăn', 'thức uống', 'thức thời',
  'xem phim', 'xem kịch', 'xem tranh', 'xem xét', 'xem bói', 'xem lại', 'xem trộm', 'xem xiếc', 'xem bóng',
  'nghe nhạc', 'nghe ngóng', 'nghe nhìn', 'nghe lời', 'nghe lén', 'nghe đài', 'nghe thử', 'nghe kể',
  'đọc sách', 'đọc báo', 'đọc truyện', 'đọc tin', 'đọc hiểu', 'đọc thơ', 'đọc diễn', 'đọc bài',
  'viết văn', 'viết bài', 'viết thư', 'viết lách', 'viết tay', 'viết sách',
  'học sinh', 'học bài', 'học tập', 'học hành', 'học hỏi', 'học phí', 'học lực', 'học bổng', 'học viện', 'học thuật', 'học hàm', 'học vị', 'học kỳ', 'học đường', 'học lỏm', 'học thêm',
  'dạy học', 'dạy bảo', 'dạy dỗ', 'dạy kèm', 'dạy con', 'dạy nghề',
  'tập gym', 'tập yoga', 'tập tành', 'tập luyện', 'tập thể', 'tập làm', 'tập viết', 'tập đọc', 'tập vẽ', 'tập bơi', 'tập chạy', 'tập xe', 'tập múa', 'tập hát',
  'chơi game', 'chơi bóng', 'chơi đùa', 'chơi bời', 'chơi trội', 'chơi net', 'chơi xấu', 'chơi bài', 'chơi cờ', 'chơi nhạc',

  // Quan hệ, Tình cảm
  'người yêu', 'bạn trai', 'bạn gái', 'bồ bịch', 'crush', 'tri kỷ', 'bạn thân', 'bạn cũ', 'tỏ tình', 'tán tỉnh', 'hẹn hò', 'yêu đương', 'chia tay',
  'nắm tay', 'ôm ấp', 'hôn hít', 'kết hôn', 'ly hôn', 'vợ chồng', 'ông bà', 'cha mẹ', 'bố mẹ', 'anh chị', 'anh em', 'chị em', 'cô dì', 'chú bác', 'con cháu', 'dâu rể', 'thầy cô', 'học trò',

  // Nối vòng chuỗi các từ ghép phổ biến
  'viên gạch', 'gạch men', 'men gốm', 'gốm sứ', 'sứ mệnh', 'mệnh lệnh',
  'chua cay', 'cay đắng', 'tôm khô', 'tôm hùm', 'hùm xám', 'xám xịt', 'bò khô', 'bò né', 'bò bía',
  'bộ đồ', 'đồ chơi', 'sách vở', 'phim ảnh', 'nhạc sống', 'đá bóng', 'bóng đá', 'đá banh',
  'con mèo', 'con chó', 'con gà', 'con heo', 'cái bàn', 'cái ghế', 'bông hoa',
  'ly nước', 'nước cam', 'phê duyệt', 'phim truyện', 'truyện tranh', 'tranh vẽ', 'vẽ tranh',
  'chợ búa', 'siêu thị', 'thị trường', 'xe máy', 'xe đạp', 'xe hơi', 'xe bus',
  'máy bay', 'bay lượn', 'lượn sóng', 'sóng biển', 'biển cả', 'cả ngày',
  'ngày mai', 'mai sau', 'sau này', 'này nọ', 'nọ kia', 'bài tập',
  'tập làm', 'làm bài', 'viết thư', 'thư viện', 'viện bảo', 'bảo tàng',
  'tàng hình', 'hình ảnh', 'ảnh chụp', 'chụp hình', 'hình học', 'học hỏi',
  'hỏi thăm', 'thăm hỏi', 'hỏi han', 'han gỉ', 'gỉ sét', 'sét đánh',
  'đánh chén', 'chén bát', 'bát đũa', 'đũa ăn',
  'nguội lạnh', 'lạnh giá', 'giá cả', 'cả đời',
  'đời sống', 'sống còn', 'còn lại', 'lại đây', 'đây đó', 'đó đây'
];

async function main() {
  console.log('Downloading and compiling comprehensive Vietnamese dictionaries...');
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let wordsJsData = '';
  let viet74kData = '';
  let undertheseaData = '';

  // 1. Fetch undertheseanlp words.txt
  try {
    console.log('Fetching undertheseanlp/dictionary words.txt...');
    undertheseaData = await fetchUrl('https://raw.githubusercontent.com/undertheseanlp/dictionary/master/dictionary/words.txt');
    console.log(`Downloaded undertheseanlp words.txt (${Math.round(undertheseaData.length / 1024)} KB).`);
  } catch (e) {
    console.warn('Could not fetch undertheseanlp words.txt:', e.message);
  }

  // 2. Fetch words.js
  try {
    console.log('Fetching NNBnh/noi-tu words.js...');
    wordsJsData = await fetchUrl('https://raw.githubusercontent.com/NNBnh/noi-tu/master/words/words.js');
    console.log('Downloaded words.js successfully.');
  } catch (e) {
    console.warn('Could not fetch words.js:', e.message);
  }

  // 3. Fetch Viet74K.txt
  try {
    console.log('Fetching Viet74K.txt...');
    viet74kData = await fetchUrl('https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet74K.txt');
    console.log('Downloaded Viet74K.txt successfully.');
  } catch (e) {
    console.warn('Could not fetch Viet74K.txt:', e.message);
  }

  const wordSet = new Set();
  const graph = {}; // { firstSyllable: Set(secondSyllables) }

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

  // Process undertheseanlp
  if (undertheseaData) {
    const lines = undertheseaData.split(/\r?\n/);
    for (const line of lines) {
      if (!line) continue;
      try {
        const obj = JSON.parse(line);
        if (obj && typeof obj.text === 'string') {
          const parts = obj.text.trim().toLowerCase().normalize('NFC').split(/\s+/);
          if (parts.length === 2) {
            addWord(parts[0], parts[1]);
          }
        }
      } catch (e) {}
    }
  }

  // Process words.js
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

  // Process Viet74K
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

  // Process custom_words.txt if already exists
  const customTxtPath = path.join(dataDir, 'custom_words.txt');
  if (fs.existsSync(customTxtPath)) {
    const lines = fs.readFileSync(customTxtPath, 'utf8').split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim().toLowerCase().normalize('NFC');
      const parts = line.split(/\s+/);
      if (parts.length === 2) {
        addWord(parts[0], parts[1]);
      }
    }
  }

  // Process modern and daily words
  for (const item of MODERN_AND_DAILY_WORDS) {
    const parts = item.trim().toLowerCase().normalize('NFC').split(/\s+/);
    if (parts.length === 2) {
      addWord(parts[0], parts[1]);
    }
  }

  // Convert graph sets to arrays
  const serializableGraph = {};
  for (const k of Object.keys(graph)) {
    serializableGraph[k] = Array.from(graph[k]).sort();
  }

  const resultWords = Array.from(wordSet).sort();
  console.log(`✅ Dictionary compiled: ${resultWords.length} unique 2-syllable Vietnamese words.`);
  console.log(`✅ Graph contains ${Object.keys(serializableGraph).length} unique head syllables.`);

  // Write dictionary.json
  const outputPath = path.join(dataDir, 'dictionary.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    count: resultWords.length,
    words: resultWords,
    graph: serializableGraph
  }));
  console.log(`Saved dictionary to: ${outputPath}`);

  // Write custom_words.txt with all modern & daily additions
  fs.writeFileSync(customTxtPath, MODERN_AND_DAILY_WORDS.sort().join('\n') + '\n', 'utf8');
  console.log(`Saved custom words list to: ${customTxtPath}`);

  // Verify 'trồng cây'
  if (wordSet.has('trồng cây')) {
    console.log('🎯 Verified: "trồng cây" is in the dictionary!');
    console.log('Follow-ups for "cây":', serializableGraph['cây']?.slice(0, 15));
  } else {
    console.error('❌ ERROR: "trồng cây" was NOT added!');
  }
}

main().catch(err => {
  console.error('Failed to build dictionary:', err);
  process.exit(1);
});
