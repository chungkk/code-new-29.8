import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const DashboardLayout = ({ children }) => {
  const router = useRouter();

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

  return (
    <div style={{
      display: 'flex',
      minHeight: 'calc(100vh - 64px)',
      maxWidth: '1400px',
      margin: '0 auto',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '250px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        padding: 'var(--spacing-lg)',
      }}>
        <nav style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-sm)',
        }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                padding: '12px 16px',
                borderRadius: 'var(--border-radius-small)',
                textDecoration: 'none',
                color: isActive(item.href) ? 'var(--accent-blue)' : 'var(--text-primary)',
                background: isActive(item.href) ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
                fontWeight: isActive(item.href) ? '600' : '500',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{
        flex: 1,
        padding: 'var(--spacing-xl) var(--spacing-lg)',
        overflowY: 'auto',
      }}>
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
