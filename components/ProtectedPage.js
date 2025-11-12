import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const ProtectedPage = ({ children, adminOnly = false, requireAuth = true }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        // Redirect to login if not authenticated
        router.push('/auth/login?redirect=' + router.asPath);
      } else if (adminOnly && user && !user.isAdmin) {
        // Redirect to home if not admin
        router.push('/');
      }
    }
  }, [user, loading, router, adminOnly, requireAuth]);

  // Show loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        flexDirection: 'column',
        gap: 'var(--spacing-md)',
      }}>
        <div className="loading-spinner" />
        <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  // Don't render if user doesn't have access
  if (requireAuth && !user) {
    return null;
  }

  if (adminOnly && user && !user.isAdmin) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedPage;
