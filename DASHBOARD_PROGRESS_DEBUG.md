# Dashboard Progress Display - Debug Guide

## Issue
Dashboard không hiển thị tiến độ bài học.

## Possible Causes & Solutions

### 1. User Chưa Đăng Nhập
**Symptom:** Dashboard redirect về /auth/login
**Solution:** 
```bash
# Tạo user/admin nếu chưa có
node scripts/createAdminQuick.js
```

### 2. Chưa Có Progress Data
**Symptom:** Dashboard shows empty state "Chưa có bài học nào"
**Reason:** User chưa từng làm bài nào

**Solution:**
1. Login vào hệ thống
2. Vào homepage (http://localhost:3010)
3. Click vào Bài 1
4. Chọn "Dictation"
5. Gõ ít nhất 1 từ đúng
6. Quay lại dashboard
7. Sẽ thấy Bài 1 với progress %

### 3. Database Connection Issue
**Symptom:** Console shows MongoDB errors
**Check:**
```bash
# Open browser console (F12)
# Look for errors like:
# - "Error loading data"
# - "MongoNetworkError"
# - "Authentication failed"
```

**Solution:**
- Check .env.local has correct MONGODB_URI
- Verify MongoDB Atlas is accessible
- Check network connection

### 4. API Returns Wrong Format
**Symptom:** Console logs show unexpected data structure
**Debug:**
```javascript
// Open browser console and check logs:
console.log('Progress data:', progressData);
// Should be array: [{ lessonId, mode, completionPercent, ... }]

console.log('All lessons:', allLessons);
// Should be array: [{ id, displayTitle, description, ... }]

console.log('Lesson IDs with progress:', lessonIdsWithProgress);
// Should be array: ["bai_1", "bai_3", ...]

console.log('Filtered lessons:', lessonsWithProgress);
// Should be filtered array based on progress
```

## How to Test Properly

### Step-by-Step Testing:

#### Step 1: Login
```
1. Go to: http://localhost:3010/auth/login
2. Login with credentials
3. Should redirect to dashboard
```

#### Step 2: Check Empty State
```
If first time:
- Should show: "Chưa có bài học nào"
- This is CORRECT (no progress yet)
```

#### Step 3: Create Progress
```
1. Go to homepage: http://localhost:3010
2. Click "Lektion 1: Patient Erde"
3. Select "Dictation" mode
4. Type a few words correctly
5. See words turn green (✅ saved)
```

#### Step 4: Verify Dashboard
```
1. Go back to dashboard
2. Open browser console (F12)
3. Look at console logs:
   - Progress data: [{ lessonId: "bai_1", ... }]
   - Lesson IDs with progress: ["bai_1"]
   - Filtered lessons: [{ id: "bai_1", ... }]
4. Should see Bài 1 card with progress %
```

#### Step 5: Verify Progress Calculation
```javascript
// In calculateProgress function:
const lessonProgress = progress.filter(p => p.lessonId === lessonId);
// Should find progress entries

const maxProgress = Math.max(...lessonProgress.map(p => p.completionPercent || 0));
// Should calculate max % across modes

return Math.min(100, maxProgress);
// Should return 0-100
```

## Debug Checklist

### Browser Console Checks:
- [ ] Open http://localhost:3010/dashboard
- [ ] Press F12 (open console)
- [ ] Check for errors (red messages)
- [ ] Look for console.log outputs:
  - [ ] "Progress data: [...]"
  - [ ] "All lessons: [...]"
  - [ ] "Lesson IDs with progress: [...]"
  - [ ] "Filtered lessons: [...]"

### Network Tab Checks:
- [ ] Open Network tab in DevTools
- [ ] Reload dashboard
- [ ] Check API calls:
  - [ ] GET /api/progress → Status 200?
  - [ ] GET /api/lessons → Status 200?
  - [ ] GET /api/vocabulary → Status 200?
- [ ] Click on each request
- [ ] Check Response body

### MongoDB Checks:
```javascript
// Check if progress collection exists
use your_database_name;
db.progress.find().pretty();

// Should see documents like:
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),
  "lessonId": "bai_1",
  "mode": "dictation",
  "progress": {
    "completedWords": { ... },
    "completedSentences": [ ... ],
    "correctWords": 5,
    "totalWords": 50
  },
  "completionPercent": 10,
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

## Common Issues & Fixes

### Issue 1: "Vui lòng đăng nhập"
```
API returns: { message: "Vui lòng đăng nhập" }
Reason: Session expired or not logged in
Fix: Login again
```

### Issue 2: Progress Data is Object (not Array)
```javascript
// If API returns object instead of array:
progressData = { message: "..." }  // Wrong

// Fix is already in place:
setProgress(Array.isArray(progressData) ? progressData : []);
```

### Issue 3: Lesson ID Mismatch
```javascript
// Progress has: lessonId: "bai_1"
// Lesson has: id: "lesson_1"
// They don't match!

// Check consistency:
console.log(progressData.map(p => p.lessonId));  // ["bai_1"]
console.log(allLessons.map(l => l.id));          // ["lesson_1"]
```

**Fix:** Ensure lesson IDs are consistent everywhere

### Issue 4: calculateProgress Returns 0
```javascript
const calculateProgress = (lessonId) => {
  const lessonProgress = progress.filter(p => p.lessonId === lessonId);
  console.log('Lesson progress for', lessonId, ':', lessonProgress);
  
  if (lessonProgress.length === 0) return 0;
  
  const maxProgress = Math.max(...lessonProgress.map(p => p.completionPercent || 0));
  console.log('Max progress:', maxProgress);
  
  return Math.min(100, maxProgress);
};
```

**Add logs to debug!**

## Expected Console Output (Working)

```javascript
// When dashboard loads:

Progress data: [
  {
    lessonId: "bai_1",
    mode: "dictation", 
    completionPercent: 15,
    progress: {
      completedWords: { "0": { "0": "Patient", "1": "Erde" } },
      correctWords: 2,
      totalWords: 50
    }
  }
]

All lessons: [
  {
    id: "bai_1",
    displayTitle: "Lektion 1: Patient Erde",
    description: "Thema: Umwelt, Klimawandel (DW)"
  }
]

Lesson IDs with progress: ["bai_1"]

Filtered lessons: [
  {
    id: "bai_1",
    displayTitle: "Lektion 1: Patient Erde",
    description: "Thema: Umwelt, Klimawandel (DW)"
  }
]
```

**Result:** Dashboard shows 1 card with 15% progress

## Quick Test Commands

### Test 1: Check if logged in
```javascript
// In browser console:
fetch('/api/progress')
  .then(r => r.json())
  .then(d => console.log('Progress:', d));

// Expected: Array of progress objects
// If error: "Vui lòng đăng nhập" → need to login
```

### Test 2: Manually save progress
```javascript
// In browser console (after login):
fetch('/api/progress', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lessonId: 'bai_1',
    mode: 'dictation',
    progress: {
      completedWords: { "0": { "0": "test" } },
      correctWords: 1,
      totalWords: 50
    }
  })
})
.then(r => r.json())
.then(d => console.log('Save result:', d));

// Then reload dashboard
```

### Test 3: Check lesson data
```javascript
// In browser console:
fetch('/api/lessons')
  .then(r => r.json())
  .then(d => console.log('Lessons:', d));

// Should see array of lessons
```

## What to Do Next

### If Still Not Working:

1. **Check Browser Console:**
   - Open http://localhost:3010/dashboard
   - Press F12
   - Look at console logs
   - Take screenshot if needed

2. **Check Network Tab:**
   - See what API returns
   - Check status codes
   - Verify response data

3. **Verify Login:**
   - Check if session exists
   - Try logout and login again

4. **Create Test Data:**
   - Go to dictation page
   - Complete at least 1 word
   - Check console logs
   - Return to dashboard

5. **Manual Database Check:**
   ```javascript
   // Check MongoDB Atlas directly
   // Collection: progress
   // Filter: { userId: ObjectId("your_user_id") }
   ```

## Current Status

✅ Code updated with:
- Filter logic for started lessons
- Debug console.logs
- Array type checking
- Fallback to hardcoded lessons
- Error handling

**Next:** Test in browser with console open to see logs!

**Server:** http://localhost:3010
