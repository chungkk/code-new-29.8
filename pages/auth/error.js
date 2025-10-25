import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function ErrorPage() {
  const router = useRouter();
  const { error } = router.query;

  const errorMessages = {
    Configuration: 'Có lỗi cấu hình server',
    AccessDenied: 'Truy cập bị từ chối',
    Verification: 'Token đã hết hạn hoặc đã được sử dụng',
    Default: 'Có lỗi xảy ra khi đăng nhập',
  };

  const errorMessage = error && errorMessages[error] 
    ? errorMessages[error] 
    : errorMessages.Default;

  return (
    <>
      <Head>
        <title>Lỗi Đăng Nhập - Deutsch Shadowing</title>
      </Head>
      <div style={{ 
        minHeight: '100vh', 
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          maxWidth: '400px',
          padding: '30px',
          background: 'white',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ marginBottom: '15px', color: '#c33' }}>Lỗi Đăng Nhập</h2>
          <p style={{ marginBottom: '25px', color: '#666' }}>
            {errorMessage}
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            style={{
              padding: '10px 20px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Thử Lại
          </button>
        </div>
      </div>
    </>
  );
}
