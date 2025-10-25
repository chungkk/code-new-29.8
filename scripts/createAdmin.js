const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdminUser() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/deutsch-shadowing';
  const client = new MongoClient(uri);

  try {
    console.log('🔗 Đang kết nối đến MongoDB...');
    await client.connect();
    console.log('✅ Kết nối thành công!\n');

    const db = client.db();
    
    console.log('📝 Tạo tài khoản Admin mới\n');
    
    const name = await question('Nhập tên admin: ');
    const email = await question('Nhập email admin: ');
    const password = await question('Nhập mật khẩu (tối thiểu 6 ký tự): ');

    if (!name || !email || !password) {
      console.log('\n❌ Vui lòng điền đầy đủ thông tin!');
      rl.close();
      return;
    }

    if (password.length < 6) {
      console.log('\n❌ Mật khẩu phải có ít nhất 6 ký tự!');
      rl.close();
      return;
    }

    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      console.log('\n❌ Email này đã tồn tại trong hệ thống!');
      rl.close();
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

    console.log('\n✅ Tạo tài khoản admin thành công!');
    console.log('📧 Email:', email);
    console.log('👤 Tên:', name);
    console.log('🔑 ID:', result.insertedId.toString());
    console.log('\n🎉 Bạn có thể đăng nhập với email và mật khẩu vừa tạo!');
    
  } catch (error) {
    console.error('\n❌ Lỗi:', error.message);
  } finally {
    await client.close();
    rl.close();
  }
}

createAdminUser();
