import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/DashboardLayout.module.css';

const DashboardLayout = ({ children }) => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/dashboard/vocabulary', label: 'Vocabulary', icon: '📚' },
    { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
  ];

  const isActive = (path) => {
    if (path === '/dashboard') {
      return router.pathname === '/dashboard';
    }
    return router.pathname.startsWith(path);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.open : ''} ${sidebarCollapsed ? styles.collapsed : ''}`}>
          <nav className={styles.nav}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${isActive(item.href) ? styles.active : ''}`}
                onClick={closeMobileMenu}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Sidebar toggle button */}
          <button
            className={styles.sidebarToggleBtn}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </aside>

        {/* Main content */}
        <main className={styles.main}>
          {children}
        </main>
      </div>



      {/* Mobile menu button */}
      <button
        className={styles.mobileMenuBtn}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? '✕' : '☰'}
      </button>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className={`${styles.overlay} ${styles.visible}`}
          onClick={closeMobileMenu}
        />
      )}
    </>
  );
};

export default DashboardLayout;
