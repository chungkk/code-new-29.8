# Guest Access Feature - Cho phép khách truy cập Dictation & Shadowing

## Overview
Người dùng giờ có thể truy cập và sử dụng **Dictation** và **Shadowing** mà không cần đăng nhập. Các tính năng lưu progress, vocabulary vẫn yêu cầu đăng nhập.

## Thay đổi chính

### 1. **Optional Authentication Middleware** ✅
**File**: `lib/authMiddleware.js`
- Tạo mới `optionalAuth()` middleware
- Cho phép cả guest users (req.user = null) và logged-in users
- Fallback gracefully khi không có token hoặc token invalid

```javascript
// Before: requireAuth - blocks all guests
export default requireAuth(handler);

// After: optionalAuth - allows guests
export default optionalAuth(handler);
```

### 2. **Progress API - Guest Support** ✅
**File**: `pages/api/progress.js`
- **GET**: Guest users nhận empty progress `{ progress: {}, studyTime: 0, isGuest: true }`
- **POST**: Guest users nhận message "Vui lòng đăng nhập để lưu tiến trình"
- Không block page load cho guests

### 3. **Updated Data Fetching Hook** ✅
**File**: `lib/hooks/useLessonData.js`
- `progressFetcher` không require token
- Tự động detect guest users (no token trong localStorage)
- Return empty progress thay vì throw error cho guests
- Thêm flag `isGuest` để UI biết user là guest

### 4. **Progress Hook - Silent Guest Handling** ✅
**File**: `lib/hooks/useProgress.js`
- `saveProgress()` silently skip khi user = null (guest)
- Console log để developer biết, không spam toast messages
- Guest users vẫn dùng app bình thường, chỉ không save được

### 5. **Vocabulary Save - Login Prompt** ✅
**Existing**: Shadowing & Dictation pages
- `saveVocabulary()` đã có check token
- Show toast "Bitte melden Sie sich an, um Vokabeln zu speichern" cho guests
- Friendly UX, không block feature

## User Experience Flow

### **Guest User (Chưa đăng nhập)**
1. ✅ Vào homepage → Chọn bài học
2. ✅ Click Shadowing hoặc Dictation → Vào trang học bình thường
3. ✅ Xem video, transcript, IPA, translation
4. ✅ Practice dictation, nghe audio, replay
5. ❌ Progress không được save (silent)
6. ❌ Vocabulary không save được (hiện toast yêu cầu login)
7. ❌ Streak, leaderboard không update (auto-skip)

### **Logged-in User**
1. ✅ Tất cả features như cũ
2. ✅ Progress tự động save
3. ✅ Vocabulary save được
4. ✅ Streak update
5. ✅ Leaderboard tracking

## Technical Details

### API Behavior

#### `/api/progress` GET
```javascript
// Guest user (no token)
Response: { progress: {}, studyTime: 0, isGuest: true }
Status: 200 OK

// Logged-in user
Response: { progress: {...}, studyTime: 1234 }
Status: 200 OK
```

#### `/api/progress` POST
```javascript
// Guest user (no token)
Response: { message: 'Vui lòng đăng nhập để lưu tiến trình', requiresAuth: true }
Status: 401 Unauthorized

// Logged-in user
Response: { message: 'Lưu tiến trình thành công', completionPercent: 65 }
Status: 200 OK
```

### Frontend Checks
```javascript
// All functions check user before saving
const updateMonthlyStats = async () => {
  if (!user) return; // Skip for guests
  // ... save stats
};

const saveProgress = async (data) => {
  if (!user) {
    console.log('Guest user - not saved');
    return; // Silent skip
  }
  // ... save progress
};

const saveVocabulary = async ({ word, translation }) => {
  if (!token) {
    toast.error('Bitte melden Sie sich an...');
    return;
  }
  // ... save vocabulary
};
```

## Benefits

### 1. **Lower Barrier to Entry** 🎯
- Users can try the app immediately
- No signup required to see value
- Better conversion rate (try first → sign up later)

### 2. **SEO Friendly** 🔍
- Public lesson pages can be indexed
- Better discoverability
- More organic traffic

### 3. **Better UX** 😊
- No frustration from forced signup
- Users decide when to register (when they see value)
- Smooth guest → registered user flow

### 4. **Viral Potential** 📈
- Easy to share lesson links
- Friends can try without signup
- Word-of-mouth growth

## What's Protected (Requires Login)

These features still require authentication:
- ❌ Save progress
- ❌ Save vocabulary
- ❌ Streak tracking
- ❌ Leaderboard participation
- ❌ Dashboard access
- ❌ User profile settings

## Testing

### Test as Guest:
```bash
# 1. Logout completely
# 2. Navigate to any lesson
# 3. Try features:
✅ Watch video
✅ View transcript
✅ Play audio
✅ Use controls (seek, speed, etc.)
✅ View IPA and translations
❌ Progress not saved (check console)
❌ Vocabulary shows login toast
```

### Test as Logged-in User:
```bash
# 1. Login
# 2. Navigate to lesson
# 3. All features work normally:
✅ Progress saves automatically
✅ Vocabulary saves
✅ Streak updates
✅ Leaderboard tracks
```

## Migration Notes

### No Breaking Changes ✅
- Existing logged-in users: **No impact**
- Database: **No changes needed**
- APIs: **Backward compatible**
- Frontend: **Graceful degradation for guests**

### Rollback Plan
If needed, simply change back:
```javascript
// In pages/api/progress.js
export default requireAuth(handler); // Block guests again
```

## Future Enhancements (Optional)

### 1. **Guest Progress in LocalStorage**
- Save guest progress locally
- Sync to account when they register
- Better onboarding experience

### 2. **Login Prompts**
- After completing N sentences
- After spending X minutes
- "Create account to save your progress"

### 3. **Anonymous Usage Analytics**
- Track guest engagement
- Measure conversion rate
- Optimize signup flow

### 4. **Social Sharing**
- "I just completed this lesson!"
- Share with guest-accessible link
- Built-in referral system

## Security Considerations ✅

1. **No Data Leakage**
   - Guests can only access public lessons
   - No access to other users' data
   - Progress/vocabulary still protected

2. **API Rate Limiting**
   - Consider rate limit for guests
   - Prevent abuse
   - Throttle anonymous requests

3. **Spam Prevention**
   - Monitor suspicious activity
   - Block malicious IPs
   - CAPTCHA for suspicious patterns

## Conclusion

Guest access enables:
- ✅ **Try before signup** model
- ✅ **Lower friction** onboarding
- ✅ **Better SEO** and discoverability
- ✅ **Viral growth** potential
- ✅ **No breaking changes** for existing users

The implementation is **clean**, **secure**, and **backward compatible**. Guest users get a great preview experience while logged-in users enjoy full functionality.
