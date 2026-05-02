"""
run_comparison.py - Run only the comparison experiment + plots (no re-training)
"""
import random
import numpy as np
from config import RANDOM_SEED, ATTACK_FRACTION
from main import build_swarm, run_comparison_experiment
from visualise import generate_all_plots

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

print("Running comparison experiment (FedAvg vs Krum vs Median, 15 rounds)...")
nodes      = build_swarm(ATTACK_FRACTION)
comparison = run_comparison_experiment(nodes, rounds=15)

print("\nGenerating all plots from saved training history...")
generate_all_plots()

print("\n--- AGGREGATION COMPARISON RESULTS ---")
for method, m in comparison.items():
    acc  = m["final_accuracy"]
    f1   = m["final_f1"]
    loss = m["final_loss"]
    prec = m["final_precision"]
    rec  = m["final_recall"]
    print(f"  {method.upper():<8}  acc={acc:.4f}  f1={f1:.4f}  loss={loss:.4f}  prec={prec:.4f}  rec={rec:.4f}")

print("\n[DONE] Comparison and plots complete.")
