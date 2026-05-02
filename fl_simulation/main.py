"""
main.py — UAV Handover FL Authentication Simulation — Master Entry Point
=========================================================================

Execution pipeline
------------------
  Step 1 : Generate synthetic dataset  (dataset_generator.py)
  Step 2 : Build UAV node swarm        (uav_node.py)
  Step 3 : Run Federated Learning      (fl_server.py)
  Step 4 : Run comparative experiments (FedAvg vs Krum vs Median)
  Step 5 : Visualise results           (visualise.py)
  Step 6 : Print final summary report

Usage
-----
  python main.py
  python main.py --rounds 20 --agg krum --attack 0.35
"""

import argparse
import json
import os
import random
import sys
import numpy as np

from config import (
    NUM_UAVS, NUM_WITNESS_UAVS, FL_ROUNDS,
    ATTACK_FRACTION, AGGREGATION_METHOD,
    RESULTS_DIR, RANDOM_SEED
)
from dataset_generator import generate_all_uav_datasets
from uav_node          import UAVNode
from fl_server         import FLServer
from visualise         import generate_all_plots


# ─── Deterministic seeding ───────────────────────────────────────────────────
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


# ─── UAV Swarm Factory ────────────────────────────────────────────────────────

def build_swarm(attack_fraction: float = ATTACK_FRACTION) -> list[UAVNode]:
    """
    Instantiate all UAV nodes with assigned roles.

    Roles:
      id=0           → sender   (parcel carrier)
      id=1           → receiver (handover target)
      id=2..4        → witness  (authentication validators)
      id=5..NUM_UAVS → relay    (edge participants)

    ~attack_fraction of relay/witness nodes are flagged as malicious
    (Byzantine) to simulate an adversarial federated environment.
    """
    nodes = []
    for uid in range(NUM_UAVS):
        if uid == 0:
            role = "sender"
        elif uid == 1:
            role = "receiver"
        elif uid < 2 + NUM_WITNESS_UAVS:
            role = "witness"
        else:
            role = "relay"

        # Malicious node assignment (never corrupt sender/receiver/witnesses)
        is_mal = (role == "relay") and (random.random() < attack_fraction)
        nodes.append(UAVNode(uid, role, is_malicious=is_mal))

    n_mal = sum(1 for n in nodes if n.is_malicious)
    print(f"  Swarm: {NUM_UAVS} UAVs - {n_mal} malicious relays")
    return nodes


# ─── Comparative Experiment ───────────────────────────────────────────────────

