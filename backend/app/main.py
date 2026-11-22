import os
import sys
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Ensure root directory is in sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app.degradation import DegradationAnalyzer
from backend.app.ml_model import LapTimePredictor
from backend.app.strategy import RaceStrategySimulator
from backend.app.schemas import LapPredictRequest, StrategyPredictRequest

app = FastAPI(
    title="F1 Race Performance & Strategy Predictor API",
    description="Full-stack student-level machine learning and race strategy analytics API for Formula 1",
    version="1.0.0"
)

# Enable CORS for local Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize analytical modules
degradation_analyzer = DegradationAnalyzer()
lap_predictor = LapTimePredictor()
strategy_simulator = RaceStrategySimulator()

@app.get("/api/health")
def health_check():
    has_data = degradation_analyzer._df is not None and not degradation_analyzer._df.empty
    laps_count = len(degradation_analyzer._df) if has_data else 0
    return {
        "status": "online",
        "data_loaded": has_data,
        "total_laps_loaded": laps_count,
        "model_trained": lap_predictor.pipeline is not None,
    }

@app.get("/api/options")
def get_options():
    try:
        return degradation_analyzer.get_filter_options()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/degradation")
def get_degradation(
    year: int = Query(2023, description="Championship Season"),
    circuit: str = Query("Sakhir", description="Grand Prix Circuit"),
    driver_code: str = Query("VER", description="Driver 3-letter acronym"),
    compound: str = Query("SOFT", description="Tyre compound: SOFT, MEDIUM, HARD"),
):
    try:
        res = degradation_analyzer.analyze_stint(
            year=year,
            circuit=circuit,
            driver_code=driver_code.upper(),
            compound=compound.upper(),
        )
        if "error" in res:
            raise HTTPException(status_code=404, detail=res["error"])
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/predict-lap")
def predict_lap(req: LapPredictRequest):
    try:
        res = lap_predictor.predict_lap_time(
            circuit=req.circuit,
            driver_code=req.driver_code,
            compound=req.compound,
            tyre_age=req.tyre_age,
            track_temp=req.track_temperature,
            air_temp=req.air_temperature,
            rainfall=req.rainfall,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/predict-strategy")
def predict_strategy(req: StrategyPredictRequest):
    try:
        res = strategy_simulator.simulate_strategy(
            circuit=req.circuit,
            race_distance=req.race_distance or 57,
            starting_compound=req.starting_compound,
            available_compounds=req.available_compounds,
            weather=req.weather,
            current_lap=req.current_lap,
            current_tyre_age=req.current_tyre_age,
            current_position=req.current_position or 1,
            safety_car_scenario=req.safety_car_scenario,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
