import React, { useState } from 'react';
import type { FilterOptions, LapPredictionResponse } from '../types';
import { predictLapTime } from '../api';
import {
  Gauge,
  Sparkles,
  Award,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Loader2,
  Sliders
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

interface LapPredictionViewProps {
  options: FilterOptions | null;
}

export const LapPredictionView: React.FC<LapPredictionViewProps> = ({ options }) => {
  const [circuit, setCircuit] = useState<string>('Sakhir');
  const [driver, setDriver] = useState<string>('VER');
  const [compound, setCompound] = useState<string>('SOFT');
  const [tyreAge, setTyreAge] = useState<number>(5);
  const [trackTemp, setTrackTemp] = useState<number>(35.0);
  const [airTemp, setAirTemp] = useState<number>(28.0);
  const [rainfall, setRainfall] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<LapPredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await predictLapTime({
        circuit,
        driver_code: driver,
        compound,
        tyre_age: tyreAge,
        track_temperature: trackTemp,
        air_temperature: airTemp,
        rainfall,
      });
      setPrediction(res);
    } catch (err: any) {
      setError(err.message || 'Failed to predict lap time');
    } finally {
      setLoading(false);
    }
  };

  // Run initial prediction if not yet run
  React.useEffect(() => {
    handlePredict();
  }, []);

  const getCompoundColor = (comp: string) => {
    switch (comp.toUpperCase()) {
      case 'SOFT': return '#ef4444';
      case 'MEDIUM': return '#eab308';
      case 'HARD': return '#f8fafc';
      default: return '#38bdf8';
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Input Controls */}
      <div className="bg-[#151622] p-5 rounded-2xl border border-[#26283b] shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#232536]">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Gauge className="w-5 h-5 text-[#e10600]" />
              Lap Time ML Predictor
            </h2>
            <p className="text-xs text-slate-400">
              Random Forest Regression model trained on 5,500+ genuine historical laps across multiple seasons.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-[#1f202e] text-slate-300 font-mono border border-[#2e3146]">
            Algorithm: Scikit-learn Random Forest
          </span>
        </div>

        <form onSubmit={handlePredict} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Circuit */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Circuit</label>
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

            {/* Driver */}
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

            {/* Tyre Compound */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Tyre Compound</label>
              <div className="grid grid-cols-3 gap-2">
                {['SOFT', 'MEDIUM', 'HARD'].map(comp => (
                  <button
                    type="button"
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
                    {comp}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {/* Tyre Age */}
            <div className="bg-[#0f1018] p-3 rounded-xl border border-[#232536]">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400 font-semibold uppercase">Tyre Age</span>
                <span className="font-mono text-white font-bold">{tyreAge} laps</span>
              </div>
              <input
                type="range"
                min="0"
                max="45"
                value={tyreAge}
                onChange={(e) => setTyreAge(Number(e.target.value))}
                className="w-full accent-[#e10600] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>Fresh (0)</span>
                <span>Worn (45)</span>
              </div>
            </div>

            {/* Track Temp */}
            <div className="bg-[#0f1018] p-3 rounded-xl border border-[#232536]">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400 font-semibold uppercase">Track Temp</span>
                <span className="font-mono text-amber-300 font-bold">{trackTemp}°C</span>
              </div>
              <input
                type="range"
                min="15"
                max="55"
                step="0.5"
                value={trackTemp}
                onChange={(e) => setTrackTemp(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>Cool (15°C)</span>
                <span>Hot (55°C)</span>
              </div>
            </div>

            {/* Air Temp */}
            <div className="bg-[#0f1018] p-3 rounded-xl border border-[#232536]">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400 font-semibold uppercase">Air Temp</span>
                <span className="font-mono text-sky-300 font-bold">{airTemp}°C</span>
              </div>
              <input
                type="range"
                min="12"
                max="42"
                step="0.5"
                value={airTemp}
                onChange={(e) => setAirTemp(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>12°C</span>
                <span>42°C</span>
              </div>
            </div>

            {/* Weather / Rain */}
            <div className="bg-[#0f1018] p-3 rounded-xl border border-[#232536] flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400 font-semibold uppercase">Weather Condition</span>
                <span className="font-mono text-xs font-bold text-white">
                  {rainfall === 1 ? 'Wet / Rain' : 'Dry'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setRainfall(0)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
                    rainfall === 0
                      ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500'
                      : 'bg-[#14151f] text-slate-400 border-[#262838]'
                  }`}
                >
                  Dry Track
                </button>
                <button
                  type="button"
                  onClick={() => setRainfall(1)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
                    rainfall === 1
                      ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                      : 'bg-[#14151f] text-slate-400 border-[#262838]'
                  }`}
                >
                  Rain Active
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#e10600] hover:bg-[#c90500] text-white text-sm font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-red-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Computing Random Forest Prediction...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Estimate Lap Time</span>
              </>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Prediction Output & Historical Benchmark Comparison */}
      {prediction && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Lap Time Display Card */}
          <div className="lg:col-span-1 bg-gradient-to-br from-[#181a28] to-[#12131d] p-6 rounded-2xl border border-[#2b2d42] shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-semibold">
                <span>Predicted Lap Time</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                  Scikit-learn RF
                </span>
              </div>

              {/* Digital Lap Time Display */}
              <div className="my-5 p-4 bg-[#0a0a0f] rounded-xl border border-[#222330] text-center shadow-inner">
                <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                  {prediction.predicted_lap_time_formatted}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  {prediction.predicted_lap_time_seconds.toFixed(3)} seconds
                </div>
              </div>

              {/* Selected conditions summary */}
              <div className="space-y-1.5 text-xs text-slate-300 border-t border-[#232536] pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Circuit & Driver:</span>
                  <span className="font-bold text-white font-mono">{prediction.input_conditions.circuit} • {prediction.input_conditions.driver_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tyre & Age:</span>
                  <span className="font-bold text-white font-mono flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: getCompoundColor(prediction.input_conditions.compound) }}
                    />
                    {prediction.input_conditions.compound} ({prediction.input_conditions.tyre_age} laps old)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Track & Weather:</span>
                  <span className="font-bold text-white font-mono">
                    {prediction.input_conditions.track_temperature}°C / {prediction.input_conditions.air_temperature}°C
                    {prediction.input_conditions.rainfall === 1 ? ' (Wet)' : ' (Dry)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Realistic accuracy disclaimer */}
            <div className="mt-4 pt-3 border-t border-[#232536] text-[11px] text-slate-400">
              Note: Lap times vary by ±0.4s to ±0.8s in actual racing due to dirty air, ERS battery deployment, and DRS slipstream.
            </div>
          </div>

          {/* Historical Benchmark Comparison */}
          <div className="lg:col-span-2 bg-[#151622] p-5 rounded-2xl border border-[#26283b] shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Historical Pace Comparison Under Similar Conditions
                </h3>
                {prediction.historical_benchmarks && (
                  <span className="text-xs text-slate-400 font-mono">
                    Matched {prediction.historical_benchmarks.matched_lap_count} genuine laps
                  </span>
                )}
              </div>

              {prediction.historical_benchmarks ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300">
                    Comparing the ML prediction against genuine historical telemetry at {circuit} on {compound} compound (similar tyre age range):
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-[#0e0f17] border border-[#232536]">
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Historical Fastest</span>
                      <p className="text-lg font-mono font-bold text-emerald-400 mt-1">
                        {prediction.historical_benchmarks.historical_min_formatted}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {prediction.historical_benchmarks.historical_min.toFixed(3)}s
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0e0f17] border border-[#232536]">
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Historical Median</span>
                      <p className="text-lg font-mono font-bold text-sky-400 mt-1">
                        {prediction.historical_benchmarks.historical_median_formatted}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {prediction.historical_benchmarks.historical_median.toFixed(3)}s
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0e0f17] border border-[#232536]">
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Historical Slowest</span>
                      <p className="text-lg font-mono font-bold text-slate-300 mt-1">
                        {prediction.historical_benchmarks.historical_max_formatted}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {prediction.historical_benchmarks.historical_max.toFixed(3)}s
                      </span>
                    </div>
                  </div>

                  {/* Relative Pace Delta Progress Bar */}
                  <div className="p-3 rounded-xl bg-[#0e0f17] border border-[#232536]">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Position in Historical Spread:</span>
                      <span className="font-mono text-white font-bold">
                        {prediction.predicted_lap_time_seconds <= prediction.historical_benchmarks.historical_median ? (
                          <span className="text-emerald-400">
                            -{(prediction.historical_benchmarks.historical_median - prediction.predicted_lap_time_seconds).toFixed(3)}s faster than median
                          </span>
                        ) : (
                          <span className="text-amber-400">
                            +{(prediction.predicted_lap_time_seconds - prediction.historical_benchmarks.historical_median).toFixed(3)}s slower than median
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-[#1b1d2b] h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{
                          width: `${Math.max(5, Math.min(95, ((prediction.predicted_lap_time_seconds - prediction.historical_benchmarks.historical_min) / Math.max(0.1, prediction.historical_benchmarks.historical_max - prediction.historical_benchmarks.historical_min)) * 100))}%`
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                      <span>Fastest ({prediction.historical_benchmarks.historical_min_formatted})</span>
                      <span>Slowest ({prediction.historical_benchmarks.historical_max_formatted})</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#0f1018] text-slate-400 text-xs">
                  No historical lap times directly match this condition. Prediction is generalized by Random Forest trees.
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#232536] text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Trained on multi-circuit telemetry with 80/20 train-test split without data leakage.
            </div>
          </div>
        </div>
      )}

      {/* Model Evaluation Metrics & Feature Importances */}
      {prediction?.model_metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evaluation Metrics Cards */}
          <div className="bg-[#151622] p-5 rounded-2xl border border-[#26283b] shadow-xl">
            <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
              <Award className="w-4 h-4 text-sky-400" />
              Machine Learning Model Evaluation
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Tested on 1,100+ held-out out-of-sample racing laps. Metrics explain the real-world engineering accuracy.
            </p>

            <div className="space-y-3">
              {/* MAE */}
              <div className="p-3.5 rounded-xl bg-[#0f1018] border border-[#232536]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-white">Mean Absolute Error (MAE)</span>
                  <span className="text-lg font-black font-mono text-emerald-400">
                    {prediction.model_metrics.mae.toFixed(3)}s
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {prediction.model_metrics.explanations.mae}
                </p>
              </div>

              {/* RMSE */}
              <div className="p-3.5 rounded-xl bg-[#0f1018] border border-[#232536]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-white">Root Mean Squared Error (RMSE)</span>
                  <span className="text-lg font-black font-mono text-sky-400">
                    {prediction.model_metrics.rmse.toFixed(3)}s
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {prediction.model_metrics.explanations.rmse}
                </p>
              </div>

              {/* R² Score */}
              <div className="p-3.5 rounded-xl bg-[#0f1018] border border-[#232536]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-white">Coefficient of Determination (R²)</span>
                  <span className="text-lg font-black font-mono text-amber-400">
                    {prediction.model_metrics.r2_score.toFixed(4)}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {prediction.model_metrics.explanations.r2}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#232536] flex justify-between text-xs text-slate-400 font-mono">
              <span>Training: {prediction.model_metrics.train_samples} laps</span>
              <span>Testing: {prediction.model_metrics.test_samples} laps</span>
            </div>
          </div>

          {/* Feature Importances Chart */}
          <div className="bg-[#151622] p-5 rounded-2xl border border-[#26283b] shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-rose-400" />
                Random Forest Feature Importance
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Relative influence of each telemetry variable on the predicted lap time.
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={prediction.model_metrics.feature_importances}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#222436" horizontal={false} />
                    <XAxis type="number" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
                    <YAxis dataKey="feature" type="category" stroke="#475569" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={80} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-[#0e0f17] p-2 rounded-lg border border-[#2b2d42] text-xs">
                              <p className="font-bold text-white">{item.feature}</p>
                              <p className="text-emerald-400 font-mono">{item.importance_pct}% importance</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="importance_pct" fill="#e10600" radius={[0, 4, 4, 0]}>
                      {prediction.model_metrics.feature_importances.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === 0
                              ? '#e10600'
                              : index === 1
                                ? '#38bdf8'
                                : index === 2
                                  ? '#f59e0b'
                                  : '#64748b'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-2">
              Circuit layout establishes the base sector length, while tyre age and thermal degradation govern the intra-race pace evolution.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
