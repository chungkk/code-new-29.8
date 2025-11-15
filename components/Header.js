import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import styles from '../styles/Header.module.css';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
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

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
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

              <div className={styles.userMenuContainer} ref={userMenuRef}>
                <button 
                  className={styles.userAvatarBtn}
                  onClick={toggleUserMenu}
                  aria-label="User menu"
                  aria-expanded={userMenuOpen}
                >
                  <Image
                    src={user.avatar || '/default-avatar.png'}
                    alt={user.name || 'User'}
                    width={40}
                    height={40}
                    className={styles.userAvatar}
                  />
                </button>

                {userMenuOpen && (
                  <div className={styles.userDropdown}>
                    <div className={styles.userDropdownHeader}>
                      <div className={styles.userDropdownAvatar}>
                        <Image
                          src={user.avatar || '/default-avatar.png'}
                          alt={user.name || 'User'}
                          width={48}
                          height={48}
                          className={styles.dropdownAvatar}
                        />
                      </div>
                      <div className={styles.userDropdownInfo}>
                        <div className={styles.userName}>{user.name}</div>
                        <div className={styles.userEmail}>{user.email}</div>
                      </div>
                    </div>

                    <div className={styles.userDropdownDivider}></div>

                    <div className={styles.userDropdownMenu}>
                      <Link 
                        href="/dashboard" 
                        className={styles.userDropdownItem}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <span className={styles.dropdownIcon}>📊</span>
                        <span>Dashboard</span>
                      </Link>

                      <Link 
                        href="/dashboard/vocabulary" 
                        className={styles.userDropdownItem}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <span className={styles.dropdownIcon}>📚</span>
                        <span>Mein Wortschatz</span>
                      </Link>

                      <Link 
                        href="/dashboard/settings" 
                        className={styles.userDropdownItem}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <span className={styles.dropdownIcon}>⚙️</span>
                        <span>Einstellungen</span>
                      </Link>

                      {user.role === 'admin' && (
                        <>
                          <div className={styles.userDropdownDivider}></div>
                          <Link 
                            href="/admin/dashboard" 
                            className={`${styles.userDropdownItem} ${styles.adminItem}`}
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <span className={styles.dropdownIcon}>👑</span>
                            <span>Admin Panel</span>
                          </Link>
                        </>
                      )}

                      <div className={styles.userDropdownDivider}></div>

                      <button 
                        className={`${styles.userDropdownItem} ${styles.logoutItem}`}
                        onClick={handleLogout}
                      >
                        <span className={styles.dropdownIcon}>🚪</span>
                        <span>Abmelden</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!user && (
            <>
              <div className={styles.authButtonsDesktop}>
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
              <button
                onClick={() => router.push('/auth/login')}
                className={styles.authBtnMobile}
              >
                Anmelden
              </button>
            </>
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
