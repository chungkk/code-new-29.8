# Hệ Thống Phân Quyền Admin & Member

## Tổng quan

Hệ thống đã được thiết lập với 2 loại người dùng:
- **Member (User)**: Người dùng thông thường có thể học bài, lưu tiến độ
- **Admin**: Có toàn quyền như user + quản lý bài học (thêm, sửa, xóa)

---

## 1. Tạo Tài Khoản Admin

### Cách 1: Sử dụng Script (Khuyên dùng)

```bash
# Chạy script tạo admin
node scripts/createAdmin.js
```

Script sẽ hỏi:
- Tên admin
- Email admin
- Mật khẩu (tối thiểu 6 ký tự)

### Cách 2: Tạo thủ công trong MongoDB

Truy cập MongoDB và thêm document vào collection `users`:
```javascript
{
  "email": "admin@example.com",
  "password": "$2a$10$...", // Mật khẩu đã hash
  "name": "Admin Name",
  "role": "admin",
  "createdAt": new Date(),
  "updatedAt": new Date()
}
```

---

## 2. Đăng Nhập

### Admin Login
1. Truy cập: `http://localhost:3000/auth/login`
2. Nhập email và mật khẩu admin
3. Sau khi đăng nhập, truy cập: `http://localhost:3000/admin/dashboard`

### Member Login
1. Truy cập: `http://localhost:3000/auth/login`
2. Nhập email và mật khẩu user
3. Sau khi đăng nhập, truy cập: `http://localhost:3000/dashboard`

---

## 3. Chức Năng Admin Dashboard

### URL Admin
```
http://localhost:3000/admin/dashboard
```

### Các chức năng chính:

#### A. Xem Danh Sách Bài Học
- Hiển thị tất cả bài học trong hệ thống
- Thông tin: ID, Tiêu đề, Mô tả
- Thao tác: Sửa, Xóa

#### B. Thêm Bài Học Mới
Click nút **"Thêm Bài Học Mới"**, điền form:

**Thông tin cơ bản:**
- **ID**: Mã định danh bài học (ví dụ: `bai_10`)
- **Title**: Tiêu đề nội bộ
- **Display Title**: Tiêu đề hiển thị cho user
- **Description**: Mô tả ngắn gọn
- **Order**: Thứ tự hiển thị (số nguyên)

**Audio & Text - Có 2 cách:**

##### Cách 1: Nhập URL (File đã có sẵn)
- Chọn radio button **"Nhập URL"**
- Nhập đường dẫn:
  - Audio URL: `/audio/bai_10.mp3`
  - JSON URL: `/text/bai_10.json`
- File phải đã tồn tại trong thư mục `public/`

##### Cách 2: Upload File
- Chọn radio button **"Upload File"**
- Chọn file audio (MP3, WAV, etc.)
- Chọn file JSON/text
- Hệ thống tự động upload và lưu vào thư mục phù hợp

#### C. Sửa Bài Học
1. Click nút **"Sửa"** ở bài học cần chỉnh sửa
2. Form hiện lên với thông tin hiện tại
3. Chỉnh sửa thông tin cần thiết
4. Click **"Cập Nhật"**

**Lưu ý:** Không thể thay đổi ID khi sửa bài học

#### D. Xóa Bài Học
1. Click nút **"Xóa"** ở bài học cần xóa
2. Xác nhận xóa trong popup
3. Bài học sẽ bị xóa khỏi database

**Cảnh báo:** Xóa bài học là không thể hoàn tác!

---

## 4. Định Dạng File JSON

File JSON cần có cấu trúc như sau:
```json
{
  "sentences": [
    {
      "index": 0,
      "german": "Guten Morgen!",
      "vietnamese": "Chào buổi sáng!",
      "startTime": 0.0,
      "endTime": 2.5
    },
    {
      "index": 1,
      "german": "Wie geht es dir?",
      "vietnamese": "Bạn khỏe không?",
      "startTime": 2.5,
      "endTime": 5.0
    }
  ]
}
```

**Các trường bắt buộc:**
- `index`: Số thứ tự câu
- `german`: Câu tiếng Đức
- `vietnamese`: Dịch tiếng Việt
- `startTime`: Thời gian bắt đầu (giây)
- `endTime`: Thời gian kết thúc (giây)

---

## 5. Cấu Trúc Thư Mục

```
public/
  ├── audio/          # Lưu file audio
  │   ├── bai_1.mp3
  │   ├── bai_2.mp3
  │   └── ...
  └── text/           # Lưu file JSON
      ├── bai_1.json
      ├── bai_2.json
      └── ...
```

---

## 6. Phân Quyền & Bảo Mật

