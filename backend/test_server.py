import subprocess
import time
import urllib.request
import json
import sys

def run_e2e_test():
    print("Starting FastAPI backend server...")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd="C:/Users/shyam/.gemini/antigravity/scratch/f1-predictor",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    time.sleep(3)

    try:
        # 1. Health
        print("Testing /api/health...")
        with urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=5) as resp:
            data = json.loads(resp.read().decode())
            print("Health response:", data)
            assert data["status"] == "online"
            assert data["total_laps_loaded"] > 0

        # 2. Options
        print("Testing /api/options...")
        with urllib.request.urlopen("http://127.0.0.1:8000/api/options", timeout=5) as resp:
            opts = json.loads(resp.read().decode())
            print("Circuits available:", opts["all_circuits"])
            assert len(opts["all_circuits"]) > 0

        # 3. Degradation
        print("Testing /api/degradation...")
        deg_url = "http://127.0.0.1:8000/api/degradation?year=2023&circuit=Sakhir&driver_code=VER&compound=SOFT"
        with urllib.request.urlopen(deg_url, timeout=5) as resp:
            deg = json.loads(resp.read().decode())
            print(f"Degradation rate: +{deg['regression_stats']['degradation_rate_per_lap']}s/lap on {len(deg['stint_laps'])} laps")
            assert deg["regression_stats"]["base_pace"] > 0

        # 4. Lap Time ML Prediction
        print("Testing /api/predict-lap...")
        req_data = json.dumps({
            "circuit": "Sakhir",
            "driver_code": "VER",
            "compound": "SOFT",
            "tyre_age": 5,
            "track_temperature": 35.0,
            "air_temperature": 28.0,
            "rainfall": 0
        }).encode("utf-8")
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/predict-lap",
            data=req_data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            lap_pred = json.loads(resp.read().decode())
            print(f"Predicted lap time: {lap_pred['predicted_lap_time_formatted']} ({lap_pred['predicted_lap_time_seconds']}s)")
            print(f"Model MAE: {lap_pred['model_metrics']['mae']}s | R²: {lap_pred['model_metrics']['r2_score']}")
            assert lap_pred["predicted_lap_time_seconds"] > 60

        # 5. Race Strategy Simulation
        print("Testing /api/predict-strategy...")
        strat_data = json.dumps({
            "circuit": "Sakhir",
            "race_distance": 57,
            "starting_compound": "MEDIUM",
            "available_compounds": ["SOFT", "MEDIUM", "HARD"],
            "weather": "Dry",
            "current_lap": 1,
            "current_tyre_age": 1,
            "current_position": 1,
            "safety_car_scenario": "safety_car"
        }).encode("utf-8")
        strat_req = urllib.request.Request(
            "http://127.0.0.1:8000/api/predict-strategy",
            data=strat_data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(strat_req, timeout=5) as resp:
            strat_pred = json.loads(resp.read().decode())
            rec = strat_pred["recommended_strategy"]
            print(f"Recommended Strategy: {rec['name']} | Est. Time: {rec['total_estimated_time_formatted']}")
            print(f"Pit windows: {rec['pit_windows']}")
            assert rec["stops"] >= 1

        print("\nAll API endpoints passed successfully!")
    finally:
        print("Stopping backend server...")
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    run_e2e_test()
