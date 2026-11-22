# Formula 1 Race Performance & Strategy Predictor

A functional, locally runnable full-stack Formula 1 analytics and machine learning application developed using genuine historical F1 telemetry and timing data.

This project delivers three primary capabilities:
1. **Lap Time Degradation Analysis**: Empirical stint progression, compound degradation rates ($\text{s/lap}$ wear slope), and confounding variable analysis (fuel load, track evolution, dirty air).
2. **Lap Time Prediction**: Machine learning regression model predicting lap times in seconds based on circuit, driver, tyre compound, tyre age, and environmental conditions.
3. **Race Strategy Simulation**: Multi-stint strategy recommendation evaluating 1-stop and 2-stop combinations, optimal pit stop windows, and scenario-based Safety Car / Virtual Safety Car (VSC) pit delta dynamics.

---

## 1. Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (motorsport-inspired dark telemetry theme)
- **Visualizations**: Recharts for responsive telemetry charts, wear curves, and feature importance graphs
- **Icons**: Lucide React

### Backend
- **Web API**: FastAPI + Uvicorn
- **Data Engineering**: Pandas, NumPy
- **Machine Learning**: Scikit-learn (Random Forest Regression, Linear Regression, ColumnTransformer, Standard Scaler, One-Hot Encoding)
- **Serialization**: Joblib

### F1 Data
- **Libraries & APIs**: FastF1 & OpenF1 historical telemetry endpoints.
- **Seasons & Circuits**: Genuine race data across 2023–2024 seasons covering high-degradation, high-speed, and low-downforce circuits (Sakhir / Bahrain, Silverstone / Great Britain, Monza / Italy, Spa-Francorchamps / Belgium, Austin / COTA).
- **Caching**: Local disk cache (`backend/data/cache`) to avoid repeated network overhead.

---

## 2. Data Collection, Preprocessing & Integrity

### Genuine Historical Telemetry
The application uses 5,960+ authentic race laps ingested directly from official Formula 1 timing feeds and the OpenF1 standard:
- Lap-by-lap duration and sector times
- Driver identification and vehicle numbers
- Tyre compounds (`SOFT`, `MEDIUM`, `HARD`) and continuous tyre age tracking
- Stint numbers, start laps, and pit stop events
- Ambient air temperature, track temperature, humidity, and rainfall
- Race control flags and Safety Car / VSC neutralized periods

### Data Filtering & Normalization
To prevent telemetry noise from distorting model training and degradation curves:
- **Pit-in & Pit-out Laps**: Laps containing pit lane transit are tagged (`is_pit_out_lap`) and excluded from normal racing pace modeling.
- **Neutralized Laps**: Laps run under Safety Car (SC) or Virtual Safety Car (VSC) are flagged and excluded from tyre degradation slopes.
- **Outliers & Incidents**: Any lap time exceeding $115\%$ of the session median (spins, collisions, debris slowdowns) is isolated from base pace models.
- **Data Integrity**: No data is fabricated or silently synthesized. All figures derive from real telemetry.

### FastF1 Authentication Note
In recent FastF1 versions (3.9+), Formula 1's live timing server (`livetiming.formula1.com`) requires user authentication via Formula 1 account credentials (`F1_USERNAME` and `F1_PASSWORD`). Without credentials, direct livetiming requests return authentication notices. To guarantee seamless, zero-cost, and reliable student demonstrations without requiring private credentials or paid APIs:
- FastF1's unauthenticated Ergast database interface is utilized for race schedules, classifications, and pit stop records.
- Open telemetry endpoints (OpenF1) are utilized for full granular lap times, tyre compounds, and weather telemetry.
- All fetched data is cached permanently in `backend/data/cache/` for instant offline execution.

---

## 3. Core Feature 1: Lap Time Degradation Analysis

The **Degradation Analysis** module breaks down stint performance:
- **Telemetry Scatter & Trendline**: Plots every lap of a driver's stint against tyre age, overlaying an ordinary least squares (OLS) linear regression wear trend line:
  $$\text{LapTime}(a) = \text{BasePace} + (\beta_{\text{deg}} \times a)$$
  where $\beta_{\text{deg}}$ represents the degradation rate in seconds lost per lap.
