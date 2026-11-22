import type {
  FilterOptions,
  DegradationResponse,
  LapPredictionResponse,
  StrategyResponse
} from './types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<{ status: string; data_loaded: boolean; total_laps_loaded: number; model_trained: boolean }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch API health status');
  return res.json();
}

export async function fetchOptions(): Promise<FilterOptions> {
  const res = await fetch(`${API_BASE}/options`);
  if (!res.ok) throw new Error('Failed to fetch options');
  return res.json();
}

export async function fetchDegradation(
  year: number,
  circuit: string,
  driverCode: string,
  compound: string
): Promise<DegradationResponse> {
  const params = new URLSearchParams({
    year: year.toString(),
    circuit,
    driver_code: driverCode,
    compound,
  });
  const res = await fetch(`${API_BASE}/degradation?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch degradation data');
  }
  return res.json();
}

export async function predictLapTime(payload: {
  circuit: string;
  driver_code: string;
  compound: string;
  tyre_age: number;
  track_temperature: number;
  air_temperature: number;
  rainfall: number;
}): Promise<LapPredictionResponse> {
  const res = await fetch(`${API_BASE}/predict-lap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to predict lap time');
  }
  return res.json();
}

export async function predictStrategy(payload: {
  circuit: string;
  race_distance?: number;
  starting_compound: string;
  available_compounds: string[];
  weather: string;
  current_lap: number;
  current_tyre_age: number;
  current_position?: number;
  safety_car_scenario: string;
}): Promise<StrategyResponse> {
  const res = await fetch(`${API_BASE}/predict-strategy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to simulate race strategy');
  }
  return res.json();
}
