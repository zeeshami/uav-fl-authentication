"""
dataset_generator.py — Synthetic UAV Authentication Dataset Generator
=======================================================================
Generates per-UAV datasets that mimic realistic RF and kinematic
measurements during a drone-to-drone parcel handover event.

Each row represents ONE authentication attempt between a Sender and
Receiver UAV as witnessed by the witness swarm.

Attack-class feature perturbations are calibrated against published
UAV intrusion-detection benchmarks (cf. [Ferrag 2020], [Whelan 2020]).

Output
------
  data/uav_{id}_train.csv
  data/uav_{id}_test.csv
  data/dataset_summary.json
"""

import os, json, random
import numpy as np
import pandas as pd
from config import (
    DATA_DIR, FEATURE_NAMES, NUM_FEATURES, NUM_CLASSES,
    SAMPLES_PER_UAV, NUM_UAVS, ATTACK_SCENARIOS, RANDOM_SEED
)

rng = np.random.default_rng(RANDOM_SEED)


# ─── Per-feature normal (legitimate) distributions ────────────────────────────
# Tuned to realistic UAV telemetry ranges documented in research literature.
LEGIT_PARAMS = {
    "rssi_dbm"           : {"dist": "normal",  "mean": -65.0,  "std":  8.0},
    "snr_db"             : {"dist": "normal",  "mean":  20.0,  "std":  4.0},
    "doppler_hz"         : {"dist": "normal",  "mean":   2.0,  "std":  1.5},
    "crypto_latency_ms"  : {"dist": "normal",  "mean":  12.0,  "std":  3.0},
    "pkt_loss_rate"      : {"dist": "beta",    "a":      1.5,  "b":   20.0},   # mostly 0
    "inter_pkt_delay_ms" : {"dist": "normal",  "mean":  50.0,  "std":  5.0},
    "manoeuvre_energy_j" : {"dist": "normal",  "mean":   3.5,  "std":  0.5},
    "hover_variance"     : {"dist": "normal",  "mean":   0.05, "std":  0.02},
    "heading_delta_deg"  : {"dist": "normal",  "mean":   1.0,  "std":  1.5},
    "payload_hash_match" : {"dist": "bernoulli","p":     0.99},
    "timestamp_skew_ms"  : {"dist": "normal",  "mean":   0.5,  "std":  0.8},
    "witness_confidence" : {"dist": "normal",  "mean":   0.92, "std":  0.05},
}

# ─── Attack perturbation deltas per scenario ──────────────────────────────────
ATTACK_PERTURBATIONS = {
    "spoofing": {
        # Forged identity → bad crypto latency, hash mismatch, wrong position
        "crypto_latency_ms"  : (+35, 12),
        "payload_hash_match" : (0, None),     # force 0
        "timestamp_skew_ms"  : (+80, 30),
        "witness_confidence" : (-0.5, 0.1),
        "rssi_dbm"           : (-20, 8),
    },
    "replay": {
        # Re-transmitted old packets → timing anomalies
        "inter_pkt_delay_ms" : (+120, 30),
        "timestamp_skew_ms"  : (+200, 50),
        "crypto_latency_ms"  : (+5, 2),
        "doppler_hz"         : (-1.8, 0.5),
    },
    "rogue_node": {
        # Impersonating a known UAV → position jitter, heading off
        "hover_variance"     : (+0.4, 0.1),
        "heading_delta_deg"  : (+45, 15),
        "rssi_dbm"           : (-30, 10),
        "witness_confidence" : (-0.6, 0.15),
        "manoeuvre_energy_j" : (+5, 1),
    },
    "sybil": {
        # Multiple fake identities → energy anomaly, high packet loss
        "pkt_loss_rate"      : (+0.4, 0.15),
        "manoeuvre_energy_j" : (+8, 2),
        "snr_db"             : (-8, 3),
        "witness_confidence" : (-0.7, 0.1),
    },
}


def _sample_feature(name: str, params: dict, n: int) -> np.ndarray:
    """Draw n samples for one feature from the given parameter dict."""
    d = params["dist"]
    if d == "normal":
        return rng.normal(params["mean"], params["std"], n)
    elif d == "beta":
        return rng.beta(params["a"], params["b"], n)
    elif d == "bernoulli":
        return rng.binomial(1, params["p"], n).astype(float)
    raise ValueError(f"Unknown dist: {d}")


def generate_legitimate_samples(n: int) -> pd.DataFrame:
    """Generate n clean (label=0) samples."""
    data = {}
    for feat in FEATURE_NAMES:
        data[feat] = _sample_feature(feat, LEGIT_PARAMS[feat], n)
    df = pd.DataFrame(data)
    df["label"] = 0
    return df


