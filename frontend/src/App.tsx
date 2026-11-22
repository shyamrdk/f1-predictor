import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DegradationView } from './components/DegradationView';
import { LapPredictionView } from './components/LapPredictionView';
import { StrategyView } from './components/StrategyView';
import type { FilterOptions } from './types';
import { fetchHealth, fetchOptions } from './api';
import { Database, Cpu, Activity, AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'degradation' | 'prediction' | 'strategy'>('degradation');
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [systemStatus, setSystemStatus] = useState({
    online: false,
    dataLoaded: false,
    totalLaps: 0,
    modelTrained: false,
  });
  const [, setLoadingInitial] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);

  const initSystem = async () => {
    setLoadingInitial(true);
    setBackendError(null);
    try {
      const health = await fetchHealth();
      setSystemStatus({
        online: true,
        dataLoaded: health.data_loaded,
        totalLaps: health.total_laps_loaded,
        modelTrained: health.model_trained,
      });

      const opts = await fetchOptions();
      setOptions(opts);
    } catch (err: any) {
      setBackendError(
        'Unable to connect to the FastAPI backend (http://127.0.0.1:8000). Please ensure the backend server is running.'
      );
      setSystemStatus({
        online: false,
        dataLoaded: false,
        totalLaps: 0,
        modelTrained: false,
      });
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    initSystem();
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0e14] text-slate-100 flex flex-col font-sans selection:bg-[#e10600] selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={systemStatus}
      />

      {/* Backend Connection Alert if Offline */}
      {backendError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{backendError}</span>
            </div>
            <button
              onClick={initSystem}
              className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 flex items-center gap-1 font-semibold transition-all cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {activeTab === 'degradation' && <DegradationView options={options} />}
        {activeTab === 'prediction' && <LapPredictionView options={options} />}
        {activeTab === 'strategy' && <StrategyView options={options} />}
      </main>

      {/* Footer */}
      <footer className="bg-[#101119] border-t border-[#202230] py-6 text-xs text-slate-400 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e10600]" />
            <span className="font-bold text-white uppercase tracking-wider">
              F1 Race Performance & Strategy Predictor
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Machine Learning & Analytics</span>
          </div>

          <div className="flex items-center space-x-6 text-slate-400 font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              FastF1 & Genuine Telemetry
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Scikit-learn Random Forest
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-rose-400" />
              Degradation Modeling
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
