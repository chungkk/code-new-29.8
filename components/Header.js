import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import styles from '../styles/Header.module.css';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navLinks = [
    { href: '/', label: 'Topics' },
    { href: '/review', label: 'Review' },
    { href: '/dashboard/vocabulary', label: 'Vocabulary' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(path);
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>🦜</div>
          <span className={styles.logoText}>Papageil</span>
        </Link>

        <nav className={`${styles.nav} ${mobileMenuOpen ? styles.open : ''}`}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${isActive(link.href) ? styles.active : ''}`}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <Link
              href="/dashboard"
              className={`${styles.navLink} ${isActive('/dashboard') ? styles.active : ''}`}
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className={styles.rightSection}>

          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          <div className={styles.languageSelector}>
            <span>🇬🇧</span>
            <span>English</span>
            <span>▼</span>
          </div>

          {user && (
            <>
              <button className={styles.notificationBtn} aria-label="Notifications">
                <span>🔔</span>
                <span className={styles.notificationBadge}></span>
              </button>

              <img
                src={user.avatar || '/default-avatar.png'}
                alt={user.name || 'User'}
                className={styles.userAvatar}
                onClick={() => router.push('/dashboard/settings')}
              />
            </>
          )}

          {!user && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => router.push('/login')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '8px 16px',
                  borderRadius: 'var(--border-radius-small)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Login
              </button>
              <button
                onClick={() => router.push('/signup')}
                style={{
                  background: 'var(--accent-gradient)',
                  border: 'none',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: 'var(--border-radius-small)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Sign Up
              </button>
            </div>
          )}

          <button
            className={styles.mobileMenuBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
