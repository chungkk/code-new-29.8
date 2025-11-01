// Multi-Provider Translation API with intelligent fallback chain
// Priority: DeepL (best for German) → Google Translate → OpenAI → Groq → MyMemory
// 
// Setup API Keys in .env.local:
// DEEPL_API_KEY=your_key           (Free: 500k chars/month - https://www.deepl.com/pro-api)
// GOOGLE_TRANSLATE_API_KEY=your_key (Free: $300 credit - https://cloud.google.com/translate)
// OPENAI_API_KEY=your_key          (Paid - https://platform.openai.com/)
// GROQ_API_KEY=your_key            (Free - https://console.groq.com/keys)

const DEEPL_API_KEY = process.env.DEEPL_API_KEY || '';
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const LANGUAGE_NAMES = {
  vi: 'Tiếng Việt',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese'
};

/**
 * Translate using DeepL (BEST for German, especially DE→VI)
 * Free tier: 500,000 characters/month
 */
async function translateWithDeepL(text, sourceLang, targetLang) {
  if (!DEEPL_API_KEY) {
    throw new Error('DEEPL_API_KEY not configured');
  }

  // DeepL uses 'EN' for English, 'DE' for German
  const sourceCode = sourceLang.toUpperCase();
  // DeepL doesn't have Vietnamese, so this will fail gracefully
  // But we keep the structure for when they add it
  const targetCode = targetLang === 'vi' ? 'EN' : targetLang.toUpperCase();

  const response = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      source_lang: sourceCode,
      target_lang: targetCode,
    }),
  });

  if (!response.ok) {
    throw new Error('DeepL API request failed');
  }

  const data = await response.json();
  return data.translations[0]?.text || null;
}

/**
 * Translate using Google Cloud Translation API
 * Best balance of quality and price
 */
async function translateWithGoogle(text, sourceLang, targetLang) {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error('GOOGLE_TRANSLATE_API_KEY not configured');
  }

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text',
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Google Translate API request failed');
  }

  const data = await response.json();
  return data.data?.translations?.[0]?.translatedText || null;
}

/**
 * Translate using OpenAI GPT-4 (high quality but expensive)
 */
async function translateWithOpenAI(text, context = '', targetLang = 'vi') {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const targetLanguageName = LANGUAGE_NAMES[targetLang] || 'the target language';

  const prompt = context
    ? `Translate from German to ${targetLanguageName}. This word appears in context: "${context}"

Word: ${text}

Return 2-3 common meanings in ${targetLanguageName}, separated by commas. Example: "house, home, building". No explanations.`
    : `Translate from German to ${targetLanguageName}: ${text}

Return 2-3 common meanings in ${targetLanguageName}, separated by commas. Example: "house, home, building". No explanations.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Cheaper than gpt-4
      messages: [
        {
          role: 'system',
          content: 'Bạn là một chuyên gia dịch thuật Đức-Việt chuyên nghiệp. Cung cấp bản dịch chính xác và tự nhiên.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 60,
    }),
  });

  if (!response.ok) {
    throw new Error('OpenAI API request failed');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim();
}

/**
 * Translate using Groq AI (improved prompt for better German-Vietnamese)
 */
async function translateWithGroq(text, context = '', targetLang = 'vi') {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const targetLanguageName = LANGUAGE_NAMES[targetLang] || 'the target language';

  const prompt = context
    ? `Translate from German to ${targetLanguageName}. This word appears in context: "${context}"

Word to translate: ${text}

ONLY return the meaning in ${targetLanguageName}, NO explanations, NO additional text. If it's a noun, DO NOT add articles (der/die/das). Translation must be concise, natural and accurate.`
    : `Translate from German to ${targetLanguageName}: ${text}

ONLY return the meaning in ${targetLanguageName}, NO explanations, NO additional text. If it's a noun, DO NOT add articles (der/die/das). Translation must be concise, natural and accurate.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', // More powerful model for better translation
      messages: [
        {
          role: 'system',
          content: `You are an expert German-${targetLanguageName} translator with 20 years of experience. You always provide accurate, natural translations that fit the context. ONLY return the ${targetLanguageName} translation, NO explanations or additional text.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2, // Lower for more consistent translations
      max_tokens: 60,
    }),
  });

  if (!response.ok) {
    throw new Error('Groq API request failed');
  }

  const data = await response.json();
  const translation = data.choices[0]?.message?.content?.trim();
  
  return translation;
}

