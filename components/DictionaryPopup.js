import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/DictionaryPopup.module.css';

const DictionaryPopup = ({ word, onClose, position }) => {
  const { user } = useAuth();
  const [wordData, setWordData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWordData = async () => {
      if (!word) return;
      
      setIsLoading(true);
      try {
        const targetLang = user?.nativeLanguage || 'vi';
        const response = await fetch('/api/dictionary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            word: word,
            sourceLang: 'de',
            targetLang: targetLang
          })
        });

        const data = await response.json();
        if (data.success) {
          setWordData(data.data);
        }
      } catch (error) {
        console.error('Dictionary fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWordData();
  }, [word, user]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.popupContainer}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.wordTitle}>{word}</div>
            {wordData?.translation && (
              <div className={styles.wordTranslation}>
                {wordData.translation}
              </div>
            )}
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>Lädt...</div>
          ) : (
            <>
              {/* Erklärung */}
              {wordData?.explanation && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>Erklärung</h4>
                  <div className={styles.sectionContent}>
                    {wordData.explanation}
                  </div>
                </div>
              )}

              {/* Beispiele */}
              {wordData?.examples && wordData.examples.length > 0 && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>Beispiele</h4>
                  <div className={styles.examples}>
                    {wordData.examples.map((example, index) => (
                      <div key={index} className={styles.example}>
                        <div className={styles.exampleGerman}>{example.de}</div>
                        <div className={styles.exampleTranslation}>{example.translation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DictionaryPopup;
