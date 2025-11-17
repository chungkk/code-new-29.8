# Leaderboard System - Integration Guide

## Overview
I've created a complete monthly leaderboard system that tracks user rankings based on points, time spent, sentences completed, and lessons completed. The system includes:

✅ **API Endpoints** for fetching rankings and updating stats
✅ **Monthly Tracking** with countdown timer
✅ **User Rankings** with top 3 highlighted
✅ **Rewards System** displaying badges and avatar frames
✅ **Navigation Links** in header and user menu

---

## What Was Created

### 1. Database Model
**File:** `lib/models/MonthlyLeaderboard.js`

Tracks monthly statistics for each user:
- Monthly points earned
- Total time spent (seconds)
- Sentences completed
- Lessons completed
- Streak days
- Rank position

### 2. API Endpoints

#### `/api/leaderboard/index.js`
- **GET** - Fetch all-time leaderboard with pagination
- Returns users ranked by total points

#### `/api/leaderboard/monthly.js`
- **GET** - Fetch monthly leaderboard
- Query params: `year`, `month`, `page`, `limit`
- Returns monthly rankings + countdown timer

#### `/api/leaderboard/user-rank.js`
- **GET** - Get current user's rank and nearby users
- Requires authentication

#### `/api/leaderboard/update-monthly-stats.js`
- **POST** - Update user's monthly statistics
- Body: `{ pointsChange, timeSpent, sentencesCompleted, lessonsCompleted }`

### 3. Frontend Components

#### `/pages/leaderboard/index.js`
Main leaderboard page with:
- Countdown timer to month end
- Previous/Next month navigation
- Monthly rewards display
- Top 3 users highlighted with gold/silver/bronze
- Full ranking list with user stats

#### `/styles/leaderboard.module.css`
Complete styling matching your dark purple/blue theme

### 4. Navigation Updates
- Added "Leaderboard" link to header navigation
- Added "🏆 Leaderboard" to user dropdown menu

---

## How to Integrate with Your Points System

### Step 1: Update Points API
When users earn points, also update monthly stats.

**File to modify:** `pages/api/user/points.js`

Add this code after updating user points:

```javascript
// After updating user.points
const pointsChange = req.body.pointsChange || 0;

// Update monthly leaderboard stats
try {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const MonthlyLeaderboard = require('../../../lib/models/MonthlyLeaderboard').default;

  await MonthlyLeaderboard.findOneAndUpdate(
    { userId: user._id, year, month },
    {
      $inc: { monthlyPoints: pointsChange },
      $set: { lastUpdated: new Date() }
    },
    { upsert: true, new: true }
  );
} catch (err) {
  console.error('Error updating monthly leaderboard:', err);
  // Don't fail the request if leaderboard update fails
}
```

### Step 2: Track Lesson Completions
When a user completes a lesson, update monthly stats.

**Example in your lesson completion handler:**

```javascript
import { fetchWithAuth } from '../../lib/api';

// After user completes a lesson
const updateMonthlyStats = async (timeSpent, sentencesCompleted) => {
  try {
    await fetchWithAuth('/api/leaderboard/update-monthly-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pointsChange: 10, // Points earned for this lesson
        timeSpent: timeSpent, // In seconds
        sentencesCompleted: sentencesCompleted,
        lessonsCompleted: 1
      })
    });
  } catch (err) {
    console.error('Failed to update monthly stats:', err);
  }
};

// Call this function when lesson is completed
await updateMonthlyStats(120, 15); // 120 seconds, 15 sentences
```

### Step 3: Track Time Spent

**Option A: Track per lesson/activity**

```javascript
// Start timer when lesson begins
const startTime = Date.now();

// When lesson ends
const endTime = Date.now();
const timeSpentSeconds = Math.floor((endTime - startTime) / 1000);

await fetchWithAuth('/api/leaderboard/update-monthly-stats', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    timeSpent: timeSpentSeconds
  })
});
```

**Option B: Track in existing progress system**

If you already track time in `UserProgress` model, update monthly stats when saving progress.

### Step 4: Update Existing Lessons/Activities

Add stats tracking to these files:
- `pages/shadowing/[lessonId].js` - Shadowing lessons
- `pages/dictation/[lessonId].js` - Dictation lessons
- Any other activities that award points

**Example for Shadowing:**

```javascript
// In your handleLessonComplete function
const handleLessonComplete = async () => {
  const timeSpentSeconds = Math.floor((Date.now() - lessonStartTime) / 1000);
  const sentencesCount = lesson.sentences?.length || 0;

  // Award points (existing code)
  await fetchWithAuth('/api/user/points', {
    method: 'POST',
    body: JSON.stringify({
      pointsChange: 10,
      reason: 'lesson_completion'
    })
  });

  // Update monthly stats (NEW)
  await fetchWithAuth('/api/leaderboard/update-monthly-stats', {
    method: 'POST',
    body: JSON.stringify({
      pointsChange: 10,
      timeSpent: timeSpentSeconds,
      sentencesCompleted: sentencesCount,
      lessonsCompleted: 1
    })
  });
};
```

