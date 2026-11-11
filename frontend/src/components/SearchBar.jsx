import React from 'react';
import { Search, Loader2, X, Sparkles, Zap, Brain, HelpCircle } from 'lucide-react';

export default function SearchBar({
  query,
  setQuery,
  onSearch,
  loading,
  onClear,
  onQuickQuery,
  queryUnderstanding,
  setQueryUnderstanding,
}) {
  const popularTopics = [
    "Two Sum",
    "topo sort graph",
    "kadane max subarr",
    "ll cycle tortoise",
    "two ptr 3sum",
    "dijkstra pq",
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      onSearch(query.trim());
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Main Search Input Form */}
      <form onSubmit={handleSubmit} style={{ position: 'relative', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-secondary)',
            border: `1.5px solid ${queryUnderstanding ? 'rgba(168, 85, 247, 0.4)' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '8px 12px 8px 16px',
            boxShadow: queryUnderstanding
              ? '0 8px 24px rgba(168, 85, 247, 0.15)'
              : '0 8px 24px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.25s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = queryUnderstanding ? '#a855f7' : 'var(--accent-red)';
            e.currentTarget.style.boxShadow = queryUnderstanding
              ? '0 0 0 3px rgba(168, 85, 247, 0.25)'
              : '0 0 0 3px var(--accent-red-glow)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = queryUnderstanding ? 'rgba(168, 85, 247, 0.4)' : 'var(--border-color)';
            e.currentTarget.style.boxShadow = queryUnderstanding
              ? '0 8px 24px rgba(168, 85, 247, 0.15)'
              : '0 8px 24px rgba(0, 0, 0, 0.3)';
          }}
        >
          <Search size={20} color="var(--text-muted)" style={{ marginRight: '12px', flexShrink: 0 }} />

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              queryUnderstanding
                ? "Search with shorthand/typos (e.g. 'topo sort graph', 'll cycle', 'kadane max')..."
                : "Search topic or problem (e.g. 'Binary Search', 'Two Sum')..."
            }
            disabled={loading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'inherit',
            }}
          />

          {query && !loading && (
            <button
              type="button"
              onClick={onClear}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                marginRight: '8px',
              }}
              title="Clear input"
            >
              <X size={18} />
            </button>
          )}

          <button
            type="submit"
            disabled={loading || !query.trim()}
            style={{
              backgroundColor: query.trim()
                ? (queryUnderstanding ? '#9333ea' : 'var(--accent-red)')
                : 'var(--bg-tertiary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: '0.92rem',
              cursor: query.trim() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s, transform 0.1s',
            }}
            onMouseEnter={(e) => {
              if (query.trim() && !loading) {
                e.currentTarget.style.backgroundColor = queryUnderstanding ? '#7e22ce' : 'var(--accent-red-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (query.trim()) {
                e.currentTarget.style.backgroundColor = queryUnderstanding ? '#9333ea' : 'var(--accent-red)';
              }
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Searching...</span>
              </>
            ) : (
              <span>Search</span>
            )}
          </button>
        </div>
      </form>

      {/* AI Query Understanding Feature Controls */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '12px 14px',
          backgroundColor: queryUnderstanding ? 'rgba(147, 51, 234, 0.08)' : 'rgba(255, 255, 255, 0.02)',
          border: `1px solid ${queryUnderstanding ? 'rgba(168, 85, 247, 0.3)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-md)',
          transition: 'all 0.2s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          {/* Toggle label & switch */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {/* Custom Switch Component */}
            <div
              onClick={() => setQueryUnderstanding(!queryUnderstanding)}
              style={{
                width: '38px',
                height: '22px',
                backgroundColor: queryUnderstanding ? '#9333ea' : 'var(--bg-tertiary)',
                borderRadius: '12px',
                position: 'relative',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  transform: queryUnderstanding ? 'translateX(16px)' : 'translateX(1px)',
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Brain size={15} color={queryUnderstanding ? '#c084fc' : 'var(--text-secondary)'} />
              <span
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: queryUnderstanding ? '#f3e8ff' : 'var(--text-primary)',
                }}
              >
                AI Query Understanding
              </span>
            </div>
          </label>

          {/* Active Mode Status Badge */}
          <div>
            {queryUnderstanding ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(168, 85, 247, 0.18)',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  color: '#d8b4fe',
                }}
              >
                <Sparkles size={12} color="#c084fc" />
                Enhanced Search Active
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 500,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                }}
              >
                <Zap size={12} color="var(--text-muted)" />
                Standard Search Active
              </span>
            )}
          </div>
        </div>

        {/* Short Description */}
        <p
          style={{
            fontSize: '0.78rem',
            color: queryUnderstanding ? 'rgba(216, 180, 254, 0.85)' : 'var(--text-muted)',
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          {queryUnderstanding
            ? 'Groq LLM normalizes DSA abbreviations (e.g. "topo sort" → DAG Kahn algorithm), fixes typos, and expands concepts prior to vector retrieval.'
            : 'Direct semantic vector search without LLM normalization. Fast and zero additional token consumption.'}
        </p>
      </div>

      {/* Suggested Quick Queries */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Sparkles size={12} color="var(--accent-red)" /> Suggested:
        </span>
        {popularTopics.map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() => onQuickQuery(topic)}
            disabled={loading}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '0.76rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = queryUnderstanding ? '#a855f7' : 'var(--accent-red)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  );
}
