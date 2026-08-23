import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Map } from 'lucide-react';

const STATIONS = [
  { code: 'MAS', name: 'Chennai Central', km: 0 },
  { code: 'KPD', name: 'Katpadi', km: 130 },
  { code: 'JTJ', name: 'Jolarpettai', km: 214 },
  { code: 'SA',  name: 'Salem', km: 334 },
  { code: 'ED',  name: 'Erode', km: 396 },
  { code: 'TUP', name: 'Tiruppur', km: 446 },
  { code: 'CBE', name: 'Coimbatore', km: 497 }
];

const TOTAL_KM = 497;

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

export default function TrackDiagram({ schedule }) {
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoverTrain, setHoverTrain] = useState(null);
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

  const trackWidth = 1200;
  const padding = 60;
  const usableWidth = trackWidth - 2 * padding;

  const getStationX = (km) => padding + (km / TOTAL_KM) * usableWidth;

  const activeTrains = schedule.trains.map(train => {
    let currentPos = null;
    let isActive = false;
    let direction = train.direction;
    let isDwelling = false;
    let lastCrossed = '';

    for (const seg of train.segments) {
      if (time >= seg.entry_time && time <= seg.exit_time) {
        isActive = true;
        const progress = (time - seg.entry_time) / (seg.exit_time - seg.entry_time);
        
        const [startCode, endCode] = seg.segment_name.split('-');
        
        let startStn = STATIONS.find(s => s.code === startCode);
        let endStn = STATIONS.find(s => s.code === endCode);

        if (startStn && endStn) {
          // Segment names are canonical (low-km -> high-km, e.g. "TUP-CBE").
          // DOWN (right) trains traverse start->end; UP (left) trains
          // physically traverse the same segment end->start.
          const fromStn = direction === 'left' ? endStn : startStn;
          const toStn = direction === 'left' ? startStn : endStn;
          const fromX = getStationX(fromStn.km);
          const toX = getStationX(toStn.km);
          currentPos = fromX + (toX - fromX) * progress;
          lastCrossed = fromStn.name;
        }
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
          
          let stationName = '';
          const s1 = seg1.segment_name.split('-');
          const s2 = seg2.segment_name.split('-');
          const stnCode = s1.find(s => s2.includes(s));
          const stn = STATIONS.find(s => s.code === stnCode);
          
          if (stn) {
            currentPos = getStationX(stn.km);
            lastCrossed = stn.name;
          }
          break;
        }
      }
    }

    if (!isActive) return null;

    return {
      train_id: train.train_id,
      train_class: train.train_class,
      pos: currentPos,
      color: COLOR_MAP[train.train_class] || '#fff',
      dir: direction,
      isDwelling,
      delay: train.delay,
      lastCrossed
    };
  }).filter(Boolean);

  const renderTrackLines = () => {
    const edX = getStationX(396);
    
    return (
      <g>
        <line x1={padding} y1={100} x2={edX} y2={100} stroke="var(--border-color)" strokeWidth={3} />
        <line x1={padding} y1={140} x2={edX} y2={140} stroke="var(--border-color)" strokeWidth={3} />
        <text x={padding} y={92} fill="var(--text-secondary)" fontSize={10} fontWeight="bold">DOWN LINE</text>
        <text x={padding} y={154} fill="var(--text-secondary)" fontSize={10} fontWeight="bold">UP LINE</text>

        <line x1={edX} y1={120} x2={trackWidth - padding} y2={120} stroke="var(--color-signal-amber)" strokeWidth={4} />
        <text x={edX + 10} y={112} fill="var(--color-signal-amber)" fontSize={10} fontWeight="bold">BOTTLENECK (SINGLE LINE)</text>
        
        <line x1={edX - 20} y1={100} x2={edX} y2={120} stroke="var(--border-color)" strokeWidth={3} />
        <line x1={edX - 20} y1={140} x2={edX} y2={120} stroke="var(--border-color)" strokeWidth={3} />
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--surface-color-light)', borderLeft: '4px solid var(--accent-color)', borderRadius: '4px', fontSize: '0.9rem' }}>
        <Map size={20} color="var(--accent-color)" />
        <div>
          <strong style={{ display: 'block', marginBottom: '2px' }}>MAS-CBE Live Route Map (497 km)</strong>
          <span style={{ color: 'var(--text-secondary)' }}>
            Hover over a train to view live delay and last crossed station. Erode-Coimbatore is modeled as single-line per ongoing doubling project.
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <svg viewBox={`0 0 ${trackWidth} 220`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          
          {renderTrackLines()}

          {STATIONS.map((st) => {
            const cx = getStationX(st.km);
            const isSingle = st.km > 396;
            const platY = isSingle ? 120 : 120;
            
            return (
              <g key={st.code}>
                <rect x={cx - 15} y={platY - 5} width={30} height={10} fill="var(--surface-color-light)" stroke="var(--border-color)" rx={2} />
                <text x={cx} y={platY - 15} fill="var(--text-primary)" fontSize={12} fontWeight="bold" textAnchor="middle">{st.code}</text>
                <text x={cx} y={platY + 25} fill="var(--text-secondary)" fontSize={10} textAnchor="middle">{st.name}</text>
                <text x={cx} y={platY + 38} fill="var(--text-secondary)" fontSize={9} textAnchor="middle">{st.km} km</text>
              </g>
            );
          })}

          {activeTrains.map((t) => {
            let y = 120;
            const isSingle = t.pos > getStationX(396);
            if (!isSingle) {
                y = t.dir === 'right' ? 100 : 140;
            }
            
            if (t.isDwelling) {
               y = t.dir === 'right' ? y - 15 : y + 15;
            }
            
            return (
              <g 
                key={t.train_id} 
                transform={`translate(${t.pos}, ${y})`} 
                style={{ transition: 'transform 0.1s linear', cursor: 'pointer' }}
                onMouseEnter={() => setHoverTrain(t)}
                onMouseLeave={() => setHoverTrain(null)}
              >
                <circle cx={0} cy={0} r={6} fill={t.color} stroke="#000" strokeWidth={2} />
                <text y={-10} fontSize={10} fill={t.color} fontWeight="bold" textAnchor="middle">
                  {t.train_id.split('-')[0]}
                </text>
              </g>
            );
          })}
        </svg>

        {hoverTrain && (
          <div style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            padding: '1rem',
            borderRadius: '4px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            zIndex: 10,
            minWidth: '200px'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: hoverTrain.color }}>{hoverTrain.train_id}</h4>
            <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>Class: <strong>{hoverTrain.train_class}</strong></div>
              <div>Last Station: <strong>{hoverTrain.lastCrossed}</strong></div>
              <div>Delay: <strong style={{ color: hoverTrain.delay > 0 ? 'var(--color-signal-red)' : 'var(--color-signal-green)' }}>{hoverTrain.delay} mins</strong></div>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: 'var(--surface-color)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={() => setIsPlaying(!isPlaying)} 
          style={{ background: isPlaying ? 'var(--color-signal-red)' : 'var(--accent-color)', color: 'white', padding: '0.5rem', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        
        <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-color)', padding: '0.25rem .75rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontFamily: 'monospace' }}>
              {formatTime(time)}
            </span>
          </div>
          
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
