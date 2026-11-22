import React, { useState, useEffect } from 'react';
import type {
  FilterOptions,
  DegradationResponse
} from '../types';
import { fetchDegradation } from '../api';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import {
  Activity,
  TrendingUp,
  Clock,
  Thermometer,
  Fuel,
  Info,
  ShieldAlert,
  Loader2
} from 'lucide-react';

interface DegradationViewProps {
  options: FilterOptions | null;
}

export const DegradationView: React.FC<DegradationViewProps> = ({ options }) => {
  const [year, setYear] = useState<number>(2023);
  const [circuit, setCircuit] = useState<string>('Sakhir');
  const [driver, setDriver] = useState<string>('VER');
  const [compound, setCompound] = useState<string>('SOFT');

  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<DegradationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load degradation data whenever selection changes
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchDegradation(year, circuit, driver, compound);
        if (isMounted) setData(res);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load degradation data');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [year, circuit, driver, compound]);

  // Format seconds to mm:ss.sss
  const formatSec = (sec: number | null) => {
    if (sec === null || isNaN(sec) || sec <= 0) return 'N/A';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s.toFixed(3)}`;
  };

  // Compound color helpers
  const getCompoundColor = (comp: string) => {
    switch (comp.toUpperCase()) {
      case 'SOFT': return '#ef4444'; // Red
      case 'MEDIUM': return '#eab308'; // Yellow
      case 'HARD': return '#f8fafc'; // White
      default: return '#38bdf8';
    }
  };

  // Prepare chart data: match stint laps with regression trend
  const chartPoints = (data?.stint_laps || []).map((lap) => {
    const trendMatch = data?.regression_stats?.trend_line.find(t => t.tyre_age === lap.tyre_age);
    return {
      lap_number: lap.lap_number,
      tyre_age: lap.tyre_age,
      lap_time_seconds: lap.lap_time_seconds,
      trend_time: trendMatch ? trendMatch.trend_time : null,
      track_temperature: lap.track_temperature,
      is_valid_pace: lap.is_valid_pace,
      is_safety_car: lap.is_safety_car,
    };
  });

  return (
    <div className="space-y-6">
      {/* Control Selector Panel */}
      <div className="bg-[#151622] p-5 rounded-2xl border border-[#26283b] shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-[#232536]">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#e10600]" />
              Lap Time Degradation Analysis
            </h2>
            <p className="text-xs text-slate-400">
              Analyze tyre degradation curves, linear pace loss, and compound comparison using authentic session telemetry.
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#e10600] font-mono animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading telemetry...
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Season Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Season</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full bg-[#0d0e14] border border-[#2e3146] text-white text-sm rounded-lg p-2.5 focus:border-[#e10600] focus:outline-none"
            >
              {options?.years.map(y => (
                <option key={y} value={y}>{y} Season</option>
              ))}
            </select>
          </div>

          {/* Circuit Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Grand Prix Circuit</label>
            <select
              value={circuit}
              onChange={(e) => setCircuit(e.target.value)}
              className="w-full bg-[#0d0e14] border border-[#2e3146] text-white text-sm rounded-lg p-2.5 focus:border-[#e10600] focus:outline-none"
            >
              {options?.all_circuits.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Driver Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Driver</label>
            <select
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              className="w-full bg-[#0d0e14] border border-[#2e3146] text-white text-sm rounded-lg p-2.5 focus:border-[#e10600] focus:outline-none font-mono"
            >
              {options?.drivers.map(d => (
                <option key={d.driver_code} value={d.driver_code}>
                  {d.driver_code} ({d.driver_name})
                </option>
              ))}
            </select>
          </div>

          {/* Compound Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Tyre Compound</label>
            <div className="grid grid-cols-3 gap-1.5">
              {['SOFT', 'MEDIUM', 'HARD'].map(comp => (
                <button
                  key={comp}
                  onClick={() => setCompound(comp)}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                    compound === comp
                      ? 'border-[#e10600] bg-[#e10600]/20 text-white shadow-sm'
                      : 'border-[#282a3c] bg-[#0d0e14] text-slate-400 hover:text-white'
                  }`}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: getCompoundColor(comp) }}
                  />
                  {comp[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Degradation KPI Stats Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Degradation Rate */}
          <div className="bg-[#151622] p-4 rounded-xl border border-[#26283b] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Degradation Slope</span>
              <TrendingUp className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-white font-mono">
                +{data.regression_stats.degradation_rate_per_lap.toFixed(3)}
              </span>
              <span className="text-xs text-slate-400 ml-1">s/lap</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Estimated pace loss per lap of tyre age
            </p>
          </div>

          {/* Fresh Tyre Base Pace */}
          <div className="bg-[#151622] p-4 rounded-xl border border-[#26283b] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Fresh Tyre Base Pace</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-white font-mono">
                {formatSec(data.regression_stats.base_pace)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {data.regression_stats.base_pace.toFixed(3)}s theoretical zero-wear lap
            </p>
          </div>

          {/* Model Fit (R²) */}
          <div className="bg-[#151622] p-4 rounded-xl border border-[#26283b] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Linear Fit (R²)</span>
              <Activity className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-white font-mono">
                {data.regression_stats.r2_score.toFixed(2)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {Math.round(data.regression_stats.r2_score * 100)}% fit on {data.regression_stats.valid_lap_count} clean laps
            </p>
          </div>

          {/* Track Conditions */}
          <div className="bg-[#151622] p-4 rounded-xl border border-[#26283b] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Track Temperature</span>
              <Thermometer className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-white font-mono">
                {data.weather_summary.avg_track_temp.toFixed(1)}°C
              </span>
              <span className="text-xs text-slate-400 ml-1">
                (Air {data.weather_summary.avg_air_temp.toFixed(1)}°C)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Range: {data.weather_summary.track_temp_range[0]}°C – {data.weather_summary.track_temp_range[1]}°C
            </p>
          </div>
        </div>
      )}

      {/* Main Stint Progression Chart */}
      <div className="bg-[#151622] p-5 rounded-2xl border border-[#26283b] shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
          <div>
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#e10600]" />
              Stint Lap Time Progression & Wear Curve
            </h3>
            <p className="text-xs text-slate-400">
              Genuine lap times plotted against tyre age with statistical regression degradation slope.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs mt-2 sm:mt-0 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getCompoundColor(compound) }} />
              <span className="text-slate-300">Clean Pace Lap</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500/50" />
              <span className="text-slate-400">Traffic / SC / Pit In</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-sky-400" />
              <span className="text-sky-300">Degradation Trend</span>
            </div>
          </div>
        </div>

        <div className="h-80 w-full">
          {chartPoints.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222436" vertical={false} />
                <XAxis
                  dataKey="tyre_age"
                  label={{ value: 'Tyre Age (Laps Completed on Compound)', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 11 }}
                  stroke="#475569"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 2']}
                  tickFormatter={(val) => formatSec(val)}
                  stroke="#475569"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  width={65}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const p = payload[0].payload;
                      return (
                        <div className="bg-[#0e0f17] p-3 rounded-xl border border-[#2b2d42] text-xs shadow-2xl">
                          <div className="font-bold text-white border-b border-[#232536] pb-1 mb-1.5 flex justify-between gap-4">
                            <span>Lap {p.lap_number}</span>
                            <span className="text-slate-400 font-mono">Tyre Age: {p.tyre_age}</span>
                          </div>
                          <div className="space-y-1 font-mono">
                            <p className="text-emerald-400">Time: {formatSec(p.lap_time_seconds)}</p>
                            {p.trend_time && (
                              <p className="text-sky-300">Trend: {formatSec(p.trend_time)}</p>
                            )}
                            <p className="text-amber-300">Track Temp: {p.track_temperature}°C</p>
                            {p.is_safety_car && (
                              <p className="text-yellow-400 font-sans font-bold">Safety Car Lap</p>
                            )}
                            {!p.is_valid_pace && !p.is_safety_car && (
                              <p className="text-amber-400 font-sans">Outlier / Pit-In / Traffic</p>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Degradation Trendline */}
                <Line
                  type="monotone"
                  dataKey="trend_time"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={false}
                  name="Degradation Trendline"
                />
                {/* Actual Laps */}
                <Scatter
                  dataKey="lap_time_seconds"
                  name="Actual Laps"
                  shape={(props: any) => {
                    const { cx, cy, payload } = props;
                    const isValid = payload.is_valid_pace;
                    const isSC = payload.is_safety_car;
                    const fillColor = isSC
                      ? '#f59e0b'
                      : isValid
                        ? getCompoundColor(compound)
                        : '#64748b';
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isValid ? 5 : 3.5}
                        fill={fillColor}
                        stroke="#0d0e14"
                        strokeWidth={1.5}
                        opacity={isValid ? 1 : 0.6}
                      />
                    );
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              No lap telemetry found for this combination. Please select another driver or compound.
            </div>
          )}
        </div>
      </div>

      {/* Compound Comparison & Educational Confounders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compound Comparison Table & Rate */}
        <div className="bg-[#151622] p-5 rounded-2xl border border-[#26283b] shadow-xl">
          <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Compound Pace & Degradation Benchmark
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Comparison between Soft, Medium, and Hard compounds across all drivers at {circuit}.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#26283b] text-slate-400 uppercase">
                  <th className="py-2 px-2">Compound</th>
                  <th className="py-2 px-2">Laps Sampled</th>
                  <th className="py-2 px-2">Base Pace</th>
                  <th className="py-2 px-2">Degradation</th>
                  <th className="py-2 px-2">Max Stint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e202e] font-mono">
                {data?.compound_comparison.map(item => (
                  <tr key={item.compound} className="hover:bg-[#1a1c2a]">
                    <td className="py-2.5 px-2 font-sans font-bold flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: getCompoundColor(item.compound) }}
                      />
                      {item.compound}
                    </td>
                    <td className="py-2.5 px-2 text-slate-300">{item.sample_laps}</td>
                    <td className="py-2.5 px-2 text-emerald-400">{formatSec(item.base_pace)}</td>
                    <td className="py-2.5 px-2 text-rose-400">+{item.degradation_rate.toFixed(3)}s/lap</td>
                    <td className="py-2.5 px-2 text-slate-300">{item.max_stint_length} laps</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Degradation Rate Bar Chart */}
          <div className="mt-4 pt-4 border-t border-[#232536]">
            <p className="text-xs text-slate-400 mb-2 font-semibold">Degradation Rate Comparison (Seconds Lost Per Lap):</p>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.compound_comparison || []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222436" vertical={false} />
                  <XAxis dataKey="compound" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-[#0e0f17] p-2 rounded-lg border border-[#2b2d42] text-xs">
                            <p className="font-bold text-white">{d.compound}</p>
                            <p className="text-rose-400 font-mono">Degradation: +{d.degradation_rate.toFixed(3)}s/lap</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="degradation_rate" radius={[4, 4, 0, 0]}>
                    {(data?.compound_comparison || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getCompoundColor(entry.compound)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Confounding Race Factors & Explainability */}
        <div className="bg-[#151622] p-5 rounded-2xl border border-[#26283b] shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400" />
              Confounding Factors in Degradation Analysis
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Real-world lap time progression is not solely driven by tyre wear. The telemetry captures multiple concurrent physical forces.
            </p>

            <div className="space-y-3">
              {/* Fuel Burn Effect */}
              <div className="p-3 rounded-xl bg-[#0f1018] border border-[#232536]">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
                  <Fuel className="w-3.5 h-3.5" />
                  Fuel Load Burn-off Effect
                </div>
                <p className="text-xs text-slate-300">
                  {data?.confounding_factors.fuel_burn_effect.desc}
                </p>
                <div className="mt-2 text-[11px] font-mono flex items-center justify-between text-slate-400 bg-[#161723] px-2.5 py-1.5 rounded">
                  <span>Raw Observed Degradation:</span>
                  <span className="text-white">+{data?.regression_stats.degradation_rate_per_lap.toFixed(3)}s/lap</span>
                </div>
                <div className="mt-1 text-[11px] font-mono flex items-center justify-between text-slate-400 bg-[#161723] px-2.5 py-1.5 rounded">
                  <span>Adjusted (Fuel-Corrected) Degradation:</span>
                  <span className="text-rose-400 font-bold">+{data?.confounding_factors.fuel_burn_effect.adjusted_degradation_rate.toFixed(3)}s/lap</span>
                </div>
              </div>

              {/* Track Evolution */}
              <div className="p-3 rounded-xl bg-[#0f1018] border border-[#232536]">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Track Evolution & Rubbering-In
                </div>
                <p className="text-xs text-slate-300">
                  {data?.confounding_factors.track_evolution}
                </p>
              </div>

              {/* Dirty Air */}
              <div className="p-3 rounded-xl bg-[#0f1018] border border-[#232536]">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400 mb-1">
                  <Activity className="w-3.5 h-3.5" />
                  Dirty Air & Traffic Turbulence
                </div>
                <p className="text-xs text-slate-300">
                  {data?.confounding_factors.dirty_air}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#232536] text-[11px] text-slate-400 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            Filtered out in/out laps and Safety Car periods to isolate genuine racing pace.
          </div>
        </div>
      </div>
    </div>
  );
};
