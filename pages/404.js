import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';

export default function Custom404() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <>
      <SEO
        title="404 - Seite nicht gefunden | PapaGeil"
        description="Die gesuchte Seite konnte nicht gefunden werden. Kehren Sie zur Startseite zurück, um weiter Deutsch zu lernen."
        noindex={true}
      />

      <div style={{
        minHeight: 'calc(100vh - 200px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '600px',
          background: 'white',
          padding: '60px 40px',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)'
        }}>
          {/* 404 Number */}
          <div style={{
            fontSize: '120px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '20px',
            lineHeight: 1
          }}>
            404
          </div>

          {/* Error Icon */}
          <div style={{
            fontSize: '60px',
            marginBottom: '20px'
          }}>
            🔍
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '15px'
          }}>
            {t('404.title')}
          </h1>

          {/* Description */}
          <p style={{
            fontSize: '18px',
            color: '#666',
            marginBottom: '40px',
            lineHeight: 1.6
          }}>
            {t('404.subtitle')}
            <br />
            {t('404.description')}
          </p>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '15px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                padding: '15px 35px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '16px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }}
            >
              🏠 {t('404.goHome')}
            </Link>

            <button
              onClick={() => router.back()}
              style={{
                padding: '15px 35px',
                background: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f5f7fa';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              ← {t('404.goBack')}
            </button>
          </div>

          {/* Helpful Links */}
          <div style={{
            marginTop: '40px',
            paddingTop: '30px',
            borderTop: '1px solid #eee'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#999',
              marginBottom: '15px'
            }}>
              {t('404.suggestions')}
            </p>
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link
                href="/dashboard"
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  fontSize: '14px',
                  padding: '8px 15px',
                  background: '#f5f7fa',
                  borderRadius: '6px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#e8ecf4'}
                onMouseLeave={(e) => e.target.style.background = '#f5f7fa'}
              >
                {t('404.links.dashboard')}
              </Link>
              <Link
                href="/auth/login"
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  fontSize: '14px',
                  padding: '8px 15px',
                  background: '#f5f7fa',
                  borderRadius: '6px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#e8ecf4'}
                onMouseLeave={(e) => e.target.style.background = '#f5f7fa'}
              >
                {t('404.links.login')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
