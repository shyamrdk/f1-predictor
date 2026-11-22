import os
import pandas as pd
import numpy as np

CIRCUIT_CONFIGS = {
    "Sakhir": {
        "total_laps": 57,
        "base_lap_time": 95.5,
        "green_pit_loss": 23.5,
        "vsc_pit_loss": 15.0,
        "sc_pit_loss": 11.0,
        "fuel_burn_benefit": 0.055,  # seconds per lap
        "deg_rates": {"SOFT": 0.078, "MEDIUM": 0.048, "HARD": 0.028},
        "pace_deltas": {"SOFT": 0.0, "MEDIUM": 0.65, "HARD": 1.25},
        "cliff_laps": {"SOFT": 18, "MEDIUM": 28, "HARD": 40},
    },
    "Silverstone": {
        "total_laps": 52,
        "base_lap_time": 90.0,
        "green_pit_loss": 21.0,
        "vsc_pit_loss": 13.5,
        "sc_pit_loss": 10.0,
        "fuel_burn_benefit": 0.052,
        "deg_rates": {"SOFT": 0.072, "MEDIUM": 0.044, "HARD": 0.026},
        "pace_deltas": {"SOFT": 0.0, "MEDIUM": 0.60, "HARD": 1.15},
        "cliff_laps": {"SOFT": 17, "MEDIUM": 27, "HARD": 38},
    },
    "Monza": {
        "total_laps": 51,
        "base_lap_time": 84.5,
        "green_pit_loss": 24.0,
        "vsc_pit_loss": 15.5,
        "sc_pit_loss": 11.5,
        "fuel_burn_benefit": 0.050,
        "deg_rates": {"SOFT": 0.058, "MEDIUM": 0.038, "HARD": 0.020},
        "pace_deltas": {"SOFT": 0.0, "MEDIUM": 0.55, "HARD": 1.05},
        "cliff_laps": {"SOFT": 20, "MEDIUM": 32, "HARD": 45},
    },
    "Spa-Francorchamps": {
        "total_laps": 44,
        "base_lap_time": 108.0,
        "green_pit_loss": 22.0,
        "vsc_pit_loss": 14.0,
        "sc_pit_loss": 10.5,
        "fuel_burn_benefit": 0.065,
        "deg_rates": {"SOFT": 0.082, "MEDIUM": 0.050, "HARD": 0.030},
        "pace_deltas": {"SOFT": 0.0, "MEDIUM": 0.70, "HARD": 1.35},
        "cliff_laps": {"SOFT": 15, "MEDIUM": 24, "HARD": 35},
    },
    "Austin": {
        "total_laps": 56,
        "base_lap_time": 98.0,
        "green_pit_loss": 22.5,
        "vsc_pit_loss": 14.5,
        "sc_pit_loss": 10.8,
        "fuel_burn_benefit": 0.054,
        "deg_rates": {"SOFT": 0.076, "MEDIUM": 0.046, "HARD": 0.026},
        "pace_deltas": {"SOFT": 0.0, "MEDIUM": 0.62, "HARD": 1.20},
        "cliff_laps": {"SOFT": 16, "MEDIUM": 26, "HARD": 38},
    },
}

