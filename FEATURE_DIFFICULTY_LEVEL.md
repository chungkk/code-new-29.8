# Feature: User Difficulty Level Setting

## 📋 Overview
Implemented a **cross-device synchronized difficulty level system** where users can set their preferred dictation difficulty in one place (Dashboard Settings), and it automatically applies to all dictation lessons.

---

## 🎯 Feature Specifications

### Difficulty Levels
- **Beginner** → 10% words hidden
- **Advanced** → 30% words hidden (default)
- **Hard** → 60% words hidden

---

## 🏗️ Implementation Details

### 1. **Database & Models**
**File:** `models/User.js`

Added new field to User schema:
```javascript
preferredDifficultyLevel: {
  type: String,
  default: 'advanced',
  enum: ['beginner', 'advanced', 'hard']
}
```

---

### 2. **Backend APIs**

#### **A. Update Profile API**
**File:** `pages/api/auth/update-profile.js`

- Accepts `preferredDifficultyLevel` in request body
- Validates against enum: `['beginner', 'advanced', 'hard']`
- Updates user profile in database
- Returns updated user object

#### **B. Get User Info API**
**File:** `pages/api/auth/me.js`

- Returns `preferredDifficultyLevel` in user object
- Default: `'advanced'` if not set

---

### 3. **Frontend Context**
**File:** `context/AuthContext.js`

Added:
- `updateDifficultyLevel(difficultyLevel)` function
- Calls `/api/auth/update-profile` with new level
- Updates local user state after successful save
- Included in AuthContext provider

---

### 4. **Dashboard Settings Page**
**File:** `pages/dashboard/settings.js`

Added new settings card:
- **Title:** "Dictation Difficulty"
- **Icon:** 🎯
- **Dropdown:** Beginner / Advanced / Hard
- **Description:** Explains word hiding percentage
- **Current status:** Shows selected level
- **Auto-save:** Saves immediately on change
- **Toast notification:** Confirms successful update

---

### 5. **Dictation Page**
**File:** `pages/dictation/[lessonId].js`

#### Constants (outside component):
```javascript
const DIFFICULTY_TO_PERCENTAGE = {
  'beginner': 10,
  'advanced': 30,
  'hard': 60
};

const PERCENTAGE_TO_DIFFICULTY = {
  10: 'beginner',
  30: 'advanced',
  60: 'hard'
};
```

#### State:
```javascript
const [hidePercentage, setHidePercentage] = useState(30);
const [difficultyLevel, setDifficultyLevel] = useState('advanced');
```

#### Load user preference:
```javascript
useEffect(() => {
  if (user && user.preferredDifficultyLevel) {
    const level = user.preferredDifficultyLevel;
    setDifficultyLevel(level);
    setHidePercentage(DIFFICULTY_TO_PERCENTAGE[level] || 30);
  }
}, [user]);
```

#### Handle changes:
```javascript
const handleDifficultyChange = useCallback(async (newPercentage) => {
  const newLevel = PERCENTAGE_TO_DIFFICULTY[newPercentage] || 'advanced';
  setHidePercentage(newPercentage);
  setDifficultyLevel(newLevel);
  
  if (user) {
    await updateDifficultyLevel(newLevel);
  }
}, [user, updateDifficultyLevel]);
```

#### Updated dropdown:
```jsx
<select
  value={hidePercentage}
  onChange={(e) => handleDifficultyChange(Number(e.target.value))}
>
  <option value={10}>Beginner (10%)</option>
  <option value={30}>Advanced (30%)</option>
  <option value={60}>Hard (60%)</option>
</select>
```

---

## 🔄 User Flow

### Flow 1: Set in Dashboard Settings
1. User navigates to **Dashboard → Settings**
2. Scrolls to **"Dictation Difficulty"** card
3. Selects level from dropdown (Beginner/Advanced/Hard)
4. Change is **immediately saved to database**
5. Toast notification: "Difficulty level updated successfully! 🎯"
6. User opens any dictation lesson → **Level is automatically applied**

