import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import styles from '../styles/adminDashboardLayout.module.css';

export default function AdminDashboardLayout({ children }) {
  const router = useRouter();
  const { user } = useAuth();
  const { currentTheme, nextTheme, toggleTheme } = useTheme();

  const navItems = [
    {
      path: '/admin/dashboard',
      icon: '📚',
      label: 'Lektionen verwalten',
      description: 'Lektionen erstellen & bearbeiten'
    },
    {
      path: '/admin/dashboard/files',
      icon: '🗂️',
      label: 'Dateien verwalten',
      description: 'Ungenutzte Dateien löschen'
    }
  ];

  const isActive = (path) => {
    if (path === '/admin/dashboard') {
      return router.pathname === '/admin/dashboard';
    }
    return router.pathname.startsWith(path);
  };

  return (
    <div className={styles.adminContainer}>
      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.adminBadge}>
            <span className={styles.adminIcon}>👑</span>
            <div className={styles.adminInfo}>
              <h3 className={styles.adminTitle}>Admin Panel</h3>
              <p className={styles.adminName}>{user?.name}</p>
            </div>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.navItem} ${isActive(item.path) ? styles.navItemActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <div className={styles.navContent}>
                <span className={styles.navLabel}>{item.label}</span>
                <span className={styles.navDescription}>{item.description}</span>
              </div>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            onClick={toggleTheme}
            className={styles.themeToggle}
            title={nextTheme ? `Theme wechseln: ${nextTheme.label}` : 'Theme wechseln'}
          >
            <span className={styles.themeIcon}>{currentTheme?.emoji || '🎨'}</span>
            <span className={styles.themeLabel}>
              {nextTheme ? `${nextTheme.label}` : 'Theme'}
            </span>
          </button>

          <Link href="/dashboard" className={styles.backButton}>
            ← Zurück zum Dashboard
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
