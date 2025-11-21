import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO, { generateBreadcrumbStructuredData } from '../../components/SEO';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import AuthForm from '../../components/AuthForm';
import styles from '../../styles/auth.module.css';

export default function Register() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingText}>{t('auth.login.loadingText')}</div>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Registrieren', url: '/auth/register' }
  ]);

  return (
    <>
      <SEO
        title="Kostenlos Registrieren | PapaGeil - Deutsch Lernen"
        description="Erstellen Sie Ihr kostenloses PapaGeil-Konto und starten Sie heute mit interaktiven Deutsch-Lektionen. ✓ Shadowing-Methode ✓ Diktat-Übungen ✓ Fortschrittsverfolgung ✓ Alle Niveaus A1-C2"
        keywords="PapaGeil Registrierung, kostenloses Konto, Deutsch lernen kostenlos, German learning app, Deutsch Kurs anmelden, free German course"
        canonicalUrl="/auth/register"
        locale="de_DE"
        noindex={true}
        structuredData={breadcrumbData}
      />

      <div className={styles.authContainer}>
        <div className={styles.registerCard}>
          {/* Left Side - Illustration */}
          <div className={styles.registerLeftSide}>
            <div className={styles.illustrationContent}>
              <div className={styles.illustrationIcon}>🎓</div>
              <h2 className={styles.illustrationTitle}>
                {t('auth.register.illustrationTitle')}
              </h2>
              <p className={styles.illustrationSubtitle}>
                {t('auth.register.illustrationSubtitle')}
              </p>
              <div className={styles.featuresList}>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>🎯</span>
                  <span>{t('auth.register.features.lessons')}</span>
                </div>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>📚</span>
                  <span>{t('auth.register.features.vocabulary')}</span>
                </div>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>🎵</span>
                  <span>{t('auth.register.features.audio')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className={styles.registerRightSide}>
            <div className={styles.authHeader}>
              <h1 className={styles.authTitle}>{t('auth.register.createAccount')}</h1>
              <p className={styles.authSubtitle}>
                {t('auth.register.subtitle')}
              </p>
            </div>

            <AuthForm mode="register" />

            <div className={styles.authFooter}>
              <p className={styles.footerText}>
                {t('auth.register.hasAccount')}{' '}
                <Link href="/auth/login" className={styles.footerLink}>
                  {t('auth.register.loginLink')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}