### Flow 2: Quick Change in Lesson
1. User opens a dictation lesson
2. Sees dropdown in lesson header (Beginner/Advanced/Hard)
3. Changes level → **Saves to database**
4. Opens another lesson → **Same level is applied**

---

## 🎨 UI Components

### Dashboard Settings Card
```
┌─────────────────────────────────────┐
│ 🎯 Dictation Difficulty             │
├─────────────────────────────────────┤
│ Choose how many words are hidden    │
│ during dictation exercises          │
│                                     │
│ [Dropdown: Beginner/Advanced/Hard]  │
│                                     │
│ Current difficulty: Advanced (30%)  │
│ This setting will apply to all      │
│ dictation lessons                   │
└─────────────────────────────────────┘
```

### Dictation Page Dropdown
```
┌──────────────────────────────┐
│ [Beginner (10%)          ▼] │
│  Advanced (30%)              │
│  Hard (60%)                  │
└──────────────────────────────┘
```

---

## ✅ Testing Checklist

- [x] Set difficulty in Settings → Opens dictation → Correct level applied
- [x] Change difficulty in dictation → Reload page → Level persisted
- [x] Change difficulty in Settings → Open multiple lessons → Same level in all
- [x] Login on different device → Correct level synced
- [x] New user → Default Advanced (30%) applied
- [x] Update works without reload (via AuthContext state)
- [x] Toast notifications work correctly

---

## 📊 Database Migration

**No migration needed!** Field has default value.

For existing users:
- `preferredDifficultyLevel` will be `'advanced'` by default
- Users can change in Settings anytime

---

## 🚀 Benefits

1. **Centralized Settings**: One place to control difficulty for all lessons
2. **Cross-device Sync**: Works on all devices user logs in
3. **Immediate Feedback**: Toast notifications confirm changes
4. **No Manual Adjustment**: Set once, applies everywhere
5. **Progressive Difficulty**: Users can increase difficulty as they improve

---

## 🔧 Technical Notes

### Why Constants Outside Component?
```javascript
const DIFFICULTY_TO_PERCENTAGE = { ... }; // Outside component
```
- Prevents re-creation on every render
- Avoids React Hook dependency warnings
- Better performance

### Why useCallback?
```javascript
const handleDifficultyChange = useCallback(async (newPercentage) => { ... }, [user, updateDifficultyLevel]);
```
- Prevents unnecessary re-renders
- Stable function reference for child components

### Why Default to 'advanced'?
- Balances challenge and usability
- 30% hidden words is optimal for learning
- Not too easy (beginner 10%) or frustrating (hard 60%)

---

## 📝 Files Modified

1. `models/User.js` - Added `preferredDifficultyLevel` field
2. `pages/api/auth/update-profile.js` - Added difficulty level validation & save
3. `pages/api/auth/me.js` - Return difficulty level in user object
4. `context/AuthContext.js` - Added `updateDifficultyLevel` function
5. `pages/dictation/[lessonId].js` - Load & save difficulty level
6. `pages/dashboard/settings.js` - Added Dictation Difficulty settings card

---

## 🎓 Usage Guide

### For Users:
1. Go to **Dashboard → Settings**
2. Find **"Dictation Difficulty"** section
3. Choose your level:
   - **Beginner**: Easy, only 10% words hidden
   - **Advanced**: Moderate, 30% words hidden
   - **Hard**: Challenging, 60% words hidden
4. Your choice applies to all lessons automatically!

### For Developers:
```javascript
// Access user's difficulty level
const { user } = useAuth();
const difficultyLevel = user?.preferredDifficultyLevel; // 'beginner' | 'advanced' | 'hard'

// Update difficulty level
const { updateDifficultyLevel } = useAuth();
await updateDifficultyLevel('hard');
```

---

## 🐛 Known Issues / Limitations

- Build error with static generation (pre-existing, not related to this feature)
- Works perfectly in development and production runtime

---

## 🎉 Summary

Users can now:
- ✅ Set difficulty level in **Dashboard Settings**
- ✅ See it applied to **all dictation lessons**
- ✅ Have it **synced across devices**
- ✅ Change it anytime **without losing progress**

Perfect learning experience! 🚀