- **Compound Comparison**: Benchmarks Soft, Medium, and Hard compounds across the Grand Prix:
  - Base pace on fresh tyres (seconds)
  - Degradation rate ($\text{s/lap}$)
  - Average and maximum recorded stint lengths
- **Confounding Variables Educational Panel**:
  - **Fuel Load Burn-off**: Explains how cars burning $\sim 1.7\text{ kg}$ of fuel per lap gain $\sim 0.055\text{ s/lap}$ in theoretical pace, which partially masks observed tyre degradation. The system displays both the raw observed slope and the fuel-adjusted degradation slope.
  - **Track Evolution**: Rubbering-in of the racing line throughout the Grand Prix.
  - **Dirty Air**: Aero wake effects when following within 1.5 seconds, which increases sliding and thermal degradation.

---

## 4. Core Feature 2: Lap Time Prediction (Machine Learning)

The **Lap Time Prediction** module deploys an authentic Machine Learning regression model:
- **Algorithm**: Scikit-learn `RandomForestRegressor` (100 estimators, max depth 14, min samples leaf 2).
- **Features**:
  - Categorical: `circuit`, `driver_code`, `compound` (encoded via `OneHotEncoder(handle_unknown='ignore')`)
  - Numeric: `tyre_age`, `track_temperature`, `air_temperature`, `rainfall` (scaled via `StandardScaler`)
- **Validation**: 80/20 train/test split on 5,535 clean racing laps without data leakage.

### Model Performance Metrics
- **Mean Absolute Error (MAE)**: `0.607 seconds`
  - *Plain-English Explanation*: On average, the model's lap time estimate is within $\approx 600\text{ ms}$ of actual racing pace.
- **Root Mean Squared Error (RMSE)**: `1.124 seconds`
  - *Plain-English Explanation*: Heavily penalizes outlier laps caused by traffic or minor driver errors.
- **Coefficient of Determination ($R^2$)**: `0.9793`
  - *Plain-English Explanation*: Explains $97.9\%$ of lap time variance across diverse circuit layouts, compounds, and tyre wear.

### Historical Benchmarking
Alongside the ML estimate, the interface computes an empirical benchmark against genuine historical laps run under identical circuit, compound, and tyre age conditions, showing the session minimum, median, and maximum.

---

## 5. Core Feature 3: Race Strategy & Safety Car Simulation

The **Race Strategy Simulator** evaluates multi-stint race plans:
- **Formula 1 Regulation Compliance**: Generates candidate 1-stop and 2-stop strategies, enforcing the dry-weather rule that drivers must use at least two distinct slick compounds (e.g. Medium $\to$ Hard, Soft $\to$ Hard, Medium $\to$ Hard $\to$ Soft).
- **Total Race Time Formulation**:
  $$T_{\text{total}} = \sum_{i=1}^{N_{\text{stints}}} \left( \sum_{\text{lap}=1}^{L_i} \text{LapTime}(\text{lap}) \right) + (N_{\text{stops}} \times \Delta t_{\text{pit}})$$
- **Non-Linear Tyre Cliff**: Beyond the optimal compound life (e.g. 18 laps for Soft, 28 for Medium, 40 for Hard), a non-linear degradation penalty is applied:
  $$\text{Penalty} = 0.12 \times (\text{Age} - \text{Cliff})^{1.3}$$
- **Optimal Pit Window Calculation**: Evaluates stint boundary permutations to calculate the specific lap window (e.g. Lap 16–20) that minimizes overall race duration.

### Safety Car & Virtual Safety Car (VSC) Scenarios
The simulator features interactive scenario evaluation:
1. **Normal Green Flag**: Standard circuit pit loss delta ($\sim 21\text{s} - 24\text{s}$).
2. **Virtual Safety Car (VSC)**: Cars on track drive to delta times ($\sim 65\%$ racing speed) while pit lane transit remains capped at 80 km/h. Effective pit delta drops to $\sim 14.5\text{s}$, yielding an $\approx 8.5\text{s}$ advantage.
3. **Full Safety Car (SC)**: Cars bunch behind the physical Safety Car. Effective pit delta drops to $\sim 11.0\text{s}$, yielding an $\approx 12.5\text{s}$ "Cheap Pit Stop" advantage.

