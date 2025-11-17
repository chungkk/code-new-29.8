// Test script for streak API
// Run this after logging in and getting a token

const token = process.argv[2];

if (!token) {
  console.log('Usage: node test-streak-api.js <your-auth-token>');
  console.log('\nTo get your token:');
  console.log('1. Login to the app');
  console.log('2. Open DevTools Console (F12)');
  console.log('3. Run: localStorage.getItem("token")');
  process.exit(1);
}

async function testStreak() {
  const baseUrl = 'http://localhost:3000';

  console.log('🔍 Testing Streak API...\n');

  // Test GET request
  console.log('1️⃣ GET current streak:');
  try {
    const getRes = await fetch(`${baseUrl}/api/user/streak`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const getData = await getRes.json();
    console.log('   Response:', JSON.stringify(getData, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n2️⃣ POST to increment streak:');
  try {
    const postRes = await fetch(`${baseUrl}/api/user/streak`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const postData = await postRes.json();
    console.log('   Response:', JSON.stringify(postData, null, 2));

    if (postData.alreadyLoggedToday) {
      console.log('   ⚠️  Already logged today - streak not incremented');
    } else if (postData.success) {
      console.log('   ✅ Streak incremented successfully!');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n3️⃣ GET updated streak:');
  try {
    const getRes2 = await fetch(`${baseUrl}/api/user/streak`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const getData2 = await getRes2.json();
    console.log('   Response:', JSON.stringify(getData2, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

testStreak();
