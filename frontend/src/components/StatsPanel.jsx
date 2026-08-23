import React from 'react';

function formatTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export default function StatsPanel({ compare, mode }) {
  const currentResult = mode === 'optimized' ? compare.optimized : compare.baseline;
  const improvement = compare.improvement;

  const trains = currentResult.trains.sort((a, b) => a.actual_finish - b.actual_finish);

  return (
    <div className="panel">
      <h2>Section Performance Summary {mode === 'optimized' ? '(AI CP-SAT)' : '(FCFS Baseline)'}</h2>
      
      {mode === 'optimized' && (
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(88, 166, 255, 0.1)', border: '1px solid var(--accent-color)', borderRadius: '6px' }}>
          <div>
            <div className="subtitle">Weighted Delay Reduction</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-signal-green)' }}>
              {improvement.weighted_delay_reduction_pct}% (↓ {improvement.weighted_delay_reduction} score)
            </div>
          </div>
          <div>
            <div className="subtitle">Bottleneck Throughput</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>
              +{improvement.throughput_increase_pct}% (↑ {improvement.throughput_increase} trains/hr)
            </div>
          </div>
          <div>
            <div className="subtitle">Solve Time</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {compare.optimized.summary.solve_time_seconds.toFixed(3)}s
            </div>
          </div>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Train</th>
            <th>Class</th>
            <th>Dir</th>
            <th>Scheduled Arr</th>
            <th>Actual Arr</th>
            <th>Delay</th>
          </tr>
        </thead>
        <tbody>
          {trains.map(t => {
            let delayClass = 'delay-none';
            if (t.delay > 15) delayClass = 'delay-major';
            else if (t.delay > 0) delayClass = 'delay-minor';

            return (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.id}</td>
                <td>{t.class}</td>
                <td>{t.direction === 'right' ? 'MAS→CBE' : 'CBE→MAS'}</td>
                <td>{formatTime(t.scheduled_finish)}</td>
                <td>{formatTime(t.actual_finish)}</td>
                <td>
                  <span className={`delay-badge ${delayClass}`}>
                    {t.delay === 0 ? 'On Time' : `+${t.delay}m`}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
