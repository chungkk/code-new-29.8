import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SEO, { generateBreadcrumbStructuredData } from '../../components/SEO';
import ProtectedPage from '../../components/ProtectedPage';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-toastify';
import styles from '../../styles/dashboard.module.css';


function SettingsPage() {
  const { t } = useTranslation();
  const { user, updateDifficultyLevel } = useAuth();
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
      toast.error(t('settings.password.errors.mismatch'));
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error(t('settings.password.errors.minLength'));
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
        toast.success(t('settings.password.success'));
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const error = await response.json();
        toast.error(error.message || t('settings.password.errors.failed'));
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(t('settings.password.errors.failed'));
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
        toast.success(t('settings.updateSuccess'));
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(t('settings.updateError'));
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(t('settings.updateError'));
    }
  };

  const handleDifficultyLevelUpdate = async (newLevel) => {
    try {
      const result = await updateDifficultyLevel(newLevel);
      if (result.success) {
        toast.success('Difficulty level updated successfully! 🎯');
      } else {
        toast.error('Failed to update difficulty level');
      }
    } catch (error) {
      console.error('Difficulty level update error:', error);
      toast.error('An error occurred');
    }
  };

  // Structured data
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: t('breadcrumb.home'), url: '/' },
    { name: t('breadcrumb.dashboard'), url: '/profile' },
    { name: t('breadcrumb.settings'), url: '/profile/settings' }
  ]);

  return (
    <>
      <SEO
        title={t('seo.settings.title')}
        description={t('seo.settings.description')}
        keywords={t('seo.settings.keywords')}
        structuredData={breadcrumbData}
        noindex={true}
      />

      <DashboardLayout>
        <div className={styles.dashboardGrid} style={{ gridTemplateColumns: '1fr' }}>
          <div className={styles.mainContent}>
            {/* Page Header */}
            <div className={styles.pageHeader}>
              <div>
                <h1 className={styles.pageTitle}>⚙️ {t('settings.title')}</h1>
                <p className={styles.pageSubtitle}>
                  {t('settings.subtitle')}
                </p>
              </div>
            </div>

            {/* Settings Sections */}
            <div className={styles.settingsGrid}>
            {/* Profile Card */}
            <div className={styles.settingCard}>
              <div className={styles.settingCardHeader}>
                <div className={styles.settingCardIcon}>👤</div>
                <h3 className={styles.settingCardTitle}>{t('settings.profile.title')}</h3>
              </div>
              <div className={styles.settingCardBody}>
                <div className={styles.profileInfo}>
                  <div className={styles.profileItem}>
                    <span className={styles.profileLabel}>{t('settings.profile.name')}</span>
                    <span className={styles.profileValue}>{user?.name}</span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileLabel}>{t('settings.profile.email')}</span>
                    <span className={styles.profileValue}>{user?.email}</span>
                  </div>
                  <div className={styles.profileItem}>
                    <span className={styles.profileLabel}>{t('settings.profile.role')}</span>
                    <span className={styles.profileValue}>
                      {user?.role === 'admin' ? t('settings.profile.admin') : t('settings.profile.user')}
                    </span>
                  </div>
                </div>

                {/* Native Language Section */}
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                  <label className={styles.settingLabel}>
                    🌐 {t('settings.nativeLanguage.title')}
                  </label>
                  <p className={styles.settingDescription}>
                    {t('settings.nativeLanguage.description')}
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
                    {t('settings.nativeLanguage.current')} <strong>{user?.nativeLanguage || 'Tiếng Việt'}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Theme Setting Card */}
            <div className={styles.settingCard}>
              <div className={styles.settingCardHeader}>
                <div className={styles.settingCardIcon}>🎨</div>
                <h3 className={styles.settingCardTitle}>{t('settings.appearance.title')}</h3>
              </div>
              <div className={styles.settingCardBody}>
                <p className={styles.settingDescription}>
                  {t('settings.appearance.description')}
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
                  {t('settings.appearance.current')} <strong>{currentTheme?.label}</strong>
                </p>
              </div>
            </div>

            {/* Learning Level & Difficulty Setting Card (Combined) */}
            <div className={styles.settingCard}>
              <div className={styles.settingCardHeader}>
                <div className={styles.settingCardIcon}>🎯</div>
                <h3 className={styles.settingCardTitle}>{t('lesson.ui.levelAndDifficulty')}</h3>
              </div>
              <div className={styles.settingCardBody}>
                {/* German Level Section */}
                <div style={{ marginBottom: '24px' }}>
                  <label className={styles.settingLabel}>
                    <strong>📊 {t('settings.level.title')}</strong>
                  </label>
                  <p className={styles.settingDescription} style={{ fontSize: '13px', marginTop: '6px', marginBottom: '10px' }}>
                    {t('settings.level.description')}
                  </p>
                  <select
                    value={user?.level || 'beginner'}
                    onChange={(e) => handleProfileUpdate('level', e.target.value)}
                    className={styles.settingSelect}
                  >
                    <option value="beginner">🌱 {t('settings.level.beginner')}</option>
                    <option value="experienced">🚀 {t('settings.level.experienced')}</option>
                    <option value="all">🎯 {t('settings.level.all')}</option>
                  </select>
                  <p className={styles.settingHint} style={{ fontSize: '12px', marginTop: '6px' }}>
                    {t('settings.level.hint')}
                  </p>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid var(--border-color, #e0e0e0)', margin: '16px 0' }}></div>

                {/* Dictation Difficulty Section */}
                <div>
                  <label className={styles.settingLabel}>
                    <strong>{t('lesson.ui.dictationDifficulty')}</strong>
                  </label>
                  <p className={styles.settingDescription} style={{ fontSize: '13px', marginTop: '6px', marginBottom: '10px' }}>
                    {t('lesson.ui.dictationDifficultyDesc')}
                  </p>
                  <select
                    value={user?.preferredDifficultyLevel || 'b1'}
                    onChange={(e) => handleDifficultyLevelUpdate(e.target.value)}
                    className={styles.settingSelect}
                  >
                    <option value="a1">A1 (10% hidden)</option>
                    <option value="a2">A2 (30% hidden)</option>
                    <option value="b1">B1 (30% hidden)</option>
                    <option value="b2">B2 (60% hidden)</option>
                    <option value="c1">C1 (100% hidden)</option>
                    <option value="c2">C2 (100% hidden)</option>
                  </select>
                  <p className={styles.settingHint} style={{ fontSize: '12px', marginTop: '6px' }}>
                    {t('lesson.ui.currentLevel')} <strong>{
                      user?.preferredDifficultyLevel === 'a1' ? 'A1 (10%)' :
                      user?.preferredDifficultyLevel === 'a2' ? 'A2 (30%)' :
                      user?.preferredDifficultyLevel === 'b1' ? 'B1 (30%)' :
                      user?.preferredDifficultyLevel === 'b2' ? 'B2 (60%)' :
                      user?.preferredDifficultyLevel === 'c1' ? 'C1 (100%)' :
                      user?.preferredDifficultyLevel === 'c2' ? 'C2 (100%)' :
                      'B1 (30%)'
                    }</strong>
                    {' '}<small>• {t('lesson.ui.appliesTo')}</small>
                  </p>
                </div>
              </div>
            </div>

            {/* Password Change Card */}
            <div className={styles.settingCard}>
              <div className={styles.settingCardHeader}>
                <div className={styles.settingCardIcon}>🔒</div>
                <h3 className={styles.settingCardTitle}>{t('settings.password.title')}</h3>
              </div>
              <div className={styles.settingCardBody}>
                <form onSubmit={handlePasswordChange} className={styles.passwordForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t('settings.password.current')}</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      className={styles.formInput}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t('settings.password.new')}</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      className={styles.formInput}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t('settings.password.confirm')}</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      className={styles.formInput}
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className={styles.submitButton}
                  >
                    {passwordLoading ? `🔄 ${t('settings.password.updating')}` : `🔒 ${t('settings.password.button')}`}
                  </button>
                </form>
              </div>
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
