import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const VocabularyPopup = ({ word, context, lessonId, onClose, position, preTranslation = '' }) => {
  const { user } = useAuth();
  const [translation, setTranslation] = useState(preTranslation);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!preTranslation);
  const [autoTranslation, setAutoTranslation] = useState(preTranslation);
  const popupRef = useRef(null);

  // Fetch auto translation when popup opens (if not already provided)
  useEffect(() => {
    const fetchTranslation = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: word,
            context: context || '', // Pass context for better AI translation
            sourceLang: 'de',
            targetLang: user?.nativeLanguage || 'vi'
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.translation) {
            setAutoTranslation(data.translation);
            setTranslation(data.translation); // Pre-fill input
            
            // Log which method was used
            if (data.method) {
              console.log(`Translation method: ${data.method}`);
            }
          }
        }
      } catch (error) {
        console.error('Auto translation error:', error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we don't have a preTranslation
    if (word && !preTranslation) {
      fetchTranslation();
    }
  }, [word, context, preTranslation, user?.nativeLanguage]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Position popup fixed below header
  useEffect(() => {
    const positionPopup = () => {
      const popup = popupRef.current;
      if (!popup) return;

      const rect = popup.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      // Get actual header height
      const header = document.querySelector('.app-header');
      const headerHeight = header ? header.offsetHeight : 80;

      // Position popup right below header, centered horizontally
      const newTop = headerHeight + 10;
      const newLeft = Math.max(10, (viewportWidth - rect.width) / 2);

      popup.style.top = `${newTop}px`;
      popup.style.left = `${newLeft}px`;
    };

    // Position immediately when popup opens
    positionPopup();

    // Reposition on resize
    window.addEventListener('resize', positionPopup);

    return () => {
      window.removeEventListener('resize', positionPopup);
    };
  }, []); // Empty dependency array since position doesn't matter anymore

  const handleSave = async () => {
    if (!translation.trim()) {
      toast.error('Bitte geben Sie die Bedeutung des Wortes ein');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          word: word.toLowerCase(),
          translation: translation.trim(),
          context: context || '',
          lessonId: lessonId || ''
        })
      });

      if (!res.ok) throw new Error('Failed to save vocabulary');

       toast.success(`✓ Wort gespeichert: ${word}`);
      onClose();
    } catch (error) {
       toast.error('Fehler beim Speichern des Wortes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="vocabulary-popup-overlay" onClick={onClose} />
      <div
        ref={popupRef}
        className="vocabulary-popup"
        style={{
          top: position.top,
          left: position.left
        }}
      >
        <div className="vocabulary-popup-header">
           <h3>Wort speichern</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="vocabulary-popup-content">
          <div className="vocab-field">
             <label>Wort:</label>
            <div className="vocab-word">{word}</div>
          </div>

          {context && (
            <div className="vocab-field">
               <label>Kontext:</label>
              <div className="vocab-context">{context}</div>
            </div>
          )}

           <div className="vocab-field">
              <label>Bedeutung (Vietnamesisch):</label>
             {loading ? (
               <div className="translation-loading">
                 <span className="loading-spinner">⏳</span>
                  <span>Übersetze...</span>
               </div>
             ) : (
               <>
                 <input
                   type="text"
                   value={translation}
                   onChange={(e) => setTranslation(e.target.value)}
                    placeholder="Vietnamesische Bedeutung eingeben..."
                   autoFocus
                   onKeyPress={(e) => {
                     if (e.key === 'Enter') handleSave();
                   }}
                 />
                 {autoTranslation && (
                   <div className="translation-suggestions">
                     <div className="suggestions-label">💡 Vorschläge:</div>
                     <div className="suggestions-list">
                       {autoTranslation.split(',').map((meaning, index) => (
                         <button
                           key={index}
                           className="suggestion-item"
                           onClick={() => setTranslation(meaning.trim())}
                           title="Click để chọn nghĩa này"
                         >
                           {meaning.trim()}
                         </button>
                       ))}
                     </div>
                   </div>
                 )}
               </>
             )}
           </div>
        </div>

        <div className="vocabulary-popup-footer">
          <button className="btn-cancel" onClick={onClose}>
             Abbrechen
          </button>
          <button 
            className="btn-save" 
            onClick={handleSave}
            disabled={saving}
          >
             {saving ? 'Speichere...' : 'Speichern'}
          </button>
        </div>
      </div>
    </>
  );
};

export default VocabularyPopup;
