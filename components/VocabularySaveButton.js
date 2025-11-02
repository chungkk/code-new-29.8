import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../lib/api';
import { toast } from 'react-toastify';

export default function VocabularySaveButton({ word, context, lessonId }) {
  const { user } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [translation, setTranslation] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  // Get language name in German
  const getLanguageName = (langCode) => {
    const languageNames = {
      'vi': 'Vietnamesisch',
      'en': 'Englisch',
      'fr': 'Französisch',
      'es': 'Spanisch',
      'zh': 'Chinesisch',
      'ja': 'Japanisch',
      'ko': 'Koreanisch',
      'ru': 'Russisch',
      'ar': 'Arabisch',
      'pt': 'Portugiesisch',
      'it': 'Italienisch',
      'nl': 'Niederländisch',
      'pl': 'Polnisch',
      'tr': 'Türkisch',
      'th': 'Thailändisch',
      'hi': 'Hindi'
    };
    return languageNames[langCode] || 'Ihre Sprache';
  };

  const handleSave = async () => {
    if (!translation.trim()) {
      toast.warning('Bitte geben Sie die Bedeutung des Wortes ein');
      return;
    }

    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/vocabulary', {
        method: 'POST',
        body: JSON.stringify({
          word,
          translation: translation.trim(),
          context: context || '',
          lessonId
        })
      });

      if (res.ok) {
        toast.success('Wortschatz gespeichert!');
        setShowPopup(false);
        setTranslation('');
      } else {
        const data = await res.json();
        toast.error('Fehler: ' + data.message);
      }
    } catch (error) {
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowPopup(true)}
        style={{
          padding: '4px 8px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          marginLeft: '5px'
        }}
        title="Wortschatz speichern"
      >
        💾
      </button>

      {showPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '15px' }}>
              Wortschatz speichern
            </h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Wort:
              </label>
              <div style={{ 
                padding: '10px',
                background: '#f5f5f5',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#2196F3'
              }}>
                {word}
              </div>
            </div>

            {context && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Kontext:
                </label>
                <div style={{ 
                  padding: '10px',
                  background: '#f5f5f5',
                  borderRadius: '5px',
                  fontSize: '14px',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  {context}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Bedeutung ({getLanguageName(user?.nativeLanguage || 'vi')}): *
              </label>
              <input
                type="text"
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder={`${getLanguageName(user?.nativeLanguage || 'vi')} Bedeutung eingeben...`}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: saving ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {saving ? 'Speichere...' : 'Speichern'}
              </button>
              <button
                onClick={() => {
                  setShowPopup(false);
                  setTranslation('');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
