import { useEffect } from 'react';
import { useRouter } from 'next/router';
import SEO from '../../components/SEO';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import AuthForm from '../../components/AuthForm';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import styles from '../../styles/auth.module.css';

export default function Login() {
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
          <div className={styles.loadingText}>⏳ Lädt...</div>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <>
      <SEO
        title="Anmelden - Papageil"
        description="Melden Sie sich an, um Ihre Deutsch-Lernreise fortzusetzen. Greifen Sie auf personalisierte Lektionen, Fortschrittsverfolgung und Wortschatz zu."
        keywords="Papageil Login, Anmelden, Deutsch lernen Login"
        noindex={true}
      />

      <div className={styles.authContainer}>
        <div className={styles.loginCard}>
          <div className={styles.authHeader}>
            <div className={styles.brandHeader}>
              <span className={styles.brandIcon}>🦜</span>
            </div>
            <h1 className={styles.authTitle}>Papageil</h1>
            <p className={styles.authSubtitle}>
              Melden Sie sich an, um weiterzulernen
            </p>
          </div>

          <AuthForm mode="login" />

          <div className={styles.divider}>
            <div className={styles.dividerLine}></div>
            <span className={styles.dividerText}>oder</span>
            <div className={styles.dividerLine}></div>
          </div>

          <GoogleSignInButton />

          <div className={styles.authFooter}>
            <p className={styles.footerText}>
              Noch kein Konto?{' '}
              <Link href="/auth/register" className={styles.footerLink}>
                Jetzt registrieren
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}