# 🚀 Quick Start - Set Admin

## Cách Nhanh Nhất

### 1️⃣ Đăng ký tài khoản
Vào website → Register → Tạo tài khoản mới

### 2️⃣ Set Admin trong MongoDB

**Nếu dùng MongoDB Compass:**
```
1. Mở MongoDB Compass
2. Connect với string: mongodb+srv://hoatiuthu_db_user:8PQdFjviFIKxyv65@cluster0.aj3nby6.mongodb.net/Cluster0
3. Vào database: Cluster0
4. Vào collection: users
5. Tìm user theo email vừa đăng ký
6. Edit document
7. Sửa: "role": "member" → "role": "admin"
8. Update
```

**Nếu dùng MongoDB Atlas:**
```
1. Vào https://cloud.mongodb.com/
2. Login
3. Browse Collections
4. Cluster0 → users
5. Tìm user theo email
6. Edit → role: "admin"
7. Save
```

### 3️⃣ Logout và Login lại
- Logout khỏi website
- Login lại với tài khoản đã set admin
- Vào Dashboard → Thấy button "✍️ Viết Bài Mới"

## ✅ Done!

Bạn đã là admin và có thể:
- Tạo bài học mới
- Upload audio & transcript
- Quản lý toàn bộ bài học

---

## 🔍 Kiểm Tra Xem Đã Là Admin Chưa

1. Login vào website
2. Vào Dashboard
3. Nếu thấy button "✍️ Viết Bài Mới" → Bạn là admin ✅
4. Nếu không thấy → Kiểm tra lại MongoDB

---

## 📝 Note

- Mỗi user chỉ có thể có 1 role: "member" hoặc "admin"
- Admin có tất cả quyền của member + thêm quyền tạo bài
- Có thể có nhiều admin trong hệ thống
