import React from 'react';
import { ExternalLink, Video, Tv } from 'lucide-react';

export default function VideoPlayer({ videoId, videoTitle, activeTimestamp, loading }) {
  if (loading) {
    return (
      <div
        className="glass-panel"
        style={{
          width: '100%',
          aspectRatio: '16/9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          color: 'var(--text-secondary)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--accent-red)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ fontSize: '0.9rem' }}>Searching vector database & finding best lecture moments...</p>
      </div>
    );
  }

  if (!videoId) {
    return (
      <div
        className="glass-panel"
        style={{
          width: '100%',
          aspectRatio: '16/9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          border: '1.5px dashed var(--border-color)',
          color: 'var(--text-muted)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <Tv size={28} color="var(--accent-red)" />
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Video Player Window
        </h3>
        <p style={{ fontSize: '0.85rem', maxWidth: '340px', lineHeight: 1.5 }}>
          Search for any DSA problem or topic on the left. The matching Striver lecture will load and play here with exact timestamp jump points.
        </p>
      </div>
    );
  }

  // Construct iframe embed URL with active timestamp
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?start=${activeTimestamp || 0}&autoplay=1&rel=0`;
  const directWatchUrl = `https://youtu.be/${videoId}?t=${activeTimestamp || 0}`;

  return (
    <div
      className="glass-panel"
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Video Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(10, 13, 20, 0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <Video size={18} color="var(--accent-red)" style={{ flexShrink: 0 }} />
          <span
            style={{
              fontSize: '0.88rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '380px',
            }}
            title={videoTitle}
          >
            {videoTitle}
          </span>
        </div>

        <a
          href={directWatchUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.78rem',
            color: 'var(--accent-blue)',
            textDecoration: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            background: 'rgba(56, 189, 248, 0.08)',
            flexShrink: 0,
          }}
        >
          <span>Open YouTube</span>
          <ExternalLink size={12} />
        </a>
      </div>

      {/* 16:9 Responsive Video Iframe */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: '#000000' }}>
        <iframe
          key={`${videoId}-${activeTimestamp}`}
          src={embedUrl}
          title={videoTitle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      </div>

      {/* Bottom Bar */}
      <div
        style={{
          padding: '8px 16px',
          fontSize: '0.76rem',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <span>Video ID: <code>{videoId}</code></span>
        <span>Playing at: <strong>{activeTimestamp || 0}s</strong></span>
      </div>
    </div>
  );
}
