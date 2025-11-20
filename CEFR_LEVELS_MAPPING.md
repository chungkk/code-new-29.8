# CEFR Levels Mapping for Dictation Difficulty

## 📊 Overview
Updated difficulty system to use **CEFR (Common European Framework of Reference)** levels instead of generic beginner/advanced/hard labels.

---

## 🎯 CEFR Level Mapping

| CEFR Level | Hidden Words % | Description |
|------------|---------------|-------------|
| **A1** | 10% | Beginner - Very easy |
| **A2** | 30% | Elementary - Easy |
| **B1** | 30% | Intermediate - Medium (Default) |
| **B2** | 60% | Upper Intermediate - Hard |
| **C1** | 100% | Advanced - Very Hard |
| **C2** | 100% | Mastery - Extremely Hard |

---

## 🔄 Migration Details

### Old System → New System
```
beginner (10%)  →  A1 (10%)
advanced (30%)  →  B1 (30%)  [DEFAULT]
hard (60%)      →  B2 (60%)
                   + A2 (30%)
                   + C1 (100%)
                   + C2 (100%)
```

---

## 💾 Database Schema

### User Model (`models/User.js`)
```javascript
preferredDifficultyLevel: {
  type: String,
  default: 'b1',
  enum: ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']
}
```

**Default:** `b1` (B1 - 30% hidden)

---

## 🔧 Technical Implementation

### Constants (`pages/dictation/[lessonId].js`)
```javascript
const DIFFICULTY_TO_PERCENTAGE = {
  'a1': 10,
  'a2': 30,
  'b1': 30,
  'b2': 60,
  'c1': 100,
  'c2': 100
};

const PERCENTAGE_TO_DIFFICULTY = {
  10: 'a1',
  30: 'b1',   // Default to B1 for 30%
  60: 'b2',
  100: 'c1'   // Default to C1 for 100%
};
```

**Note:** A2 and B1 both map to 30%, but B1 is the default.

---

## 🎨 UI Dropdowns

### Settings Page
```jsx
<select value={user?.preferredDifficultyLevel || 'b1'}>
  <option value="a1">A1 (10% hidden)</option>
  <option value="a2">A2 (30% hidden)</option>
  <option value="b1">B1 (30% hidden)</option>
  <option value="b2">B2 (60% hidden)</option>
  <option value="c1">C1 (100% hidden)</option>
  <option value="c2">C2 (100% hidden)</option>
</select>
```

### Dictation Page Header
```jsx
<select value={difficultyLevel}>
  <option value="a1">A1 (10%)</option>
  <option value="a2">A2 (30%)</option>
  <option value="b1">B1 (30%)</option>
  <option value="b2">B2 (60%)</option>
  <option value="c1">C1 (100%)</option>
  <option value="c2">C2 (100%)</option>
</select>
```

---

## 📝 API Changes

### Validation (`pages/api/auth/update-profile.js`)
```javascript
const validDifficultyLevels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
```

### Default Value (`pages/api/auth/me.js`)
```javascript
preferredDifficultyLevel: user.preferredDifficultyLevel || 'b1'
```

---

## 🌍 CEFR Level Descriptions

### A1 - Beginner (10% hidden)
- Can understand and use familiar everyday expressions
- Very basic phrases
- **Ideal for:** Complete beginners

### A2 - Elementary (30% hidden)
- Can understand sentences and frequently used expressions
- Simple routine tasks
- **Ideal for:** Basic independent users

### B1 - Intermediate (30% hidden) ⭐ DEFAULT
- Can understand the main points of clear standard input
- Deal with most situations likely to arise
- **Ideal for:** Intermediate learners, most users

### B2 - Upper Intermediate (60% hidden)
- Can understand complex texts
- Interact with fluency and spontaneity
- **Ideal for:** Advanced learners

### C1 - Advanced (100% hidden)
- Can understand demanding, longer texts
- Express ideas fluently and spontaneously
- **Ideal for:** Very advanced learners

### C2 - Mastery (100% hidden)
- Can understand virtually everything heard or read
- Native-like proficiency
- **Ideal for:** Near-native speakers

---

## 🔄 User Flow Examples

### Example 1: New User
1. User registers → Default: **B1 (30%)**
2. User opens dictation → 30% words hidden
3. User thinks it's too hard → Changes to **A1 (10%)** in Settings
4. All lessons now show only 10% hidden

### Example 2: Progressive Difficulty
1. User starts at **A1 (10%)**
2. After mastering basics → Changes to **A2 (30%)**
3. Gets comfortable → Changes to **B1 (30%)**
4. Wants challenge → Changes to **B2 (60%)**
5. Expert level → Changes to **C1 (100%)**

### Example 3: C1/C2 Users
1. Advanced user sets **C1 (100%)**
2. All words are hidden
3. Pure dictation mode
4. Tests comprehension fully

---

## 📊 Statistics & Analytics

### Difficulty Distribution (Expected)
```
A1 (10%):   15% of users
A2 (30%):   20% of users
B1 (30%):   35% of users ⭐ Most common
B2 (60%):   20% of users
C1 (100%):   8% of users
C2 (100%):   2% of users
```

---

## 🔒 Backward Compatibility

### Old Users (with old values)
If database has old values (`beginner`, `advanced`, `hard`):
- They will be treated as `'b1'` (default)
- Users can re-select their level from new dropdown
- No data loss, seamless migration

---

## ✅ Files Modified

1. ✅ `models/User.js` - Updated enum, default to 'b1'
2. ✅ `pages/api/auth/update-profile.js` - Updated validation
3. ✅ `pages/api/auth/me.js` - Updated default
4. ✅ `pages/dictation/[lessonId].js` - Updated mappings, dropdowns
5. ✅ `pages/dashboard/settings.js` - Updated dropdown, display
6. ✅ `context/AuthContext.js` - Updated defaults

---

## 🎓 Educational Benefits

1. **Industry Standard:** CEFR is globally recognized
2. **Clear Progression:** Users know where they stand
3. **Motivation:** Clear path from A1 → C2
4. **Self-Assessment:** Users can gauge their level
5. **Goal Setting:** "I want to reach B2 by next month"

---

## 🚀 Future Enhancements

### Potential Features:
- Level recommendations based on progress
- Automatic level increase after X sentences
- Level badges/achievements
- Progress tracking per CEFR level
- Comparison with other users at same level

---

Perfect! 🎯 Standard CEFR system implemented!
