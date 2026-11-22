import React from 'react';
import { Activity, Gauge, Flame, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'degradation' | 'prediction' | 'strategy';
  setActiveTab: (tab: 'degradation' | 'prediction' | 'strategy') => void;
  systemStatus: {
    online: boolean;
    dataLoaded: boolean;
    totalLaps: number;
    modelTrained: boolean;
  };
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  systemStatus,
}) => {
  return (
    <header className="bg-[#12131a] border-b border-[#232533] sticky top-0 z-40">
      {/* F1 Speed Line Accent */}
      <div className="h-1 w-full bg-gradient-to-r from-[#e10600] via-[#ef4444] to-[#f59e0b]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#e10600] text-white font-black italic tracking-tighter shadow-lg shadow-red-900/30">
              F1
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-wider text-white uppercase">
                  Pace<span className="text-[#e10600]">&</span>Strategy
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#1e202d] text-slate-400 border border-[#2e3146] font-mono">
                  ML Predictor
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Formula 1 Telemetry Analytics & Race Strategy Simulation
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2 bg-[#0d0e14] p-1 rounded-xl border border-[#232533]">
            <button
              onClick={() => setActiveTab('degradation')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'degradation'
                  ? 'bg-[#e10600] text-white shadow-md shadow-red-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-[#1a1c28]'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Degradation</span>
            </button>

            <button
              onClick={() => setActiveTab('prediction')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'prediction'
                  ? 'bg-[#e10600] text-white shadow-md shadow-red-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-[#1a1c28]'
              }`}
            >
              <Gauge className="w-4 h-4" />
              <span>Lap Time ML</span>
            </button>

            <button
              onClick={() => setActiveTab('strategy')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'strategy'
                  ? 'bg-[#e10600] text-white shadow-md shadow-red-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-[#1a1c28]'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Race Strategy</span>
            </button>
          </nav>

          {/* System Status Badge */}
          <div className="hidden md:flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#181a24] border border-[#282a3c] text-xs">
              {systemStatus.online ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-300 font-medium">
                    {systemStatus.totalLaps.toLocaleString()} genuine laps
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-amber-300 font-medium">Backend Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
