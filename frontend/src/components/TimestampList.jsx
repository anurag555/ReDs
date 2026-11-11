import React from 'react';
import { Clock, Play, CheckCircle2 } from 'lucide-react';

export default function TimestampList({ timestamps, activeTimestamp, onSelectTimestamp }) {
  if (!timestamps || timestamps.length === 0) return null;

  return (
    <div style={{ marginTop: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <Clock size={16} color="var(--accent-red)" />
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Key Timestamps ({timestamps.length})
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {timestamps.map((ts, idx) => {
          const isActive = activeTimestamp === ts.seconds;

          return (
            <button
              key={`${ts.seconds}-${idx}`}
              type="button"
              onClick={() => onSelectTimestamp(ts.seconds)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isActive ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-secondary)',
                border: `1.5px solid ${isActive ? 'var(--accent-red)' : 'var(--border-color)'}`,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 0 16px var(--accent-red-glow)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--border-hover)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    backgroundColor: isActive ? 'var(--accent-red)' : 'var(--bg-tertiary)',
                    color: '#ffffff',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Play size={11} fill="#ffffff" />
                  {ts.label}
                </span>

                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#ffffff' : 'var(--text-primary)',
                  }}
                >
                  {ts.description}
                </span>
              </div>

              {isActive && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: 'var(--accent-red)',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={14} /> Playing
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