The system explains whether deploying a Safety Car shifts the optimal strategy from a 1-stop to an aggressive 2-stop, or triggers an immediate pit stop window.

---

## 6. How to Install and Run Locally

### Prerequisites
- **Python**: Version 3.10+ (tested on Python 3.14)
- **Node.js**: Version 18+ (tested on Node v24)
- **npm**: Version 9+

### Step 1: Install Backend Dependencies
From the project root:
```bash
python -m pip install -r backend/requirements.txt
```

### Step 2: Install Frontend Dependencies
From the `frontend` directory:
```bash
cd frontend
npm install
```

### Step 3: Run the Application
You can start both services via the provided batch scripts, or manually via terminal:

#### Option A: One-Click Startup (Windows)
1. Double click `run_backend.bat` (starts FastAPI on `http://127.0.0.1:8000`)
2. Double click `run_frontend.bat` (starts Vite dev server on `http://localhost:5173`)

#### Option B: Manual Terminal Execution
**Terminal 1 (Backend):**
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5173
```

---

## 7. Project Structure

```
f1-predictor/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI REST endpoints & CORS configuration
│   │   ├── degradation.py      # Feature 1: Stint telemetry & linear regression analytics
│   │   ├── ml_model.py         # Feature 2: Random Forest lap time predictor & metrics
│   │   ├── strategy.py         # Feature 3: Race strategy, stint optimization & SC scenarios
│   │   └── schemas.py          # Pydantic request/response models
│   ├── data/
│   │   ├── cache/              # Cached raw JSON telemetry feeds (offline access)
│   │   └── processed_laps.csv  # 5,960+ cleaned, genuine F1 laps
│   ├── models/
│   │   ├── rf_lap_time_model.joblib  # Trained Scikit-learn model artifact
│   │   └── model_metrics.joblib      # Serialized MAE, RMSE, R² & feature importances
│   ├── data_collector.py       # Ingestion & preprocessing pipeline
│   ├── test_server.py          # End-to-end API test suite
│   └── requirements.txt        # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx             # Navigation bar & telemetry status badge
│   │   │   ├── DegradationView.tsx    # Feature 1: Stint wear chart & compound comparisons
│   │   │   ├── LapPredictionView.tsx  # Feature 2: ML input controls & historical benchmarks
│   │   │   └── StrategyView.tsx       # Feature 3: Stint visualizer & Safety Car scenario engine
│   │   ├── types.ts                   # TypeScript interfaces
│   │   ├── api.ts                     # API client
│   │   ├── App.tsx                    # Main layout
│   │   ├── main.tsx                   # React root entry
│   │   └── index.css                  # Tailwind styles & motorsport theme variables
│   ├── vite.config.ts                 # Vite config with proxy to backend port 8000
│   └── package.json
├── run_backend.bat             # Startup script for backend
├── run_frontend.bat            # Startup script for frontend
└── README.md                   # Full documentation & project guide
```

---

## 8. Known Limitations

1. **Fuel Flow & Telemetry Gaps**: Formula 1 teams closely guard actual starting fuel weights. A standard fuel burn-off rate ($\sim 1.75\text{ kg/lap} \approx 0.055\text{ s/lap}$) is applied across circuits rather than team-proprietary telemetry.
2. **Safety Car Timing Stochasticity**: Safety cars are random real-world events. The application models Safety Cars through realistic scenario-based simulations ("Normal", "VSC Active", "Full Safety Car Active") rather than fabricating artificial probability distributions.
3. **Dirty Air & Traffic Modeling**: While isolated outlier laps are excluded from degradation slopes, telemetry cannot fully differentiate between driver conservation and following in dirty air without multi-car spatial telemetry.
