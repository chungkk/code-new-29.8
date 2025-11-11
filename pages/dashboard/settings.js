import { useState } from 'react';
import SEO, { generateBreadcrumbStructuredData } from '../../components/SEO';
import ProtectedPage from '../../components/ProtectedPage';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-toastify';
import styles from '../../styles/dashboardPage.module.css';

function SettingsPage() {
  const { user } = useAuth();
  const { theme, themeOptions, setTheme, currentTheme } = useTheme();

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Neue Passwörter stimmen nicht überein!');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Neues Passwort muss mindestens 6 Zeichen lang sein!');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        toast.success('Passwort erfolgreich geändert!');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const error = await response.json();
        toast.error(error.message || 'Fehler beim Ändern des Passworts');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Fehler beim Ändern des Passworts');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleProfileUpdate = async (field, value) => {
    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ [field]: value })
      });

      if (response.ok) {
        toast.success('Einstellungen aktualisiert!');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error('Fehler beim Aktualisieren');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  // Structured data
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Dashboard', url: '/dashboard' },
    { name: 'Einstellungen', url: '/dashboard/settings' }
  ]);

  return (
    <>
      <SEO
        title="Einstellungen - Papageil"
        description="Verwalten Sie Ihre Kontoeinstellungen, Präferenzen und Profil."
        keywords="Einstellungen, Profil, Konto verwalten, Deutsch lernen Einstellungen"
        structuredData={breadcrumbData}
        noindex={true}
      />

      <DashboardLayout>
        <div className={styles.container}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>⚙️ Einstellungen</h1>
              <p className={styles.pageSubtitle}>
                Verwalten Sie Ihre Kontoeinstellungen und Präferenzen
              </p>
            </div>
          </div>

          {/* Settings Sections */}
          <div className={styles.settingsGrid}>
            {/* Profile Card */}
            <div className={styles.settingCard}>
              <div className={styles.settingCardHeader}>
                <div className={styles.settingCardIcon}>👤</div>
                <h3 className={styles.settingCardTitle}>Profil</h3>
              </div>
              <div className={styles.settingCardBody}>
                <div className={styles.profileInfo}>
                  <div className={styles.profileItem}>
                    <span className={styles.profileLabel}>Name:</span>
                    <span className={styles.profileValue}>{user?.name}</span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileLabel}>E-Mail:</span>
                    <span className={styles.profileValue}>{user?.email}</span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileLabel}>Rolle:</span>
                    <span className={styles.profileValue}>
                      {user?.role === 'admin' ? 'Administrator' : 'Benutzer'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Theme Setting Card */}
            <div className={styles.settingCard}>
              <div className={styles.settingCardHeader}>
                <div className={styles.settingCardIcon}>🎨</div>
                <h3 className={styles.settingCardTitle}>Darstellung</h3>
              </div>
              <div className={styles.settingCardBody}>
                <p className={styles.settingDescription}>
                  Wählen Sie Ihr bevorzugtes Farbschema
                </p>
                <div className={styles.themeOptions}>
                  {themeOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`${styles.themeOption} ${theme === option.id ? styles.themeOptionActive : ''}`}
                      onClick={() => setTheme(option.id)}
                      aria-pressed={theme === option.id}
                    >
                      <span className={styles.themeOptionEmoji} aria-hidden="true">
                        {option.emoji}
                      </span>
                      <span className={styles.themeOptionContent}>
                        <span className={styles.themeOptionLabel}>{option.label}</span>
                        <span className={styles.themeOptionDescription}>{option.description}</span>
                      </span>
                      {theme === option.id && (
                        <span className={styles.checkmark}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
                <p className={styles.settingHint}>
                  Aktuell: <strong>{currentTheme?.label}</strong>
                </p>
              </div>
            </div>

            {/* Language Setting Card */}
            <div className={styles.settingCard}>
              <div className={styles.settingCardHeader}>
                <div className={styles.settingCardIcon}>🌐</div>
                <h3 className={styles.settingCardTitle}>Muttersprache</h3>
              </div>
              <div className={styles.settingCardBody}>
                <p className={styles.settingDescription}>
                  Wählen Sie Ihre Muttersprache für Übersetzungen
                </p>
                <select
                  value={user?.nativeLanguage || 'vi'}
                  onChange={(e) => handleProfileUpdate('nativeLanguage', e.target.value)}
                  className={styles.settingSelect}
                >
                  <option value="vi">🇻🇳 Tiếng Việt</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="de">🇩🇪 Deutsch</option>
                  <option value="it">🇮🇹 Italiano</option>
                  <option value="pt">🇵🇹 Português</option>
                  <option value="ru">🇷🇺 Русский</option>
                  <option value="ja">🇯🇵 日本語</option>
                  <option value="ko">🇰🇷 한국어</option>
                  <option value="zh">🇨🇳 中文</option>
                </select>
                <p className={styles.settingHint}>
                  Aktuelle Sprache: <strong>{user?.nativeLanguage || 'Tiếng Việt'}</strong>
                </p>
              </div>
            </div>

            {/* Level Setting Card */}
            <div className={styles.settingCard}>
              <div className={styles.settingCardHeader}>
                <div className={styles.settingCardIcon}>📊</div>
                <h3 className={styles.settingCardTitle}>Deutsch-Niveau</h3>
              </div>
              <div className={styles.settingCardBody}>
                <p className={styles.settingDescription}>
                  Wählen Sie Ihr aktuelles Deutsch-Niveau
                </p>
                <select
                  value={user?.level || 'beginner'}
                  onChange={(e) => handleProfileUpdate('level', e.target.value)}
                  className={styles.settingSelect}
                >
                  <option value="beginner">🌱 Anfänger (A1-A2)</option>
                  <option value="experienced">🚀 Fortgeschritten (B1+)</option>
                  <option value="all">🎯 Alle Niveaus</option>
                </select>
                <p className={styles.settingHint}>
                  Lektionen auf der Startseite werden automatisch nach deinem gewählten Niveau gefiltert
                </p>
              </div>
            </div>

            {/* Password Change Card */}
            <div className={`${styles.settingCard} ${styles.fullWidth}`}>
              <div className={styles.settingCardHeader}>
                <div className={styles.settingCardIcon}>🔒</div>
                <h3 className={styles.settingCardTitle}>Passwort ändern</h3>
              </div>
              <div className={styles.settingCardBody}>
                <p className={styles.settingDescription}>
                  Ändern Sie Ihr Passwort für mehr Sicherheit
                </p>
                <form onSubmit={handlePasswordChange} className={styles.passwordForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Aktuelles Passwort</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      className={styles.formInput}
                      required
                      placeholder="Ihr aktuelles Passwort eingeben"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Neues Passwort</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      className={styles.formInput}
                      required
                      minLength={6}
                      placeholder="Mindestens 6 Zeichen"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Neues Passwort bestätigen</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      className={styles.formInput}
                      required
                      minLength={6}
                      placeholder="Neues Passwort wiederholen"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className={styles.submitButton}
                  >
                    {passwordLoading ? '🔄 Wird geändert...' : '🔒 Passwort ändern'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

export default function Settings() {
  return (
    <ProtectedPage>
      <SettingsPage />
    </ProtectedPage>
  );
}
