import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

const VocabularyPopup = ({ word, context, lessonId, onClose, position, preTranslation = '' }) => {
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
            targetLang: 'vi'
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
  }, [word, context, preTranslation]);

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

      // Approximate header height (adjust if needed)
      const headerHeight = 70;

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
      toast.error('Vui lòng nhập nghĩa từ');
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

      toast.success(`✓ Đã lưu từ: ${word}`);
      onClose();
    } catch (error) {
      toast.error('Lỗi khi lưu từ vựng');
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
          <h3>Lưu từ vựng</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="vocabulary-popup-content">
          <div className="vocab-field">
            <label>Từ:</label>
            <div className="vocab-word">{word}</div>
          </div>

          {context && (
            <div className="vocab-field">
              <label>Ngữ cảnh:</label>
              <div className="vocab-context">{context}</div>
            </div>
          )}

          <div className="vocab-field">
            <label>Nghĩa (Tiếng Việt):</label>
            {loading ? (
              <div className="translation-loading">
                <span className="loading-spinner">⏳</span>
                <span>Đang dịch...</span>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  placeholder="Nhập nghĩa tiếng Việt..."
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSave();
                  }}
                />
                {autoTranslation && (
                  <div className="auto-translation-hint">
                    💡 Gợi ý: {autoTranslation}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="vocabulary-popup-footer">
          <button className="btn-cancel" onClick={onClose}>
            Hủy
          </button>
          <button 
            className="btn-save" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </>
  );
};

export default VocabularyPopup;