/**
 * Translate using MyMemory (fallback)
 */
async function translateWithMyMemory(text, sourceLang, targetLang) {
  const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error('MyMemory API request failed');
  }

  const data = await response.json();

  if (data.responseStatus === 200 && data.responseData) {
    return data.responseData.translatedText;
  }
  
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { text, context = '', sourceLang = 'de', targetLang = 'vi' } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    const cleanText = text.trim().toLowerCase();
    let translation = '';
    let method = '';

    // PRIORITY 1: OpenAI GPT-4 mini (High quality, context-aware)
    if (OPENAI_API_KEY) {
      try {
        translation = await translateWithOpenAI(cleanText, context, targetLang);
        method = 'openai-gpt4';

        if (translation && translation !== cleanText) {
          console.log(`✅ OpenAI: ${cleanText} → ${translation}`);
          return res.status(200).json({
            success: true,
            originalText: cleanText,
            translation: translation,
            method,
            sourceLang,
            targetLang
          });
        }
      } catch (error) {
        console.log('⚠️ OpenAI failed, trying next...', error.message);
      }
    }

    // PRIORITY 2: Google Translate (Best for Vietnamese)
    if (GOOGLE_TRANSLATE_API_KEY) {
      try {
        translation = await translateWithGoogle(cleanText, sourceLang, targetLang);
        method = 'google-translate';

        if (translation && translation !== cleanText) {
          console.log(`✅ Google Translate: ${cleanText} → ${translation}`);
          return res.status(200).json({
            success: true,
            originalText: cleanText,
            translation: translation,
            method,
            sourceLang,
            targetLang
          });
        }
      } catch (error) {
        console.log('⚠️ Google Translate failed, trying next...', error.message);
      }
    }

    // PRIORITY 3: DeepL (Best for German, but no Vietnamese support yet)
    // Skip for now since DeepL doesn't support Vietnamese
    // Uncomment when DeepL adds Vietnamese
    /*
    if (DEEPL_API_KEY && targetLang !== 'vi') {
      try {
        translation = await translateWithDeepL(cleanText, sourceLang, targetLang);
        method = 'deepl';

        if (translation && translation !== cleanText) {
          console.log(`✅ DeepL: ${cleanText} → ${translation}`);
          return res.status(200).json({
            success: true,
            originalText: cleanText,
            translation: translation,
            method,
            sourceLang,
            targetLang
          });
        }
      } catch (error) {
        console.log('⚠️ DeepL failed, trying next...', error.message);
      }
    }
    */

    // PRIORITY 4: Groq AI with improved prompt (Free but less accurate)
    if (GROQ_API_KEY) {
      try {
        translation = await translateWithGroq(cleanText, context, targetLang);
        method = 'groq-llama';
        
        if (translation && translation !== cleanText) {
          console.log(`✅ Groq AI: ${cleanText} → ${translation}`);
          return res.status(200).json({
            success: true,
            originalText: cleanText,
            translation: translation,
            method,
            sourceLang,
            targetLang
          });
        }
      } catch (error) {
        console.log('⚠️ Groq failed, trying MyMemory...', error.message);
      }
    }

    // PRIORITY 5: MyMemory (Last resort, free but low quality)
    try {
      translation = await translateWithMyMemory(cleanText, sourceLang, targetLang);
      method = 'mymemory';
      
      if (translation && translation !== cleanText) {
        console.log(`⚠️ MyMemory (low quality): ${cleanText} → ${translation}`);
        return res.status(200).json({
          success: true,
          originalText: cleanText,
          translation: translation,
          method,
          sourceLang,
          targetLang,
          warning: 'Using fallback translation service - quality may be lower'
        });
      }
    } catch (error) {
      console.error('❌ MyMemory failed:', error.message);
    }

    // No translation found
    console.error(`❌ All translation services failed for: ${cleanText}`);
    return res.status(200).json({
      success: true,
      originalText: cleanText,
      translation: cleanText, // Return original if all fail
      method: 'none',
      sourceLang,
      targetLang,
      warning: 'No translation service available. Please add API keys to .env.local'
    });

  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Translation failed',
      error: error.message 
    });
  }
}
