import React, { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function VocabularySaveButton({ word, context, lessonId }) {
  const { data: session } = useSession();
  const [showPopup, setShowPopup] = useState(false);
  const [translation, setTranslation] = useState('');
  const [saving, setSaving] = useState(false);

  if (!session) return null;

  const handleSave = async () => {
    if (!translation.trim()) {
      alert('Vui lòng nhập nghĩa của từ');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word,
          translation: translation.trim(),
          context: context || '',
          lessonId
        })
      });

      if (res.ok) {
        alert('✅ Đã lưu từ vựng!');
        setShowPopup(false);
        setTranslation('');
      } else {
        const data = await res.json();
        alert('❌ Lỗi: ' + data.message);
      }
    } catch (error) {
      alert('❌ Có lỗi xảy ra');
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
        title="Lưu từ vựng"
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
              Lưu Từ Vựng
            </h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Từ:
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
                  Ngữ cảnh:
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
                Nghĩa (tiếng Việt): *
              </label>
              <input
                type="text"
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder="Nhập nghĩa của từ..."
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
                {saving ? 'Đang lưu...' : 'Lưu'}
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
