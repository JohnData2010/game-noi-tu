const fs = require('fs');
const path = require('path');

const VIETNAMESE_SYLLABLE_REGEX = /^[a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]+$/i;

function isValidSyllable(s) {
  return VIETNAMESE_SYLLABLE_REGEX.test(s);
}

const GENZ_AND_MODERN_WORDS = [
  // --- Gen Z, Trending & Internet Slang ---
  'bắt trend', 'đu trend', 'tạo trend', 'hết trend', 'trend hot', 'trend mới', 'trend cũ', 'trend xịn', 'trend này', 'chạy trend',
  'check var', 'var nhau', 'var chạm', 'bị var', 'pha var',
  'flex đồ', 'flex bài', 'flex điểm', 'flex nhẹ', 'flex khéo', 'flex xe', 'flex tiền', 'flex nhà', 'flex ảnh',
  'flop vãi', 'flop nặng', 'bị flop', 'chúa flop', 'cứu flop', 'bài flop', 'kênh flop', 'video flop',
  'slay quá', 'slay vãi', 'slay chúa', 'quá slay', 'cực slay',
  'mãi đỉnh', 'đỉnh nóc', 'kịch trần', 'bay phới', 'đỉnh chóp', 'đỉnh cao', 'quá đỉnh', 'đỉnh thật',
  'cháy phố', 'cháy máy', 'cháy quá', 'cháy khét', 'khét lẹt', 'cháy túi', 'cháy ví', 'cháy hết',
  'căng đét', 'căng cực', 'căng thẳng', 'căng tràn', 'căng buồm', 'cực căng',
  'vô tri', 'hết cứu', 'cạn lời', 'sập nguồn', 'hóa đá', 'đứng hình', 'bật ngửa', 'ngơ ngác', 'ngỡ ngàng', 'chết lặng', 'câm nín',
  'chấn động', 'ô dề', 'ố dề', 'ra dẻ', 'ra vẻ', 'làm màu', 'làm nét', 'tạo nét', 'làm dáng',
  'keo lỳ', 'keo lì', 'mãi mận', 'mận xoài', 'mận chát', 'mận vải', 'mận keo', 'mận đỏ', 'mận hậu',
  'bóc phốt', 'hóng phốt', 'hóng biến', 'nổ biến', 'hít drama', 'drama chúa', 'dính phốt', 'dính chưởng', 'phốt to', 'phốt căng', 'tẩy chay',
  'cà khịa', 'cà chớn', 'đá đểu', 'đá xéo', 'mỉa mai', 'châm biếm', 'xỏ xiên', 'nói móc', 'chọc ngoáy',
  'chữa lành', 'chữa rách', 'tổn thương', 'thao túng', 'tâm lý', 'chấp niệm', 'sầu muộn', 'suy đét', 'suy sụp', 'overthinking',
  'bất ổn', 'bất lực', 'bật mood', 'tụt mood', 'chill chill', 'chill phết', 'quá đã', 'đã cái', 'cưng xỉu', 'xỉu ngang', 'xỉu up', 'xỉu down', 'mê xỉu', 'đẹp xỉu',
  'mlem mlem', 'simp chúa', 'simp lỏ', 'lỏ vãi', 'lỏ quá', 'ảo ma', 'ảo tưởng', 'ảo giác', 'ảo diệu', 'cay cú', 'ấm ức', 'tức tối',
  'trà xanh', 'tiểu tam', 'chính thất', 'cờ đỏ', 'cờ xanh', 'red flag', 'green flag', 'trap boy', 'trap girl', 'đào mỏ', 'lừa tình', 'bắt cá',
  'gánh team', 'tạ team', 'bóp team', 'còng lưng', 'out trình', 'tay to', 'tay mơ', 'gà mờ', 'lên trình', 'xuống trình', 'chấp hết',
  'lật kèo', 'quay xe', 'bẻ lái', 'lội ngược', 'cua gắt', 'lạng lách', 'đánh võng', 'văng cua',
  'lụm lúa', 'lượm tiền', 'bào tiền', 'bào ví', 'rỗng ví', 'viêm màng', 'màng túi', 'hết tiền', 'kẹt tiền', 'túng tiền',
  'đu idol', 'đu concert', 'đu show', 'săn vé', 'săn sale', 'chốt đơn', 'nổ đơn', 'bão đơn', 'bùng hàng', 'boom hàng', 'huỷ đơn', 'hoàn đơn',
  'giao hàng', 'nhận hàng', 'trả hàng', 'áp mã', 'săn voucher', 'giảm giá', 'khuyến mãi', 'xả kho', 'gom đơn',
  'ting ting', 'quét mã', 'quét qr', 'bắn tiền', 'chuyển khoản', 'nạp ví', 'rút ví', 'quẹt thẻ', 'chạm thẻ', 'mở ví', 'sao kê',

  // --- Mạng xã hội, Tóp Tóp, Livestream & Gaming ---
  'sống ảo', 'quay tóp', 'tóp tóp', 'lướt phây', 'lướt mạng', 'lướt web', 'lướt nét', 'lướt tóp', 'cày view', 'cày phim', 'cày game', 'cày cuốc', 'cày đêm',
  'thả tim', 'thả like', 'thả haha', 'bình luận', 'chia sẻ', 'đăng bài', 'đăng story', 'gắn thẻ', 'chặn tin', 'kết bạn', 'hủy kết', 'hủy bạn',
  'theo dõi', 'lượt xem', 'tương tác', 'hút view', 'lên xu', 'xu hướng', 'tin nhắn', 'nhắn tin', 'gọi điện', 'gọi video', 'nhắn riêng', 'nhắn nhóm',
  'livestream', 'chốt deal', 'bán hàng', 'phát sóng', 'lên sóng', 'cắt clip', 'ghép nhạc', 'chèn sub', 'ăn gậy', 'bay kênh', 'bay màu', 'khóa nick', 'report kênh',
  'nạp game', 'nạp thẻ', 'nạp vip', 'mở rương', 'quay hòm', 'đập đồ', 'ép đồ', 'nâng cấp', 'leo rank', 'rớt rank', 'tụt rank', 'kéo rank', 'cày rank', 'ghép trận',
  'combat tổng', 'ăn mạng', 'nhặt mạng', 'cướp bùa', 'ăn bùa', 'đẩy đường', 'gank lẻ', 'phá trụ', 'thủ nhà', 'quét sạch', 'bất tử', 'hồi máu', 'hồi chiêu', 'tốc biến', 'trừng phạt',

  // --- Ẩm thực, Trà sữa & Ăn vặt đường phố ---
  'trà sữa', 'trà đào', 'trà tắc', 'trà sen', 'trà măng', 'măng cụt', 'trà chanh', 'trà dâu', 'trà xanh', 'trà ô', 'ô long', 'trà gạo', 'gạo lứt',
  'trà lài', 'trà đen', 'trà thảo', 'thảo mộc', 'trà vải', 'trà ổi', 'trà táo', 'trà quất', 'trà gừng', 'trà mãng', 'mãng cầu', 'trà bưởi', 'trà nương',
  'hồng trà', 'bạch trà', 'matcha', 'lục trà', 'phê muối', 'phê trứng', 'phê sữa', 'phê đen', 'bạc xỉu', 'đen đá', 'nâu đá', 'sữa đá', 'sữa nóng',
  'cốt dừa', 'muối đá', 'trứng muối', 'muối ớt', 'chấm muối', 'lắc muối', 'sữa hạt', 'sữa chua', 'chua nếp', 'nếp cẩm', 'sữa tươi', 'sữa đặc', 'sữa bắp',
  'đậu nành', 'kem béo', 'kem cheese', 'trân châu', 'đường đen', 'thạch rau', 'rau câu', 'thạch dừa', 'thạch đen', 'thạch củ', 'củ năng', 'sương sáo',
  'bánh flan', 'pudding', 'kem trứng', 'bánh mì', 'bánh tráng', 'tráng trộn', 'tráng nướng', 'tráng cuộn', 'tráng bơ', 'tráng mỡ', 'mỡ hành', 'hành phi',
  'ruốc tép', 'bánh cuốn', 'bánh bao', 'bánh xèo', 'bánh khọt', 'bánh bèo', 'bột lọc', 'bánh đúc', 'bánh giò', 'bánh chưng', 'bánh tét', 'bánh pía',
  'bông lan', 'su kem', 'bánh tiêu', 'bánh rán', 'bánh quy', 'bánh kem', 'bánh gối', 'bánh cay', 'bánh chuối', 'bánh khoai', 'bánh quẩy',
  'mì cay', 'mì tôm', 'mì xào', 'mì trộn', 'mì ý', 'mì quảng', 'bún đậu', 'mắm tôm', 'mắm nêm', 'bún bò', 'bún chả', 'bún riêu', 'bún mắm', 'bún ốc',
  'bún cá', 'bún sườn', 'phở bò', 'phở gà', 'phở tái', 'phở nạm', 'phở gầu', 'phở xào', 'phở cuốn', 'phở trộn', 'hủ tiếu', 'bánh canh',
  'cơm tấm', 'cơm sườn', 'cơm gà', 'cơm rang', 'cơm chiên', 'cơm lam', 'cơm niêu', 'cơm nắm', 'gà rán', 'khoai tây', 'tây chiên', 'khoai lang', 'lang kén', 'lang lắc',
  'nem chua', 'nem nướng', 'nem rán', 'nem lụi', 'chả giò', 'chả ram', 'chả lụa', 'chả cá', 'chả mực', 'chả quế', 'chả bò',
  'lẩu thái', 'lẩu bò', 'lẩu gà', 'lẩu nấm', 'lẩu cua', 'lẩu dê', 'lẩu cá', 'lẩu mắm', 'lẩu riêu', 'hải sản', 'sốt thái', 'ốc hương', 'cút lộn', 'vịt lộn',
  'chân gà', 'sả tắc', 'rút xương', 'tai heo', 'dồi sụn', 'lạp xưởng', 'xúc xích', 'bò kho', 'bò né', 'bò sốt', 'sốt vang', 'bò bít', 'bít tết',
  'gà luộc', 'gà ủ', 'ủ muối', 'vịt quay', 'heo quay', 'sườn xào', 'xào chua', 'chua ngọt', 'thịt kho', 'kho tàu', 'cá kho', 'canh chua',
  'khô gà', 'khô bò', 'khô heo', 'khô mực', 'mực rim', 'me ngào', 'da heo', 'tóp mỡ', 'mỡ chiên', 'bắp xào', 'ngô luộc', 'ngô nướng', 'khoai nướng',

  // --- Công sở, Sinh viên, Đi làm & Đời sống số ---
  'đi làm', 'đi học', 'tăng ca', 'tan ca', 'làm thêm', 'làm ca', 'chấm công', 'quẹt vân', 'vân tay', 'nhận lương', 'thưởng tết', 'tăng lương',
  'hạ lương', 'trừ lương', 'nợ lương', 'ứng lương', 'hoa hồng', 'phúc lợi', 'chạy deadline', 'dí deadline', 'trễ deadline', 'họp hành', 'họp ban',
  'họp phòng', 'giao việc', 'nhận việc', 'nộp báo', 'báo cáo', 'nghiệm thu', 'bàn giao', 'chuyển giao', 'làm slide', 'thuyết trình', 'bảo vệ',
  'nghỉ phép', 'nghỉ việc', 'nhảy việc', 'xin việc', 'phỏng vấn', 'thử việc', 'biên chế', 'hợp đồng', 'thanh lý', 'sa thải', 'đuổi việc',
  'thất nghiệp', 'công đoàn', 'bảo hiểm', 'đóng quỹ', 'quỹ đen', 'quỹ lớp', 'quỹ phòng', 'sếp tổng', 'sếp lớn', 'giám đốc', 'trưởng phòng',
  'phó phòng', 'nhân viên', 'thực tập', 'chính thức', 'đồng nghiệp', 'ma cũ', 'ma mới', 'đồ án', 'khóa luận', 'luận văn', 'luận án',
  'thi cử', 'kiểm tra', 'trả bài', 'nộp bài', 'điểm danh', 'trốn học', 'cúp cua', 'cúp học', 'học bù', 'học lỏm', 'học thêm', 'gia sư',
  'trợ giảng', 'giảng viên', 'giáo sư', 'thạc sĩ', 'tiến sĩ', 'cử nhân', 'viết code', 'lập trình', 'sửa lỗi', 'fix bug', 'cài win',
  'chạy server', 'gửi mail', 'lỗi code', 'lỗi game', 'lỗi mạng', 'lag mạng', 'mất mạng', 'rớt mạng', 'máy tính', 'bàn phím', 'chuột máy',
  'màn hình', 'tai nghe', 'sạc pin', 'dây cáp', 'ổ cứng', 'thẻ nhớ', 'điện thoại', 'laptop', 'máy in', 'máy chiếu', 'phần mềm', 'ứng dụng', 'trang web',

  // --- Gym, Thể thao, Sức khỏe & Làm đẹp ---
  'tập gym', 'tập tạ', 'nâng tạ', 'chạy bộ', 'đi bộ', 'bơi lội', 'đạp xe', 'leo núi', 'leo dốc', 'gập bụng', 'hít đất', 'kéo xà',
  'đốt mỡ', 'siết cơ', 'tăng cơ', 'giảm mỡ', 'xả cơ', 'ăn kiêng', 'nhịn ăn', 'ép cân', 'giảm cân', 'tăng cân',
  'dưỡng da', 'rửa mặt', 'đắp mặt', 'bôi kem', 'thoa son', 'kẻ mắt', 'chuốt mi', 'làm móng', 'sơn móng', 'uốn tóc', 'duỗi tóc',
  'nhuộm tóc', 'cắt tóc', 'tạo kiểu', 'gội đầu', 'cạo râu', 'làm đẹp', 'thẩm mỹ', 'nâng mũi', 'nhấn mí', 'xăm môi', 'phun mày',
  'đá bóng', 'đá banh', 'bóng rổ', 'bóng chuyền', 'cầu lông', 'bóng bàn', 'pickleball', 'đánh gôn', 'quần vợt', 'bắn cung', 'cưỡi ngựa', 'đua xe', 'chèo thuyền',

  // --- Tâm lý, Tính cách, Hẹn hò & Gia đình ---
  'hướng nội', 'hướng ngoại', 'nội tâm', 'ngoại giao', 'giao tiếp', 'tâm lý', 'tâm sự', 'chia sẻ',
  'mỏ hỗn', 'hỗn xược', 'hỗn hào', 'hỗn láo', 'nết na', 'ngoan hiền', 'thục nữ', 'ngoan ngoãn', 'cưng chiều', 'nuông chiều',
  'cơm chó', 'phát cẩu', 'cẩu lương', 'lương tháng', 'tháng mười', 'bồ bịch', 'người yêu', 'bạn trai', 'bạn gái', 'người cũ', 'tình cũ', 'tình mới',
  'thả thính', 'dính thính', 'cắn câu', 'né thính', 'bật đèn', 'đèn xanh', 'đèn đỏ', 'bật tín', 'tín hiệu',
  'ghép đôi', 'bắt cặp', 'se duyên', 'hẹn hò', 'tỏ tình', 'từ chối', 'bị đá', 'chia tay', 'nối lại', 'tái hợp',
  'nóc nhà', 'sợ vợ', 'đội vợ', 'lên đầu', 'nghe lời', 'vợ chồng', 'chồng con',
  'rich kid', 'soái ca', 'mỹ nam', 'mỹ nữ', 'nữ thần', 'nam thần', 'bá đạo', 'tổng tài', 'bá khí', 'ngầu đét', 'ngầu lòi', 'chất chơi', 'dân chơi',
  'xịn sò', 'chanh sả', 'sang chảnh', 'bánh bèo', 'men lỳ', 'chuẩn men', 'ngọt ngào', 'dễ thương', 'đáng yêu',
  'vibe này', 'gu này', 'gu ruột', 'hợp gu', 'lệch gu', 'đúng gu', 'sai gu', 'gu độc', 'gu lạ', 'gu mặn', 'gu nhạt', 'mặn mòi', 'mặn mà',

  // --- Vía, Tâm linh, May rủi, Đời sống mạng ---
  'xin vía', 'nhả vía', 'trộm vía', 'vía lành', 'vía may', 'vía dữ', 'may mắn', 'xui xẻo', 'giải xui', 'cầu duyên', 'cầu may', 'xin lộc',
  'bói bài', 'lá bài', 'bài tây', 'thần số', 'số học',
  'bão like', 'bão tim', 'triệu view', 'triệu like', 'triệu sub', 'like dạo', 'dạo chơi', 'chơi game', 'view cao', 'cao vút',
  'độc lạ', 'bình dương', 'ấn tượng', 'tấu hài', 'cây hài', 'hài hước', 'hề hước', 'chúa hề', 'cười bò', 'cười ẻ', 'cười xỉu',
  'trầm trồ', 'sốc tận', 'tận óc', 'sốc nhiệt', 'sốc thuốc', 'xúc động', 'nghẹn ngào',
  'hút khách', 'đắt khách', 'ế ẩm', 'ế khách', 'cháy vé', 'hết vé', 'phe vé', 'chợ đen',
  'bán kết', 'chung kết', 'tứ kết', 'vòng loại', 'tranh cúp', 'nâng cúp', 'đoạt giải', 'rinh quà',
  'đập hộp', 'khui hộp', 'khui quà', 'bóc quà', 'mở quà', 'tặng quà', 'tri ân', 'quà cáp',
  'chụp choẹt', 'check in', 'tạo dáng', 'thần thái', 'góc nghiêng', 'cam thường', 'chỉnh ảnh', 'kéo chân',
  'nhậu nhẹt', 'chén chú', 'chén anh', 'lai rai', 'say xỉn', 'say khướt', 'say mềm', 'tỉnh rượu', 'giải rượu', 'quá chén',
  'đu đỉnh', 'bắt đáy', 'cắt lỗ', 'chốt lời', 'tiền ảo', 'chứng khoán', 'lướt sóng', 'sàn giao', 'nến xanh', 'nến đỏ', 'sập sàn', 'cháy tài',
  'học bá', 'thủ khoa', 'á khoa', 'học giỏi', 'học dốt', 'dốt nát', 'lười biếng', 'chăm chỉ', 'cần cù', 'siêng năng',
  'thức khuya', 'dậy sớm', 'ngủ nướng', 'ngái ngủ', 'mất ngủ', 'thiếu ngủ', 'mơ màng', 'tỉnh táo',

  // --- Nối đuôi liên hoàn (Mắt xích từ vựng thông suốt không bao giờ cụt) ---
  'trend hot', 'trend mới', 'trend xịn', 'trend này', 'hot girl', 'hot boy', 'hot trend', 'hòn ngọc', 'hòn đá', 'đá quý', 'quý giá', 'giá trị', 'trị liệu', 'liệu pháp', 'pháp luật', 'luật sư', 'sư phạm', 'phạm nhân',
  'nóc nhà', 'nhà lầu', 'lầu son', 'son môi', 'môi thắm', 'thắm thiết', 'thiết thực', 'thực tế', 'tế bào', 'bào mòn', 'mòn mỏi', 'mỏi mệt', 'mệt nhoài', 'nhoài người',
  'trần nhà', 'trần gian', 'gian lận', 'lận đận', 'đận này', 'phốt to', 'to béo', 'béo ngậy', 'ngậy mùi', 'mùi thơm', 'thơm phức', 'phức tạp',
  'chốt đơn', 'đơn giá', 'giá cả', 'cả tuần', 'tuần tra', 'tra hỏi', 'hỏi han', 'vô tri', 'tri âm', 'âm vang', 'vang dội', 'dội ngược', 'ngược lại', 'lại đây',
  'hết cứu', 'cứu hộ', 'hộ khẩu', 'khẩu trang', 'trang sức', 'sức khỏe', 'sập nguồn', 'nguồn gốc', 'gốc rễ', 'rễ cây', 'cây cảnh', 'cảnh sát',
  'cưng xỉu', 'xỉu ngang', 'ngang trái', 'trái ngọt', 'ngọt bùi', 'bùi tai', 'thao túng', 'túng bấn', 'bấn loạn', 'loạn lạc', 'lạc quan', 'quan sát',
  'bẻ lái', 'lái xe', 'xe cộ', 'cộ tải', 'tải nặng', 'lụm lúa', 'lúa non', 'non trẻ', 'trẻ thơ', 'thơ ấu', 'bắn tiền', 'tiền bạc', 'bạc bẽo', 'bẽo bọt', 'bọt biển',
  'sống ảo', 'ảo tưởng', 'tưởng bở', 'bở hơi', 'hơi ấm', 'bất ổn', 'ổn định', 'định cư', 'cư dân', 'dân chủ', 'chủ quyền', 'gánh team', 'team này', 'này nọ', 'nọ kia', 'kia kìa',
  'out trình', 'trình bày', 'bày tỏ', 'tỏ tường', 'tường tận', 'tận tâm', 'check var', 'var chạm', 'chạm đáy', 'đáy biển',
  'trồng cây', 'cây xanh', 'xanh tươi', 'tươi tốt', 'tốt lành', 'lành tính', 'tính tình', 'tình cảm', 'cảm xúc', 'xúc động'
];