def run_comparison_experiment(nodes: list[UAVNode],
                               rounds: int = 15) -> dict:
    """
    Run FL training with FedAvg, Krum, and Median aggregation methods
    side by side, returning final-round global metrics for each.
    """
    methods  = ["fedavg", "krum", "median"]
    results  = {}

    print("\n" + "=" * 65)
    print("  Comparative Aggregation Experiment")
    print("=" * 65)

    for method in methods:
        print(f"\n  -- Method: {method.upper()} --")
        # Reset each node's model before each experiment
        for node in nodes:
            from model import UAVAuthModel
            node.model = UAVAuthModel(seed=RANDOM_SEED + node.uav_id)

        server = FLServer(nodes, aggregation_method=method)
        server.setup_witness_protocol()
        history = server.train(num_rounds=rounds)

        final  = history[-1]["global"]
        results[method] = {
            "final_accuracy" : final["accuracy"],
            "final_f1"       : final["f1"],
            "final_loss"     : final["loss"],
            "final_precision": final["precision"],
            "final_recall"   : final["recall"],
        }

    # Save comparison
    path = os.path.join(RESULTS_DIR, "aggregation_comparison.json")
    with open(path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n[OK] Comparison results saved -> {path}")
    return results


# ─── Terminal Summary Report ──────────────────────────────────────────────────

def print_summary(history: list[dict], comparison: dict | None = None):
    final  = history[-1]
    gm     = final["global"]
    ae     = final.get("auth_event")

    print("\n" + "+" + "=" * 63 + "+")
    print("|" + "  UAV HANDOVER AUTHENTICATION - SIMULATION SUMMARY".center(63) + "|")
    print("+" + "=" * 63 + "+")
    print(f"|  FL Rounds Completed : {len(history):>3}                              |")
    print(f"|  Global Accuracy     : {gm['accuracy']:.4f}                           |")
    print(f"|  Global F1 Score     : {gm['f1']:.4f}                           |")
    print(f"|  Global Precision    : {gm['precision']:.4f}                           |")
    print(f"|  Global Recall       : {gm['recall']:.4f}                           |")

    if ae:
        print("+" + "=" * 63 + "+")
        print(f"|  Last Auth Event                                               |")
        print(f"|    Attack Scenario   : {ae['attack_scenario']:<10}                    |")
        print(f"|    Crypto Score      : {ae['crypto']['score']:>6.2f}                           |")
        print(f"|    AI Model Score    : {ae['ai_model']['score']:>6.2f}                           |")
        print(f"|    Witness Score     : {ae['witness']['witness_score']:>6.2f}                           |")
        print(f"|    Fused Trust Score : {ae['total_score']:>6.2f}                           |")
        print(f"|    Decision          : {ae['decision']:<12}                    |")
        print(f"|    Quorum Met        : {'YES' if ae['witness']['quorum_met'] else 'NO':<12}                    |")

    if comparison:
        print("+" + "=" * 63 + "+")
        print("|  Aggregation Comparison                                        |")
        for method, m in comparison.items():
            print(f"|    {method.upper():<8}  acc={m['final_accuracy']:.4f}  f1={m['final_f1']:.4f}  "
                  f"loss={m['final_loss']:.4f}  |")

    print("+" + "=" * 63 + "+")


# ─── Main ─────────────────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(
        description="UAV Handover Federated Learning Authentication Simulation"
    )
    parser.add_argument("--rounds",   type=int,   default=FL_ROUNDS,
                        help="Number of FL rounds")
    parser.add_argument("--agg",      type=str,   default=AGGREGATION_METHOD,
                        choices=["fedavg", "fedprox", "krum", "median"],
                        help="Aggregation method")
    parser.add_argument("--attack",   type=float, default=ATTACK_FRACTION,
                        help="Fraction of malicious relay nodes [0.0-1.0]")
    parser.add_argument("--compare",  action="store_true",
                        help="Run comparative aggregation experiment")
    parser.add_argument("--no-plots", action="store_true",
                        help="Skip visualisation step")
    return parser.parse_args()


def main():
    args = parse_args()

    print("\n" + "=" * 65)
    print("  UAV Federated Learning - Handover Authentication Simulation")
    print("  Based on: McMahan 2017 (FedAvg), Blanchard 2017 (Krum),")
    print("            Pham 2023 (Cooperative UAV-FL Authentication)")
    print("=" * 65)

    # ── Step 1: Dataset ───────────────────────────────────────────────────────
    print("\n[1/5] Generating synthetic UAV authentication dataset...")
    generate_all_uav_datasets(attack_fraction=args.attack)

    # ── Step 2: Build Swarm ───────────────────────────────────────────────────
    print("\n[2/5] Building UAV swarm...")
    nodes = build_swarm(attack_fraction=args.attack)

    # ── Step 3: Primary FL run ────────────────────────────────────────────────
    print(f"\n[3/5] Running FL training ({args.rounds} rounds, agg={args.agg})...")
    server = FLServer(nodes, aggregation_method=args.agg)
    server.setup_witness_protocol()
    history = server.train(num_rounds=args.rounds)

    # ── Step 4: Comparative experiment ───────────────────────────────────────
    comparison = None
    if args.compare:
        print("\n[4/5] Running comparative aggregation experiment...")
        nodes_fresh = build_swarm(attack_fraction=args.attack)
        comparison  = run_comparison_experiment(nodes_fresh, rounds=min(15, args.rounds))
    else:
        print("\n[4/5] Skipping comparison (use --compare to enable)")

    # ── Step 5: Visualise ─────────────────────────────────────────────────────
    if not args.no_plots:
        print("\n[5/5] Generating plots...")
        generate_all_plots()
    else:
        print("\n[5/5] Plot generation skipped (--no-plots)")

    # ── Final summary ─────────────────────────────────────────────────────────
    print_summary(history, comparison)


if __name__ == "__main__":
    main()
