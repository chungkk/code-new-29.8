# Cách Xem Tiến Độ Bài Học trên Dashboard 📊

## Tình Huống Hiện Tại

Dashboard đã được cập nhật để **chỉ hiển thị những bài học mà user đã từng làm** (có progress), thay vì hiển thị tất cả bài.

## Tại Sao Dashboard Trống?

Nếu bạn thấy dashboard trống với message "Chưa có bài học nào", đó là vì:
✅ **User chưa bắt đầu học bài nào**

Đây là behavior **đúng** và **mong muốn**!

## Cách Tạo Progress Để Hiển Thị

### Bước 1: Đăng Nhập (Nếu Chưa)

```bash
# Tạo user/admin nếu chưa có
cd /Users/chungkk/Desktop/GG\ Driver/code/code\ new\ 29.8
node scripts/createAdminQuick.js

# Nhập thông tin:
# Email: test@example.com
# Password: 123456
# Name: Test User
```

**Hoặc:**
- Vào http://localhost:3010/auth/register
- Đăng ký tài khoản mới

### Bước 2: Bắt Đầu Học Bài

#### Option A: Dictation (Chép Chính Tả)
```
1. Vào Homepage: http://localhost:3010
2. Click vào "Lektion 1: Patient Erde"
3. Chọn "Dictation"
4. Bạn sẽ thấy các ô input với icon mắt 👁️
5. Gõ ít nhất 1 từ đúng (ví dụ: "der", "die", "und"...)
6. Từ sẽ chuyển sang màu xanh lá → ✅ Đã lưu!
```

#### Option B: Shadowing
```
1. Vào Homepage: http://localhost:3010
2. Click vào "Lektion 1: Patient Erde"
3. Chọn "Shadowing"
4. Play audio và nghe
5. Progress tự động lưu khi bạn play
```

### Bước 3: Kiểm Tra Dashboard

```
1. Click vào tên user ở góc phải header
2. Chọn "Quản lý học tập"
3. Hoặc vào trực tiếp: http://localhost:3010/dashboard
4. Bạn sẽ thấy:

┌──────────────────────────────┐
│ 📖 Lektion 1: Patient Erde  │
│ Thema: Umwelt, Klimawandel   │
│                              │
│ Tiến độ           15%       │
│ ▓▓░░░░░░░░░░░░ 15%         │
│                              │
│ 🆕 Chưa bắt đầu             │
└──────────────────────────────┘
```

## Cách Progress Được Tính

### Dictation Mode:
```javascript
completionPercent = (correctWords / totalWords) * 100

Example:
- User gõ đúng 5 từ
- Tổng bài có 50 từ
- Progress = (5/50) * 100 = 10%
```

### Shadowing Mode:
```javascript
completionPercent = (currentSentence / totalSentences) * 100

Example:
- User nghe đến câu 3
- Tổng bài có 10 câu
- Progress = (3/10) * 100 = 30%
```

### Multiple Modes (Same Lesson):
```javascript
// User làm cả Dictation và Shadowing cho cùng 1 bài:
- Dictation: 20%
- Shadowing: 45%

// Dashboard hiển thị:
Progress = MAX(20%, 45%) = 45%
```

Chỉ hiển thị **1 card** cho bài đó với % cao nhất.

## Debug - Xem Data Trong Console

### Mở Browser Console (F12):

```javascript
// Check if logged in
fetch('/api/progress')
  .then(r => r.json())
  .then(d => console.log('My progress:', d));

// Should see:
// My progress: [{ lessonId: "bai_1", mode: "dictation", completionPercent: 15, ... }]

// If see: { message: "Vui lòng đăng nhập" }
// → You need to login first!
```

### Manually Create Test Progress:

```javascript
// In browser console (after login):
fetch('/api/progress', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lessonId: 'bai_1',
    mode: 'dictation',
    progress: {
      completedWords: { "0": { "0": "Patient", "1": "Erde" } },
      completedSentences: [],
      currentSentenceIndex: 0,
      totalSentences: 10,
      correctWords: 2,
      totalWords: 50
    }
  })
})
.then(r => r.json())
.then(d => console.log('Progress saved:', d));

// Then reload dashboard → Should see Bài 1 with 4% progress
```

## Visual Guide

### Empty State (No Progress):
```
╔════════════════════════════╗
║                            ║
║          📚                ║
║                            ║
║   Chưa có bài học nào     ║
║                            ║
║  Hãy bắt đầu học bài       ║
║      đầu tiên             ║
║                            ║
╚════════════════════════════╝
```

### With Progress (After Learning):
```
╔════════════════════════════╗
║ 📖 Lektion 1: Patient Erde║
║ Thema: Umwelt, Klimawandel ║
║                            ║
║ Tiến độ            15%    ║
║ ▓▓▓░░░░░░░░░░░ 15%       ║
╚════════════════════════════╝
```

### Multiple Lessons:
```
╔════════════════════════════╗
║ 📖 Lektion 1: Patient Erde║
║ Progress: 45%              ║
╚════════════════════════════╝

╔════════════════════════════╗
║ 📖 Lektion 2: Das Klima   ║
║ Progress: 30%              ║
╚════════════════════════════╝

╔════════════════════════════╗
║ 📖 Lektion 3: Die Energie ║
║ Progress: 100% ✅          ║
╚════════════════════════════╝
```

## Summary

✅ **Dashboard Filter:** Chỉ hiện bài đã bắt đầu học

✅ **Empty State:** Normal nếu chưa học bài nào

✅ **Để thấy progress:**
1. Login
2. Vào dictation/shadowing page
3. Làm bài (gõ ít nhất 1 từ)
4. Quay lại dashboard
5. Sẽ thấy bài với % tiến độ

✅ **Debug:** Mở console (F12) để xem logs

**Server:** http://localhost:3010

**Next Steps:**
1. Đăng nhập (nếu chưa)
2. Vào http://localhost:3010
3. Click Bài 1 → Chọn Dictation
4. Gõ một vài từ đúng
5. Quay lại Dashboard
6. Sẽ thấy tiến độ! 🎉
