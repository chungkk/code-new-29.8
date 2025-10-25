# Hướng Dẫn Sử Dụng Admin

## 🔐 Cách Set Admin Cho User

### Phương Án 1: Sử Dụng MongoDB Compass (Khuyên Dùng)

1. **Mở MongoDB Compass**
2. **Connect** đến database của bạn với connection string từ `.env.local`
3. **Chọn database** `Cluster0`
4. **Chọn collection** `users`
5. **Tìm user** cần set admin (tìm theo email)
6. **Click vào icon Edit** (biểu tượng bút chì)
7. **Sửa field `role`** từ `"member"` thành `"admin"`
8. **Click Update** để lưu

### Phương Án 2: Sử Dụng MongoDB Atlas

1. **Đăng nhập** vào [MongoDB Atlas](https://cloud.mongodb.com/)
2. **Chọn Cluster** của bạn
3. **Click Browse Collections**
4. **Chọn database** `Cluster0`
5. **Chọn collection** `users`
6. **Tìm user** cần set admin
7. **Click Edit** và sửa `role: "admin"`
8. **Save**

### Phương Án 3: Register User Mới Rồi Set Admin

1. **Đăng ký tài khoản mới** trên website (email bất kỳ)
2. **Vào MongoDB** (Compass hoặc Atlas)
3. **Tìm user vừa tạo** theo email
4. **Sửa `role`** thành `"admin"`
5. **Logout và login lại** với tài khoản đó

---

## 📸 Screenshot MongoDB Compass

```
Collection: users
Document structure:
{
  "_id": ObjectId("..."),
  "name": "Your Name",
  "email": "your@email.com",
  "password": "$2a$10$...",
  "role": "admin",  ← Sửa thành "admin"
  "createdAt": ISODate("...")
}
```

⚠️ **LƯU Ý**: 
- Chỉ sửa field `role`, không sửa các field khác
- Giá trị phải là `"admin"` (có dấu ngoặc kép)
- Sau khi sửa, logout và login lại để nhận quyền admin

---

## 👥 Phân Quyền User

Hệ thống có 2 loại user:

### Member (Người dùng thường)
- Xem danh sách bài học
- Học shadowing và dictation
- Lưu tiến trình học tập
- Lưu từ vựng
- Xem dashboard cá nhân

### Admin (Quản trị viên)
- **Tất cả quyền của Member** +
- ✍️ **Viết bài học mới**
- Upload audio và transcript
- Quản lý bài học

---

## ✍️ Tạo Bài Học Mới (Admin)

### Bước 1: Truy cập Dashboard
1. Đăng nhập với tài khoản admin
2. Vào trang Dashboard
3. Click button **"✍️ Viết Bài Mới"** ở góc trên bên phải

### Bước 2: Điền Thông Tin

**1. ID Bài Học** (bắt buộc)
- ID duy nhất cho bài học
- Ví dụ: `bai_2`, `bai_3`
- Chỉ dùng chữ thường, số và dấu gạch dưới
- Không dấu tiếng Việt

**2. Tiêu Đề** (bắt buộc)
- Tiêu đề bài học bằng tiếng Đức
- Ví dụ: `Patient Erde: Zustand kritisch`

**3. Tên Hiển Thị** (bắt buộc)
- Tên hiển thị trên giao diện
- Ví dụ: `Lektion 2: Umwelt`

**4. Mô Tả** (tùy chọn)
- Mô tả ngắn về chủ đề
- Ví dụ: `Thema: Umwelt, Klimawandel (DW)`

**5. Audio File** (bắt buộc)
- Upload file MP3
- Dung lượng tối đa: 50MB
- Audio phải rõ ràng, chất lượng cao

**6. JSON File** (bắt buộc)
- Upload file transcript JSON
- Format chuẩn:
```json
[
  {
    "start": 0.0,
    "end": 5.5,
    "text": "Patient Erde: Zustand kritisch"
  },
  {
    "start": 5.5,
    "end": 10.2,
    "text": "Die Temperatur steigt weltweit."
  }
]
```

### Bước 3: Upload & Tạo
1. Click **"✅ Tạo Bài Học"**
2. Hệ thống sẽ:
   - Upload audio vào `/public/audio/`
   - Upload JSON vào `/public/text/`
   - Tạo bài học trong database
3. Thanh tiến trình hiển thị quá trình upload
4. Thành công → Bài học xuất hiện trong danh sách

---

## 📁 Cấu Trúc File JSON

File transcript phải theo format sau:

```json
[
  {
    "start": 0.0,        // Thời điểm bắt đầu (giây)
    "end": 5.5,          // Thời điểm kết thúc (giây)
    "text": "Câu văn"    // Nội dung câu
  }
]
```

### Ví dụ đầy đủ:

```json
[
  {
    "start": 0.0,
    "end": 4.2,
    "text": "Guten Tag! Heute sprechen wir über die Umwelt."
  },
  {
    "start": 4.2,
    "end": 8.5,
    "text": "Der Klimawandel ist eine große Herausforderung."
  },
  {
    "start": 8.5,
    "end": 12.8,
    "text": "Wir müssen jetzt handeln, um unseren Planeten zu retten."
  }
]
```

### Lưu ý:
- Thời gian phải chính xác với audio
- Text phải chính tả chuẩn
- Mỗi câu nên có độ dài vừa phải (2-10 giây)

---

## 🔧 Quản Lý Bài Học

### Xem Danh Sách
- Tất cả bài học hiển thị trên trang chủ
- Dashboard hiển thị tiến trình của từng bài

### Xóa Bài Học
- Sử dụng MongoDB Compass hoặc
- Gọi API DELETE `/api/lessons?id={lessonId}`

### Cập Nhật Bài Học
- Sử dụng API PUT `/api/lessons`
- Body:
```json
{
  "id": "lesson_id",
  "title": "New Title",
  "description": "New Description"
}
```

---

## 🐛 Xử Lý Lỗi

### Lỗi Upload File
**Nguyên nhân**: File quá lớn hoặc format không đúng
**Giải pháp**:
- Audio: Chỉ chấp nhận MP3, tối đa 50MB
- JSON: Kiểm tra format JSON hợp lệ

### Lỗi ID Trùng
**Nguyên nhân**: ID bài học đã tồn tại
**Giải pháp**: Dùng ID khác (ví dụ: bai_3 thay vì bai_2)

### Lỗi Quyền Truy Cập
**Nguyên nhân**: Tài khoản không phải admin
**Giải pháp**: Kiểm tra role trong database hoặc tạo lại admin

---

## 📊 Theo Dõi Tiến Độ

Admin có thể xem tiến độ của tất cả users (nếu cần):
1. Truy cập MongoDB
2. Collection: `userprogresses`
3. Xem `completionPercent` cho mỗi user

---

## 💡 Tips

1. **Chuẩn bị Audio**: Nên dùng audio chất lượng cao, loại bỏ nhiễu
2. **Tạo Transcript**: Dùng tool speech-to-text để tạo transcript nhanh
3. **Kiểm tra Timing**: Đảm bảo timing trong JSON khớp với audio
4. **Test trước**: Test bài học sau khi tạo để đảm bảo mọi thứ hoạt động

---

## 🆘 Hỗ Trợ

Nếu gặp vấn đề, kiểm tra:
1. Console logs (F12)
2. Network tab để xem API response
3. MongoDB để xem data đã lưu chưa

---

**Chúc bạn tạo bài học thành công! 🎉**
