import React from 'react';
import Head from 'next/head';
import '../styles/globals.css';
import '../styles/popup.css';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Component to show Header & Footer on all pages
function Layout({ children }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Deutsch Shadowing - German Learning App</title>
        <meta name="description" content="Learn German with Shadowing and Dictation methods" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="App">
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </div>
    </>
  );
}

export default MyApp;
