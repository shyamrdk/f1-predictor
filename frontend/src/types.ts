export interface Driver {
  driver_code: string;
  driver_name: string;
  team_name: string;
}

export interface FilterOptions {
  years: number[];
  circuits_by_year: Record<number, string[]>;
  all_circuits: string[];
  drivers: Driver[];
  compounds: string[];
}

export interface StintLapPoint {
  lap_number: number;
  tyre_age: number;
  lap_time_seconds: number | null;
  stint_number: number;
  is_valid_pace: boolean;
  track_temperature: number;
  air_temperature: number;
  is_safety_car: boolean;
}

export interface TrendPoint {
  tyre_age: number;
  trend_time: number;
}

export interface RegressionStats {
  degradation_rate_per_lap: number;
  base_pace: number;
  r2_score: number;
  valid_lap_count: number;
  trend_line: TrendPoint[];
}

export interface CompoundComparisonItem {
  compound: string;
  sample_laps: number;
  base_pace: number;
  avg_lap_time: number;
  degradation_rate: number;
  max_stint_length: number;
  avg_stint_length: number;
}

export interface WeatherSummary {
  avg_track_temp: number;
  avg_air_temp: number;
  track_temp_range: [number, number];
  rainfall: boolean;
}

export interface ConfoundingFactors {
  fuel_burn_effect: {
    desc: string;
    fuel_advantage_per_lap: number;
    adjusted_degradation_rate: number;
  };
  track_evolution: string;
  dirty_air: string;
}

export interface DegradationResponse {
  year: number;
  circuit: string;
  driver_code: string;
  compound: string;
  stint_laps: StintLapPoint[];
  regression_stats: RegressionStats;
  compound_comparison: CompoundComparisonItem[];
  weather_summary: WeatherSummary;
  confounding_factors: ConfoundingFactors;
}

export interface FeatureImportance {
  feature: string;
  importance_pct: number;
}

export interface ModelMetrics {
  mae: number;
  rmse: number;
  r2_score: number;
  train_samples: number;
  test_samples: number;
  mean_actual_lap_time: number;
  feature_importances: FeatureImportance[];
  explanations: {
    mae: string;
    rmse: string;
    r2: string;
  };
}

export interface HistoricalBenchmarks {
  matched_lap_count: number;
  historical_min: number;
  historical_median: number;
  historical_max: number;
  historical_min_formatted: string;
  historical_median_formatted: string;
  historical_max_formatted: string;
}

export interface LapPredictionResponse {
  predicted_lap_time_seconds: number;
  predicted_lap_time_formatted: string;
  input_conditions: {
    circuit: string;
    driver_code: string;
    compound: string;
    tyre_age: number;
    track_temperature: number;
    air_temperature: number;
    rainfall: number;
  };
  historical_benchmarks: HistoricalBenchmarks | null;
  model_metrics: ModelMetrics;
}

export interface PitWindow {
  stop: number;
  start: number;
  optimal: number;
  end: number;
  compound_to: string;
}

export interface StintDetail {
  stint: number;
  compound: string;
  start_lap: number;
  end_lap: number;
  laps: number;
}

export interface StrategyItem {
  name: string;
  stops: number;
  compounds: string[];
  pit_windows: PitWindow[];
  stints: StintDetail[];
  total_estimated_time_seconds: number;
  total_estimated_time_formatted: string;
  avg_lap_time: number;
}

export interface StrategyResponse {
  circuit: string;
  total_laps: number;
  current_lap: number;
  starting_compound: string;
  safety_car_scenario: string;
  scenario_details: string;
  normal_pit_loss: number;
  effective_first_pit_loss: number;
  recommended_strategy: StrategyItem | null;
  all_strategies: StrategyItem[];
  recommendation_summary: string[];
}
