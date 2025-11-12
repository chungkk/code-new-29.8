import React from 'react';
import Head from 'next/head';

const SEO = ({
  title = 'Parroto - Learn English with Shadowing & Dictation',
  description = 'Improve your English pronunciation and speaking skills with modern shadowing and dictation methods.',
  keywords = 'English learning, shadowing, dictation, pronunciation practice, speaking skills',
  ogImage = '/og-image.jpg',
  ogUrl,
  structuredData,
}) => {
  const siteTitle = title.includes('Parroto') ? title : `${title} | Parroto`;

  return (
    <Head>
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      {ogUrl && <meta property="og:url" content={ogUrl} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
    </Head>
  );
};

export const generateBreadcrumbStructuredData = (breadcrumbs) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
};

export const generateVideoStructuredData = (lesson) => {
  if (!lesson) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: lesson.title || lesson.displayTitle,
    description: lesson.description || `Learn with this ${lesson.difficulty || 'beginner'} level lesson`,
    thumbnailUrl: lesson.thumbnail || lesson.thumbnailUrl,
    uploadDate: lesson.createdAt || new Date().toISOString(),
    duration: lesson.duration ? `PT${Math.floor(lesson.duration / 60)}M${lesson.duration % 60}S` : undefined,
    contentUrl: lesson.youtubeUrl || lesson.videoUrl,
    embedUrl: lesson.youtubeUrl || lesson.videoUrl,
  };
};

export default SEO;
