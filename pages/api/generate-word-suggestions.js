// API endpoint to generate word suggestions using AI
// Creates 2 distractor words similar to the correct word for multiple choice

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

/**
 * Generate word suggestions using OpenAI
 */
async function generateWithOpenAI(correctWord, context = '') {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const prompt = context
    ? `Create 2 German distractor words for a dictation exercise. The correct word is "${correctWord}".
Context: "${context}"

Requirements:
1. Distractors must be real German words
2. Similar in length to "${correctWord}" (±1-2 letters)
3. Similar difficulty level
4. Make sense in the context if possible
5. NOT the correct word or obvious derivatives

Return ONLY 2 words separated by comma, no explanations.
Example format: "Wort1, Wort2"`
    : `Create 2 German distractor words for a dictation exercise. The correct word is "${correctWord}".

Requirements:
1. Distractors must be real German words
2. Similar in length to "${correctWord}" (±1-2 letters)
3. Similar difficulty level
4. Could be confused with the correct word (similar sound/spelling)
5. NOT the correct word or obvious derivatives

Return ONLY 2 words separated by comma, no explanations.
Example format: "Wort1, Wort2"`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a German language teacher creating multiple choice exercises. Generate realistic distractor words that are challenging but fair.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8, // Higher for more variety
      max_tokens: 50,
    }),
  });

  if (!response.ok) {
    throw new Error('OpenAI API request failed');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content?.trim();
  
  if (!content) {
    throw new Error('No content from OpenAI');
  }

  // Parse the response
  const words = content.split(',').map(w => w.trim()).filter(w => w && w.length > 0);
  
  if (words.length < 2) {
    throw new Error('Not enough words generated');
  }

  return words.slice(0, 2);
}

/**
 * Generate word suggestions using Groq
 */
async function generateWithGroq(correctWord, context = '') {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const prompt = context
    ? `Create 2 German distractor words for a dictation exercise. The correct word is "${correctWord}".
Context: "${context}"

Requirements:
1. Distractors must be real German words
2. Similar in length to "${correctWord}" (±1-2 letters)
3. Similar difficulty level
4. Make sense in the context if possible
5. NOT the correct word or obvious derivatives

Return ONLY 2 words separated by comma, no explanations.
Example format: "Wort1, Wort2"`
    : `Create 2 German distractor words for a dictation exercise. The correct word is "${correctWord}".

Requirements:
1. Distractors must be real German words
2. Similar in length to "${correctWord}" (±1-2 letters)
3. Similar difficulty level
4. Could be confused with the correct word (similar sound/spelling)
5. NOT the correct word or obvious derivatives

Return ONLY 2 words separated by comma, no explanations.
Example format: "Wort1, Wort2"`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a German language teacher creating multiple choice exercises. Generate realistic distractor words that are challenging but fair.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 50,
    }),
  });

  if (!response.ok) {
    throw new Error('Groq API request failed');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content?.trim();
  
  if (!content) {
    throw new Error('No content from Groq');
  }

  // Parse the response
  const words = content.split(',').map(w => w.trim()).filter(w => w && w.length > 0);
  
  if (words.length < 2) {
    throw new Error('Not enough words generated');
  }

  return words.slice(0, 2);
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Remove duplicate words (case-insensitive) and ensure uniqueness
 */
function deduplicateWords(words) {
  const seen = new Set();
  return words.filter(word => {
    const normalized = word.toLowerCase().trim();
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

/**
 * Generate simple fallback distractors that are different from the correct word
 */
function generateFallbackDistractors(correctWord) {
  const distractors = [];

  // Method 1: Change ending
  if (correctWord.length > 2) {
    const variant1 = correctWord.slice(0, -1) + (correctWord[correctWord.length - 1] === 'e' ? 'en' : 'e');
    if (variant1.toLowerCase() !== correctWord.toLowerCase()) {
      distractors.push(variant1);
    }
  }

  // Method 2: Change last 2 letters
  if (correctWord.length > 3) {
    const variant2 = correctWord.slice(0, -2) + correctWord.slice(-2).split('').reverse().join('');
    if (variant2.toLowerCase() !== correctWord.toLowerCase()) {
      distractors.push(variant2);
    }
  }

  // Method 3: Add/remove letter
  if (distractors.length < 2 && correctWord.length > 2) {
    const variant3 = correctWord + 'n';
    if (variant3.toLowerCase() !== correctWord.toLowerCase()) {
      distractors.push(variant3);
    }
  }

  // Method 4: Duplicate a vowel
  if (distractors.length < 2) {
    const vowelIndex = correctWord.search(/[aeiouäöü]/i);
    if (vowelIndex !== -1) {
      const variant4 = correctWord.slice(0, vowelIndex + 1) + correctWord[vowelIndex] + correctWord.slice(vowelIndex + 1);
      if (variant4.toLowerCase() !== correctWord.toLowerCase()) {
        distractors.push(variant4);
      }
    }
  }

  return distractors;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { correctWord, context = '' } = req.body;

    if (!correctWord) {
      return res.status(400).json({ message: 'correctWord is required' });
    }

    console.log(`Generating suggestions for: ${correctWord}`);

    let distractors = [];
    let method = 'none';

    // Try OpenAI first, then Groq
    try {
      if (OPENAI_API_KEY) {
        distractors = await generateWithOpenAI(correctWord, context);
        method = 'openai';
      } else if (GROQ_API_KEY) {
        distractors = await generateWithGroq(correctWord, context);
        method = 'groq';
      } else {
        throw new Error('No AI service configured');
      }
    } catch (error) {
      console.error(`AI generation failed: ${error.message}`);

      // Fallback to simple rule-based distractors
      distractors = generateFallbackDistractors(correctWord);
      method = 'fallback';
    }

    // Create options array with correct word and distractors
    let options = [correctWord, ...distractors];
    const originalLength = options.length;

    // CRITICAL: Remove duplicates (case-insensitive)
    options = deduplicateWords(options);

    if (originalLength !== options.length) {
      console.log(`⚠️ Removed ${originalLength - options.length} duplicate(s) from suggestions`);
    }

    // Ensure we have at least 3 unique options
    // If AI/fallback didn't generate enough unique words, add more fallback options
    if (options.length < 3) {
      const additionalDistractors = generateFallbackDistractors(correctWord);
      options = deduplicateWords([...options, ...additionalDistractors]);

      // If still not enough, add simple variations
      let attempts = 0;
      while (options.length < 3 && attempts < 5) {
        const randomSuffix = ['er', 'en', 'es', 't', 'st'][attempts];
        const variant = correctWord + randomSuffix;
        options = deduplicateWords([...options, variant]);
        attempts++;
      }
    }

    // Take only first 3 unique options
    options = options.slice(0, 3);

    // Shuffle to randomize position
    const shuffledOptions = shuffleArray(options);

    console.log(`✅ Generated suggestions (${method}):`, shuffledOptions);

    return res.status(200).json({
      success: true,
      correctWord,
      options: shuffledOptions,
      method
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to generate suggestions',
      error: error.message 
    });
  }
}
