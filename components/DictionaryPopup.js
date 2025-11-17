import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/DictionaryPopup.module.css';

const DICTIONARY_CACHE_KEY = 'dictionary_cache';
const CACHE_EXPIRY_DAYS = 7;

const dictionaryCache = {
  get(word, targetLang) {
    if (typeof window === 'undefined') return null;
    try {
      const cache = JSON.parse(localStorage.getItem(DICTIONARY_CACHE_KEY) || '{}');
      const key = `${word}_${targetLang}`.toLowerCase();
      const cached = cache[key];
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }
      return null;
    } catch {
      return null;
    }
  },
  set(word, data, targetLang) {
    if (typeof window === 'undefined') return;
    try {
      const cache = JSON.parse(localStorage.getItem(DICTIONARY_CACHE_KEY) || '{}');
      const key = `${word}_${targetLang}`.toLowerCase();
      cache[key] = {
        data,
        expiry: Date.now() + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      };
      localStorage.setItem(DICTIONARY_CACHE_KEY, JSON.stringify(cache));
    } catch {}
  }
};

const DictionaryPopup = ({ word, onClose, position, arrowPosition }) => {
  const { user } = useAuth();
  const [wordData, setWordData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchWordData = async () => {
      if (!word) return;

      const targetLang = user?.nativeLanguage || 'vi';

      // Check cache first
      const cached = dictionaryCache.get(word, targetLang);
      if (cached) {
        setWordData(cached);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
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
          dictionaryCache.set(word, data.data, targetLang);
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
    <div className={`${styles.overlay} ${isMobile ? styles.mobileOverlay : ''}`} onClick={handleOverlayClick}>
      <div
        className={`${styles.popupContainer} ${isMobile ? styles.mobilePopup : ''}`}
        data-arrow-position={arrowPosition || 'right'}
        style={position ? {
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: isMobile ? 'translate(-50%, 0)' : 'none',
        } : {}}
      >
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
            <div className={styles.loading}>
              <div className={styles.spinnerContainer}>
                <div className={styles.spinner}></div>
              </div>
              <div className={styles.loadingText}>Lädt...</div>
            </div>
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
