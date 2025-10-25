import clientPromise from '../mongodb';
import { ObjectId } from 'mongodb';

export class Lesson {
  static async create(lessonData) {
    const client = await clientPromise;
    const db = client.db();
    
    const result = await db.collection('lessons').insertOne({
      ...lessonData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return { _id: result.insertedId, ...lessonData };
  }

  static async findAll() {
    const client = await clientPromise;
    const db = client.db();
    return await db.collection('lessons').find({}).sort({ order: 1 }).toArray();
  }

  static async findById(id) {
    const client = await clientPromise;
    const db = client.db();
    return await db.collection('lessons').findOne({ _id: new ObjectId(id) });
  }

  static async update(id, updateData) {
    const client = await clientPromise;
    const db = client.db();
    
    const result = await db.collection('lessons').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );

    return result;
  }

  static async delete(id) {
    const client = await clientPromise;
    const db = client.db();
    return await db.collection('lessons').deleteOne({ _id: new ObjectId(id) });
  }
}