### API Routes Được Bảo Vệ

**Chỉ Admin mới truy cập được:**
- `POST /api/lessons` - Tạo bài học mới
- `PUT /api/lessons` - Cập nhật bài học
- `DELETE /api/lessons` - Xóa bài học
- `POST /api/upload` - Upload audio/text

**Tất cả user (bao gồm admin):**
- `GET /api/lessons` - Xem danh sách bài học
- `GET /api/progress` - Xem tiến độ cá nhân
- `POST /api/progress` - Lưu tiến độ

### Session Management
- Sử dụng NextAuth JWT
- Session timeout: 30 ngày
- Token được refresh tự động

---

## 7. Khắc Phục Sự Cố

### Admin không thấy Dashboard
**Nguyên nhân:** Chưa có quyền admin
**Giải pháp:** 
1. Kiểm tra role trong database
2. Đảm bảo `role: "admin"` trong collection users
3. Đăng xuất và đăng nhập lại

### Upload File Thất Bại
**Nguyên nhân:** File quá lớn hoặc định dạng sai
**Giải pháp:**
- Giới hạn file: 50MB
- Audio: MP3, WAV, M4A, OGG
- Text: JSON, TXT
- Kiểm tra quyền ghi thư mục `public/`

### Không load được audio/JSON
**Nguyên nhân:** Đường dẫn sai
**Giải pháp:**
- Đường dẫn phải bắt đầu bằng `/` (ví dụ: `/audio/bai_1.mp3`)
- File phải tồn tại trong `public/audio/` hoặc `public/text/`
- Kiểm tra tên file (phân biệt chữ hoa/thường)

---

## 8. Best Practices

### Đặt Tên File
- Sử dụng chữ thường và gạch dưới: `bai_1.mp3`, `lektion_10.json`
- Tránh ký tự đặc biệt, khoảng trắng
- ID bài học nên khớp với tên file

### Quản Lý Thứ Tự
- Sử dụng số `order` để sắp xếp bài học
- Nên đánh số cách nhau 10 (10, 20, 30...) để dễ chèn bài mới vào giữa

### Backup
- Thường xuyên backup MongoDB database
- Backup thư mục `public/audio/` và `public/text/`
- Export danh sách bài học định kỳ

---

## 9. API Reference

### Upload File
```javascript
POST /api/upload
Content-Type: multipart/form-data

Body:
- audio: File (audio file)
- text: File (JSON file)
- lessonId: String (lesson ID for naming)

Response:
{
  "message": "Upload thành công",
  "files": {
    "audio": "/audio/bai_10.mp3",
    "text": "/text/bai_10.json"
  }
}
```

### Create Lesson
```javascript
POST /api/lessons
Content-Type: application/json

Body:
{
  "id": "bai_10",
  "title": "Lesson 10",
  "displayTitle": "Bài 10: Shopping",
  "description": "Learn shopping vocabulary",
  "audio": "/audio/bai_10.mp3",
  "json": "/text/bai_10.json",
  "order": 10
}

Response:
{
  "_id": "...",
  "id": "bai_10",
  ...
}
```

### Update Lesson
```javascript
PUT /api/lessons
Content-Type: application/json

Body:
{
  "id": "6478...",  // MongoDB _id
  "title": "Updated Title",
  "displayTitle": "Bài 10: Shopping (Updated)",
  ...
}

Response:
{
  "message": "Cập nhật thành công"
}
```

### Delete Lesson
```javascript
DELETE /api/lessons?id=6478...

Response:
{
  "message": "Xóa thành công"
}
```

---

## 10. Testing

### Test Workflow Đầy Đủ

1. **Tạo Admin**
   ```bash
   node scripts/createAdmin.js
   ```

2. **Đăng nhập admin**
   - URL: http://localhost:3000/auth/login
   - Nhập email/password admin

3. **Thêm bài học mới**
   - Truy cập: http://localhost:3000/admin/dashboard
   - Click "Thêm Bài Học Mới"
   - Upload audio + JSON file
   - Submit form

4. **Kiểm tra bài học**
   - Đăng xuất
   - Đăng nhập lại với tài khoản member
   - Vào dashboard: http://localhost:3000/dashboard
   - Bài học mới phải hiện ra trong danh sách

5. **Test quyền truy cập**
   - Với tài khoản member, thử truy cập: http://localhost:3000/admin/dashboard
   - Phải bị redirect về trang chủ

---

## Support

Nếu gặp vấn đề, kiểm tra:
1. Console log trong browser (F12)
2. Server log trong terminal
3. MongoDB connection
4. File permissions trong thư mục `public/`

Chúc bạn thành công! 🎉
