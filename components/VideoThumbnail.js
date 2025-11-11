import React from 'react';
import Image from 'next/image';

// Helper function to extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url) => {
  if (!url) return null;

  // Match youtube.com/watch?v=ID
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
  const match = url.match(youtubeRegex);

  return match ? match[1] : null;
};

const VideoThumbnail = ({ lesson, className = '' }) => {
  // If lesson has YouTube URL, use YouTube thumbnail
  if (lesson.youtubeUrl) {
    const videoId = getYouTubeVideoId(lesson.youtubeUrl);
    if (videoId) {
      // Use medium quality for faster loading (320x180, ~30KB vs ~100KB for hqdefault)
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

      return (
        <div className={`video-thumbnail ${className}`}>
          <Image
            src={thumbnailUrl}
            alt={lesson.displayTitle || lesson.title}
            width={320}
            height={180}
            loading="lazy"
            onError={(e) => {
              // Fallback to default quality if medium quality fails
              e.target.src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
            }}
          />
          <div className="youtube-badge">
            <span className="youtube-icon">▶</span> Youtube
          </div>
        </div>
      );
    }
  }

  // If lesson has uploaded thumbnail, use it
  if (lesson.thumbnail) {
    return (
      <div className={`video-thumbnail ${className}`}>
        <Image
          src={lesson.thumbnail}
          alt={lesson.displayTitle || lesson.title}
          width={320}
          height={180}
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback: No thumbnail available, show placeholder
  return (
    <div className={`video-thumbnail placeholder ${className}`}>
      <div className="placeholder-content">
        <span className="placeholder-icon">🎵</span>
        <span className="placeholder-text">Audio</span>
      </div>
    </div>
  );
};

export default VideoThumbnail;