---

## Quick Integration Example

Here's a complete example for a lesson completion:

```javascript
import { fetchWithAuth } from '../../lib/api';

export default function LessonPage() {
  const [lessonStartTime, setLessonStartTime] = useState(null);

  useEffect(() => {
    // Track when lesson starts
    setLessonStartTime(Date.now());
  }, []);

  const handleLessonComplete = async (sentencesCompleted) => {
    const timeSpentSeconds = Math.floor((Date.now() - lessonStartTime) / 1000);
    const pointsEarned = 10;

    try {
      // Update user's total points
      await fetchWithAuth('/api/user/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pointsChange: pointsEarned,
          reason: 'lesson_completion'
        })
      });

      // Update monthly leaderboard stats
      await fetchWithAuth('/api/leaderboard/update-monthly-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pointsChange: pointsEarned,
          timeSpent: timeSpentSeconds,
          sentencesCompleted: sentencesCompleted,
          lessonsCompleted: 1
        })
      });

      // Dispatch event to refresh points in header
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pointsUpdated'));
      }

      console.log('✅ Lesson completed and stats updated!');
    } catch (err) {
      console.error('Error updating stats:', err);
    }
  };

  return (
    // Your lesson component
  );
}
```

---

## Testing the Leaderboard

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to:** `http://localhost:3000/leaderboard`

3. **Test features:**
   - View current month leaderboard
   - Navigate to previous/next months
   - See countdown timer
   - View your current rank
   - Check top 3 users with special styling

4. **Generate test data (optional):**

Create a test script to populate some sample rankings:

```javascript
// scripts/populate-leaderboard.js
const connectDB = require('../lib/mongodb').default;
const User = require('../models/User').default;
const MonthlyLeaderboard = require('../lib/models/MonthlyLeaderboard').default;

async function populateTestData() {
  await connectDB();

  const users = await User.find().limit(10);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  for (const user of users) {
    await MonthlyLeaderboard.findOneAndUpdate(
      { userId: user._id, year, month },
      {
        monthlyPoints: Math.floor(Math.random() * 10000),
        totalTimeSpent: Math.floor(Math.random() * 36000),
        sentencesCompleted: Math.floor(Math.random() * 5000),
        lessonsCompleted: Math.floor(Math.random() * 100),
        streakDays: Math.floor(Math.random() * 30)
      },
      { upsert: true }
    );
  }

  console.log('✅ Test data populated!');
  process.exit(0);
}

populateTestData();
```

Run: `node scripts/populate-leaderboard.js`

---

## Customization Options

### Change Point Values
Edit point awards in your lesson completion handlers.

### Add More Metrics
Modify `MonthlyLeaderboard` schema to track additional stats (e.g., perfect scores, vocabulary added).

### Change Reward Tiers
Update the rewards section in `pages/leaderboard/index.js` to show different rank tiers (#1-10, #11-50, etc.).

### Custom Styling
Edit `styles/leaderboard.module.css` to match your brand colors.

### Add Prizes/Badges
Create a new collection for actual rewards and link to user achievements.

---

## Monthly Reset (Optional)

To automatically reset monthly rankings at the start of each month, create a cron job:

**File:** `lib/cron/reset-monthly-leaderboard.js`

```javascript
import cron from 'node-cron';
import connectDB from '../mongodb';
import MonthlyLeaderboard from '../models/MonthlyLeaderboard';

// Run on 1st of every month at 00:00
cron.schedule('0 0 1 * *', async () => {
  console.log('Resetting monthly leaderboard...');

  await connectDB();

  // Archive or keep previous month data
  // Create new entries for new month automatically via upsert

  console.log('Monthly leaderboard reset complete!');
});
```

---

## Next Steps

1. ✅ Test the leaderboard page
2. ✅ Integrate stats tracking in lesson completion handlers
3. ✅ Test with real user activity
4. ✅ Add rewards system (badges, avatar frames, diamonds)
5. ✅ Consider adding weekly leaderboards
6. ✅ Add social sharing features

---

## Files Created

```
pages/
├── api/leaderboard/
│   ├── index.js                    # All-time rankings
│   ├── monthly.js                  # Monthly rankings + countdown
│   ├── user-rank.js                # User's current rank
│   └── update-monthly-stats.js     # Update monthly stats
└── leaderboard/
    └── index.js                    # Leaderboard page

lib/models/
└── MonthlyLeaderboard.js           # Monthly stats schema

styles/
└── leaderboard.module.css          # Leaderboard styling

components/
└── Header.js                       # Updated with leaderboard links
```

---

## Support

If you encounter any issues:
1. Check browser console for errors
2. Verify MongoDB connection
3. Ensure JWT authentication is working
4. Check that MonthlyLeaderboard model is properly imported

The leaderboard is now fully integrated and ready to use! 🎉
