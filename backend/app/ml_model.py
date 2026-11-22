import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "processed_laps.csv")
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "rf_lap_time_model.joblib")
METRICS_PATH = os.path.join(MODEL_DIR, "model_metrics.joblib")
os.makedirs(MODEL_DIR, exist_ok=True)

class LapTimePredictor:
    def __init__(self, model_path=MODEL_PATH):
        self.model_path = model_path
        self.pipeline = None
        self.metrics = None
        self.feature_names = None
        self._df = None
        self.load_dataset()
        if os.path.exists(self.model_path):
            self.load_model()
        else:
            self.train_model()

    def load_dataset(self):
        if os.path.exists(DATA_PATH):
            self._df = pd.read_csv(DATA_PATH)
            for col in ["is_valid_pace", "is_pit_out_lap", "is_safety_car", "is_virtual_safety_car"]:
                if col in self._df.columns:
                    self._df[col] = self._df[col].astype(bool)
        else:
            self._df = pd.DataFrame()

    def train_model(self):
        if self._df.empty:
            print("No dataset available to train model.")
            return None

        # Filter strictly clean valid racing laps
        clean_df = self._df[
            self._df["is_valid_pace"] &
            self._df["lap_time_seconds"].notna() &
            self._df["compound"].isin(["SOFT", "MEDIUM", "HARD"])
        ].copy()

        # Features & Target
        cat_features = ["circuit", "driver_code", "compound"]
        num_features = ["tyre_age", "track_temperature", "air_temperature", "rainfall"]
        
        X = clean_df[cat_features + num_features]
        y = clean_df["lap_time_seconds"]

        # 80/20 train/test split with seed
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, shuffle=True
        )

        preprocessor = ColumnTransformer(
            transformers=[
                ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_features),
                ("num", StandardScaler(), num_features),
            ]
        )

        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=14,
            min_samples_split=4,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )

        pipeline = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("regressor", model)
        ])

        print(f"Training Random Forest on {len(X_train)} laps (evaluating on {len(X_test)} laps)...")
        pipeline.fit(X_train, y_train)

        # Evaluate
        y_pred = pipeline.predict(X_test)
        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(root_mean_squared_error(y_test, y_pred))
        r2 = float(r2_score(y_test, y_pred))

        # Feature importances
        cat_encoder = pipeline.named_steps["preprocessor"].named_transformers_["cat"]
        encoded_cat_names = list(cat_encoder.get_feature_names_out(cat_features))
        all_feature_names = encoded_cat_names + num_features
        raw_importances = model.feature_importances_

        # Aggregate feature importance by parent group
        group_importances = {"circuit": 0.0, "driver": 0.0, "compound": 0.0, "tyre_age": 0.0, "track_temp": 0.0, "air_temp": 0.0, "rainfall": 0.0}
        for name, imp in zip(all_feature_names, raw_importances):
            if name.startswith("circuit_"):
                group_importances["circuit"] += imp
            elif name.startswith("driver_code_"):
                group_importances["driver"] += imp
            elif name.startswith("compound_"):
                group_importances["compound"] += imp
            elif name == "tyre_age":
                group_importances["tyre_age"] += imp
            elif name == "track_temperature":
                group_importances["track_temp"] += imp
            elif name == "air_temperature":
                group_importances["air_temp"] += imp
            elif name == "rainfall":
                group_importances["rainfall"] += imp

        # Normalize to percentage
        total_imp = sum(group_importances.values())
        formatted_importances = [
            {"feature": k.replace("_", " ").title(), "importance_pct": round((v / total_imp) * 100, 1)}
            for k, v in sorted(group_importances.items(), key=lambda x: x[1], reverse=True)
        ]

        self.metrics = {
            "mae": round(mae, 3),
            "rmse": round(rmse, 3),
            "r2_score": round(r2, 4),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "mean_actual_lap_time": round(float(y_test.mean()), 2),
            "feature_importances": formatted_importances,
            "explanations": {
                "mae": f"Mean Absolute Error is {round(mae, 3)} seconds. On average, the model's lap time prediction is within {round(mae * 1000)} milliseconds of reality.",
                "rmse": f"Root Mean Squared Error is {round(rmse, 3)} seconds, penalizing larger deviations such as outlier laps with traffic or mistakes.",
                "r2": f"R² Score of {round(r2, 3)} indicates the model explains {round(r2 * 100, 1)}% of the variance in lap times across circuits, tyres, and drivers.",
            }
        }

        self.pipeline = pipeline
        joblib.dump(pipeline, self.model_path)
        joblib.dump(self.metrics, METRICS_PATH)
        print(f"Model saved! MAE: {mae:.3f}s | RMSE: {rmse:.3f}s | R²: {r2:.4f}")
        return self.metrics

    def load_model(self):
        if os.path.exists(self.model_path):
            self.pipeline = joblib.load(self.model_path)
        if os.path.exists(METRICS_PATH):
            self.metrics = joblib.load(METRICS_PATH)

    def predict_lap_time(self, circuit: str, driver_code: str, compound: str,
                         tyre_age: int, track_temp: float, air_temp: float, rainfall: int = 0):
        if self.pipeline is None:
            self.train_model()

        input_df = pd.DataFrame([{
            "circuit": circuit,
            "driver_code": driver_code,
            "compound": compound.upper(),
            "tyre_age": tyre_age,
            "track_temperature": track_temp,
            "air_temperature": air_temp,
            "rainfall": rainfall,
        }])

        pred_seconds = float(self.pipeline.predict(input_df)[0])

        # Historical comparison lookup
        hist_stats = self._get_historical_benchmarks(circuit, compound.upper(), tyre_age)

        return {
            "predicted_lap_time_seconds": round(pred_seconds, 3),
            "predicted_lap_time_formatted": self.format_lap_time(pred_seconds),
            "input_conditions": {
                "circuit": circuit,
                "driver_code": driver_code,
                "compound": compound.upper(),
                "tyre_age": tyre_age,
                "track_temperature": track_temp,
                "air_temperature": air_temp,
                "rainfall": rainfall,
            },
            "historical_benchmarks": hist_stats,
            "model_metrics": self.metrics,
        }

    def _get_historical_benchmarks(self, circuit: str, compound: str, tyre_age: int):
        if self._df.empty:
            return None

        # Similar laps: same circuit, same compound, tyre_age within +/- 4 laps
        matches = self._df[
            (self._df["circuit"] == circuit) &
            (self._df["compound"] == compound) &
            (self._df["is_valid_pace"]) &
            (self._df["tyre_age"].between(max(0, tyre_age - 3), tyre_age + 3))
        ]

        if matches.empty:
            # Fallback to just same circuit & compound
            matches = self._df[
                (self._df["circuit"] == circuit) &
                (self._df["compound"] == compound) &
                (self._df["is_valid_pace"])
            ]

        if not matches.empty:
            times = matches["lap_time_seconds"].dropna()
            return {
                "matched_lap_count": len(times),
                "historical_min": round(float(times.min()), 3),
                "historical_median": round(float(times.median()), 3),
                "historical_max": round(float(times.max()), 3),
                "historical_min_formatted": self.format_lap_time(float(times.min())),
                "historical_median_formatted": self.format_lap_time(float(times.median())),
                "historical_max_formatted": self.format_lap_time(float(times.max())),
            }
        return None

    @staticmethod
    def format_lap_time(seconds: float) -> str:
        if pd.isna(seconds) or seconds <= 0:
            return "N/A"
        minutes = int(seconds // 60)
        remaining_sec = seconds % 60
        return f"{minutes}:{remaining_sec:06.3f}"

predictor = LapTimePredictor()
