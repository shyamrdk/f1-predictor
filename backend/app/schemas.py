from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class LapPredictRequest(BaseModel):
    circuit: str = Field(..., example="Sakhir")
    driver_code: str = Field(..., example="VER")
    compound: str = Field(..., example="SOFT")
    tyre_age: int = Field(5, ge=0, le=60, example=5)
    track_temperature: float = Field(35.0, ge=10.0, le=65.0, example=35.0)
    air_temperature: float = Field(28.0, ge=5.0, le=50.0, example=28.0)
    rainfall: int = Field(0, ge=0, le=1, example=0)

class StrategyPredictRequest(BaseModel):
    circuit: str = Field("Sakhir", example="Sakhir")
    race_distance: Optional[int] = Field(57, ge=10, le=80, example=57)
    starting_compound: str = Field("MEDIUM", example="MEDIUM")
    available_compounds: List[str] = Field(default=["SOFT", "MEDIUM", "HARD"])
    weather: str = Field("Dry", example="Dry")
    current_lap: int = Field(1, ge=1, le=80, example=1)
    current_tyre_age: int = Field(1, ge=0, le=50, example=1)
    current_position: Optional[int] = Field(1, ge=1, le=20, example=1)
    safety_car_scenario: str = Field("normal", example="normal")  # "normal", "safety_car", "vsc"
