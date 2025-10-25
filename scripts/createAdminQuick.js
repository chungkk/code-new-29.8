const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  const uri = process.env.MONGODB_URI || 'mongodb://atlas-sql-68fb66582f642059a2788ee9-wi7ou6.a.query.mongodb.net/Cluster0?ssl=true&authSource=admin';
  const client = new MongoClient(uri);

  try {
    console.log('🔗 Đang kết nối đến MongoDB...');
    await client.connect();
    console.log('✅ Kết nối thành công!\n');

    const db = client.db();
    
    const name = 'Admin';
    const email = 'admin@test.com';
    const password = 'admin123';

    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      console.log('❌ Admin đã tồn tại. Email:', email);
      console.log('✅ Bạn có thể đăng nhập với:');
      console.log('   Email:', email);
      console.log('   Password: admin123');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.collection('users').insertOne({
      email,
      password: hashedPassword,
      name,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Tạo tài khoản admin thành công!');
    console.log('📧 Email:', email);
    console.log('👤 Tên:', name);
    console.log('🔑 Password: admin123');
    console.log('🔑 ID:', result.insertedId.toString());
    console.log('\n🎉 Đăng nhập tại: http://localhost:3000/auth/login');
    
  } catch (error) {
    console.error('\n❌ Lỗi:', error.message);
  } finally {
    await client.close();
  }
}

createAdminUser();
