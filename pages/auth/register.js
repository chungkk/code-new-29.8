import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import AuthForm from '../../components/AuthForm';

export default function Register() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5'
      }}>
        <div style={{ fontSize: '24px', color: '#667eea' }}>
           ⏳ Lädt...
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <>
      <Head>
         <title>Registrieren - Deutsch Shadowing</title>
      </Head>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '10px'
            }}>
              🎓 Deutsch Shadowing
            </h1>
            <p style={{ color: '#666', fontSize: '16px' }}>
               Erstellen Sie ein Konto, um zu beginnen
            </p>
          </div>

          <AuthForm mode="register" />

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ color: '#666', fontSize: '14px' }}>
               Haben Sie bereits ein Konto?{' '}
              <Link href="/auth/login" style={{
                color: '#667eea',
                textDecoration: 'none',
                fontWeight: 'bold'
              }}>
                 Anmelden
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}