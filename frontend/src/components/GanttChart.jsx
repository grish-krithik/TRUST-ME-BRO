import React from 'react';

const COLOR_MAP = {
  'Rajdhani/Vande Bharat': 'var(--color-rajdhani)', 
  'Mail/Express': 'var(--color-mail)', 
  'Passenger': 'var(--color-passenger)', 
  'Freight': 'var(--color-freight)' 
};

const formatTime = (minutes) => {
    const d = Math.floor(minutes / (24 * 60));
    const h = Math.floor((minutes % (24 * 60)) / 60);
    const m = Math.floor(minutes % 60);
    let dayStr = d > 0 ? `+${d}d ` : '';
    return `${dayStr}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export default function GanttChart({ schedule }) {
  if (!schedule || !schedule.trains) return null;

  const maxTime = Math.max(
    ...schedule.trains.map(t => t.actual_finish),
    ...schedule.trains.map(t => t.scheduled_finish)
  );
  
  const minTime = Math.min(
    ...schedule.trains.map(t => t.segments[0].entry_time)
  );

  const horizon = Math.max(maxTime - minTime, 1) * 1.05;

  const sortedTrains = [...schedule.trains].sort((a, b) => a.segments[0].entry_time - b.segments[0].entry_time);

  return (
    <div style={{ position: 'relative', width: '100%', overflowX: 'auto', paddingBottom: '2rem' }}>
      <div style={{ minWidth: '800px' }}>
        {/* Header / Time Axis */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          <div style={{ width: '150px', flexShrink: 0, fontWeight: 600 }}>Train ID</div>
          <div style={{ width: '80px', flexShrink: 0, fontWeight: 600 }}>Sched Arr</div>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            {/* Tick marks every 60 mins */}
            {Array.from({ length: Math.ceil(horizon / 60) + 1 }).map((_, i) => (
              <div 
                key={i} 
                style={{ 
                  position: 'absolute', 
                  left: `${((i * 60) / horizon) * 100}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {formatTime(minTime + (i * 60))}
              </div>
            ))}
          </div>
        </div>

        {/* Train Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sortedTrains.map(train => {
            const color = COLOR_MAP[train.train_class] || 'var(--text-primary)';
            
            return (
              <div key={train.train_id} style={{ display: 'flex', alignItems: 'center', position: 'relative', height: '2.5rem' }}>
                {/* Labels */}
                <div style={{ width: '150px', flexShrink: 0, fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
                  {train.train_id}
                </div>
                <div style={{ width: '80px', flexShrink: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {formatTime(train.scheduled_finish)}
                </div>

                {/* Timeline */}
                <div style={{ position: 'relative', flexGrow: 1, height: '100%', backgroundColor: 'var(--surface-color-light)', borderRadius: '0.25rem' }}>
                  
                  {Array.from({ length: Math.ceil(horizon / 60) + 1 }).map((_, i) => (
                    <div 
                      key={i} 
                      style={{ 
                        position: 'absolute', 
                        left: `${((i * 60) / horizon) * 100}%`,
                        top: 0,
                        bottom: 0,
                        width: '1px',
                        backgroundColor: 'var(--border-color)',
                        opacity: 0.5
                      }}
                    />
                  ))}

                  <div 
                    title={`Ideal Finish: ${formatTime(train.scheduled_finish)}`}
                    style={{
                      position: 'absolute',
                      left: `${((train.scheduled_finish - minTime) / horizon) * 100}%`,
                      top: '-4px',
                      bottom: '-4px',
                      width: '2px',
                      backgroundColor: 'var(--text-secondary)',
                      borderLeft: '1px dashed rgba(255,255,255,0.3)',
                      zIndex: 1
                    }}
                  />

                  {train.segments.map((seg, idx) => {
                    const startPct = ((seg.entry_time - minTime) / horizon) * 100;
                    const widthPct = ((seg.exit_time - seg.entry_time) / horizon) * 100;
                    
                    return (
                      <div
                        key={idx}
                        title={`${seg.segment_name}: ${formatTime(seg.entry_time)} - ${formatTime(seg.exit_time)}`}
                        style={{
                          position: 'absolute',
                          left: `${startPct}%`,
                          width: `${widthPct}%`,
                          top: '20%',
                          height: '60%',
                          backgroundColor: color,
                          opacity: 0.8,
                          borderRadius: '0.125rem',
                          border: '1px solid rgba(0,0,0,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          fontSize: '0.65rem',
                          color: '#fff',
                          fontWeight: 600,
                          cursor: 'default',
                          transition: 'all 0.2s',
                          zIndex: 2
                        }}
                      >
                        {widthPct > 3 ? seg.segment_name : ''}
                      </div>
                    );
                  })}
                  
                  {train.actual_finish > train.scheduled_finish && (
                    <div 
                      title={`Delay: ${train.delay}m`}
                      style={{
                        position: 'absolute',
                        left: `${((train.scheduled_finish - minTime) / horizon) * 100}%`,
                        width: `${((train.actual_finish - train.scheduled_finish) / horizon) * 100}%`,
                        top: '50%',
                        height: '2px',
                        backgroundColor: 'var(--color-signal-red)',
                        opacity: 1,
                        zIndex: 0
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
