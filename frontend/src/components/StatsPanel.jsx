import React from 'react';
import { Clock, TrendingUp, TrendingDown, Leaf, IndianRupee } from 'lucide-react';

export default function StatsPanel({ compare, mode }) {
  // compare comes from /compare endpoint: { improvement, baseline_summary, optimized_summary }
  const currentData = mode === 'optimized' ? compare.optimized_summary : compare.baseline_summary;
  const improvement = compare.improvement;

  return (
    <section className="stats-grid">
      <div className="stat-card highlight">
        <div className="stat-header">
          <Clock size={20} className="icon" />
          <h3>Total Weighted Delay</h3>
        </div>
        <div className="stat-value">{currentData.total_weighted_delay} <span className="stat-unit">mins</span></div>
        {mode === 'optimized' && (
          <div className="stat-delta positive">
            <TrendingDown size={14} /> 
            Reduced by {improvement.weighted_delay_reduction_pct}%
          </div>
        )}
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <TrendingUp size={20} className="icon" />
          <h3>Throughput (Capacity)</h3>
        </div>
        <div className="stat-value">{currentData.throughput_trains_per_hour} <span className="stat-unit">trains/hr</span></div>
        {mode === 'optimized' && (
          <div className="stat-delta positive">
            <TrendingUp size={14} /> 
            Kavach physics enabled
          </div>
        )}
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <Leaf size={20} className="icon" style={{color: '#4ade80'}} />
          <h3>Eco-Coasting Savings</h3>
        </div>
        <div className="stat-value" style={{color: '#4ade80'}}>
          {mode === 'optimized' ? currentData.diesel_saved_liters.toLocaleString() : '0'} <span className="stat-unit">Liters</span>
        </div>
        <div className="stat-delta">
          Diesel saved from smart braking
        </div>
      </div>

      <div className="stat-card highlight-rupee" style={{borderColor: '#fbbf24', background: 'rgba(251, 191, 36, 0.05)'}}>
        <div className="stat-header">
          <IndianRupee size={20} className="icon" style={{color: '#fbbf24'}}/>
          <h3 style={{color: '#fbbf24'}}>Net Financial Savings</h3>
        </div>
        <div className="stat-value" style={{color: '#fbbf24'}}>
          ₹ {mode === 'optimized' ? currentData.financial_savings_inr.toLocaleString() : '0'}
        </div>
        <div className="stat-delta">
          Fuel + Delay Cost Recovered
        </div>
      </div>
    </section>
  );
}
