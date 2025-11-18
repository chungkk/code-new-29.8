// Helper functions for managing user points and streaks
import { createStreakNotification, createPointsMilestoneNotification } from './notifications';

/**
 * Check if we need to reset monthly stats
 * @param {Date} lastReset - Last monthly reset date
 * @returns {boolean} - True if we need to reset
 */
export function shouldResetMonthlyStats(lastReset) {
  if (!lastReset) return true;

  const now = new Date();
  const lastResetDate = new Date(lastReset);

  // Check if we're in a different month
  return (
    now.getMonth() !== lastResetDate.getMonth() ||
    now.getFullYear() !== lastResetDate.getFullYear()
  );
}

/**
 * Update user points and streak
 * @param {Object} user - User document
 * @param {Object} activity - Activity data
 * @param {number} activity.points - Points earned from this activity
 * @param {boolean} activity.completedToday - Whether user completed activity today
 * @returns {Object} - Updated user data
 */
export async function updateUserPointsAndStreak(user, activity) {
  const now = new Date();

  // Reset monthly stats if needed
  if (shouldResetMonthlyStats(user.lastMonthlyReset)) {
    user.monthlyPoints = 0;
    user.streak.maxStreakThisMonth = 0;
    user.lastMonthlyReset = now;
  }

  // Update points
  const oldPoints = user.points || 0;
  if (activity.points) {
    user.points = Math.max(0, oldPoints + activity.points);
    user.monthlyPoints = Math.max(0, (user.monthlyPoints || 0) + activity.points);

    // Create notification for points milestones
    const newPoints = user.points;
    if (oldPoints < 100 && newPoints >= 100) {
      // User just reached 100 points
      createPointsMilestoneNotification(user._id.toString(), 100);
    } else {
      // Check for other milestones (500, 1000, etc.)
      createPointsMilestoneNotification(user._id.toString(), newPoints);
    }
  }

  // Update streak based on correct/incorrect sentences
  if (activity.completedToday !== undefined) {
    if (activity.completedToday) {
      // Correct answer - increment streak
      const oldStreak = user.streak.currentStreak || 0;
      user.streak.currentStreak = oldStreak + 1;
      user.streak.lastActivityDate = now;

      // Update max streaks
      const currentStreak = user.streak.currentStreak;

      if (currentStreak > (user.streak.maxStreak || 0)) {
        user.streak.maxStreak = currentStreak;
      }

      if (currentStreak > (user.streak.maxStreakThisMonth || 0)) {
        user.streak.maxStreakThisMonth = currentStreak;
      }

      // Create notification for streak milestones
      createStreakNotification(user._id.toString(), currentStreak);
    } else {
      // Incorrect answer - reset streak to 0
      user.streak.currentStreak = 0;
      user.streak.lastActivityDate = now;
    }
  }

  return user;
}

/**
 * Calculate points based on activity
 * @param {Object} activityData - Activity data
 * @param {number} activityData.sentencesCompleted - Number of sentences completed
 * @param {number} activityData.lessonsCompleted - Number of lessons completed
 * @param {number} activityData.timeSpent - Time spent in seconds
 * @returns {number} - Points earned
 */
export function calculatePoints(activityData) {
  const { sentencesCompleted = 0, lessonsCompleted = 0, timeSpent = 0 } = activityData;

  // Points formula: sentences * 2 + lessons * 50 + time bonus
  let points = (sentencesCompleted * 2) + (lessonsCompleted * 50);

  // Time bonus: 1 point per 10 minutes studied
  const timeBonus = Math.floor(timeSpent / 600);
  points += timeBonus;

  return Math.max(0, points);
}

/**
 * Get user's current month stats
 * @param {Object} user - User document
 * @returns {Object} - Current month stats
 */
export function getCurrentMonthStats(user) {
  // Check if we need to reset
  if (shouldResetMonthlyStats(user.lastMonthlyReset)) {
    return {
      monthlyPoints: 0,
      maxStreakThisMonth: 0
    };
  }

  return {
    monthlyPoints: user.monthlyPoints || 0,
    maxStreakThisMonth: user.streak?.maxStreakThisMonth || 0
  };
}
