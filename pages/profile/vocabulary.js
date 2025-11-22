import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO, { generateBreadcrumbStructuredData } from '../../components/SEO';
import ProtectedPage from '../../components/ProtectedPage';
import DashboardLayout from '../../components/DashboardLayout';
import { fetchWithAuth } from '../../lib/api';
import { toast } from 'react-toastify';
import { speakText } from '../../lib/textToSpeech';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/vocabulary.module.css';

function VocabularyPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWord, setSelectedWord] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, placement: 'bottom' });

  useEffect(() => {
    if (user) {
      loadVocabulary();
    }
  }, [user]);

  const loadVocabulary = async () => {
    try {
      setLoading(true);
      const targetLanguage = user?.nativeLanguage || 'vi';
      const vocabRes = await fetchWithAuth(`/api/vocabulary?targetLanguage=${targetLanguage}`);
      const vocabData = await vocabRes.json();
      setVocabulary(Array.isArray(vocabData) ? vocabData : []);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      toast.error(t('vocabulary.errors.loading'));
    } finally {
      setLoading(false);
    }
  };

  const deleteVocabulary = async (id, e) => {
    e.stopPropagation();
    if (!confirm(t('vocabulary.deleteConfirm'))) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error(t('vocabulary.errors.notAuthenticated'));
        return;
      }

      const res = await fetch(`/api/vocabulary?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setVocabulary(vocabulary.filter(v => v._id !== id));
        toast.success(t('vocabulary.success.deleted'));
        if (selectedWord?._id === id) {
          setSelectedWord(null);
        }
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || t('vocabulary.errors.deleting'));
      }
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      toast.error(t('vocabulary.errors.general'));
    }
  };

  const handleWordClick = (vocab, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Calculate available space
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // Estimate dropdown height (can be adjusted based on content)
    const estimatedDropdownHeight = 400;
    
    // Determine placement
    let placement = 'bottom';
    let top = rect.bottom + window.scrollY + 8;
    
    // If not enough space below and more space above
    if (spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow) {
      placement = 'top';
      top = rect.top + window.scrollY - 8; // Will be adjusted in CSS with transform
    }
    
    // Calculate left position (center align with word, but keep within viewport)
    const dropdownWidth = 450; // Approximate dropdown width
    let left = rect.left + window.scrollX + (rect.width / 2) - (dropdownWidth / 2);
    
    // Keep dropdown within viewport horizontally
    const viewportWidth = window.innerWidth;
    const scrollX = window.scrollX;
    if (left < scrollX + 10) {
      left = scrollX + 10;
    } else if (left + dropdownWidth > scrollX + viewportWidth - 10) {
      left = scrollX + viewportWidth - dropdownWidth - 10;
    }
    
    setDropdownPosition({
      top,
      left,
      placement,
      wordCenterX: rect.left + window.scrollX + (rect.width / 2) // For arrow positioning
    });
    setSelectedWord(vocab);
  };

  const closeDropdown = () => {
    setSelectedWord(null);
  };

  const speakWord = (word, e) => {
    if (e) e.stopPropagation();
    speakText(word, 'de-DE', 0.9, 1);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (selectedWord) {
        closeDropdown();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [selectedWord]);





  // Render List View
  const renderListView = () => (
    <>
      <div className={styles.vocabGrid}>
        {vocabulary.map((vocab) => (
          <div
            key={vocab._id}
            className={styles.vocabCard}
          >
            <div className={styles.cardHeader}>
              <div className={styles.wordSection} onClick={(e) => handleWordClick(vocab, e)}>
                <div className={styles.word}>
                  {vocab.word}
                  {vocab.level && <span className={styles.level}>{vocab.level}</span>}
                </div>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={(e) => deleteVocabulary(vocab._id, e)}
                title={t('vocabulary.delete')}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Dropdown for word details */}
      {selectedWord && (
        <div 
          className={`${styles.dropdown} ${styles[`dropdown--${dropdownPosition.placement}`]}`}
          style={{
            position: 'absolute',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Arrow indicator */}
          <div 
            className={styles.dropdownArrow}
            style={{
              left: `${dropdownPosition.wordCenterX - dropdownPosition.left}px`
            }}
          />
          
          <div className={styles.dropdownHeader}>
            <h3 className={styles.dropdownTitle}>{selectedWord.word}</h3>
            <button className={styles.closeDropdown} onClick={closeDropdown}>✕</button>
          </div>

          <div className={styles.dropdownContent}>
            {/* Phonetics */}
            {(selectedWord.phonetics?.us || selectedWord.phonetics?.uk) && (
              <div className={styles.phonetics}>
                {selectedWord.phonetics.us && (
                  <div className={styles.phoneticItem}>
                    <button
                      className={styles.speakerIcon}
                      onClick={(e) => speakWord(selectedWord.word, e)}
                    >
                      🔊
                    </button>
                    <span className={styles.phoneticLabel}>US</span>
                    <span className={styles.phoneticText}>{selectedWord.phonetics.us}</span>
                  </div>
                )}
                {selectedWord.phonetics.uk && (
                  <div className={styles.phoneticItem}>
                    <button
                      className={styles.speakerIcon}
                      onClick={(e) => speakWord(selectedWord.word, e)}
                    >
                      🔊
                    </button>
                    <span className={styles.phoneticLabel}>UK</span>
                    <span className={styles.phoneticText}>{selectedWord.phonetics.uk}</span>
                  </div>
                )}
              </div>
            )}

            {/* Part of Speech */}
            {selectedWord.partOfSpeech && (
              <div className={styles.partOfSpeech}>{selectedWord.partOfSpeech}</div>
            )}

            {/* Translation */}
            <div className={styles.dropdownTranslation}>
              <strong>{t('vocabulary.meaning')}:</strong> {selectedWord.translation}
            </div>

            {/* Definition */}
            {selectedWord.definition && (
              <div className={styles.definition}>{selectedWord.definition}</div>
            )}

            {/* Examples */}
            {selectedWord.examples && selectedWord.examples.length > 0 && (
              <div className={styles.examplesSection}>
                <div className={styles.examplesTitle}>{t('vocabulary.examples')}:</div>
                {selectedWord.examples.map((example, idx) => (
                  <div key={idx} className={styles.example}>
                    <div className={styles.exampleText}>&ldquo;{example.text}&rdquo;</div>
                    {example.translation && (
                      <div className={styles.exampleTranslation}>{example.translation}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Context from lesson */}
            {selectedWord.context && !selectedWord.examples?.length && (
              <div className={styles.examplesSection}>
                <div className={styles.examplesTitle}>{t('vocabulary.context')}:</div>
                <div className={styles.example}>
                  <div className={styles.exampleText}>&ldquo;{selectedWord.context}&rdquo;</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );





  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Profile', url: '/profile' },
    { name: 'Vocabulary', url: '/profile/vocabulary' }
  ]);

  return (
    <>
      <SEO
        title="My Vocabulary - PapaGeil"
        description="Verwalten Sie Ihren persönlichen deutschen Wortschatz. Speichern, überprüfen und üben Sie Ihre gelernten Vokabeln."
        keywords="Deutsch Wortschatz, Vokabeln speichern, Vokabeltrainer, Deutsch lernen Wortschatz"
        structuredData={breadcrumbData}
        noindex={true}
      />

      <DashboardLayout>
        <div className={styles.container}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>
              <div className={styles.parrotIcon}>🦜</div>
              My Vocabulary
            </h1>
            <p className={styles.pageSubtitle}>
              Manage your vocabulary list for review
            </p>
          </div>

          {/* Content */}
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>{t('vocabulary.loading')}</p>
            </div>
          ) : vocabulary.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📝</div>
              <h3 className={styles.emptyTitle}>{t('vocabulary.empty')}</h3>
              <p className={styles.emptyText}>
                {t('vocabulary.startAdding')}
              </p>
            </div>
          ) : (
            renderListView()
          )}
        </div>
      </DashboardLayout>
    </>
  );
}

export default function Vocabulary() {
  return (
    <ProtectedPage>
      <VocabularyPage />
    </ProtectedPage>
  );
}
