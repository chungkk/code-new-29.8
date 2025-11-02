import Head from 'next/head';
import { useRouter } from 'next/router';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deutsch-shadowing.com';
const SITE_NAME = 'Deutsch Shadowing';

export default function SEO({
  title = 'Deutsch Shadowing - Lerne Deutsch mit YouTube Videos',
  description = 'Verbessere dein Deutsch durch Shadowing und Diktat-Übungen mit authentischen YouTube-Videos. Über 100+ Lektionen für alle Niveaus A1-C2.',
  keywords = 'Deutsch lernen, Shadowing, Diktat, YouTube, Aussprache, Deutsch Übungen, German learning, Language learning',
  image = `${SITE_URL}/og-image.jpg`,
  type = 'website',
  author = 'Deutsch Shadowing Team',
  publishedTime,
  modifiedTime,
  canonical,
  noindex = false,
  nofollow = false,
  structuredData,
}) {
  const router = useRouter();
  const currentUrl = canonical || `${SITE_URL}${router.asPath}`;

  // Clean the URL (remove query params for canonical)
  const cleanUrl = currentUrl.split('?')[0].split('#')[0];

  // Ensure title is not too long (recommended: 50-60 chars)
  const metaTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;

  // Ensure description is not too long (recommended: 150-160 chars)
  const metaDescription = description.length > 160 ? description.substring(0, 157) + '...' : description;

  // Full title with site name
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />

      {/* Robots Meta */}
      {(noindex || nofollow) && (
        <meta name="robots" content={`${noindex ? 'noindex' : 'index'},${nofollow ? 'nofollow' : 'follow'}`} />
      )}

      {/* Canonical URL */}
      <link rel="canonical" href={cleanUrl} />

      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={cleanUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={metaTitle} />
      <meta property="og:locale" content="de_DE" />
      <meta property="og:locale:alternate" content="vi_VN" />
      <meta property="og:locale:alternate" content="en_US" />

      {/* Article specific tags */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={metaTitle} />
      <meta name="twitter:creator" content="@DeutschShadowing" />
      <meta name="twitter:site" content="@DeutschShadowing" />

      {/* Additional SEO Meta Tags */}
      <meta name="language" content="German" />
      <meta name="revisit-after" content="7 days" />
      <meta name="rating" content="general" />

      {/* Geo tags (if applicable) */}
      <meta name="geo.region" content="DE" />
      <meta name="geo.placename" content="Germany" />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData)
          }}
        />
      )}

      {/* Alternate languages (hreflang) */}
      <link rel="alternate" hreflang="de" href={cleanUrl} />
      <link rel="alternate" hreflang="vi" href={cleanUrl.replace('/de/', '/vi/')} />
      <link rel="alternate" hreflang="en" href={cleanUrl.replace('/de/', '/en/')} />
      <link rel="alternate" hreflang="x-default" href={cleanUrl} />
    </Head>
  );
}

// Helper function to generate Course structured data
export function generateCourseStructuredData(lesson) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: lesson.title,
    description: lesson.description || 'Lerne Deutsch durch Shadowing-Übungen',
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      sameAs: SITE_URL
    },
    image: lesson.thumbnail,
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: lesson.duration || 'PT10M',
    },
    inLanguage: 'de',
    educationalLevel: lesson.level || 'Beginner to Advanced',
    isAccessibleForFree: true,
  };
}

// Helper function to generate VideoObject structured data
export function generateVideoStructuredData(lesson) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: lesson.title,
    description: lesson.description || 'Deutsch Shadowing Übung',
    thumbnailUrl: lesson.thumbnail,
    uploadDate: lesson.createdAt,
    duration: lesson.duration,
    contentUrl: `${SITE_URL}/shadowing/${lesson.id}`,
    embedUrl: lesson.videoUrl,
    inLanguage: 'de',
    educationalUse: 'Language Learning',
    learningResourceType: 'Interactive Exercise',
  };
}

// Helper function to generate BreadcrumbList structured data
export function generateBreadcrumbStructuredData(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}
