import requests
import json
import os
import pandas as pd
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CACHE_DIR = os.path.join(DATA_DIR, "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

TARGET_SESSIONS = [
    {"year": 2023, "country": "Bahrain", "circuit": "Sakhir", "session_key": 7953, "total_laps": 57},
    {"year": 2023, "country": "United Kingdom", "circuit": "Silverstone", "session_key": 9126, "total_laps": 52},
    {"year": 2023, "country": "Italy", "circuit": "Monza", "session_key": 9157, "total_laps": 51},
    {"year": 2023, "country": "Belgium", "circuit": "Spa-Francorchamps", "session_key": 9141, "total_laps": 44},
    {"year": 2023, "country": "United States", "circuit": "Austin", "session_key": 9213, "total_laps": 56},
    {"year": 2024, "country": "Bahrain", "circuit": "Sakhir", "session_key": 9472, "total_laps": 57},
]

def fetch_cached_json(url, cache_filename):
    filepath = os.path.join(CACHE_DIR, cache_filename)
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    print(f"Downloading from {url}...")
    resp = requests.get(url, timeout=40)
    resp.raise_for_status()
    data = resp.json()
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return data

def process_session(sess_info):
    s_key = sess_info["session_key"]
    year = sess_info["year"]
    country = sess_info["country"]
    circuit = sess_info["circuit"]
    total_race_laps = sess_info["total_laps"]

    print(f"\nProcessing {year} {circuit} (Session {s_key})...")
    
    # 1. Fetch data
    laps_raw = fetch_cached_json(f"https://api.openf1.org/v1/laps?session_key={s_key}", f"laps_{s_key}.json")
    stints_raw = fetch_cached_json(f"https://api.openf1.org/v1/stints?session_key={s_key}", f"stints_{s_key}.json")
    drivers_raw = fetch_cached_json(f"https://api.openf1.org/v1/drivers?session_key={s_key}", f"drivers_{s_key}.json")
    weather_raw = fetch_cached_json(f"https://api.openf1.org/v1/weather?session_key={s_key}", f"weather_{s_key}.json")
    race_control_raw = fetch_cached_json(f"https://api.openf1.org/v1/race_control?session_key={s_key}", f"rc_{s_key}.json")

    # Driver mapping: number -> acronym/name/team
    driver_map = {}
    for d in drivers_raw:
        num = d.get("driver_number")
        if num is not None:
            driver_map[num] = {
                "driver_code": d.get("name_acronym", f"D{num}"),
                "driver_name": d.get("full_name", f"Driver {num}"),
                "team_name": d.get("team_name", "Unknown"),
            }

    # Stints DataFrame
    df_stints = pd.DataFrame(stints_raw)
    if df_stints.empty:
        print("Warning: Stints data empty!")
        return pd.DataFrame()

    # Weather DataFrame
    df_weather = pd.DataFrame(weather_raw)
    if not df_weather.empty and "date" in df_weather.columns:
        df_weather["date_dt"] = pd.to_datetime(df_weather["date"], format="ISO8601")
        df_weather = df_weather.sort_values("date_dt")

    # Race Control (Safety Cars / VSC)
    df_rc = pd.DataFrame(race_control_raw)
    sc_laps = set()
    vsc_laps = set()
    if not df_rc.empty:
        for _, row in df_rc.iterrows():
            msg = str(row.get("message", "")).upper()
            lap = row.get("lap_number")
            if lap is not None and not pd.isna(lap):
                lap = int(lap)
                if "VIRTUAL SAFETY CAR" in msg:
                    vsc_laps.add(lap)
                    vsc_laps.add(lap + 1)
                elif "SAFETY CAR" in msg:
                    sc_laps.add(lap)
                    sc_laps.add(lap + 1)

    # Laps DataFrame
    df_laps = pd.DataFrame(laps_raw)
    if df_laps.empty:
        return pd.DataFrame()

    # Add metadata
    df_laps["year"] = year
    df_laps["country"] = country
    df_laps["circuit"] = circuit
    df_laps["session_key"] = s_key
    df_laps["total_race_laps"] = total_race_laps

    # Map driver info
    df_laps["driver_code"] = df_laps["driver_number"].apply(lambda n: driver_map.get(n, {}).get("driver_code", f"D{n}"))
    df_laps["driver_name"] = df_laps["driver_number"].apply(lambda n: driver_map.get(n, {}).get("driver_name", f"Driver {n}"))
    df_laps["team_name"] = df_laps["driver_number"].apply(lambda n: driver_map.get(n, {}).get("team_name", "Unknown"))

    # Match each lap to its stint to get compound & tyre age
    compounds = []
    tyre_ages = []
    stint_numbers = []

    for _, row in df_laps.iterrows():
        d_num = row["driver_number"]
        lap_num = row["lap_number"]

        matching_stints = df_stints[
            (df_stints["driver_number"] == d_num) &
            (df_stints["lap_start"] <= lap_num) &
            (df_stints["lap_end"] >= lap_num)
        ]

        if not matching_stints.empty:
            stint = matching_stints.iloc[0]
            compound = stint.get("compound", "UNKNOWN")
            base_age = stint.get("tyre_age_at_start", 0) or 0
            stint_start = stint.get("lap_start", lap_num)
            age = base_age + (lap_num - stint_start)
            stint_num = stint.get("stint_number", 1)
        else:
            compound = "UNKNOWN"
            age = 0
            stint_num = 1

        compounds.append(compound)
        tyre_ages.append(age)
        stint_numbers.append(stint_num)

    df_laps["compound"] = compounds
    df_laps["tyre_age"] = tyre_ages
    df_laps["stint_number"] = stint_numbers

    # Track safety car status
    df_laps["is_safety_car"] = df_laps["lap_number"].apply(lambda l: l in sc_laps)
    df_laps["is_virtual_safety_car"] = df_laps["lap_number"].apply(lambda l: l in vsc_laps)

    # Assign weather
    if not df_weather.empty and "date_start" in df_laps.columns:
        df_laps["lap_dt"] = pd.to_datetime(df_laps["date_start"], format="ISO8601", errors="coerce")
        df_laps["lap_dt"] = df_laps["lap_dt"].ffill().bfill()
        
        if df_laps["lap_dt"].notna().any():
            # If any remain null, fill with first weather timestamp
            if df_laps["lap_dt"].isna().any():
                df_laps["lap_dt"] = df_laps["lap_dt"].fillna(df_weather["date_dt"].iloc[0])

            # Merge asof to get weather closest to lap start
            df_laps = pd.merge_asof(
                df_laps.sort_values("lap_dt"),
                df_weather[["date_dt", "air_temperature", "track_temperature", "humidity", "rainfall"]],
                left_on="lap_dt",
                right_on="date_dt",
                direction="nearest"
            )
        else:
            df_laps["air_temperature"] = 28.0
            df_laps["track_temperature"] = 35.0
            df_laps["humidity"] = 25.0
            df_laps["rainfall"] = 0
    else:
        df_laps["air_temperature"] = 28.0
        df_laps["track_temperature"] = 35.0
        df_laps["humidity"] = 25.0
        df_laps["rainfall"] = 0

    # Fill default weather if any nulls remain
    df_laps["air_temperature"] = df_laps["air_temperature"].fillna(28.0)
    df_laps["track_temperature"] = df_laps["track_temperature"].fillna(35.0)
    df_laps["rainfall"] = df_laps["rainfall"].fillna(0)
    df_laps["humidity"] = df_laps["humidity"].fillna(25.0)

    # Lap time in seconds
    df_laps["lap_time_seconds"] = pd.to_numeric(df_laps["lap_duration"], errors="coerce")

    # Determine is_valid_pace:
    median_time = df_laps["lap_time_seconds"].dropna().median()
    df_laps["is_pit_out_lap"] = df_laps["is_pit_out_lap"].fillna(False)

    df_laps["is_valid_pace"] = (
        df_laps["lap_time_seconds"].notna() &
        (~df_laps["is_pit_out_lap"]) &
        (~df_laps["is_safety_car"]) &
        (~df_laps["is_virtual_safety_car"]) &
        (df_laps["lap_time_seconds"] > 50) &
        (df_laps["lap_time_seconds"] < median_time * 1.15) &
        (df_laps["compound"].isin(["SOFT", "MEDIUM", "HARD"]))
    )

    print(f"Loaded {len(df_laps)} laps. Valid pace laps: {df_laps['is_valid_pace'].sum()}")
    return df_laps

def build_dataset():
    all_dfs = []
    for sess in TARGET_SESSIONS:
        try:
            df = process_session(sess)
            if not df.empty:
                all_dfs.append(df)
        except Exception as e:
            print(f"Error processing session {sess}: {e}")

    if all_dfs:
        full_df = pd.concat(all_dfs, ignore_index=True)
        out_csv = os.path.join(DATA_DIR, "processed_laps.csv")
        full_df.to_csv(out_csv, index=False)
        print(f"\n==========================================")
        print(f"Successfully built dataset: {len(full_df)} total laps across {len(all_dfs)} sessions.")
        print(f"Clean valid pace laps for modeling: {full_df['is_valid_pace'].sum()}")
        print(f"Circuits: {full_df['circuit'].unique()}")
        print(f"Compounds: {full_df['compound'].value_counts().to_dict()}")
        print(f"Saved to {out_csv}")
        print(f"==========================================")
        return full_df
    return pd.DataFrame()

if __name__ == "__main__":
    build_dataset()