class RaceStrategySimulator:
    def __init__(self):
        pass

    def simulate_strategy(self, circuit: str, race_distance: int,
                          starting_compound: str, available_compounds: list,
                          weather: str = "Dry", current_lap: int = 1,
                          current_tyre_age: int = 1, current_position: int = 1,
                          safety_car_scenario: str = "normal"):
        
        cfg = CIRCUIT_CONFIGS.get(circuit, CIRCUIT_CONFIGS["Sakhir"])
        total_laps = race_distance if race_distance > 0 else cfg["total_laps"]
        start_comp = starting_compound.upper() if starting_compound else "MEDIUM"
        avail = [c.upper() for c in available_compounds] if available_compounds else ["SOFT", "MEDIUM", "HARD"]
        if start_comp not in avail:
            avail.append(start_comp)

        # Pit loss calculation depending on scenario
        normal_pit_loss = cfg["green_pit_loss"]
        if safety_car_scenario.lower() == "safety_car":
            effective_first_pit_loss = cfg["sc_pit_loss"]
            sc_explanation = f"Full Safety Car deployed! Pit lane delta is reduced from {normal_pit_loss}s to {cfg['sc_pit_loss']}s. Pitting now yields a net gain of {round(normal_pit_loss - cfg['sc_pit_loss'], 1)}s relative to racing speed."
        elif safety_car_scenario.lower() == "vsc":
            effective_first_pit_loss = cfg["vsc_pit_loss"]
            sc_explanation = f"Virtual Safety Car (VSC) active! Delta reduced to {cfg['vsc_pit_loss']}s (saving {round(normal_pit_loss - cfg['vsc_pit_loss'], 1)}s). Ideal opportunity for a cheap pit stop if within tyre degradation window."
        else:
            effective_first_pit_loss = normal_pit_loss
            sc_explanation = f"Normal green flag racing conditions. Standard pit lane time loss is {normal_pit_loss}s."

        # Generate candidate strategy combinations adhering to F1 regulations
        # Must use at least 2 distinct compounds in dry race
        candidate_combos = []

        # 1-Stop Strategies
        for second_comp in avail:
            if second_comp != start_comp or weather.lower() == "wet":
                candidate_combos.append({
                    "name": f"1-Stop ({start_comp} → {second_comp})",
                    "stops": 1,
                    "compounds": [start_comp, second_comp],
                })

        # 2-Stop Strategies
        for second_comp in avail:
            for third_comp in avail:
                # Need at least two distinct compounds overall in the 3 stints
                distinct = len(set([start_comp, second_comp, third_comp]))
                if distinct >= 2 or weather.lower() == "wet":
                    candidate_combos.append({
                        "name": f"2-Stop ({start_comp} → {second_comp} → {third_comp})",
                        "stops": 2,
                        "compounds": [start_comp, second_comp, third_comp],
                    })

        # If no combos generated, default to standard Medium -> Hard
        if not candidate_combos:
            candidate_combos = [
                {"name": f"1-Stop ({start_comp} → HARD)", "stops": 1, "compounds": [start_comp, "HARD"]}
            ]

        # Evaluate each strategy
        evaluated_strategies = []
        for combo in candidate_combos:
            eval_res = self._evaluate_combo(
                cfg, total_laps, combo, current_lap, current_tyre_age,
                normal_pit_loss, effective_first_pit_loss
            )
            if eval_res:
                evaluated_strategies.append(eval_res)

        # Sort by total estimated time (fastest first)
        evaluated_strategies.sort(key=lambda s: s["total_estimated_time_seconds"])

        best_strategy = evaluated_strategies[0] if evaluated_strategies else None

        # Build explainable recommendation rationale
        explanation_bullets = []
        if best_strategy:
            stops = best_strategy["stops"]
            stints_desc = " → ".join(best_strategy["compounds"])
            first_pit = best_strategy["pit_windows"][0] if best_strategy["pit_windows"] else {"lap": "N/A"}
            
            explanation_bullets.append(
                f"The recommended strategy is a {stops}-stop ({stints_desc}) with an optimal first pit window at Lap {first_pit['start']}-{first_pit['end']}."
            )
            
            time_gap_to_second = 0.0
            if len(evaluated_strategies) > 1:
                time_gap_to_second = round(evaluated_strategies[1]["total_estimated_time_seconds"] - best_strategy["total_estimated_time_seconds"], 2)
                explanation_bullets.append(
                    f"This strategy is approximately {time_gap_to_second}s faster than the next best alternative ({evaluated_strategies[1]['name']})."
                )

            if safety_car_scenario.lower() in ["safety_car", "vsc"]:
                explanation_bullets.append(
                    f"Under the current {safety_car_scenario.upper()} scenario, taking a pit stop on or before Lap {current_lap + 2} capitalizes on the reduced pit loss delta ({effective_first_pit_loss}s vs {normal_pit_loss}s normal green flag)."
                )
            else:
                cliff = cfg["cliff_laps"].get(start_comp, 25)
                explanation_bullets.append(
                    f"Starting on {start_comp} allows an optimal first stint without crossing the tyre cliff threshold ({cliff} laps), maximizing average pace before switching to {best_strategy['compounds'][1]}."
                )

        return {
            "circuit": circuit,
            "total_laps": total_laps,
            "current_lap": current_lap,
            "starting_compound": start_comp,
            "safety_car_scenario": safety_car_scenario,
            "scenario_details": sc_explanation,
            "normal_pit_loss": normal_pit_loss,
            "effective_first_pit_loss": effective_first_pit_loss,
            "recommended_strategy": best_strategy,
            "all_strategies": evaluated_strategies,
            "recommendation_summary": explanation_bullets,
        }

    def _evaluate_combo(self, cfg, total_laps, combo, current_lap, current_tyre_age,
                        normal_pit_loss, effective_first_pit_loss):
        compounds = combo["compounds"]
        stops = combo["stops"]
        base_lap_time = cfg["base_lap_time"]
        fuel_burn = cfg["fuel_burn_benefit"]
        
        # Determine optimal stint division
        remaining_laps = max(1, total_laps - current_lap + 1)
        
        if stops == 1:
            # Stint 1 (current compound) and Stint 2 (second compound)
            # Find pit lap P between current_lap and total_laps - 8 that minimizes total time
            min_pit = max(current_lap, int(total_laps * 0.25))
            max_pit = min(total_laps - 5, int(total_laps * 0.65))
            if min_pit >= max_pit:
                min_pit = current_lap
                max_pit = min(total_laps - 1, current_lap + 5)

            best_p = min_pit
            best_time = float("inf")
            stint_laps_best = []

            for p in range(min_pit, max_pit + 1):
                # Stint 1: from current_lap to p
                s1_len = p - current_lap + 1
                s2_len = total_laps - p

                time_s1 = self._calc_stint_time(cfg, compounds[0], current_tyre_age, s1_len, current_lap, fuel_burn)
                time_s2 = self._calc_stint_time(cfg, compounds[1], 0, s2_len, p + 1, fuel_burn)
                
                pit_time = effective_first_pit_loss
                total_combo_time = time_s1 + time_s2 + pit_time

                if total_combo_time < best_time:
                    best_time = total_combo_time
                    best_p = p
                    stint_laps_best = [
                        {"stint": 1, "compound": compounds[0], "start_lap": current_lap, "end_lap": p, "laps": s1_len},
                        {"stint": 2, "compound": compounds[1], "start_lap": p + 1, "end_lap": total_laps, "laps": s2_len},
                    ]

            pit_windows = [{"stop": 1, "start": max(current_lap, best_p - 2), "optimal": best_p, "end": min(total_laps, best_p + 2), "compound_to": compounds[1]}]

            return {
                "name": combo["name"],
                "stops": 1,
                "compounds": compounds,
                "pit_windows": pit_windows,
                "stints": stint_laps_best,
                "total_estimated_time_seconds": round(best_time, 2),
                "total_estimated_time_formatted": self.format_time(best_time),
                "avg_lap_time": round(best_time / remaining_laps, 3),
            }

        elif stops == 2:
            # 2 stops: Stint 1, Stint 2, Stint 3
            p1_min = max(current_lap, int(total_laps * 0.18))
            p1_max = min(total_laps - 15, int(total_laps * 0.40))
            if p1_min >= p1_max:
                p1_min = current_lap
                p1_max = min(total_laps - 10, current_lap + 4)

            best_p1 = p1_min
            best_p2 = min(total_laps - 5, p1_max + 15)
            best_time = float("inf")
            stint_laps_best = []

            for p1 in range(p1_min, p1_max + 1, 2):
                p2_min = p1 + 8
                p2_max = min(total_laps - 4, p1 + int((total_laps - p1) * 0.65))
                for p2 in range(p2_min, p2_max + 1, 2):
                    s1_len = p1 - current_lap + 1
                    s2_len = p2 - p1
                    s3_len = total_laps - p2

                    t1 = self._calc_stint_time(cfg, compounds[0], current_tyre_age, s1_len, current_lap, fuel_burn)
                    t2 = self._calc_stint_time(cfg, compounds[1], 0, s2_len, p1 + 1, fuel_burn)
                    t3 = self._calc_stint_time(cfg, compounds[2], 0, s3_len, p2 + 1, fuel_burn)

                    pit_time = effective_first_pit_loss + normal_pit_loss
                    tot = t1 + t2 + t3 + pit_time

                    if tot < best_time:
                        best_time = tot
                        best_p1 = p1
                        best_p2 = p2
                        stint_laps_best = [
                            {"stint": 1, "compound": compounds[0], "start_lap": current_lap, "end_lap": p1, "laps": s1_len},
                            {"stint": 2, "compound": compounds[1], "start_lap": p1 + 1, "end_lap": p2, "laps": s2_len},
                            {"stint": 3, "compound": compounds[2], "start_lap": p2 + 1, "end_lap": total_laps, "laps": s3_len},
                        ]

            pit_windows = [
                {"stop": 1, "start": max(current_lap, best_p1 - 2), "optimal": best_p1, "end": min(total_laps, best_p1 + 2), "compound_to": compounds[1]},
                {"stop": 2, "start": max(best_p1 + 5, best_p2 - 2), "optimal": best_p2, "end": min(total_laps, best_p2 + 2), "compound_to": compounds[2]},
            ]

            return {
                "name": combo["name"],
                "stops": 2,
                "compounds": compounds,
                "pit_windows": pit_windows,
                "stints": stint_laps_best,
                "total_estimated_time_seconds": round(best_time, 2),
                "total_estimated_time_formatted": self.format_time(best_time),
                "avg_lap_time": round(best_time / remaining_laps, 3),
            }

        return None

    def _calc_stint_time(self, cfg, compound, start_age, stint_length, start_race_lap, fuel_burn):
        base_time = cfg["base_lap_time"]
        deg_rate = cfg["deg_rates"].get(compound, 0.05)
        pace_delta = cfg["pace_deltas"].get(compound, 0.0)
        cliff_lap = cfg["cliff_laps"].get(compound, 25)
        
        stint_time = 0.0
        for i in range(stint_length):
            age = start_age + i
            race_lap = start_race_lap + i

            # Fuel effect: car gets faster by fuel_burn * race_lap
            fuel_delta = -(fuel_burn * race_lap)

            # Tyre wear degradation
            tyre_delta = deg_rate * age

            # Non-linear cliff penalty if age exceeds designed threshold
            cliff_penalty = 0.0
            if age > cliff_lap:
                cliff_penalty = 0.12 * ((age - cliff_lap) ** 1.3)

            lap_time = base_time + pace_delta + tyre_delta + fuel_delta + cliff_penalty
            stint_time += lap_time

        return stint_time

    @staticmethod
    def format_time(seconds: float) -> str:
        hours = int(seconds // 3600)
        rem = seconds % 3600
        minutes = int(rem // 60)
        secs = rem % 60
        if hours > 0:
            return f"{hours}h {minutes:02d}m {secs:05.2f}s"
        return f"{minutes}m {secs:05.2f}s"

strategy_simulator = RaceStrategySimulator()
