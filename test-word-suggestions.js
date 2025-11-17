// Test script for word suggestions API
// This tests that no duplicate words are returned

const testWords = [
  'Haus',
  'Baum',
  'Schule',
  'Computer',
  'Freund',
  'Stadt',
  'Land',
  'Buch'
];

async function testWordSuggestions(word) {
  try {
    const response = await fetch('http://localhost:3000/api/generate-word-suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        correctWord: word,
        context: 'Test context for ' + word
      })
    });

    const data = await response.json();

    if (!data.success) {
      console.log(`❌ Failed for "${word}": ${data.message}`);
      return false;
    }

    const options = data.options;

    // Check for duplicates (case-insensitive)
    const seen = new Set();
    const duplicates = [];

    for (const option of options) {
      const normalized = option.toLowerCase().trim();
      if (seen.has(normalized)) {
        duplicates.push(option);
      }
      seen.add(normalized);
    }

    if (duplicates.length > 0) {
      console.log(`❌ DUPLICATE FOUND for "${word}": ${JSON.stringify(options)}`);
      console.log(`   Duplicates: ${duplicates.join(', ')}`);
      return false;
    }

    // Check that we have exactly 3 options
    if (options.length !== 3) {
      console.log(`⚠️  Wrong count for "${word}": got ${options.length} options instead of 3`);
      console.log(`   Options: ${JSON.stringify(options)}`);
      return false;
    }

    // Check that correct word is in the options
    if (!options.some(opt => opt.toLowerCase() === word.toLowerCase())) {
      console.log(`❌ Correct word "${word}" not in options: ${JSON.stringify(options)}`);
      return false;
    }

    console.log(`✅ "${word}": ${JSON.stringify(options)} (method: ${data.method})`);
    return true;

  } catch (error) {
    console.log(`❌ Error testing "${word}":`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Testing word suggestion API for duplicates...\n');

  let passed = 0;
  let failed = 0;

  for (const word of testWords) {
    const result = await testWordSuggestions(word);
    if (result) {
      passed++;
    } else {
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / testWords.length) * 100).toFixed(1)}%`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
