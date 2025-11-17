const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const LANGUAGE_NAMES = {
  vi: 'tiếng Việt',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  ja: '日本語',
  ko: '한국어',
  zh: '中文'
};

async function getDictionaryDataWithAI(word, translation, targetLang = 'vi') {
  const apiKey = OPENAI_API_KEY || GROQ_API_KEY;
  const isOpenAI = !!OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('No AI API key available');
  }

  const targetLanguageName = LANGUAGE_NAMES[targetLang] || targetLang;

  const prompt = `Du bist ein Experte für deutsche Linguistik. Analysiere das deutsche Wort "${word}" und gib ein JSON zurück (KEIN Markdown, nur reines JSON):

{
  "partOfSpeech": "Wortart auf Deutsch (Nomen/Verb/Adjektiv/Adverb/Präposition...)",
  "wordType": "Detaillierte Erklärung der Wortart auf ${targetLanguageName}",
  "explanation": "Detaillierte grammatikalische Erklärung auf ${targetLanguageName}: Rolle, Verwendung, Kontext. Maximal 2-3 Sätze.",
  "examples": [
    {
      "de": "Natürlicher deutscher Beispielsatz mit dem Wort '${word}'",
      "translation": "Übersetzung des Beispiels auf ${targetLanguageName}"
    },
    {
      "de": "Zweiter Beispielsatz mit anderem Kontext",
      "translation": "Übersetzung auf ${targetLanguageName}"
    }
  ]
}

Anforderungen:
- Erklärung muss präzise, kurz und verständlich sein (auf ${targetLanguageName})
- Beispiele müssen natürlich und realistisch sein, nicht zu lang (10-15 Wörter)
- Bei Nomen das Genus (der/die/das) erwähnen
- Fokus auf praktische Verwendung in der Kommunikation`;

  const apiUrl = isOpenAI 
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions';

  const model = isOpenAI ? 'gpt-4o-mini' : 'llama-3.3-70b-versatile';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: `Du bist ein deutscher Linguistikexperte mit 20 Jahren Erfahrung im Deutschunterricht. Du gibst immer reines JSON zurück, ohne Markdown. Alle Erklärungen und Übersetzungen müssen in ${LANGUAGE_NAMES[targetLang] || targetLang} sein.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  let content = data.choices[0]?.message?.content?.trim();
  
  // Remove markdown code blocks if present
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  return JSON.parse(content);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { word, sourceLang, targetLang } = req.body;

  if (!word) {
    return res.status(400).json({ success: false, message: 'Word is required' });
  }

  try {
    // Step 1: Get translation
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    const response = await fetch(`${baseUrl}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: word,
        context: '',
        sourceLang: sourceLang || 'de',
        targetLang: targetLang || 'vi'
      })
    });

    const translateData = await response.json();
    const translation = translateData.translation || word;

    // Step 2: Get AI-generated dictionary data
    let aiData;
    try {
      aiData = await getDictionaryDataWithAI(word, translation, targetLang || 'vi');
    } catch (aiError) {
      console.error('AI generation failed, using fallback:', aiError);
      // Fallback to basic data
      const langName = LANGUAGE_NAMES[targetLang || 'vi'];
      aiData = {
        partOfSpeech: '(Wort)',
        wordType: `Deutsches Wort`,
        explanation: `Das Wort "${word}" bedeutet "${translation}" auf ${langName}.`,
        examples: [
          {
            de: `Das ist ein Beispiel mit ${word}.`,
            translation: translation
          }
        ]
      };
    }

    const dictionaryData = {
      word: word,
      translation: translation,
      explanation: aiData.explanation,
      examples: aiData.examples,
      partOfSpeech: aiData.partOfSpeech,
      wordType: aiData.wordType
    };

    return res.status(200).json({
      success: true,
      data: dictionaryData
    });

  } catch (error) {
    console.error('Dictionary API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dictionary data',
      error: error.message
    });
  }
}