def generate_attack_samples(n: int, scenario: str) -> pd.DataFrame:
    """Generate n adversarial (label=1) samples for a given attack scenario."""
    df = generate_legitimate_samples(n)
    df["label"] = 1
    perturbs = ATTACK_PERTURBATIONS.get(scenario, {})
    for feat, val in perturbs.items():
        if val[1] is None:
            # force binary 0
            df[feat] = 0.0
        else:
            delta_mean, delta_std = val
            df[feat] = df[feat] + rng.normal(delta_mean, delta_std, n)
    # Clamp physical limits
    df["pkt_loss_rate"]      = df["pkt_loss_rate"].clip(0, 1)
    df["payload_hash_match"] = df["payload_hash_match"].clip(0, 1).round()
    df["witness_confidence"] = df["witness_confidence"].clip(0, 1)
    df["snr_db"]             = df["snr_db"].clip(0, 40)
    return df


def generate_uav_dataset(uav_id: int, attack_fraction: float = 0.30,
                          scenario: str = "mixed") -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Generate train/test split for a single UAV node.
    scenario='mixed' randomly picks an attack type per adversarial block.
    """
    total    = SAMPLES_PER_UAV
    n_attack = int(total * attack_fraction)
    n_legit  = total - n_attack

    legit_df = generate_legitimate_samples(n_legit)

    if scenario == "mixed":
        # Split attacks equally across all known scenarios
        attack_scenarios = [s for s in ATTACK_SCENARIOS if s != "none"]
        n_per_sc = n_attack // len(attack_scenarios)
        remainder = n_attack % len(attack_scenarios)
        frames    = [legit_df]
        for i, sc in enumerate(attack_scenarios):
            n = n_per_sc + (1 if i == 0 else 0) * remainder
            if n > 0:
                frames.append(generate_attack_samples(n, sc))
        full_df = pd.concat(frames, ignore_index=True)
    else:
        attack_df = generate_attack_samples(n_attack, scenario)
        full_df   = pd.concat([legit_df, attack_df], ignore_index=True)

    # Shuffle
    full_df = full_df.sample(frac=1, random_state=RANDOM_SEED + uav_id).reset_index(drop=True)

    # Train / test 80/20
    split   = int(0.8 * len(full_df))
    train   = full_df.iloc[:split].copy()
    test    = full_df.iloc[split:].copy()

    return train, test


def generate_all_uav_datasets(attack_fraction: float = 0.30) -> dict:
    """
    Generate datasets for all UAV nodes. Returns summary statistics.
    Saves CSVs to DATA_DIR.
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    summary = {"uavs": [], "total_samples": 0, "feature_names": FEATURE_NAMES}

    for uav_id in range(NUM_UAVS):
        # Assign UAV role
        if uav_id == 0:
            role = "sender"
        elif uav_id == 1:
            role = "receiver"
        elif uav_id < 5:
            role = "witness"
        else:
            role = "relay"

        train_df, test_df = generate_uav_dataset(uav_id, attack_fraction)

        train_path = os.path.join(DATA_DIR, f"uav_{uav_id}_train.csv")
        test_path  = os.path.join(DATA_DIR, f"uav_{uav_id}_test.csv")
        train_df.to_csv(train_path, index=False)
        test_df.to_csv(test_path, index=False)

        n_attack = int(train_df["label"].sum() + test_df["label"].sum())
        uav_info = {
            "id"          : uav_id,
            "role"        : role,
            "train_size"  : len(train_df),
            "test_size"   : len(test_df),
            "attack_count": n_attack,
            "attack_frac" : round(n_attack / (len(train_df) + len(test_df)), 3),
        }
        summary["uavs"].append(uav_info)
        summary["total_samples"] += len(train_df) + len(test_df)
        print(f"  UAV-{uav_id:02d} [{role:8s}]  train={len(train_df):4d}  "
              f"test={len(test_df):3d}  attacks={n_attack}")

    summary_path = os.path.join(DATA_DIR, "dataset_summary.json")
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\n[OK] Dataset saved -> {DATA_DIR}")
    print(f"  Total samples : {summary['total_samples']}")
    print(f"  Summary JSON  : {summary_path}")
    return summary


if __name__ == "__main__":
    print("=" * 60)
    print("UAV Handover Authentication - Dataset Generator")
    print("=" * 60)
    generate_all_uav_datasets(attack_fraction=0.30)
