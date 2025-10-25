import mongoose from 'mongoose';

const VocabularySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  word: {
    type: String,
    required: true,
    lowercase: true
  },
  translation: {
    type: String,
    required: true
  },
  context: {
    type: String
  },
  lessonId: {
    type: String,
    required: true
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  lastReviewed: {
    type: Date
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

// Ensure unique word per user
VocabularySchema.index({ userId: 1, word: 1 }, { unique: true });

export const Vocabulary = mongoose.models.Vocabulary || mongoose.model('Vocabulary', VocabularySchema);
