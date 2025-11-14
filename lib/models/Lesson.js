import mongoose from 'mongoose';

const LessonSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true // Explicit index for faster lookups
  },
  title: {
    type: String,
    required: true
  },
  displayTitle: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  level: {
    type: String,
    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    default: 'A1',
    index: true // Index for filtering by level
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'experienced'],
    index: true // Index for difficulty filter
  },
  audio: {
    type: String,
    required: true
  },
  youtubeUrl: {
    type: String,
    required: false
  },
  thumbnail: {
    type: String,
    required: false // Optional thumbnail for audio files (YouTube will use video thumbnail)
  },
  json: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // Duration in seconds
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  source: {
    type: String, // e.g., 'youtube', 'upload'
    default: 'upload'
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // Index for sorting by date
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for common query patterns (level + createdAt)
LessonSchema.index({ level: 1, createdAt: -1 });
LessonSchema.index({ difficulty: 1, createdAt: -1 });

// Ensure toJSON includes id field
LessonSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Keep both _id and id fields
    return ret;
  }
});

export const Lesson = mongoose.models.Lesson || mongoose.model('Lesson', LessonSchema);
