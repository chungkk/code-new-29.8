/**
 * Script to create database indexes for better performance
 * Run this script once after deploying the updated Lesson model
 * 
 * Usage: node scripts/create-indexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

async function createIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('lessons');

    console.log('\n📊 Creating indexes...');

    // Create individual indexes
    await collection.createIndex({ id: 1 }, { unique: true });
    console.log('✅ Index created: id (unique)');

    await collection.createIndex({ level: 1 });
    console.log('✅ Index created: level');

    await collection.createIndex({ difficulty: 1 });
    console.log('✅ Index created: difficulty');

    await collection.createIndex({ createdAt: -1 });
    console.log('✅ Index created: createdAt (descending)');

    // Create compound indexes for common query patterns
    await collection.createIndex({ level: 1, createdAt: -1 });
    console.log('✅ Compound index created: level + createdAt');

    await collection.createIndex({ difficulty: 1, createdAt: -1 });
    console.log('✅ Compound index created: difficulty + createdAt');

    console.log('\n📋 Listing all indexes:');
    const indexes = await collection.indexes();
    indexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}:`, JSON.stringify(index.key));
    });

    console.log('\n✨ All indexes created successfully!');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
    process.exit(0);
  }
}

createIndexes();
