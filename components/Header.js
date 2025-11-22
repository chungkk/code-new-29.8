import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';
import { navigateWithLocale } from '../lib/navigation';
import NotificationDropdown from './NotificationDropdown';
import LoginModal from './LoginModal';
import styles from '../styles/Header.module.css';

const Header = () => {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [showPointsPlusOne, setShowPointsPlusOne] = useState(false);
  const [showPointsMinus, setShowPointsMinus] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const userMenuRef = useRef(null);
  const languageMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const router = useRouter();
  const { user, logout, userPoints, fetchUserPoints } = useAuth();
  const { theme, toggleTheme, currentTheme } = useTheme();
  const { currentLanguage, changeLanguage, languages, currentLanguageInfo } = useLanguage();
  const { unreadCount, fetchUnreadCount } = useNotifications();

  // Debug: Log userPoints whenever it changes
  useEffect(() => {
    console.log('📊 Header userPoints changed:', userPoints);
  }, [userPoints]);

  // Show points +1 animation
  const showPointsAnimation = useCallback(() => {
    console.log('🎉 showPointsAnimation called!');
    setShowPointsPlusOne(true);
    setTimeout(() => {
      setShowPointsPlusOne(false);
    }, 1500);
  }, []);

  // Show points -0.5 animation
  const showPointsMinusAnimation = useCallback(() => {
    console.log('⚠️ showPointsMinusAnimation called!');
    setShowPointsMinus(true);
    setTimeout(() => {
      setShowPointsMinus(false);
    }, 1500);
  }, []);

  // Fetch user points on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchUserPoints();
    }
  }, [user, fetchUserPoints]);

  // Expose animation functions globally (separate effect to avoid re-assignment issues)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.refreshUserPoints = fetchUserPoints;
      window.showPointsPlusOne = showPointsAnimation;
      window.showPointsMinus = showPointsMinusAnimation;
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.refreshUserPoints = null;
        window.showPointsPlusOne = null;
        window.showPointsMinus = null;
      }
    };
  }, [fetchUserPoints, showPointsAnimation, showPointsMinusAnimation]);

  // Listen for points update events from other pages
  useEffect(() => {
    const handlePointsUpdate = () => {
      if (user) {
        fetchUserPoints();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pointsUpdated', handlePointsUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointsUpdated', handlePointsUpdate);
      }
    };
  }, [user, fetchUserPoints]);

  // Tạo avatar mặc định từ initials
  const getDefaultAvatar = (name) => {
    const initials = name
      ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : '?';
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;
    const bgColor = colors[colorIndex];

    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="${bgColor}"/>
        <text x="50" y="50" font-family="Arial, sans-serif" font-size="40" fill="white" text-anchor="middle" dominant-baseline="central">${initials}</text>
      </svg>
    `)}`;
  };

  const navLinks = [
    { href: '/', label: t('header.nav.topics') },
    { href: '/leaderboard', label: t('header.nav.leaderboard') },
    // { href: '/city-builder', label: '🏙️ Thành phố' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(path);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setLanguageMenuOpen(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target)) {
        setNotificationDropdownOpen(false);
      }
    };

    if (userMenuOpen || languageMenuOpen || notificationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen, languageMenuOpen, notificationDropdownOpen]);

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const toggleLanguageMenu = () => {
    setLanguageMenuOpen(!languageMenuOpen);
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
          <span className={styles.logoText}>PapaGeil</span>
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
        </nav>

        <div className={styles.rightSection}>

          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={t('header.themeToggle')}
            title={currentTheme?.label || t('header.themeToggle')}
          >
            {currentTheme?.emoji || '🌅'}
          </button>

          <div className={styles.languageMenuContainer} ref={languageMenuRef}>
            <button
              className={styles.languageSelector}
              onClick={toggleLanguageMenu}
              aria-label="Language"
              aria-expanded={languageMenuOpen}
            >
              <span>{currentLanguageInfo.flag}</span>
              <span>{currentLanguageInfo.nativeName}</span>
            </button>

            {languageMenuOpen && (
              <div className={styles.languageDropdown}>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    className={`${styles.languageItem} ${
                      lang.code === currentLanguage ? styles.active : ''
                    }`}
                    onClick={() => {
                      changeLanguage(lang.code);
                      setLanguageMenuOpen(false);
                    }}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                    {lang.code === currentLanguage && <span className={styles.checkmark}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user && (
            <>
              <div className={styles.pointsContainer}>
                <div className={styles.pointsBadge} title={t('header.points')}>
                  <span className={styles.pointsIcon}>€</span>
                  <span className={styles.pointsValue}>{userPoints || 0}</span>
                </div>

                {showPointsPlusOne && (
                  <div className={styles.pointsPlusOne}>+1</div>
                )}

                {showPointsMinus && (
                  <div className={styles.pointsMinus}>-0.5</div>
                )}
              </div>

              <div className={styles.notificationContainer} ref={notificationMenuRef}>
                <button
                  className={styles.notificationBtn}
                  onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                  title={t('header.notifications')}
                  aria-label={t('header.notifications')}
                  aria-expanded={notificationDropdownOpen}
                >
                  <span>🔔</span>
                  {unreadCount > 0 && (
                    <span className={styles.notificationBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>

                {notificationDropdownOpen && (
                  <NotificationDropdown
                    isOpen={notificationDropdownOpen}
                    onClose={() => {
                      setNotificationDropdownOpen(false);
                      fetchUnreadCount();
                    }}
                  />
                )}
              </div>

              <div className={styles.userMenuContainer} ref={userMenuRef}>
                <button
                  className={styles.userAvatarBtn}
                  onClick={toggleUserMenu}
                  aria-label={t('header.userMenu.label')}
                  aria-expanded={userMenuOpen}
                >
                  <Image
                    src={user.avatar || getDefaultAvatar(user.name)}
                     alt={user.name || t('header.userMenu.user')}
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
                          src={user.avatar || getDefaultAvatar(user.name)}
                          alt={user.name || t('header.userMenu.user')}
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
                        <span>{t('header.userMenu.dashboard')}</span>
                      </Link>

                      <Link
                        href="/dashboard/vocabulary"
                        className={styles.userDropdownItem}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <span className={styles.dropdownIcon}>📚</span>
                        <span>{t('header.userMenu.myVocabulary')}</span>
                      </Link>

                      <Link
                        href="/leaderboard"
                        className={styles.userDropdownItem}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <span className={styles.dropdownIcon}>🏆</span>
                        <span>{t('header.userMenu.leaderboard')}</span>
                      </Link>

                      <Link
                        href="/dashboard/settings"
                        className={styles.userDropdownItem}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <span className={styles.dropdownIcon}>⚙️</span>
                        <span>{t('header.userMenu.settings')}</span>
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
                            <span>{t('header.userMenu.adminArea')}</span>
                          </Link>
                        </>
                      )}

                      <div className={styles.userDropdownDivider}></div>

                      <button
                        className={`${styles.userDropdownItem} ${styles.logoutItem}`}
                        onClick={handleLogout}
                      >
                        <span className={styles.dropdownIcon}>🚪</span>
                        <span>{t('header.userMenu.logout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!user && (
            <>
              <button
                onClick={() => setLoginModalOpen(true)}
                className={styles.loginBtn}
              >
                {t('header.auth.login')}
              </button>
            </>
          )}

          <LoginModal 
            isOpen={loginModalOpen} 
            onClose={() => setLoginModalOpen(false)} 
          />


        </div>
      </div>
    </header>
  );
};

export default Header;
