import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

              <Image
                src={user.avatar || '/default-avatar.png'}
                alt={user.name || 'User'}
                width={40}
                height={40}
                className={styles.userAvatar}
                onClick={() => router.push('/dashboard/settings')}
              />
            </>
          )}

          {!user && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => router.push('/auth/login')}
                className={styles.loginBtn}
              >
                Anmelden
              </button>
              <button
                onClick={() => router.push('/auth/register')}
                className={styles.signupBtn}
              >
                Registrieren
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
