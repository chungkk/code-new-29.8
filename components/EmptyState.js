import React from 'react';
import Link from 'next/link';

const EmptyState = ({
  icon = '📭',
  title = 'No items found',
  description = 'There are no items to display at this time.',
  actionLabel,
  actionHref,
  onAction,
}) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: 'var(--spacing-xl)',
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      <div style={{ fontSize: '64px', marginBottom: 'var(--spacing-md)' }}>
        {icon}
      </div>

      <h3
        style={{
          fontSize: '20px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: 'var(--spacing-sm)',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '15px',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          marginBottom: actionLabel ? 'var(--spacing-lg)' : 0,
        }}
      >
        {description}
      </p>

      {actionLabel && (
        <>
          {actionHref ? (
            <Link
              href={actionHref}
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: 'var(--accent-gradient)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: 'var(--border-radius-small)',
                fontWeight: '600',
                transition: 'transform 0.2s ease',
              }}
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              style={{
                padding: '12px 24px',
                background: 'var(--accent-gradient)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--border-radius-small)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '15px',
              }}
            >
              {actionLabel}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export const NoLessonsFound = () => (
  <EmptyState
    icon="🔍"
    title="No lessons found"
    description="We couldn't find any lessons matching your criteria. Try adjusting your filters."
    actionLabel="View all lessons"
    actionHref="/"
  />
);

export const NoVocabularyFound = () => (
  <EmptyState
    icon="📚"
    title="No vocabulary saved"
    description="You haven't saved any vocabulary words yet. Start learning and save words to build your collection."
    actionLabel="Browse lessons"
    actionHref="/"
  />
);

export default EmptyState;
