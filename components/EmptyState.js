import React from 'react';
import styles from '../styles/EmptyState.module.css';

export function EmptyState({
  icon = '📭',
  title = 'Keine Daten gefunden',
  message = 'Es gibt noch keine Elemente zum Anzeigen.',
  action = null
}) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icon}</div>
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyMessage}>{message}</p>
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}

export function NoLessonsFound({ onCreateLesson }) {
  return (
    <EmptyState
      icon="📚"
      title="Keine Lektionen gefunden"
      message="Es wurden noch keine Lektionen erstellt. Erstellen Sie Ihre erste Lektion, um loszulegen!"
      action={
        onCreateLesson && (
          <button onClick={onCreateLesson} className={styles.emptyButton}>
            Erste Lektion erstellen
          </button>
        )
      }
    />
  );
}

export function NoVocabularyFound() {
  return (
    <EmptyState
      icon="💎"
      title="Kein Wortschatz gespeichert"
      message="Sie haben noch keine Wörter gespeichert. Klicken Sie während des Lernens auf Wörter, um sie zu Ihrem Wortschatz hinzuzufügen."
    />
  );
}

export function NoProgressYet() {
  return (
    <EmptyState
      icon="🎯"
      title="Noch kein Fortschritt"
      message="Beginnen Sie mit dem Lernen, um Ihren Fortschritt zu verfolgen!"
    />
  );
}

export function NoSearchResults({ searchTerm }) {
  return (
    <EmptyState
      icon="🔍"
      title="Keine Ergebnisse gefunden"
      message={`Keine Ergebnisse für "${searchTerm}". Versuchen Sie es mit anderen Suchbegriffen.`}
    />
  );
}

export function ErrorState({ message = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' }) {
  return (
    <EmptyState
      icon="⚠️"
      title="Fehler"
      message={message}
    />
  );
}

export function LoadingFailed({ onRetry }) {
  return (
    <EmptyState
      icon="⚠️"
      title="Laden fehlgeschlagen"
      message="Die Daten konnten nicht geladen werden."
      action={
        onRetry && (
          <button onClick={onRetry} className={styles.emptyButton}>
            Erneut versuchen
          </button>
        )
      }
    />
  );
}

export default EmptyState;
