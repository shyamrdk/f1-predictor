import React, { useState, useEffect } from 'react';
import type { FilterOptions, StrategyResponse } from '../types';
import { predictStrategy } from '../api';
import {
  Flame,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Layers,
  Zap
} from 'lucide-react';

interface StrategyViewProps {
  options: FilterOptions | null;
}

export const StrategyView: React.FC<StrategyViewProps> = ({ options }) => {
  const [circuit, setCircuit] = useState<string>('Sakhir');
  const [raceDistance, setRaceDistance] = useState<number>(57);
  const [startingCompound, setStartingCompound] = useState<string>('MEDIUM');
  const [availableCompounds, setAvailableCompounds] = useState<string[]>(['SOFT', 'MEDIUM', 'HARD']);
  const [weather] = useState<string>('Dry');
  const [currentLap, setCurrentLap] = useState<number>(1);
  const [currentTyreAge, setCurrentTyreAge] = useState<number>(1);
  const [currentPosition] = useState<number>(1);
  const [safetyCarScenario, setSafetyCarScenario] = useState<string>('normal');

  const [loading, setLoading] = useState<boolean>(false);
  const [strategyData, setStrategyData] = useState<StrategyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Default laps map for circuits
  const CIRCUIT_LAPS: Record<string, number> = {
    'Sakhir': 57,
    'Silverstone': 52,
    'Monza': 51,
    'Spa-Francorchamps': 44,
    'Austin': 56,
  };

  const handleCircuitChange = (newCircuit: string) => {
    setCircuit(newCircuit);
    if (CIRCUIT_LAPS[newCircuit]) {
      setRaceDistance(CIRCUIT_LAPS[newCircuit]);
    }
  };

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await predictStrategy({
        circuit,
        race_distance: raceDistance,
        starting_compound: startingCompound,
        available_compounds: availableCompounds,
        weather,
        current_lap: currentLap,
        current_tyre_age: currentTyreAge,
        current_position: currentPosition,
        safety_car_scenario: safetyCarScenario,
      });
      setStrategyData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to simulate strategy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSimulate();
  }, [circuit, raceDistance, startingCompound, safetyCarScenario, weather, currentLap, currentTyreAge]);

  const toggleCompound = (comp: string) => {
    if (availableCompounds.includes(comp)) {
      if (availableCompounds.length > 1) {
        setAvailableCompounds(availableCompounds.filter(c => c !== comp));
      }
    } else {
      setAvailableCompounds([...availableCompounds, comp]);
    }
  };

  const getCompoundColor = (comp: string) => {
    switch (comp.toUpperCase()) {
      case 'SOFT': return '#ef4444';
      case 'MEDIUM': return '#eab308';
      case 'HARD': return '#f8fafc';
      default: return '#38bdf8';
    }
  };

  const best = strategyData?.recommended_strategy;

  return (
    <div className="space-y-6">
      {/* Race Setup & Simulator Controls */}
      <div className="bg-[#151622] p-5 rounded-2xl border border-[#26283b] shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 pb-3 border-b border-[#232536] gap-2">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#e10600]" />
              F1 Race Strategy & Pit Window Simulator
            </h2>
            <p className="text-xs text-slate-400">
              Simulate compound combinations, optimal pit windows, tyre degradation cliffs, and Safety Car advantages.
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#e10600] font-mono animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              Simulating strategies...
            </div>
          )}
        </div>

        {/* Primary Config Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Circuit */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Circuit</label>
            <select
              value={circuit}
              onChange={(e) => handleCircuitChange(e.target.value)}
              className="w-full bg-[#0d0e14] border border-[#2e3146] text-white text-sm rounded-lg p-2.5 focus:border-[#e10600] focus:outline-none"
            >
              {options?.all_circuits.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Race Distance */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Total Laps</label>
            <input
              type="number"
              min="10"
              max="80"
              value={raceDistance}
              onChange={(e) => setRaceDistance(Number(e.target.value))}
              className="w-full bg-[#0d0e14] border border-[#2e3146] text-white text-sm rounded-lg p-2.5 focus:border-[#e10600] focus:outline-none font-mono"
            />
          </div>

          {/* Starting Tyre */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Starting Compound</label>
            <select
              value={startingCompound}
              onChange={(e) => setStartingCompound(e.target.value)}
              className="w-full bg-[#0d0e14] border border-[#2e3146] text-white text-sm rounded-lg p-2.5 focus:border-[#e10600] focus:outline-none font-semibold"
            >
              <option value="SOFT">🔴 Soft Compound</option>
              <option value="MEDIUM">🟡 Medium Compound</option>
              <option value="HARD">⚪ Hard Compound</option>
            </select>
          </div>

          {/* Available Compounds */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Available Compounds</label>
            <div className="flex gap-2">
              {['SOFT', 'MEDIUM', 'HARD'].map(comp => {
                const active = availableCompounds.includes(comp);
                return (
                  <button
                    key={comp}
                    type="button"
                    onClick={() => toggleCompound(comp)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                      active
                        ? 'border-[#e10600] bg-[#e10600]/20 text-white'
                        : 'border-[#282a3c] bg-[#0d0e14] text-slate-500'
                    }`}
                  >
                    {comp[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Race State & Safety Car Scenario Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[#232536]">
          {/* Current Lap */}
          <div className="bg-[#0f1018] p-3 rounded-xl border border-[#232536]">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-400 font-semibold uppercase">Current Race Lap</span>
              <span className="font-mono text-white font-bold">Lap {currentLap} / {raceDistance}</span>
            </div>
            <input
              type="range"
              min="1"
              max={Math.max(1, raceDistance - 2)}
              value={currentLap}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCurrentLap(val);
                setCurrentTyreAge(Math.min(val, currentTyreAge));
              }}
              className="w-full accent-[#e10600] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>Start (Lap 1)</span>
              <span>Mid-Race</span>
            </div>
          </div>

          {/* Current Tyre Age */}
          <div className="bg-[#0f1018] p-3 rounded-xl border border-[#232536]">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-400 font-semibold uppercase">Current Tyre Age</span>
              <span className="font-mono text-white font-bold">{currentTyreAge} laps on set</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(5, currentLap)}
              value={currentTyreAge}
              onChange={(e) => setCurrentTyreAge(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>Fresh (0)</span>
              <span>Worn ({currentLap})</span>
            </div>
          </div>

          {/* Safety Car Scenario Toggle */}
          <div className="bg-[#0f1018] p-3 rounded-xl border border-[#232536]">
            <span className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Safety Car Scenario
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setSafetyCarScenario('normal')}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg border transition-all text-center ${
                  safetyCarScenario === 'normal'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                    : 'border-[#262838] bg-[#14151f] text-slate-400'
                }`}
              >
                Normal (Green)
              </button>
              <button
                type="button"
                onClick={() => setSafetyCarScenario('vsc')}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg border transition-all text-center ${
                  safetyCarScenario === 'vsc'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                    : 'border-[#262838] bg-[#14151f] text-slate-400'
                }`}
              >
                VSC Active
              </button>
              <button
                type="button"
                onClick={() => setSafetyCarScenario('safety_car')}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg border transition-all text-center ${
                  safetyCarScenario === 'safety_car'
                    ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                    : 'border-[#262838] bg-[#14151f] text-slate-400'
                }`}
              >
                Full SC Active
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Recommended Strategy Banner */}
      {best && (
        <div className="bg-gradient-to-br from-[#1b172a] via-[#161726] to-[#11121d] p-6 rounded-2xl border-2 border-[#e10600] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-40 h-40 bg-[#e10600]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#2a2c42]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-[#e10600] text-white font-extrabold text-xs uppercase tracking-wider">
                  Optimal Recommendation
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {best.stops}-Stop Strategy
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                {best.name}
              </h3>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-xs text-slate-400 uppercase font-semibold">Estimated Race Time</span>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {best.total_estimated_time_formatted}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Avg Pace: {best.avg_lap_time.toFixed(3)}s/lap
                </span>
              </div>
            </div>
          </div>

          {/* Stint Breakdown & Pit Windows */}
          <div className="my-5 space-y-4">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Stint Breakdown & Optimal Pit Stop Windows
            </h4>

            {/* Visual Stint Bar */}
            <div className="w-full bg-[#0d0e14] h-10 rounded-xl p-1 border border-[#2b2d42] flex gap-1">
              {best.stints.map((stint, idx) => {
                const pct = (stint.laps / raceDistance) * 100;
                return (
                  <div
                    key={idx}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: `${getCompoundColor(stint.compound)}20`,
                      borderColor: getCompoundColor(stint.compound),
                    }}
                    className="h-full rounded-lg border flex items-center justify-center text-xs font-bold font-mono text-white relative group"
                  >
                    <span className="hidden sm:inline">
                      Stint {stint.stint}: {stint.compound} ({stint.laps} Laps)
                    </span>
                    <span className="sm:hidden">
                      {stint.compound[0]} ({stint.laps})
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pit Window Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {best.pit_windows.map((pw) => (
                <div key={pw.stop} className="p-3.5 rounded-xl bg-[#0f1019] border border-[#232536] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-amber-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Pit Stop #{pw.stop} Window
                    </span>
                    <p className="text-lg font-black font-mono text-white mt-0.5">
                      Lap {pw.start} – Lap {pw.end}
                    </p>
                    <span className="text-xs text-slate-400">
                      Optimal Target: <strong className="text-white">Lap {pw.optimal}</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-500 font-semibold block">Fit Compound</span>
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border mt-1"
                      style={{
                        backgroundColor: `${getCompoundColor(pw.compound_to)}15`,
                        borderColor: getCompoundColor(pw.compound_to),
                        color: getCompoundColor(pw.compound_to),
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCompoundColor(pw.compound_to) }} />
                      {pw.compound_to}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Engineering Rationale & Explainability */}
          <div className="pt-4 border-t border-[#232536] space-y-2">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Strategic Rationale & Scenario Insights
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {strategyData.recommendation_summary.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e10600] mt-1.5 flex-shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Safety Car Delta Analysis & Alternative Strategies Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Safety Car Strategic Advantage Widget */}
        <div className="lg:col-span-1 bg-[#151622] p-5 rounded-2xl border border-[#26283b] shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              Safety Car Pit Delta Dynamics
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              How race neutralization creates the "Cheap Pit Stop" opportunity in Formula 1.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#0e0f17] border border-[#232536] flex justify-between items-center">
                <span className="text-slate-400 font-sans">Normal Green Flag Pit Loss:</span>
                <span className="font-bold text-white">{strategyData?.normal_pit_loss}s</span>
              </div>

              <div className="p-3 rounded-xl bg-[#0e0f17] border border-[#232536] flex justify-between items-center">
                <span className="text-slate-400 font-sans">Virtual Safety Car (VSC) Pit Loss:</span>
                <span className="font-bold text-amber-400">~14.5s (-8.5s gain)</span>
              </div>

              <div className="p-3 rounded-xl bg-[#0e0f17] border border-[#232536] flex justify-between items-center">
                <span className="text-slate-400 font-sans">Full Safety Car (SC) Pit Loss:</span>
                <span className="font-bold text-rose-400">~11.0s (-12.5s gain)</span>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-[#0f1018] border border-[#232536] text-xs text-slate-300">
              <p className="font-sans font-bold text-white mb-1">Why does a Safety Car reduce pit loss?</p>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                While cars on track are restricted to delta times (VSC) or bunched behind the safety car at ~55-65% racing speed, cars in the pit lane travel at the constant 80 km/h speed limit. The relative time loss against competitors on track drops by over 50%.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#232536] text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Active scenario: <span className="font-bold text-white uppercase">{safetyCarScenario}</span>
          </div>
        </div>

        {/* Alternative Strategies Ranked Comparison */}
        <div className="lg:col-span-2 bg-[#151622] p-5 rounded-2xl border border-[#26283b] shadow-xl">
          <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            Comparison of All Evaluated Tyre Strategies
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Simulated 1-stop and 2-stop compound combinations ranked by total calculated race time.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#26283b] text-slate-400 uppercase font-semibold">
                  <th className="py-2.5 px-3">Strategy</th>
                  <th className="py-2.5 px-2">Stops</th>
                  <th className="py-2.5 px-2">Tyres</th>
                  <th className="py-2.5 px-3">Pit Windows</th>
                  <th className="py-2.5 px-3">Est. Time</th>
                  <th className="py-2.5 px-3">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e202e] font-mono">
                {strategyData?.all_strategies.map((strat, index) => {
                  const isWinning = index === 0;
                  const deltaToBest = strat.total_estimated_time_seconds - (best?.total_estimated_time_seconds || 0);
                  return (
                    <tr
                      key={strat.name}
                      className={`hover:bg-[#1a1c2a] transition-colors ${isWinning ? 'bg-[#e10600]/10 font-bold' : ''}`}
                    >
                      <td className="py-3 px-3 font-sans flex items-center gap-2">
                        {isWinning && (
                          <span className="w-2 h-2 rounded-full bg-[#e10600] animate-ping" />
                        )}
                        <span className="text-white">{strat.name}</span>
                      </td>
                      <td className="py-3 px-2 text-slate-300 font-sans">{strat.stops}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          {strat.compounds.map((c, i) => (
                            <span
                              key={i}
                              className="w-3.5 h-3.5 rounded-full inline-block border border-black/40 text-[9px] flex items-center justify-center text-black font-extrabold"
                              style={{ backgroundColor: getCompoundColor(c) }}
                            >
                              {c[0]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {strat.pit_windows.map(pw => `L${pw.optimal}`).join(', ')}
                      </td>
                      <td className="py-3 px-3 text-emerald-400">{strat.total_estimated_time_formatted}</td>
                      <td className="py-3 px-3">
                        {isWinning ? (
                          <span className="text-emerald-400 font-bold">Fastest</span>
                        ) : (
                          <span className="text-slate-400">+{deltaToBest.toFixed(2)}s</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
