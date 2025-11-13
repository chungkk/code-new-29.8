# Vocabulary Popup Fix

## Issue
**Error**: `TypeError: onSave is not a function`

The `VocabularyPopup` component requires an `onSave` prop to save vocabulary to the database, but this prop was not being passed in the dictation and self-lesson pages.

## Root Cause
The `VocabularyPopup` component was being used in two pages without the required `onSave` callback:
1. `pages/dictation/[lessonId].js`
2. `pages/self-lesson/[lessonId].js`

## Solution

### 1. Added toast import for user feedback
Both pages now import `react-toastify` for success/error messages:
```javascript
import { toast } from 'react-toastify';
```

### 2. Created saveVocabulary function
Added a `saveVocabulary` callback function in both pages that:
- Gets authentication token from localStorage
- Extracts context from current sentence
- Makes POST request to `/api/vocabulary` endpoint
- Saves word, translation, context, and lessonId
- Shows success/error toast notifications

```javascript
const saveVocabulary = useCallback(async ({ word, translation, notes }) => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      toast.error('Bitte melden Sie sich an, um Vokabeln zu speichern');
      return;
    }

    const context = transcriptData[currentSentenceIndex]?.text || '';

    const response = await fetch('/api/vocabulary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        word,
        translation: translation || notes || '',
        context,
        lessonId
      })
    });

    if (response.ok) {
      toast.success('Vokabel erfolgreich gespeichert!');
    } else {
      const error = await response.json();
      toast.error(error.message || 'Fehler beim Speichern');
    }
  } catch (error) {
    console.error('Save vocabulary error:', error);
    toast.error('Ein Fehler ist aufgetreten');
  }
}, [lessonId, transcriptData, currentSentenceIndex]);
```

### 3. Passed onSave prop to VocabularyPopup
Updated both pages to pass the `saveVocabulary` function as the `onSave` prop:

**Dictation page:**
```javascript
<VocabularyPopup
  word={selectedWord}
  position={popupPosition}
  onClose={() => setShowVocabPopup(false)}
  onSave={saveVocabulary}  // ✅ Added
/>
```

**Self-lesson page:**
```javascript
<VocabularyPopup
  word={selectedWord}
  context={transcriptData[currentSentenceIndex]?.text || ''}
  lessonId={lessonId}
  onClose={() => setShowVocabPopup(false)}
  onSave={saveVocabulary}  // ✅ Added
  position={popupPosition}
  preTranslation=""
/>
```

## Files Modified
1. ✅ `pages/dictation/[lessonId].js` - Added toast import, saveVocabulary function, and onSave prop
2. ✅ `pages/self-lesson/[lessonId].js` - Added toast import, saveVocabulary function, and onSave prop

## API Integration
The solution integrates with the existing `/api/vocabulary` endpoint:
- **Method**: POST
- **Headers**: Authorization Bearer token
- **Body**: `{ word, translation, context, lessonId }`
- **Response**: Success message or error

## User Experience
When users click on a word and save it to vocabulary:
1. Word is saved to their personal vocabulary list
2. Context (current sentence) is stored for reference
3. Success toast notification appears
4. Popup closes automatically
5. Saved vocabulary can be reviewed in `/dashboard/vocabulary`

## Testing
- ✅ Build successful
- ✅ No TypeScript/JavaScript errors
- ✅ Both dictation and self-lesson pages fixed
- ✅ API integration working correctly

## Future Enhancements (Optional)
- Add optimistic UI updates (show saved state immediately)
- Add ability to edit saved vocabulary from popup
- Add duplicate detection (word already saved)
- Add offline support with local storage queue
