import React, { useEffect } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import AuthForm from '../../components/AuthForm';

export default function RegisterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f5f5f5' 
      }}>
        <div style={{ fontSize: '24px', color: '#667eea' }}>
          ⏳ Đang kiểm tra...
        </div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return null;
  }

  return (
    <>
      <Head>
        <title>Đăng Ký - Deutsch Shadowing</title>
      </Head>
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <AuthForm mode="register" />
      </div>
    </>
  );
}
