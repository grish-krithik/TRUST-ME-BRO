import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Cpu, Activity, Calculator, ArrowRight, ShieldAlert } from 'lucide-react';

const STATIONS = [
  { code: 'MAS', name: 'Chennai Central', km: 0 },
  { code: 'KPD', name: 'Katpadi', km: 130 },
  { code: 'JTJ', name: 'Jolarpettai', km: 214 },
  { code: 'SA',  name: 'Salem', km: 334 },
  { code: 'ED',  name: 'Erode', km: 396 },
  { code: 'TUP', name: 'Tiruppur', km: 446 },
  { code: 'CBE', name: 'Coimbatore', km: 497 }
];

const DECELERATION_RATE = 0.8; // m/s^2 (Standard passenger train braking)
const SAFETY_MARGIN = 500; // meters

const formatTime = (minutes) => {
  const d = Math.floor(minutes / (24 * 60));
  const h = Math.floor((minutes % (24 * 60)) / 60);
  const m = Math.floor(minutes % 60);
  let dayStr = d > 0 ? `+${d}d ` : '';
  return `${dayStr}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export default function PhysicsEngine({ schedule }) {
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const maxTimeRef = useRef(0);
  const minTimeRef = useRef(0);
  const reqRef = useRef();

  const speedScale = 0.2; 

  useEffect(() => {
    if (schedule && schedule.trains && schedule.trains.length > 0) {
      maxTimeRef.current = Math.max(...schedule.trains.map(t => t.actual_finish));
      const allEntries = schedule.trains.flatMap(t => t.segments.map(s => s.entry_time));
      minTimeRef.current = Math.min(...allEntries);
      
      // Start slightly after the first train enters so we have active data immediately
      setTime(minTimeRef.current + 5);
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

  // Find the most interesting active train at current time
  let activeTelemetry = null;

  for (const train of schedule.trains) {
    for (const seg of train.segments) {
      if (time >= seg.entry_time && time < seg.exit_time) {
        
        const [startCode, endCode] = seg.segment_name.split('-');
        const startStn = STATIONS.find(s => s.code === startCode);
        const endStn = STATIONS.find(s => s.code === endCode);
        const durationMins = seg.exit_time - seg.entry_time;

        if (startStn && endStn && durationMins > 0) {
          // Segment names are canonical (low-km -> high-km, e.g. "TUP-CBE").
          // DOWN (right) trains traverse start->end; UP (left) trains
          // physically traverse the same segment end->start. Without this,
          // UP trains show distance-to-<wrong station> running backwards.
          const fromStn = train.direction === 'left' ? endStn : startStn;
          const toStn = train.direction === 'left' ? startStn : endStn;

          const distanceKm = Math.abs(endStn.km - startStn.km);
          
          // Velocity (km/h)
          const velocityKmh = (distanceKm / (durationMins / 60));
          // Velocity (m/s)
          const velocityMs = velocityKmh * (1000 / 3600);

          // Position (interpolated in the train's actual direction of travel)
          const progress = (time - seg.entry_time) / durationMins;
          const currentKm = fromStn.km + (toStn.km - fromStn.km) * progress;
          
          // Distance to next station (meters) - "next" = toStn, the station
          // this train is physically approaching, not the segment's endStn.
          const distanceToNextMeters = Math.abs(toStn.km - currentKm) * 1000;

          // Required Braking Distance formula: d = v^2 / 2a
          const requiredBrakingDistance = (velocityMs * velocityMs) / (2 * DECELERATION_RATE);
          const brakingThreshold = requiredBrakingDistance + SAFETY_MARGIN;

          const isBraking = distanceToNextMeters <= requiredBrakingDistance;
          const isApproaching = distanceToNextMeters <= brakingThreshold && !isBraking;

          let status = 'CRUISING';
          let color = 'var(--color-signal-green)';
          
          if (isBraking) {
            status = 'BRAKING ENGAGED';
            color = 'var(--color-signal-red)';
          } else if (isApproaching) {
            status = 'APPROACHING BRAKE POINT';
            color = 'var(--color-signal-amber)';
          }

          activeTelemetry = {
            id: train.train_id,
            class: train.train_class,
            segment: seg.segment_name,
            velocityKmh,
            velocityMs,
            distanceToNextMeters,
            requiredBrakingDistance,
            status,
            color,
            nextStation: toStn.name
          };
          break; // found one, break seg loop
        }
      }
    }
    if (activeTelemetry) break; // found one, break train loop
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* Simulation Controls */}
      <div style={{ background: 'var(--surface-color)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={() => setIsPlaying(!isPlaying)} 
          style={{ background: isPlaying ? 'var(--color-signal-red)' : 'var(--accent-color)', color: 'white', padding: '0.5rem', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        
        <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-color)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', minWidth: '100px', textAlign: 'center' }}>
            <span style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.1rem' }}>
              {formatTime(time)}
            </span>
          </div>
          
          <input 
            type="range" 
            min={minTimeRef.current} 
            max={maxTimeRef.current || 100} 
            step="0.1"
            value={time} 
            style={{ flexGrow: 1 }}
            onChange={(e) => {
              setTime(parseFloat(e.target.value));
              setIsPlaying(false);
            }}
          />
        </div>
      </div>

      {!activeTelemetry ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          <Activity size={48} style={{ opacity: 0.5, margin: '0 auto 1rem auto' }} />
          <h3>No Trains Currently Moving</h3>
          <p>Advance the timeline to track live telemetry.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          
          {/* Telemetry Dashboard */}
          <div className="card" style={{ borderTop: `4px solid ${activeTelemetry.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={24} color={activeTelemetry.color} />
                  Train {activeTelemetry.id}
                </h2>
                <span style={{ color: 'var(--text-secondary)' }}>{activeTelemetry.class} | Segment: {activeTelemetry.segment}</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', color: activeTelemetry.color, border: `1px solid ${activeTelemetry.color}` }}>
                {activeTelemetry.status}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Current Speed (v)</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {activeTelemetry.velocityKmh.toFixed(1)} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>km/h</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--accent-color)', fontFamily: 'monospace' }}>
                  ({activeTelemetry.velocityMs.toFixed(2)} m/s)
                </div>
              </div>

              <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Distance to {activeTelemetry.nextStation} (d)</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {activeTelemetry.distanceToNextMeters.toFixed(0)} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>m</span>
                </div>
              </div>
            </div>

            {/* Dynamic Braking Visualizer */}
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Track Block</span>
                <span style={{ color: 'var(--color-signal-red)', fontWeight: 'bold' }}>Required Stop: {activeTelemetry.requiredBrakingDistance.toFixed(0)}m</span>
              </div>
              <div style={{ width: '100%', height: '12px', background: 'var(--bg-color)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                
                {/* Safe zone (Green) */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, background: 'var(--color-signal-green)', opacity: 0.2 }} />
                
                {/* Braking zone (Red) */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${Math.min(100, (activeTelemetry.requiredBrakingDistance / Math.max(1000, activeTelemetry.distanceToNextMeters)) * 100)}%`, background: 'var(--color-signal-red)', opacity: 0.6 }} />
                
                {/* Train marker */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '0%', width: '4px', background: '#fff', boxShadow: '0 0 10px #fff' }} />
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                *Assuming deceleration a = {DECELERATION_RATE} m/s²
              </div>
            </div>
          </div>

          {/* Math / Formula Breakdown */}
          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <Calculator size={20} color="var(--accent-color)" />
              Predictive Moving Block Logic
            </h3>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              To maximize throughput, the AI computes safe stopping distances dynamically rather than relying on static blocks. As speed increases, the braking envelope expands exponentially.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Formula Block */}
              <div style={{ background: 'var(--surface-color-light)', padding: '1rem', borderRadius: '6px', borderLeft: '3px solid var(--color-mail)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-mail)', marginBottom: '0.5rem', fontWeight: 'bold' }}>1. KINEMATIC BRAKING EQUATION</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  v² = u² + 2as &nbsp; <ArrowRight size={14} style={{display:'inline', verticalAlign:'middle'}}/> &nbsp; <span style={{ color: '#fff' }}>d = v² / (2a)</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Where v = current velocity, a = max safe deceleration rate.
                </div>
              </div>

              {/* Live Calculation */}
              <div style={{ background: 'var(--surface-color-light)', padding: '1rem', borderRadius: '6px', borderLeft: '3px solid var(--color-rajdhani)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-rajdhani)', marginBottom: '0.5rem', fontWeight: 'bold' }}>2. LIVE CALCULATION</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  d = ({activeTelemetry.velocityMs.toFixed(2)})² / (2 × {DECELERATION_RATE})
                  <br />
                  <span style={{ color: '#fff' }}>d = {activeTelemetry.requiredBrakingDistance.toFixed(1)} meters</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Minimum physical distance required to halt before next block.
                </div>
              </div>

              {/* Action */}
              <div style={{ background: 'var(--surface-color-light)', padding: '1rem', borderRadius: '6px', borderLeft: `3px solid ${activeTelemetry.color}` }}>
                <div style={{ fontSize: '0.8rem', color: activeTelemetry.color, marginBottom: '0.5rem', fontWeight: 'bold' }}>3. AUTOMATIC TRAIN PROTECTION (ATP)</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#fff' }}>
                  IF (Distance To Station ≤ Required Distance + Safety Margin)
                  <br/>
                  THEN <span style={{ color: activeTelemetry.color }}>{activeTelemetry.status}</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
