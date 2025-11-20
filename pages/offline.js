import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Offline.module.css';

/**
 * Offline Fallback Page
 * Shown when user navigates to uncached pages while offline
 */
const OfflinePage = () => {
  const router = useRouter();
  
  const handleRetry = () => {
    window.location.reload();
  };
  
  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };
  
  return (
    <>
      <Head>
        <title>Offline - papageil.net</title>
        <meta name="description" content="You are currently offline" />
      </Head>
      
      <div className={styles.container}>
        <div className={styles.content}>
          {/* Offline Icon */}
          <div className={styles.iconContainer}>
            <svg 
              className={styles.icon}
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.415m-1.414-1.415L3 3" 
              />
            </svg>
          </div>
          
          {/* Title */}
          <h1 className={styles.title}>You&apos;re Offline</h1>
          
          {/* Message */}
          <p className={styles.message}>
            This page is not available offline.
            <br />
            Please check your internet connection and try again.
          </p>
          
          {/* Tips */}
          <div className={styles.tips}>
            <h3>💡 Tips for offline learning:</h3>
            <ul>
              <li>Previously visited lessons are cached automatically</li>
              <li>Your progress will sync when you&apos;re back online</li>
              <li>Vocabulary saved offline will be synced later</li>
            </ul>
          </div>
          
          {/* Actions */}
          <div className={styles.actions}>
            <button 
              onClick={handleRetry}
              className={styles.primaryButton}
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              Retry
            </button>
            
            <button 
              onClick={handleGoBack}
              className={styles.secondaryButton}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default OfflinePage;
