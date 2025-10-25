# Test Đăng Nhập - Hướng Dẫn

## ✅ Đã Fix 2 Lỗi

### 1. Lỗi Dictation không hiển thị ô input khi chưa đăng nhập
**Nguyên nhân**: `progressLoaded` không được set khi user chưa đăng nhập
**Giải pháp**: Set `progressLoaded = true` ngay cả khi không có session

### 2. Lỗi đăng nhập
**Nguyên nhân**: 
- NextAuth authorize() throw Error thay vì return null
- Thiếu validation credentials
- Redirect logic không đúng

**Giải pháp**:
- Sửa authorize() return null thay vì throw Error
- Thêm validation credentials
- Sử dụng window.location.href cho redirect
- Thêm delay 500ms để session được set

---

## 🧪 Cách Test

### Test 1: Dictation Mode (Chưa đăng nhập)
1. Mở trình duyệt: http://localhost:3002
2. Click vào bất kỳ bài học nào
3. Chọn "Dictation"
4. **Kết quả mong đợi**: Hiển thị các ô input để điền từ ✅

### Test 2: Đăng Nhập
1. Mở: http://localhost:3002/auth/login
2. Nhập:
   - Email: `admin@admin.com`
   - Password: `123456`
3. Click "Đăng Nhập"
4. **Kết quả mong đợi**: Redirect đến /dashboard ✅

### Test 3: Đăng Ký
1. Mở: http://localhost:3002/auth/register
2. Điền form đầy đủ
3. Click "Đăng Ký"
4. **Kết quả mong đợi**: Thành công → redirect login ✅

---

## 🔍 Debug Checklist

Nếu vẫn gặp lỗi, kiểm tra:

### 1. MongoDB Connection
```bash
# Check connection trong server log
tail -f /tmp/nextjs-dev.log | grep MongoDB
```

### 2. NextAuth Session
```bash
# Test session API
curl http://localhost:3002/api/auth/session
```

### 3. User Exists
```bash
# Check user trong database
node scripts/testLogin.js
```

### 4. Browser Console
- Mở DevTools (F12)
- Tab Console
- Xem có error gì không

---

## 🐛 Common Issues

### Issue: "Email hoặc mật khẩu không đúng"
**Fix**:
1. Check user tồn tại trong DB
2. Check password đã hash đúng chưa
3. Xem server log: `tail -f /tmp/nextjs-dev.log`

### Issue: Dictation vẫn không hiển thị input
**Fix**:
1. Hard refresh browser (Cmd+Shift+R hoặc Ctrl+Shift+R)
2. Clear browser cache
3. Check console log có lỗi gì không

### Issue: Login thành công nhưng không redirect
**Fix**:
1. Check session: `curl http://localhost:3002/api/auth/session`
2. Đăng xuất và đăng nhập lại
3. Thử redirect manual: `window.location.href = '/dashboard'`

---

## 📝 Changes Made

### File: `pages/dictation/[lessonId].js`
- Line 55-64: Set progressLoaded = true khi không có session

### File: `pages/api/auth/[...nextauth].js`
- Line 17-20: Validate credentials
- Line 26, 34, 46: Return null thay vì throw Error
- Line 42: Default role = 'user' nếu không có

### File: `components/AuthForm.js`
- Line 48: Error message rõ ràng hơn
- Line 51-52: Check !result?.ok
- Line 57-61: Thêm delay + redirect bằng window.location.href

---

## ✅ Verification

Chạy các test sau để verify:

```bash
# 1. Build project (không có error)
npm run build

# 2. Lint (không có critical error)
npm run lint

# 3. Test login script
node scripts/testLogin.js

# 4. Start dev server
npm run dev
```

---

## 🎯 Expected Behavior

### Khi CHƯA đăng nhập:
- ✅ Có thể xem trang chủ
- ✅ Có thể mở bài học
- ✅ Có thể chơi Shadowing mode
- ✅ Có thể chơi Dictation mode (hiển thị ô input)
- ❌ Không lưu được progress
- ❌ Không truy cập được /dashboard

### Khi ĐÃ đăng nhập:
- ✅ Tất cả tính năng trên
- ✅ Lưu progress tự động
- ✅ Truy cập được /dashboard
- ✅ Xem được tiến độ học tập

### Khi đăng nhập với ADMIN:
- ✅ Tất cả tính năng member
- ✅ Truy cập được /admin/dashboard
- ✅ Thêm/sửa/xóa bài học
- ✅ Upload audio & text files

---

Nếu tất cả test pass, hệ thống đã hoạt động đúng! 🎉
