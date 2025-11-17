// Test script for streak reset functionality
// Run this after logging in and getting a token

const token = process.argv[2];

if (!token) {
  console.log('Usage: node test-streak-reset.js <your-auth-token>');
  console.log('\nTo get your token:');
  console.log('1. Login to the app');
  console.log('2. Open DevTools Console (F12)');
  console.log('3. Run: localStorage.getItem("token")');
  process.exit(1);
}

async function testStreakReset() {
  const baseUrl = 'http://localhost:3000';

  console.log('🧪 Testing Streak Reset Functionality...\n');

  // Test 1: Get current streak
  console.log('1️⃣ GET current streak:');
  try {
    const getRes = await fetch(`${baseUrl}/api/user/streak`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const getData = await getRes.json();
    console.log('   Current streak data:', JSON.stringify(getData, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test 2: Increment streak a few times
  console.log('\n2️⃣ Incrementing streak 3 times:');
  for (let i = 0; i < 3; i++) {
    try {
      const postRes = await fetch(`${baseUrl}/api/user/streak`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const postData = await postRes.json();
      console.log(`   Increment ${i + 1}:`, postData.currentStreak);
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }
  }

  // Test 3: Get streak after increments
  console.log('\n3️⃣ GET streak after increments:');
  try {
    const getRes = await fetch(`${baseUrl}/api/user/streak`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const getData = await getRes.json();
    console.log('   Streak data:', JSON.stringify(getData, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test 4: Reset streak
  console.log('\n4️⃣ Resetting streak to 0:');
  try {
    const resetRes = await fetch(`${baseUrl}/api/user/streak`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'reset' })
    });
    const resetData = await resetRes.json();
    console.log('   Reset response:', JSON.stringify(resetData, null, 2));

    if (resetData.currentStreak === 0) {
      console.log('   ✅ Streak successfully reset to 0');
    } else {
      console.log('   ❌ ERROR: Streak not reset! Current value:', resetData.currentStreak);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test 5: Verify streak is 0
  console.log('\n5️⃣ Verifying streak is 0:');
  try {
    const getRes = await fetch(`${baseUrl}/api/user/streak`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const getData = await getRes.json();
    console.log('   Final streak data:', JSON.stringify(getData, null, 2));

    if (getData.currentStreak === 0) {
      console.log('   ✅ Verified: Streak is 0');
    } else {
      console.log('   ❌ ERROR: Streak is not 0! Current value:', getData.currentStreak);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test 6: Test increment after reset
  console.log('\n6️⃣ Testing increment after reset:');
  try {
    const postRes = await fetch(`${baseUrl}/api/user/streak`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const postData = await postRes.json();
    console.log('   After reset increment:', JSON.stringify(postData, null, 2));

    if (postData.currentStreak === 1) {
      console.log('   ✅ Streak incremented correctly from 0 to 1');
    } else {
      console.log('   ❌ ERROR: Unexpected streak value:', postData.currentStreak);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

testStreakReset();
