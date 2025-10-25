import clientPromise from '../mongodb';
import { ObjectId } from 'mongodb';

export class UserProgress {
  static async saveProgress({ userId, lessonId, mode, progress }) {
    const client = await clientPromise;
    const db = client.db();
    
    // Calculate completion percentage
    let completionPercent = 0;
    if (progress.totalWords && progress.correctWords !== undefined) {
      // For dictation mode - based on correct words
      completionPercent = Math.round((progress.correctWords / progress.totalWords) * 100);
    } else if (progress.currentSentenceIndex && progress.totalSentences) {
      // For shadowing mode - based on sentence progress
      completionPercent = Math.round((progress.currentSentenceIndex / progress.totalSentences) * 100);
    }
    
    const result = await db.collection('progress').updateOne(
      { userId: new ObjectId(userId), lessonId, mode },
      {
        $set: {
          progress,
          completionPercent,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    return result;
  }

  static async getProgress(userId, lessonId, mode) {
    const client = await clientPromise;
    const db = client.db();
    
    return await db.collection('progress').findOne({
      userId: new ObjectId(userId),
      lessonId,
      mode
    });
  }

  static async getAllProgress(userId) {
    const client = await clientPromise;
    const db = client.db();
    
    return await db.collection('progress').find({
      userId: new ObjectId(userId)
    }).toArray();
  }
}
