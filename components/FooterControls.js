import React from 'react';

const FooterControls = ({
  currentIndex,
  totalSentences,
  onPrevious,
  onNext,
  onComplete,
  showComplete = false,
  completedCount = 0,
}) => {
  const progress = totalSentences > 0 ? ((currentIndex + 1) / totalSentences) * 100 : 0;

  return (
    <div style={{
      position: 'sticky',
      bottom: 0,
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-color)',
      padding: 'var(--spacing-lg)',
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {/* Progress bar */}
        <div style={{
          marginBottom: 'var(--spacing-md)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--spacing-sm)',
          }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Sentence {currentIndex + 1} of {totalSentences}
            </span>
            {completedCount > 0 && (
              <span style={{ color: 'var(--accent-blue)', fontSize: '14px' }}>
                ✓ {completedCount} completed
              </span>
            )}
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: 'var(--bg-primary)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'var(--accent-gradient)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Navigation buttons */}
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-md)',
          alignItems: 'center',
        }}>
          <button
            onClick={onPrevious}
            disabled={currentIndex === 0}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '12px 24px',
              borderRadius: 'var(--border-radius-small)',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: '500',
              opacity: currentIndex === 0 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>←</span>
            <span>Previous</span>
          </button>

          <div style={{ flex: 1 }} />

          {showComplete && currentIndex === totalSentences - 1 ? (
            <button
              onClick={onComplete}
              style={{
                background: 'var(--accent-gradient)',
                border: 'none',
                color: 'white',
                padding: '12px 32px',
                borderRadius: 'var(--border-radius-small)',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Complete Lesson</span>
              <span>✓</span>
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={currentIndex >= totalSentences - 1}
              style={{
                background: 'var(--accent-gradient)',
                border: 'none',
                color: 'white',
                padding: '12px 24px',
                borderRadius: 'var(--border-radius-small)',
                cursor: currentIndex >= totalSentences - 1 ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                fontWeight: '500',
                opacity: currentIndex >= totalSentences - 1 ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Next</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FooterControls;
