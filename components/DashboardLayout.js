import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/dashboardLayout.module.css';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user } = useAuth();

  const navItems = [
    {
      path: '/dashboard',
      icon: '📚',
      label: 'Alle Lektionen',
      description: 'Ihre Lernfortschritt'
    },
    {
      path: '/dashboard/vocabulary',
      icon: '📝',
      label: 'Wortschatz',
      description: 'Gespeicherte Wörter'
    },
    {
      path: '/dashboard/settings',
      icon: '⚙️',
      label: 'Einstellungen',
      description: 'Profil & Präferenzen'
    }
  ];

  const isActive = (path) => {
    if (path === '/dashboard') {
      return router.pathname === '/dashboard';
    }
    return router.pathname.startsWith(path);
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className={styles.userDetails}>
              <h3 className={styles.userName}>{user?.name}</h3>
              <p className={styles.userEmail}>{user?.email}</p>
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
          <Link href="/" className={styles.backButton}>
            ← Zurück zur Startseite
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
