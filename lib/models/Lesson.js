import mongoose from 'mongoose';

const LessonSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
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
  audio: {
    type: String,
    required: true
  },
  json: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure toJSON includes id field
LessonSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Keep both _id and id fields
    return ret;
  }
});

export const Lesson = mongoose.models.Lesson || mongoose.model('Lesson', LessonSchema);