function expand() {
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  const dictPath = path.join(dataDir, 'dictionary.json');
  const customTxtPath = path.join(dataDir, 'custom_words.txt');

  if (!fs.existsSync(dictPath)) {
    throw new Error(`dictionary.json not found at ${dictPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  const wordSet = new Set(raw.words);
  const graph = {};

  for (const [k, v] of Object.entries(raw.graph)) {
    graph[k] = new Set(v);
  }

  let addedCount = 0;
  function addWord(first, second) {
    if (!first || !second) return;
    first = first.trim().toLowerCase().normalize('NFC');
    second = second.trim().toLowerCase().normalize('NFC');
    if (!isValidSyllable(first) || !isValidSyllable(second)) return;

    const fullWord = `${first} ${second}`;
    if (!wordSet.has(fullWord)) {
      wordSet.add(fullWord);
      addedCount++;
    }

    if (!graph[first]) graph[first] = new Set();
    graph[first].add(second);
  }

  // 1. Process GENZ_AND_MODERN_WORDS
  for (const item of GENZ_AND_MODERN_WORDS) {
    const parts = item.trim().toLowerCase().normalize('NFC').split(/\s+/);
    if (parts.length === 2) {
      addWord(parts[0], parts[1]);
    }
  }

  // 2. Process existing custom_words.txt if any
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

  // Convert graph sets to sorted arrays
  const serializableGraph = {};
  for (const k of Object.keys(graph)) {
    serializableGraph[k] = Array.from(graph[k]).sort();
  }

  const resultWords = Array.from(wordSet).sort();
  console.log(`✅ Dictionary expanded from ${raw.words.length} to ${resultWords.length} words (+${addedCount} new words).`);
  console.log(`✅ Root syllables in graph: ${Object.keys(serializableGraph).length}.`);

  // Write updated dictionary.json
  fs.writeFileSync(dictPath, JSON.stringify({
    count: resultWords.length,
    words: resultWords,
    graph: serializableGraph
  }));
  console.log(`Saved updated dictionary to: ${dictPath}`);

  // Write updated custom_words.txt
  const allCustomWords = Array.from(new Set([
    ...GENZ_AND_MODERN_WORDS.map(w => w.trim().toLowerCase().normalize('NFC')),
    ...(fs.existsSync(customTxtPath) ? fs.readFileSync(customTxtPath, 'utf8').split(/\r?\n/).filter(Boolean) : [])
  ])).sort();

  fs.writeFileSync(customTxtPath, allCustomWords.join('\n') + '\n', 'utf8');
  console.log(`Saved updated custom_words.txt (${allCustomWords.length} words).`);
}

expand();
