import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Zap } from 'lucide-react';

const STATIONS = ['MAS', 'AJJ', 'KPD', 'SA', 'ED', 'CBE'];

const COLOR_MAP = {
  'Rajdhani/Vande Bharat': '#ec4899', // Pink glow
  'Mail/Express': '#3b82f6', // Blue glow
  'Passenger': '#eab308', // Yellow
  'Freight': '#10b981' // Green
};

const formatTime = (minutes) => {
    const d = Math.floor(minutes / (24 * 60));
    const h = Math.floor((minutes % (24 * 60)) / 60);
    const m = Math.floor(minutes % 60);
    let dayStr = d > 0 ? `+${d}d ` : '';
    return `${dayStr}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export default function TrackDiagram({ schedule }) {
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const maxTimeRef = useRef(0);
  const minTimeRef = useRef(0);
  const reqRef = useRef();
  
  const speedScale = 0.5; 

  useEffect(() => {
    if (schedule && schedule.trains) {
      maxTimeRef.current = Math.max(...schedule.trains.map(t => t.actual_finish));
      const allEntries = schedule.trains.flatMap(t => t.segments.map(s => s.entry_time));
      minTimeRef.current = Math.min(...allEntries);
      setTime(minTimeRef.current);
      setIsPlaying(false);
    }
  }, [schedule]);

  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        setTime(t => {
          if (t >= maxTimeRef.current) {
            setIsPlaying(false);
            return maxTimeRef.current;
          }
          return t + speedScale;
        });
        reqRef.current = requestAnimationFrame(animate);
      };
      reqRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(reqRef.current);
  }, [isPlaying]);

  if (!schedule) return null;

  const trackWidth = 1000;
  const padding = 80;
  const usableWidth = trackWidth - 2 * padding;
  const stationSpacing = usableWidth / (STATIONS.length - 1);

  const activeTrains = schedule.trains.map(train => {
    let currentPos = null;
    let isActive = false;
    let direction = train.direction;
    let isCoasting = false;
    let isDwelling = false;

    for (const seg of train.segments) {
      if (time >= seg.entry_time && time <= seg.exit_time) {
        isActive = true;
        const progress = (time - seg.entry_time) / (seg.exit_time - seg.entry_time);
        
        let startIdx = STATIONS.indexOf(seg.segment_name.split('-')[0]);
        let endIdx = STATIONS.indexOf(seg.segment_name.split('-')[1]);
        
        if (direction === 'left') {
          const temp = startIdx;
          startIdx = endIdx;
          endIdx = temp;
        }

        const startX = padding + startIdx * stationSpacing;
        const endX = padding + endIdx * stationSpacing;
        
        currentPos = startX + (endX - startX) * progress;
        break;
      }
    }

    if (!isActive) {
      for (let i = 0; i < train.segments.length - 1; i++) {
        const seg1 = train.segments[i];
        const seg2 = train.segments[i+1];
        if (time > seg1.exit_time && time < seg2.entry_time) {
          isActive = true;
          isDwelling = true;
          if (train.eco_coasting_minutes > 0) isCoasting = true;
          
          let stationName = '';
          const s1 = seg1.segment_name.split('-');
          const s2 = seg2.segment_name.split('-');
          stationName = s1.find(s => s2.includes(s));
          const statIdx = STATIONS.indexOf(stationName);
          
          currentPos = padding + statIdx * stationSpacing;
          break;
        }
      }
    }

    if (!isActive) return null;

    return {
      id: train.train_id,
      class: train.train_class,
      pos: currentPos,
      color: COLOR_MAP[train.train_class],
      dir: direction,
      isDwelling,
      isCoasting
    };
  }).filter(Boolean);

  // Generate track segments visually
  const renderTrackLines = (yOffset, opacity = 1) => {
    return (
      <g opacity={opacity}>
        <line x1={padding - 20} y1={yOffset - 2} x2={trackWidth - padding + 20} y2={yOffset - 2} stroke="#334155" strokeWidth={1} />
        <line x1={padding - 20} y1={yOffset + 2} x2={trackWidth - padding + 20} y2={yOffset + 2} stroke="#334155" strokeWidth={1} />
        {/* Sleepers */}
        <line x1={padding - 20} y1={yOffset} x2={trackWidth - padding + 20} y2={yOffset} stroke="#1e293b" strokeWidth={6} strokeDasharray="2 6" />
      </g>
    );
  };

  const renderSiding = (cx, baseY, isUp) => {
    const yTarget = isUp ? baseY - 20 : baseY + 20;
    const xSpread = 40;
    return (
      <g opacity={0.6}>
        <path 
          d={`M ${cx - xSpread - 10} ${baseY} L ${cx - xSpread + 10} ${yTarget} L ${cx + xSpread - 10} ${yTarget} L ${cx + xSpread + 10} ${baseY}`}
          fill="transparent" stroke="#334155" strokeWidth={2}
        />
        <path 
          d={`M ${cx - xSpread - 10} ${baseY} L ${cx - xSpread + 10} ${yTarget} L ${cx + xSpread - 10} ${yTarget} L ${cx + xSpread + 10} ${baseY}`}
          fill="transparent" stroke="#1e293b" strokeWidth={6} strokeDasharray="2 6"
        />
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.5) 100%)', borderLeft: '4px solid #10b981', borderRadius: '8px', fontSize: '0.9rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <Zap size={20} color="#10b981" />
        <div>
          <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '2px' }}>NTES Real-Time Database Active (MAS-CBE Route)</strong>
          <span style={{ color: '#94a3b8' }}>
            {activeTrains.some(t => t.isCoasting) 
              ? "Predictive Action: Slower freight shifted to siding line (Eco-Coasting) to clear UP/DOWN main line for high-priority express." 
              : "100% Electrified Double-Line Section tracking live. Simulating daily schedule overtakes."}
          </span>
        </div>
      </div>

      <div className="track-diagram-container" style={{ background: 'linear-gradient(180deg, #020617 0%, #0f172a 100%)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #1e293b', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
        <svg viewBox={`0 0 ${trackWidth} 260`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Render Main Double Lines (DOWN = 100, UP = 160) */}
          {renderTrackLines(100)}
          {renderTrackLines(160)}
          
          {/* Labels for lines */}
          <text x={20} y={104} fill="#475569" fontSize={10} fontWeight="bold">DOWN LINE</text>
          <text x={20} y={164} fill="#475569" fontSize={10} fontWeight="bold">UP LINE</text>

          {/* Render Stations & Sidings */}
          {STATIONS.map((st, i) => {
            const cx = padding + i * stationSpacing;
            return (
              <g key={i}>
                {/* UP & DOWN Loop Sidings */}
                {renderSiding(cx, 100, true)}  {/* DOWN Loop */}
                {renderSiding(cx, 160, false)} {/* UP Loop */}
                
                {/* Platform representation */}
                <rect x={cx - 30} y={115} width={60} height={30} fill="#1e293b" stroke="#334155" strokeWidth={1} rx={4} />
                <rect x={cx - 28} y={117} width={56} height={26} fill="#0f172a" rx={2} />
                
                <text x={cx} y={135} fill="#f8fafc" fontSize={14} fontWeight="bold" textAnchor="middle" letterSpacing="1">{st}</text>
                
                <text x={cx} y={205} fill="#94a3b8" fontSize={11} textAnchor="middle">
                  {st === 'MAS' ? 'Chennai Cntl' : 
                   st === 'AJJ' ? 'Arakkonam' :
                   st === 'KPD' ? 'Katpadi' :
                   st === 'SA' ? 'Salem' :
                   st === 'ED' ? 'Erode' : 'Coimbatore'}
                </text>
                
                {/* Station Node Pulse */}
                <circle cx={cx} cy={130} r={2} fill="#3b82f6" opacity={0.5} />
              </g>
            );
          })}

          {/* Render Trains */}
          {activeTrains.map((t) => {
            // DOWN uses y=100 (main) or y=80 (siding)
            // UP uses y=160 (main) or y=180 (siding)
            let y = 100;
            
            if (t.dir === 'right') {
                y = t.isDwelling ? 80 : 100;
            } else {
                y = t.isDwelling ? 180 : 160;
            }
            
            return (
              <g key={t.id} transform={`translate(${t.pos}, ${y})`} style={{ transition: 'transform 0.1s linear' }}>
                <rect x={-20} y={-8} width={40} height={16} fill={t.color} rx={4} filter="url(#glow)" opacity={0.9} />
                
                {/* Train Window Detail */}
                <rect x={-14} y={-4} width={28} height={8} fill="rgba(0,0,0,0.3)" rx={1} />
                
                <text y={-14} fontSize={10} fill={t.color} fontWeight="bold" textAnchor="middle" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  {t.id.split('-')[0]}
                </text>
                
                {/* Direction Headlight */}
                {t.dir === 'right' ? (
                  <circle cx={14} cy={0} r={2} fill="#fff" filter="url(#glow)" />
                ) : (
                  <circle cx={-14} cy={0} r={2} fill="#fff" filter="url(#glow)" />
                )}
                
                {/* Eco Coasting Indicator */}
                {t.isCoasting && (
                   <g transform="translate(0, -25)">
                     <circle cx={0} cy={0} r={6} fill="#10b981" filter="url(#glow)" className="animate-pulse" />
                     <text y={2} fontSize={8} fill="#fff" fontWeight="bold" textAnchor="middle">ECO</text>
                   </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Control Panel */}
      <div className="playback-controls" style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '12px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)' }}>
        <button 
          onClick={() => setIsPlaying(!isPlaying)} 
          style={{ background: isPlaying ? '#ef4444' : '#3b82f6', color: 'white', padding: '0.75rem', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)', transition: 'all 0.2s' }}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        
        <div className="time-scrubber" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#1e293b', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #334155' }}>
            <span style={{ color: '#38bdf8', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.25rem', letterSpacing: '2px' }}>
              {formatTime(time)}
            </span>
          </div>
          
          <input 
            type="range" 
            min={minTimeRef.current} 
            max={maxTimeRef.current || 100} 
            value={time} 
            style={{ flexGrow: 1, height: '6px', accentColor: '#3b82f6', background: '#334155', borderRadius: '3px', outline: 'none' }}
            onChange={(e) => {
              setTime(parseFloat(e.target.value));
              setIsPlaying(false);
            }}
          />
        </div>
      </div>
    </div>
  );
}
