import clientPromise from '../mongodb';
import { ObjectId } from 'mongodb';

export class Vocabulary {
  static async add({ userId, word, translation, context, lessonId }) {
    const client = await clientPromise;
    const db = client.db();
    
    // Check if word already exists for this user
    const existing = await db.collection('vocabulary').findOne({
      userId: new ObjectId(userId),
      word: word.toLowerCase()
    });

    if (existing) {
      // Update existing word
      return await db.collection('vocabulary').updateOne(
        { _id: existing._id },
        {
          $set: {
            translation,
            context,
            lessonId,
            updatedAt: new Date()
          }
        }
      );
    }

    // Add new word
    const result = await db.collection('vocabulary').insertOne({
      userId: new ObjectId(userId),
      word: word.toLowerCase(),
      translation,
      context,
      lessonId,
      reviewCount: 0,
      lastReviewed: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return result;
  }

  static async getAll(userId) {
    const client = await clientPromise;
    const db = client.db();
    
    return await db.collection('vocabulary')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();
  }

  static async getByLesson(userId, lessonId) {
    const client = await clientPromise;
    const db = client.db();
    
    return await db.collection('vocabulary')
      .find({ 
        userId: new ObjectId(userId),
        lessonId 
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  static async delete(id, userId) {
    const client = await clientPromise;
    const db = client.db();
    
    return await db.collection('vocabulary').deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId)
    });
  }

  static async updateReview(id, userId) {
    const client = await clientPromise;
    const db = client.db();
    
    return await db.collection('vocabulary').updateOne(
      {
        _id: new ObjectId(id),
        userId: new ObjectId(userId)
      },
      {
        $inc: { reviewCount: 1 },
        $set: { lastReviewed: new Date() }
      }
    );
  }
}
