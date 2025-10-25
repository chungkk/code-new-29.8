# Hệ Thống Admin & Member - Tóm Tắt Implementation

## ✅ Đã Hoàn Thành

### 1. Phân Quyền User
- **Member (role: 'user')**: Người dùng thông thường
  - Xem danh sách bài học
  - Học bài (Shadowing, Dictation)
  - Lưu tiến độ học
  - Xem dashboard cá nhân
  
- **Admin (role: 'admin')**: Quản trị viên
  - Tất cả quyền của Member
  - **+ Quản lý bài học**: Thêm, sửa, xóa
  - **+ Upload audio & text files**
  - Truy cập Admin Dashboard

### 2. Cấu Trúc Database
```javascript
// Collection: users
{
  email: String,
  password: String (hashed with bcrypt),
  name: String,
  role: "admin" | "user",
  createdAt: Date,
  updatedAt: Date
}

// Collection: lessons
{
  id: String,
  title: String,
  displayTitle: String,
  description: String,
  audio: String,  // path to audio file
  json: String,   // path to JSON file
  order: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Files Đã Tạo/Cập Nhật

#### Mới tạo:
- **`/pages/api/upload.js`**: API route xử lý upload audio & text files
- **`/lib/withAuth.js`**: Middleware kiểm tra quyền truy cập
- **`ADMIN_SYSTEM_GUIDE.md`**: Hướng dẫn chi tiết sử dụng hệ thống
- **`ADMIN_MEMBER_SYSTEM.md`**: File tóm tắt này

#### Đã cập nhật:
- **`/pages/admin/dashboard.js`**: 
  - Thêm UI upload file (audio + text)
  - Radio button chọn phương thức: URL hoặc Upload
  - Progress indicator khi upload
  - Validation form tốt hơn

#### Đã có sẵn (không cần thay đổi):
- **`/lib/models/User.js`**: Model user với role
- **`/lib/models/Lesson.js`**: Model bài học
- **`/pages/api/auth/[...nextauth].js`**: NextAuth với phân quyền
- **`/pages/api/lessons.js`**: CRUD lessons với admin protection
- **`/scripts/createAdmin.js`**: Script tạo admin user

### 4. API Endpoints

#### Public (All Users)
```
GET /api/lessons           - Lấy danh sách bài học
GET /api/progress          - Lấy tiến độ cá nhân
POST /api/progress         - Lưu tiến độ
```

#### Admin Only
```
POST /api/lessons          - Tạo bài học mới
PUT /api/lessons           - Cập nhật bài học
DELETE /api/lessons        - Xóa bài học
POST /api/upload           - Upload audio/text files
```

### 5. Upload System

**Endpoint**: `POST /api/upload`

**Features**:
- Upload audio files (MP3, WAV, M4A, OGG...)
- Upload text/JSON files
- Tự động đặt tên file theo lessonId
- Lưu vào đúng thư mục (public/audio, public/text)
- File size limit: 50MB
- Admin authentication required

**Flow**:
1. Admin chọn "Upload File" trong form
2. Chọn audio file & text file
3. Submit form
4. Files được upload lên server
5. Server lưu vào public/audio và public/text
6. Trả về đường dẫn file
7. Tạo/update lesson với đường dẫn mới

### 6. Security

**Authentication**:
- NextAuth với JWT strategy
- Session timeout: 30 days
- Bcrypt hash passwords (salt rounds: 10)

**Authorization**:
- Admin routes protected at page level
- API routes check session.user.role
- Middleware helpers: requireAuth(), requireAdmin()

**File Upload**:
- Only admin can upload
- File type validation
- File size limit
- Safe file naming (timestamp + original name)

## 🚀 Cách Sử Dụng

### Bước 1: Tạo Admin User
```bash
node scripts/createAdmin.js
```
Nhập email, password, và tên admin.

### Bước 2: Đăng Nhập
- Truy cập: http://localhost:3000/auth/login
- Nhập email/password admin

### Bước 3: Truy Cập Admin Dashboard
- URL: http://localhost:3000/admin/dashboard
- Click "Thêm Bài Học Mới"

### Bước 4: Tạo Bài Học
**Cách 1 - Nhập URL** (nếu file đã có):
1. Chọn radio "Nhập URL"
2. Điền thông tin bài học
3. Nhập path: `/audio/bai_X.mp3`, `/text/bai_X.json`
4. Submit

**Cách 2 - Upload File** (khuyên dùng):
1. Chọn radio "Upload File"
2. Điền thông tin bài học (đặc biệt là ID)
3. Chọn audio file từ máy
4. Chọn JSON file từ máy
5. Submit - hệ thống tự động upload và lưu

### Bước 5: Quản Lý Bài Học
- **Sửa**: Click nút "Sửa" → Chỉnh sửa thông tin → "Cập Nhật"
- **Xóa**: Click nút "Xóa" → Xác nhận

## 📁 Cấu Trúc File

```
project/
├── pages/
│   ├── admin/
│   │   └── dashboard.js        # Admin dashboard với upload UI
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth].js  # NextAuth config
│   │   ├── lessons.js          # CRUD lessons
│   │   └── upload.js           # Upload handler (MỚI)
│   ├── auth/
│   │   ├── login.js
│   │   └── register.js
│   └── dashboard.js            # User dashboard
├── lib/
│   ├── models/
│   │   ├── User.js
│   │   └── Lesson.js
│   ├── mongodb.js
│   └── withAuth.js             # Auth helpers (MỚI)
├── public/
│   ├── audio/                  # Audio files
│   └── text/                   # JSON files
├── scripts/
│   └── createAdmin.js          # Create admin script
├── ADMIN_SYSTEM_GUIDE.md       # Chi tiết hướng dẫn (MỚI)
└── ADMIN_MEMBER_SYSTEM.md      # File này (MỚI)
```

## 🔧 Dependencies

### Đã có:
- next
- react
- next-auth
- mongodb
- bcryptjs

### Mới thêm:
- **formidable** (^3.x): Xử lý multipart/form-data cho upload

## 🧪 Testing Checklist

### Test Admin Functions:
- [ ] Tạo admin user bằng script
- [ ] Đăng nhập với admin account
- [ ] Truy cập /admin/dashboard thành công
- [ ] Upload audio file (< 50MB)
- [ ] Upload JSON file
- [ ] Tạo bài học mới với files đã upload
- [ ] Xem bài học trong danh sách
- [ ] Sửa bài học
- [ ] Xóa bài học

### Test Member Functions:
- [ ] Đăng ký tài khoản member
- [ ] Đăng nhập với member account
- [ ] Xem danh sách bài học
- [ ] Học bài (shadowing/dictation)
- [ ] Không truy cập được /admin/dashboard

### Test Security:
- [ ] Member không POST được /api/lessons
- [ ] Member không upload được files
- [ ] Unauthenticated user redirect về login
- [ ] JWT token hoạt động đúng

## 📝 Notes

### JSON File Format
File JSON cần có structure:
```json
{
  "sentences": [
    {
      "index": 0,
      "german": "...",
      "vietnamese": "...",
      "startTime": 0.0,
      "endTime": 2.5
    }
  ]
}
```

### Naming Convention
- Lesson ID: `bai_1`, `bai_2`, `lektion_10`
- Audio files: `{lessonId}.mp3`
- JSON files: `{lessonId}.json`

### Best Practices
1. Backup database trước khi xóa bài học
2. Test audio file trước khi upload
3. Validate JSON format trước khi upload
4. Sử dụng order number để sắp xếp
5. Đặt mật khẩu admin mạnh

## 🐛 Troubleshooting

### "Chỉ admin mới có quyền..."
→ Check user role in database, đảm bảo `role: "admin"`

### Upload failed
→ Check file size (< 50MB), file type, permissions của thư mục public/

### Admin dashboard không load
→ Check MongoDB connection, đảm bảo đã đăng nhập

### Bài học không hiện trong dashboard
→ Check API /api/lessons, refresh database connection

## 🎉 Summary

Hệ thống admin/member đã hoàn chỉnh với:
✅ Phân quyền rõ ràng
✅ Upload audio & text files
✅ CRUD bài học đầy đủ
✅ Security tốt (authentication + authorization)
✅ UI thân thiện và dễ sử dụng
✅ Documentation chi tiết

Giờ đây admin có thể dễ dàng quản lý nội dung mà không cần code!
