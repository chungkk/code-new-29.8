import clientPromise from '../mongodb';
import bcrypt from 'bcryptjs';

export class User {
  static async create({ email, password, name, role = 'user' }) {
    const client = await clientPromise;
    const db = client.db();
    
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      throw new Error('Email đã được sử dụng');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.collection('users').insertOne({
      email,
      password: hashedPassword,
      name,
      role,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return { _id: result.insertedId, email, name, role };
  }

  static async findByEmail(email) {
    const client = await clientPromise;
    const db = client.db();
    return await db.collection('users').findOne({ email });
  }

  static async findById(id) {
    const client = await clientPromise;
    const db = client.db();
    const { ObjectId } = require('mongodb');
    return await db.collection('users').findOne({ _id: new ObjectId(id) });
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}
