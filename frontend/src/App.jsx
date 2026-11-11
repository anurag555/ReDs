import React, { useState } from 'react';
import SearchBar from './components/SearchBar.jsx';
import VideoPlayer from './components/VideoPlayer.jsx';
import TimestampList from './components/TimestampList.jsx';
import {
  PlayCircle,
  Cpu,
  Database,
  RotateCcw,
  AlertCircle,
  BookOpen,
  Sparkles,
  ArrowRight,
  Tag,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [activeTimestamp, setActiveTimestamp] = useState(0);
  const [mobileSearchMode, setMobileSearchMode] = useState(true);

  // AI Query Understanding layer toggle (Strictly defaults to false)
  const [queryUnderstanding, setQueryUnderstanding] = useState(false);

  // Handle search API call
  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          queryUnderstanding,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // If the backend returned a no-match (gibberish / low score), show friendly error
      if (data.noMatch) {
        const reasonMessages = {
          gibberish: `"${searchQuery}" doesn't look like a DSA topic. Try something like "Binary Search" or "Kadane's Algorithm".`,
          low_relevance_score: `No relevant lecture matched "${searchQuery}". The query may be too vague or unrelated to DSA.`,
          no_results: `No results found for "${searchQuery}". Try a different search term.`,
        };
        setError(reasonMessages[data.noMatchReason] || data.summary);
        setResult(null);
        setMobileSearchMode(true);
        return;
      }

      setResult(data);

      // Auto-select the first timestamp
      if (data.timestamps && data.timestamps.length > 0) {
        setActiveTimestamp(data.timestamps[0].seconds);
      } else {
        setActiveTimestamp(0);
      }

      // On mobile, switch to results view
      setMobileSearchMode(false);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to connect to search service.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResult(null);
    setError(null);
    setActiveTimestamp(0);
    setMobileSearchMode(true);
  };

  const handleQuickQuery = (topic) => {
    setQuery(topic);
    handleSearch(topic);
  };

  const handleSelectTimestamp = (seconds) => {
    setActiveTimestamp(seconds);
  };

  return (
    <div
      style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '24px 20px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'var(--accent-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px var(--accent-red-glow)',
            }}
          >
            <PlayCircle size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Re<span style={{ color: 'var(--accent-red)' }}>Ds</span>
            </h1>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Striver DSA Video RAG Search
            </span>
          </div>
        </div>

        {/* Tech Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              padding: '4px 10px',
              borderRadius: '20px',
            }}
          >
            <Cpu size={12} color="var(--accent-red)" /> Groq LLM
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              padding: '4px 10px',
              borderRadius: '20px',
            }}
          >
            <Database size={12} color="var(--accent-blue)" /> Qdrant
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '4px 10px',
              borderRadius: '20px',
            }}
          >
            <span className="pulse-badge" /> Online
          </span>
        </div>
      </header>

      {/* Main Content Area: Responsive Grid (Desktop Split / Mobile Stack) */}
      <main
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '32px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Search & Result Information */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Search Box */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>
              Search in Striver's Lecture Series
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Ask questions or search algorithms. We retrieve the exact lecture and pinpoint the 3 most crucial timestamps.
            </p>

            <SearchBar
              query={query}
              setQuery={setQuery}
              onSearch={handleSearch}
              loading={loading}
              onClear={handleClear}
              onQuickQuery={handleQuickQuery}
              queryUnderstanding={queryUnderstanding}
              setQueryUnderstanding={setQueryUnderstanding}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                color: '#fca5a5',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <AlertCircle size={18} color="var(--accent-red)" />
              <span>{error}</span>
            </div>
          )}

          {/* Search Result Overview & 3 Timestamps */}
          {result && result.videoId && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={16} color="var(--accent-red)" />
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--accent-red)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Lecture Match
                  </span>
                </div>

                {/* Mobile Search Again Button */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileSearchMode(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={12} />
                  <span>New Query</span>
                </button>
              </div>

              {/* AI Query Understanding Transformation Card (If active) */}
              {result.queryUnderstanding && result.queryUnderstanding.active && (
                <div
                  style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.08)',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={14} color="#c084fc" />
                      <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#d8b4fe', textTransform: 'uppercase' }}>
                        AI Query Normalization
                      </span>
                    </div>

                    {result.queryUnderstanding.detectedConcept && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          backgroundColor: 'rgba(168, 85, 247, 0.2)',
                          color: '#e9d5ff',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Tag size={10} /> {result.queryUnderstanding.detectedConcept}
                      </span>
                    )}
                  </div>

                  {/* Query transformation comparison */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.82rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>"{result.query}"</span>
                    <ArrowRight size={12} color="#a855f7" />
                    <span style={{ color: '#f3e8ff', fontWeight: 600 }}>
                      "{result.queryUnderstanding.normalizedQuery}"
                    </span>
                  </div>

                  {/* Expanded terms & Cache indicator */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '6px',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      paddingTop: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {result.queryUnderstanding.expandedTerms?.map((term, i) => (
                        <span
                          key={i}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            color: '#cbd5e1',
                          }}
                        >
                          +{term}
                        </span>
                      ))}
                    </div>

                    <span>
                      {result.queryUnderstanding.cached
                        ? '⚡ Loaded from memory cache (0 tokens)'
                        : result.queryUnderstanding.tokens
                        ? `Tokens: ${result.queryUnderstanding.tokens.totalTokens}`
                        : 'Standard Fallback'}
                    </span>
                  </div>
                </div>
              )}

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.4, marginBottom: '12px' }}>
                {result.videoTitle}
              </h3>

              {/* AI Synthesized Summary */}
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                }}
              >
                {result.summary}
              </div>

              {/* The 3 Timestamps */}
              <TimestampList
                timestamps={result.timestamps}
                activeTimestamp={activeTimestamp}
                onSelectTimestamp={handleSelectTimestamp}
              />
            </div>
          )}
        </section>

        {/* Right Column: Video Player Window */}
        <section
          style={{
            position: 'sticky',
            top: '24px',
          }}
        >
          <VideoPlayer
            videoId={result?.videoId}
            videoTitle={result?.videoTitle || ''}
            activeTimestamp={activeTimestamp}
            loading={loading}
          />
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          marginTop: '40px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.76rem',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <span>ReDs • RAG-Powered Search across Striver DSA Lectures</span>
        <span>Vector Search via Qdrant • AI Reasoning via Groq</span>
      </footer>
    </div>
  );
}
