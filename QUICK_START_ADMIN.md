# Quick Start - Admin System

## 🚀 Bắt Đầu Nhanh

### 1. Tạo Admin (lần đầu tiên)
```bash
node scripts/createAdmin.js
```
Nhập thông tin:
- **Tên**: Tên admin của bạn
- **Email**: admin@example.com
- **Password**: Mật khẩu mạnh (tối thiểu 6 ký tự)

### 2. Khởi Động Server
```bash
npm run dev
```
Server chạy tại: http://localhost:3000

### 3. Đăng Nhập Admin
- Truy cập: **http://localhost:3000/auth/login**
- Nhập email và password admin vừa tạo
- Đăng nhập thành công!

### 4. Vào Admin Dashboard
- Truy cập: **http://localhost:3000/admin/dashboard**
- Click **"Thêm Bài Học Mới"**

### 5. Tạo Bài Học Đầu Tiên

#### Cách 1: Upload File (Khuyên dùng ⭐)
1. Điền thông tin:
   - **ID**: `bai_1`
   - **Title**: `Lesson 1`
   - **Display Title**: `Bài 1: Giới thiệu`
   - **Description**: `Bài học giới thiệu cơ bản`
   - **Order**: `1`

2. Chọn **"Upload File"**

3. Click **"Choose File"** ở mục Audio:
   - Chọn file MP3/audio từ máy tính
   - Xem hiển thị: ✓ Đã chọn: [tên file]

4. Click **"Choose File"** ở mục Text/JSON:
   - Chọn file JSON từ máy tính
   - Xem hiển thị: ✓ Đã chọn: [tên file]

5. Click **"Thêm Bài Học"**
   - Đợi upload...
   - Thành công! ✅

#### Cách 2: Nhập URL (Nếu file đã có sẵn)
1. Điền thông tin như trên

2. Chọn **"Nhập URL"**

3. Nhập đường dẫn:
   - **Audio URL**: `/audio/bai_1.mp3`
   - **JSON URL**: `/text/bai_1.json`

4. Click **"Thêm Bài Học"**

### 6. Quản Lý Bài Học
- **Xem danh sách**: Tất cả bài học hiển thị trong bảng
- **Sửa bài học**: Click nút **"Sửa"** → Chỉnh sửa → **"Cập Nhật"**
- **Xóa bài học**: Click nút **"Xóa"** → Xác nhận

---

## 📄 Format File JSON

File JSON cần có cấu trúc này:
```json
{
  "sentences": [
    {
      "index": 0,
      "german": "Guten Tag!",
      "vietnamese": "Xin chào!",
      "startTime": 0.0,
      "endTime": 2.0
    },
    {
      "index": 1,
      "german": "Wie geht es dir?",
      "vietnamese": "Bạn khỏe không?",
      "startTime": 2.0,
      "endTime": 4.5
    }
  ]
}
```

---

## ⚠️ Lưu Ý

### File Upload:
- **Audio**: MP3, WAV, M4A, OGG (tối đa 50MB)
- **Text**: JSON hoặc TXT (tối đa 50MB)
- File tự động lưu vào `public/audio/` và `public/text/`

### Đặt Tên:
- **ID bài học**: Dùng chữ thường + gạch dưới (ví dụ: `bai_1`, `lektion_10`)
- **Tránh**: Khoảng trắng, ký tự đặc biệt

### Thứ Tự:
- Dùng số `order` để sắp xếp bài học
- Nên đánh số: 1, 2, 3... hoặc 10, 20, 30...

---

## 🔐 Phân Quyền

### Admin có thể:
✅ Tất cả chức năng của Member
✅ Xem Admin Dashboard (`/admin/dashboard`)
✅ Thêm bài học mới
✅ Sửa bài học
✅ Xóa bài học
✅ Upload audio & text files

### Member (User thường) có thể:
✅ Xem danh sách bài học
✅ Học bài (Shadowing, Dictation)
✅ Lưu tiến độ học tập
✅ Xem dashboard cá nhân
❌ KHÔNG truy cập được Admin Dashboard

---

## 🆘 Khắc Phục Sự Cố

### Không vào được Admin Dashboard?
1. Kiểm tra đã đăng nhập với tài khoản admin
2. Kiểm tra database: role phải là `"admin"`
3. Đăng xuất và đăng nhập lại

### Upload thất bại?
1. Check kích thước file (< 50MB)
2. Check định dạng file (audio: MP3/WAV, text: JSON/TXT)
3. Check quyền ghi thư mục `public/`

### Bài học không hiển thị?
1. Refresh trang
2. Check MongoDB connection
3. Check console log (F12) để xem lỗi

---

## 📚 Tài Liệu Chi Tiết

Xem thêm:
- **`ADMIN_SYSTEM_GUIDE.md`**: Hướng dẫn đầy đủ
- **`ADMIN_MEMBER_SYSTEM.md`**: Tóm tắt technical

---

## 🎯 Workflow Điển Hình

```
1. Tạo admin user
   ↓
2. Đăng nhập
   ↓
3. Upload audio + JSON
   ↓
4. Tạo bài học
   ↓
5. Member có thể học ngay!
```

---

**Chúc bạn thành công! 🎉**

Nếu cần hỗ trợ, xem log trong:
- **Browser Console** (F12)
- **Server Terminal** (npm run dev)
