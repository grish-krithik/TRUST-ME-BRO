import React, { useState, useEffect } from 'react';
import StatsPanel from './components/StatsPanel';
import GanttChart from './components/GanttChart';
import TrackDiagram from './components/TrackDiagram';
import PhysicsEngine from './components/PhysicsEngine';
import { Loader2 } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'red', background: '#000' }}>
          <h2>Something went wrong in the React render tree.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children; 
  }
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('optimized'); // 'optimized' or 'baseline'
  const [showPhysics, setShowPhysics] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    async function fetchData(retries = 10) {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      try {
        const [optRes, baseRes, compRes] = await Promise.all([
          fetch(`${API_BASE}/schedule/optimized`),
          fetch(`${API_BASE}/schedule/baseline`),
          fetch(`${API_BASE}/compare`)
        ]);
        
        if (!optRes.ok || !baseRes.ok || !compRes.ok) {
          throw new Error('Failed to fetch data from backend');
        }

        const optimized = await optRes.json();
        const baseline = await baseRes.json();
        const compare = await compRes.json();

        if (isSubscribed) {
          setData({ optimized, baseline, compare });
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (retries > 0 && isSubscribed) {
          setError(`Backend not ready yet. Waiting for AI computation to finish... (${retries} retries left)`);
          setTimeout(() => fetchData(retries - 1), 5000);
        } else if (isSubscribed) {
          setError(err.message);
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => { isSubscribed = false; };
  }, []);

  if (loading && !error) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader2 className="animate-spin" size={48} style={{ color: 'var(--text-secondary)' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Computing optimal schedules (approx. 30s)...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="card" style={{ borderColor: 'var(--color-rajdhani)', textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={48} style={{ color: 'var(--color-rajdhani)', margin: '0 auto' }} />
          <h2 style={{ marginTop: '1rem' }}>Starting up...</h2>
          <p style={{ color: 'var(--color-rajdhani)', marginTop: '0.5rem' }}>{error}</p>
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>The AI (CP-SAT solver) takes about 30 seconds to compute the routes before the server opens.</p>
        </div>
      </div>
    );
  }

  const currentSchedule = mode === 'optimized' ? data.optimized : data.baseline;

  return (
    <ErrorBoundary>
      <div className="app-container">
        <header className="header">
          <h1>AI-Powered Train Traffic Control</h1>
          <div className="header-controls">
            <button 
              className={showPhysics ? 'active' : ''} 
              style={{ padding: '0.5rem 1rem', borderRadius: '4px', background: showPhysics ? 'var(--accent-color)' : 'transparent', color: showPhysics ? '#fff' : 'var(--accent-color)', border: '1px solid var(--accent-color)', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => setShowPhysics(!showPhysics)}
            >
              {showPhysics ? 'Back to Dashboard' : 'View AI Physics & Math'}
            </button>
            {!showPhysics && (
              <div className="mode-toggle">
                <button 
                  className={mode === 'baseline' ? 'active' : ''} 
                  onClick={() => setMode('baseline')}
                >
                  FCFS Manual Control
                </button>
                <button 
                  className={mode === 'optimized' ? 'active' : ''} 
                  onClick={() => setMode('optimized')}
                >
                  AI Optimized (CP-SAT)
                </button>
              </div>
            )}
          </div>
        </header>

        {showPhysics ? (
          <PhysicsEngine schedule={currentSchedule} />
        ) : (
          <>
            <StatsPanel currentSchedule={currentSchedule} compare={data.compare} mode={mode} />

            <section className="card">
              <h2>Live Section View</h2>
              <TrackDiagram schedule={currentSchedule} />
            </section>

            <section className="card">
              <h2>Master Train Schedule (Gantt)</h2>
              <GanttChart schedule={currentSchedule} />
            </section>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
