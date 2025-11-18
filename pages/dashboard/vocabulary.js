import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SEO, { generateBreadcrumbStructuredData } from '../../components/SEO';
import ProtectedPage from '../../components/ProtectedPage';
import DashboardLayout from '../../components/DashboardLayout';
import { fetchWithAuth } from '../../lib/api';
import { toast } from 'react-toastify';
import { speakText } from '../../lib/textToSpeech';
import styles from '../../styles/vocabulary.module.css';

function VocabularyPage() {
  const router = useRouter();
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('list'); // list, flashcard, write
  const [selectedWord, setSelectedWord] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, placement: 'bottom' });

  // Flashcard state
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Write mode state
  const [currentWriteIndex, setCurrentWriteIndex] = useState(0);
  const [writeAnswer, setWriteAnswer] = useState('');
  const [showWriteFeedback, setShowWriteFeedback] = useState(false);
  const [isWriteCorrect, setIsWriteCorrect] = useState(false);

  useEffect(() => {
    loadVocabulary();
  }, []);

  const loadVocabulary = async () => {
    try {
      setLoading(true);
      const vocabRes = await fetchWithAuth('/api/vocabulary');
      const vocabData = await vocabRes.json();
      setVocabulary(Array.isArray(vocabData) ? vocabData : []);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      toast.error('Fehler beim Laden des Wortschatzes');
    } finally {
      setLoading(false);
    }
  };

  const deleteVocabulary = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Dieses Wort löschen?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
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
        toast.success('Wort erfolgreich gelöscht!');
        if (selectedWord?._id === id) {
          setSelectedWord(null);
        }
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Fehler beim Löschen des Wortes');
      }
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      toast.error('Ein Fehler ist aufgetreten beim Löschen');
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

  // Flashcard functions
  const nextFlashcard = () => {
    setIsFlipped(false);
    setCurrentFlashcardIndex((prev) => 
      prev < vocabulary.length - 1 ? prev + 1 : 0
    );
  };

  const prevFlashcard = () => {
    setIsFlipped(false);
    setCurrentFlashcardIndex((prev) => 
      prev > 0 ? prev - 1 : vocabulary.length - 1
    );
  };

  // Write mode functions
  const checkWriteAnswer = () => {
    const currentWord = vocabulary[currentWriteIndex];
    const isCorrect = writeAnswer.trim().toLowerCase() === currentWord.word.toLowerCase();
    setIsWriteCorrect(isCorrect);
    setShowWriteFeedback(true);

    if (isCorrect) {
      setTimeout(() => {
        nextWriteQuestion();
      }, 1500);
    }
  };

  const skipWriteQuestion = () => {
    nextWriteQuestion();
  };

  const nextWriteQuestion = () => {
    setWriteAnswer('');
    setShowWriteFeedback(false);
    setIsWriteCorrect(false);
    setCurrentWriteIndex((prev) => 
      prev < vocabulary.length - 1 ? prev + 1 : 0
    );
  };

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
                <div className={styles.translation}>{vocab.translation}</div>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={(e) => deleteVocabulary(vocab._id, e)}
                title="Löschen"
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
              <strong>Nghĩa:</strong> {selectedWord.translation}
            </div>

            {/* Definition */}
            {selectedWord.definition && (
              <div className={styles.definition}>{selectedWord.definition}</div>
            )}

            {/* Examples */}
            {selectedWord.examples && selectedWord.examples.length > 0 && (
              <div className={styles.examplesSection}>
                <div className={styles.examplesTitle}>Ví dụ:</div>
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
                <div className={styles.examplesTitle}>Ngữ cảnh:</div>
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

  // Render Flashcard View
  const renderFlashcardView = () => {
    if (vocabulary.length === 0) return null;
    const currentVocab = vocabulary[currentFlashcardIndex];

    return (
      <div className={styles.flashcardContainer}>
        <div>
          <div
            className={styles.flashcard}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className={`${styles.flashcardInner} ${isFlipped ? styles.flipped : ''}`}>
              {/* Front - Word */}
              <div className={styles.flashcardFront}>
                <div className={styles.flashcardWord}>{currentVocab.word}</div>
                {currentVocab.level && <span className={styles.level}>{currentVocab.level}</span>}
                <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
                  Klicken zum Umdrehen
                </p>
              </div>

              {/* Back - Translation & Details */}
              <div className={styles.flashcardBack}>
                <div className={styles.flashcardTranslation}>{currentVocab.translation}</div>
                {currentVocab.definition && (
                  <div className={styles.flashcardDefinition}>{currentVocab.definition}</div>
                )}
                {currentVocab.partOfSpeech && (
                  <div className={styles.partOfSpeech} style={{ marginTop: '1rem' }}>
                    {currentVocab.partOfSpeech}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.flashcardControls}>
            <button className={`${styles.flashcardBtn} ${styles.prevBtn}`} onClick={prevFlashcard}>
              ← Zurück
            </button>
            <button className={`${styles.flashcardBtn} ${styles.nextBtn}`} onClick={nextFlashcard}>
              Weiter →
            </button>
          </div>

          <div className={styles.flashcardCounter}>
            {currentFlashcardIndex + 1} / {vocabulary.length}
          </div>
        </div>
      </div>
    );
  };

  // Render Write View
  const renderWriteView = () => {
    if (vocabulary.length === 0) return null;
    const currentVocab = vocabulary[currentWriteIndex];

    return (
      <div className={styles.writeContainer}>
        <div className={styles.writeProgress}>
          Frage {currentWriteIndex + 1} / {vocabulary.length}
        </div>

        <div className={styles.writeCard}>
          <div className={styles.writeQuestion}>
            Wie lautet das deutsche Wort für:<br />
            <strong style={{ color: '#64b5f6', fontSize: '1.5rem' }}>
              {currentVocab.translation}
            </strong>
          </div>

          {currentVocab.context && (
            <div style={{ 
              color: 'var(--text-secondary)', 
              fontStyle: 'italic', 
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              Kontext: &ldquo;{currentVocab.context}&rdquo;
            </div>
          )}

          <input
            type="text"
            className={`${styles.writeInput} ${
              showWriteFeedback ? (isWriteCorrect ? styles.correct : styles.incorrect) : ''
            }`}
            value={writeAnswer}
            onChange={(e) => setWriteAnswer(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !showWriteFeedback && checkWriteAnswer()}
            placeholder="Tippe hier deine Antwort..."
            disabled={showWriteFeedback}
            autoFocus
          />

          {showWriteFeedback && (
            <div className={`${styles.writeFeedback} ${isWriteCorrect ? styles.correct : styles.incorrect}`}>
              {isWriteCorrect ? (
                <>✓ Richtig!</>
              ) : (
                <>✗ Falsch! Die richtige Antwort ist: <strong>{currentVocab.word}</strong></>
              )}
            </div>
          )}

          <div className={styles.writeControls}>
            {!showWriteFeedback ? (
              <>
                <button
                  className={`${styles.writeBtn} ${styles.checkBtn}`}
                  onClick={checkWriteAnswer}
                  disabled={!writeAnswer.trim()}
                >
                  Überprüfen
                </button>
                <button
                  className={`${styles.writeBtn} ${styles.skipBtn}`}
                  onClick={skipWriteQuestion}
                >
                  Überspringen
                </button>
              </>
            ) : !isWriteCorrect ? (
              <button
                className={`${styles.writeBtn} ${styles.nextBtn}`}
                onClick={nextWriteQuestion}
              >
                Weiter →
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Dashboard', url: '/dashboard' },
    { name: 'Vocabulary', url: '/dashboard/vocabulary-new' }
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

          {/* View Tabs */}
          <div className={styles.viewTabs}>
            <button
              className={`${styles.tabButton} ${activeView === 'list' ? styles.active : ''}`}
              onClick={() => setActiveView('list')}
            >
              📋 List
            </button>
            <button
              className={`${styles.tabButton} ${activeView === 'flashcard' ? styles.active : ''}`}
              onClick={() => setActiveView('flashcard')}
              disabled={vocabulary.length === 0}
            >
              🃏 Flashcard
            </button>
            <button
              className={`${styles.tabButton} ${activeView === 'write' ? styles.active : ''}`}
              onClick={() => setActiveView('write')}
              disabled={vocabulary.length === 0}
            >
              ✍️ Write
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Lädt Wortschatz...</p>
            </div>
          ) : vocabulary.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📝</div>
              <h3 className={styles.emptyTitle}>Noch kein Wortschatz vorhanden</h3>
              <p className={styles.emptyText}>
                Speichern Sie Wortschatz beim Lernen für spätere Wiederholung
              </p>
            </div>
          ) : (
            <>
              {activeView === 'list' && renderListView()}
              {activeView === 'flashcard' && renderFlashcardView()}
              {activeView === 'write' && renderWriteView()}
            </>
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
