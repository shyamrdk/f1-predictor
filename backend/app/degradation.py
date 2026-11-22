import os
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "processed_laps.csv")

class DegradationAnalyzer:
    def __init__(self, data_path=DATA_PATH):
        self.data_path = data_path
        self._df = None
        self.load_data()

    def load_data(self):
        if os.path.exists(self.data_path):
            self._df = pd.read_csv(self.data_path)
            # Ensure boolean types
            for col in ["is_valid_pace", "is_pit_out_lap", "is_safety_car", "is_virtual_safety_car"]:
                if col in self._df.columns:
                    self._df[col] = self._df[col].astype(bool)
        else:
            self._df = pd.DataFrame()

    def get_filter_options(self):
        if self._df.empty:
            return {}
        
        circuits_by_year = {}
        for year, group in self._df.groupby("year"):
            circuits_by_year[int(year)] = sorted(group["circuit"].unique().tolist())

        drivers = self._df[["driver_code", "driver_name", "team_name"]].drop_duplicates().sort_values("driver_code")
        driver_list = drivers.to_dict(orient="records")

        compounds = ["SOFT", "MEDIUM", "HARD"]

        return {
            "years": sorted(self._df["year"].unique().tolist(), reverse=True),
            "circuits_by_year": circuits_by_year,
            "all_circuits": sorted(self._df["circuit"].unique().tolist()),
            "drivers": driver_list,
            "compounds": compounds,
        }

    def analyze_stint(self, year: int, circuit: str, driver_code: str, compound: str):
        if self._df.empty:
            return {"error": "Dataset not loaded"}

        # Filter base race data
        race_df = self._df[(self._df["year"] == year) & (self._df["circuit"] == circuit)]
        if race_df.empty:
            return {"error": f"No data found for {year} {circuit}"}

        # Filter driver and compound
        driver_compound_df = race_df[
            (race_df["driver_code"] == driver_code) &
            (race_df["compound"] == compound)
        ].sort_values("lap_number")

        # If driver didn't run that compound, fallback to all laps for that driver
        if driver_compound_df.empty:
            # Let's find what compounds this driver actually ran
            available_compounds = race_df[race_df["driver_code"] == driver_code]["compound"].unique().tolist()
            if available_compounds and available_compounds[0] in ["SOFT", "MEDIUM", "HARD"]:
                compound = available_compounds[0]
                driver_compound_df = race_df[
                    (race_df["driver_code"] == driver_code) &
                    (race_df["compound"] == compound)
                ].sort_values("lap_number")

        # Extract stint points
        stint_points = []
        for _, row in driver_compound_df.iterrows():
            stint_points.append({
                "lap_number": int(row["lap_number"]),
                "tyre_age": int(row["tyre_age"]),
                "lap_time_seconds": round(float(row["lap_time_seconds"]), 3) if pd.notna(row["lap_time_seconds"]) else None,
                "stint_number": int(row["stint_number"]),
                "is_valid_pace": bool(row["is_valid_pace"]),
                "track_temperature": round(float(row["track_temperature"]), 1),
                "air_temperature": round(float(row["air_temperature"]), 1),
                "is_safety_car": bool(row["is_safety_car"] or row["is_virtual_safety_car"]),
            })

        # Calculate Degradation Rate via Linear Regression on valid pace laps
        valid_laps = driver_compound_df[driver_compound_df["is_valid_pace"] & driver_compound_df["lap_time_seconds"].notna()]
        
        reg_stats = {
            "degradation_rate_per_lap": 0.05,
            "base_pace": 0.0,
            "r2_score": 0.0,
            "valid_lap_count": len(valid_laps),
            "trend_line": [],
        }

        if len(valid_laps) >= 3:
            X = valid_laps[["tyre_age"]].values
            y = valid_laps["lap_time_seconds"].values
            model = LinearRegression().fit(X, y)
            slope = float(model.coef_[0])
            intercept = float(model.intercept_)
            r2 = float(model.score(X, y))

            reg_stats["degradation_rate_per_lap"] = round(slope, 4)
            reg_stats["base_pace"] = round(intercept, 3)
            reg_stats["r2_score"] = round(max(0.0, r2), 3)

            # Generate trend line points
            min_age = int(valid_laps["tyre_age"].min())
            max_age = int(valid_laps["tyre_age"].max())
            for age in range(min_age, max_age + 1):
                pred_time = model.predict([[age]])[0]
                reg_stats["trend_line"].append({
                    "tyre_age": age,
                    "trend_time": round(float(pred_time), 3),
                })
        elif not valid_laps.empty:
            reg_stats["base_pace"] = round(float(valid_laps["lap_time_seconds"].mean()), 3)

        # Compound Comparison across entire session
        compound_comparison = []
        for comp in ["SOFT", "MEDIUM", "HARD"]:
            comp_laps = race_df[(race_df["compound"] == comp) & race_df["is_valid_pace"]]
            if len(comp_laps) >= 10:
                X_comp = comp_laps[["tyre_age"]].values
                y_comp = comp_laps["lap_time_seconds"].values
                lr = LinearRegression().fit(X_comp, y_comp)
                compound_comparison.append({
                    "compound": comp,
                    "sample_laps": len(comp_laps),
                    "base_pace": round(float(lr.intercept_), 3),
                    "avg_lap_time": round(float(y_comp.mean()), 3),
                    "degradation_rate": round(float(lr.coef_[0]), 4),
                    "max_stint_length": int(comp_laps["tyre_age"].max()),
                    "avg_stint_length": round(float(comp_laps.groupby(["driver_code", "stint_number"])["tyre_age"].max().mean()), 1),
                })
            elif not comp_laps.empty:
                compound_comparison.append({
                    "compound": comp,
                    "sample_laps": len(comp_laps),
                    "base_pace": round(float(comp_laps["lap_time_seconds"].mean()), 3),
                    "avg_lap_time": round(float(comp_laps["lap_time_seconds"].mean()), 3),
                    "degradation_rate": 0.05,
                    "max_stint_length": int(comp_laps["tyre_age"].max()),
                    "avg_stint_length": round(float(comp_laps["tyre_age"].mean()), 1),
                })

        # Weather influence summary
        avg_track_temp = round(float(race_df["track_temperature"].mean()), 1)
        avg_air_temp = round(float(race_df["air_temperature"].mean()), 1)
        weather_summary = {
            "avg_track_temp": avg_track_temp,
            "avg_air_temp": avg_air_temp,
            "track_temp_range": [round(float(race_df["track_temperature"].min()), 1), round(float(race_df["track_temperature"].max()), 1)],
            "rainfall": bool(race_df["rainfall"].max() > 0),
        }

        # Confounding factors explanation
        confounding_factors = {
            "fuel_burn_effect": {
                "desc": "Car loses ~1.7 to 1.9 kg of fuel per lap (~0.055s/lap lap time benefit), which partially offsets and masks tyre degradation.",
                "fuel_advantage_per_lap": -0.055,
                "adjusted_degradation_rate": round(reg_stats["degradation_rate_per_lap"] + 0.055, 4),
            },
            "track_evolution": "Grip levels generally improve as rubber is laid down into the racing line throughout the Grand Prix.",
            "dirty_air": "Following within 1.5 seconds of another car increases tyre surface sliding and thermal degradation by 15-30%.",
        }

        return {
            "year": year,
            "circuit": circuit,
            "driver_code": driver_code,
            "compound": compound,
            "stint_laps": stint_points,
            "regression_stats": reg_stats,
            "compound_comparison": compound_comparison,
            "weather_summary": weather_summary,
            "confounding_factors": confounding_factors,
        }
