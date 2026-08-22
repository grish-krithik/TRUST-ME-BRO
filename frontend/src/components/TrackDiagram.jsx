import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

const STATIONS = ['MAS', 'AJJ', 'KPD', 'SA', 'ED', 'CBE'];
const SEGMENTS = [
  { id: 'MAS-AJJ', start: 0, end: 1, type: 'double' },
  { id: 'AJJ-KPD', start: 1, end: 2, type: 'single' },
  { id: 'KPD-SA', start: 2, end: 3, type: 'double' },
  { id: 'SA-ED', start: 3, end: 4, type: 'single' },
  { id: 'ED-CBE', start: 4, end: 5, type: 'double' }
];

const COLOR_MAP = {
  'Rajdhani/Vande Bharat': '#f43f5e', 
  'Mail/Express': '#3b82f6', 
  'Passenger': '#eab308', 
  'Freight': '#94a3b8' 
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

  const trackWidth = 900;
  const padding = 60;
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

  const formatTime = (minutes) => {
    const d = Math.floor(minutes / (24 * 60));
    const h = Math.floor((minutes % (24 * 60)) / 60);
    const m = Math.floor(minutes % 60);
    let dayStr = d > 0 ? `+${d}d ` : '';
    return `${dayStr}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      <div style={{ padding: '0.75rem 1rem', background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6', borderRadius: '4px', fontSize: '0.875rem' }}>
        <strong>Historical Dispatch Insight:</strong> 
        {activeTrains.some(t => t.isCoasting) 
          ? " 🍃 Eco-Coasting Active: Based on historical delay databases, freight train instructed to lower speed early to prevent halting at next bottleneck." 
          : " AI Predictive Dispatch online. Headways dynamically adjusted based on historical kinetic profiles."}
      </div>

      <div className="track-diagram-container" style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
        <svg viewBox={`0 0 ${trackWidth} 220`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          
          {SEGMENTS.map((seg, i) => {
            const startX = padding + seg.start * stationSpacing;
            const endX = padding + seg.end * stationSpacing;
            
            if (seg.type === 'double') {
              return (
                <g key={i}>
                  <line x1={startX} y1={100} x2={endX} y2={100} stroke="#334155" strokeWidth={3} />
                  <line x1={startX} y1={120} x2={endX} y2={120} stroke="#334155" strokeWidth={3} />
                </g>
              );
            } else {
              return (
                <line key={i} x1={startX} y1={110} x2={endX} y2={110} stroke="#f59e0b" strokeWidth={3} strokeDasharray="6 2" />
              );
            }
          })}

          {STATIONS.map((st, i) => {
            const cx = padding + i * stationSpacing;
            const hasLoop = true;
            return (
              <g key={i}>
                {hasLoop && (
                  <path d={`M ${cx - 30} 100 Q ${cx} 60 ${cx + 30} 100`} fill="transparent" stroke="#475569" strokeWidth={2} />
                )}
                {hasLoop && (
                  <path d={`M ${cx - 30} 120 Q ${cx} 160 ${cx + 30} 120`} fill="transparent" stroke="#475569" strokeWidth={2} />
                )}
                
                <rect x={cx - 10} y={96} width={20} height={28} fill="#1e293b" stroke="#94a3b8" strokeWidth={2} rx={2} />
                <text x={cx} y={155} fill="#f8fafc" fontSize={14} fontWeight="bold" textAnchor="middle">{st}</text>
                
                <text x={cx} y={170} fill="#94a3b8" fontSize={10} textAnchor="middle">
                  {st === 'MAS' ? 'Chennai Cntl' : 
                   st === 'AJJ' ? 'Arakkonam' :
                   st === 'KPD' ? 'Katpadi' :
                   st === 'SA' ? 'Salem' :
                   st === 'ED' ? 'Erode' : 'Coimbatore'}
                </text>
              </g>
            );
          })}

          {activeTrains.map((t) => {
            let y = 110; 
            if (t.isDwelling) {
               y = t.dir === 'right' ? 76 : 144;
            } else {
               if (t.dir === 'right') y = 100;
               if (t.dir === 'left') y = 120;
            }
            
            return (
              <g key={t.id} transform={`translate(${t.pos}, ${y})`} style={{ transition: 'transform 0.1s linear' }}>
                <rect x={-16} y={-8} width={32} height={16} fill={t.color} rx={4} />
                <text y={-14} fontSize={11} fill={t.color} fontWeight="bold" textAnchor="middle">
                  {t.id.split('-')[0]}
                </text>
                {t.dir === 'right' ? (
                  <polygon points="-4,-4 4,0 -4,4" fill="#1e293b" />
                ) : (
                  <polygon points="4,-4 -4,0 4,4" fill="#1e293b" />
                )}
                {t.isCoasting && (
                   <circle cx={0} cy={-25} r={4} fill="#4ade80" className="animate-pulse" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="playback-controls" style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px' }}>
        <button onClick={() => setIsPlaying(!isPlaying)} style={{ background: '#3b82f6', color: 'white', padding: '0.5rem', borderRadius: '50%', border: 'none', cursor: 'pointer' }}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="time-scrubber" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="time-display" style={{ color: '#f8fafc', fontWeight: 'bold', width: '80px', fontFamily: 'monospace', fontSize: '1.1rem' }}>
            {formatTime(time)}
          </span>
          <input 
            type="range" 
            min={minTimeRef.current} 
            max={maxTimeRef.current || 100} 
            value={time} 
            style={{ flexGrow: 1 }}
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
