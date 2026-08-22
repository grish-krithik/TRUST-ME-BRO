import React, { useState, useEffect } from 'react';
import StatsPanel from './components/StatsPanel';
import GanttChart from './components/GanttChart';
import TrackDiagram from './components/TrackDiagram';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('optimized'); // 'optimized' or 'baseline'

  useEffect(() => {
    async function fetchData() {
      try {
        const [optRes, baseRes, compRes] = await Promise.all([
          fetch('http://localhost:8000/schedule/optimized'),
          fetch('http://localhost:8000/schedule/baseline'),
          fetch('http://localhost:8000/compare')
        ]);
        
        if (!optRes.ok || !baseRes.ok || !compRes.ok) {
          throw new Error('Failed to fetch data from backend');
        }

        const optimized = await optRes.json();
        const baseline = await baseRes.json();
        const compare = await compRes.json();

        setData({ optimized, baseline, compare });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader2 className="animate-spin" size={48} style={{ color: 'var(--text-secondary)' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Computing optimal schedules (approx. 30s)...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="card" style={{ borderColor: 'var(--color-rajdhani)' }}>
          <h2>Error Loading Data</h2>
          <p style={{ color: 'var(--color-rajdhani)' }}>{error}</p>
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Is the FastAPI backend running?</p>
        </div>
      </div>
    );
  }

  const currentSchedule = mode === 'optimized' ? data.optimized : data.baseline;

  return (
    <div className="app-container">
      <header className="header">
        <h1>AI-Powered Train Traffic Control</h1>
        <div className="header-controls">
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
        </div>
      </header>

      <StatsPanel compare={data.compare} mode={mode} />

      <section className="card">
        <h2>Live Section View</h2>
        <TrackDiagram schedule={currentSchedule} />
      </section>

      <section className="card">
        <h2>Master Train Schedule (Gantt)</h2>
        <GanttChart schedule={currentSchedule} />
      </section>
    </div>
  );
}
