# 🎮 Game Nối Từ Tiếng Việt Multiplayer (Đấu Trường Từ Vựng Online)

Ứng dụng Game Nối Từ (Word Chain) thời gian thực dành cho **nhiều người chơi (Multiplayer)** với giao diện tương tác dạng **Messenger Chat** và **Hệ thống Trọng tài Tự động (Referee Engine)** khắt khe, công minh.

![Giao diện Nối Từ Pro](https://raw.githubusercontent.com/NNBnh/noi-tu/master/logo.svg)

---

## 🌟 Tính Năng Nổi Bật

1. **Đấu Trường Multiplayer Thời Gian Thực (Realtime Socket.io):**
   * Hỗ trợ từ 2 đến 8 người chơi cùng lúc trong một phòng.
   * Tạo phòng riêng với mã 5 ký tự (Ví dụ: `ABCDE`), chia sẻ link trực tiếp để bạn bè vào ngay (`http://localhost:3000/?room=ABCDE`).
   * Tùy chọn thời gian mỗi lượt: **10 giây, 15 giây, hoặc 20 giây**.
   * Hỗ trợ **Bot Trọng Tài AI** chơi cùng để luyện tập solo hoặc ghép đủ số người.

2. **Hệ Thống Trọng Tài Tự Động (Referee Engine):**
   * **Tra cứu từ điển tức thời ($O(1)$ < 0.1ms):** Sử dụng bộ dữ liệu hơn **52.800+ từ ghép 2 âm tiết tiếng Việt** chuẩn từ các dự án NLP mở và từ điển Hồ Ngọc Đức.
   * **Chuẩn hóa Unicode NFC:** Không bị lỗi dấu gõ tổ hợp / dựng sẵn tiếng Việt.
   * **Xử phạt & Xử thua ngay lập tức:**
     * ❌ Gửi từ **không có trong từ điển** $\rightarrow$ Trọng tài thổi còi xử thua và loại khỏi ván.
     * ❌ Gửi từ **không đúng 2 âm tiết** $\rightarrow$ Xử thua.
     * ❌ **Lạc âm tiết** (tiếng đầu không khớp tiếng cuối của người trước) $\rightarrow$ Xử thua.
     * ❌ **Lặp lại từ** đã dùng trong ván $\rightarrow$ Xử thua.
     * ⏰ **Hết thời gian đếm ngược** mà chưa gửi từ $\rightarrow$ Xử thua.
   * **Chế độ Sinh Tồn (Battle Royale Knockout):** Người bị loại sẽ chuyển sang làm khán giả; ván đấu tiếp tục với những người còn lại cho đến khi tìm ra người sống sót cuối cùng là **Vua Nối Từ 👑**.

3. **Giao Diện Messenger Hiện Đại:**
   * Khung chat tin nhắn động: bong bóng chat cho người chơi, avatar phong phú, thẻ thông báo trọng tài chuyên nghiệp.
   * Thanh đếm ngược nhịp tim: đổi màu từ Xanh $\rightarrow$ Vàng $\rightarrow$ Đỏ (kèm hiệu ứng cảnh báo nhấp nháy).
   * Khung nhập từ thông minh: tự động mở khóa và focus khi tới lượt, hiển thị gợi ý tiếng cần nối.
   * Hiệu ứng âm thanh chân thực được tổng hợp trực tiếp bằng **Web Audio API** (không cần tải file ngoài): tiếng tin nhắn pop, tiếng tích tắc đếm ngược, tiếng còi trọng tài xử phạt và tiếng kèn chiến thắng.

---

## 📋 Luật Chơi Chuẩn Tiếng Việt

* **Định dạng từ:** Chỉ chấp nhận từ ghép gồm đúng **2 âm tiết** có nghĩa trong tiếng Việt (Ví dụ: *Học sinh* $\rightarrow$ *Sinh viên* $\rightarrow$ *Viên gạch* $\rightarrow$ *Gạch men*).
* **Quy tắc nối:** Tiếng đầu của người chơi sau phải trùng với tiếng cuối của người chơi trước.
* **Thời gian:** Mỗi người chơi có từ 10 - 20 giây (tùy cài đặt phòng) để gõ và gửi từ.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Game

### 1. Yêu cầu hệ thống:
* **Node.js** phiên bản 16 trở lên.

### 2. Cài đặt các thư viện:
```bash
npm install
```

### 3. Khởi động Game Server:
```bash
npm start
```
Mở trình duyệt web và truy cập địa chỉ:
👉 **`http://localhost:3000`**

### 4. Mẹo thử nghiệm nhiều người chơi trên 1 máy:
* Mở một tab trình duyệt bình thường (Tạo phòng).
* Mở một tab trình duyệt ẩn danh (Incognito) hoặc trình duyệt khác (Vào phòng bằng mã hoặc đường link chia sẻ).
* Hoặc nhấn nút **"Thêm Bot Trọng tài chơi cùng"** trong phòng chờ để kiểm tra ngay lập tức mà không cần mở nhiều tab!

### 5. Chạy Kiểm Thử Tự Động (Unit & Integration Tests):
```bash
npm test
```

---

## 📚 Tùy Chỉnh & Thêm Từ Điển Riêng

Nếu bạn muốn bổ sung thêm các từ mới, tiếng lóng giới trẻ hoặc từ địa phương, chỉ cần tạo file:
`src/data/custom_words.txt`
Mỗi dòng là một từ ghép 2 âm tiết (Ví dụ):
```text
trà sữa
bún đậu
sang chảnh
mì cay
```
Server sẽ tự động nạp các từ này vào kho từ điển của Trọng tài khi khởi động!

---

## 🛠️ Cấu Trúc Mã Nguồn

```
d:\Game Noi Tu -\
├── server.js                 # Server chính Express + Socket.IO
├── src/
│   ├── dictionary.js         # Quản lý tra cứu từ điển O(1) & đồ thị từ
│   ├── referee.js            # Engine Trọng tài thẩm định luật & xử thua
│   ├── roomManager.js        # Quản lý trạng thái phòng, lượt đấu & Bot AI
│   └── data/
│       └── dictionary.json   # 52.822+ từ ghép 2 âm tiết tiếng Việt
├── public/                   # Giao diện Frontend phong cách Messenger
│   ├── index.html            # Giao diện chính (Lobby, Phòng chờ, Sàn đấu)
│   ├── css/style.css         # Styling, bong bóng chat & hiệu ứng
│   └── js/
│       ├── sound.js          # Hệ thống âm thanh Web Audio API
│       └── app.js            # Client Socket.io & đồng bộ giao diện
├── tests/
│   ├── referee.test.js       # Unit test thẩm định luật Trọng tài
│   └── simulation.test.js    # Integration test mô phỏng trận đấu nhiều người
└── scripts/
    └── build-dictionary.js   # Script tải & tổng hợp từ điển tiếng Việt
```
