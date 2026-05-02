"""
fl_server.py - Federated Learning Server (Parameter Server)
=============================================================
Coordinates the FL training loop:

  Round lifecycle  (mirroring the store.js flPhase states):
    idle -> local_training -> aggregation -> evaluation -> consensus -> idle

  The server:
  - Selects a random subset of UAV clients each round (C fraction)
  - Broadcasts the global model
  - Collects local updates + training metrics
  - Runs the configured aggregation algorithm
  - Runs authentication events between handover pairs every N rounds
  - Records full metrics per round

Research standards implemented
------------------------------
  - Partial participation (FedAvg C parameter) [McMahan 2017]
  - Non-IID data handling via weighted averaging
  - Byzantine detection via Krum scoring
  - Per-round performance tracking (acc, F1, loss)
"""

import numpy as np
import json
import os
import random
from datetime import datetime
from config import (
    FL_ROUNDS, FRACTION_FIT, MIN_FIT_CLIENTS,
    LOCAL_EPOCHS, LOCAL_BATCH_SIZE,
    AGGREGATION_METHOD, ATTACK_FRACTION,
    NUM_UAVS, NUM_WITNESS_UAVS, RESULTS_DIR, LOGS_DIR,
    ATTACK_SCENARIOS, RANDOM_SEED
)
from model import UAVAuthModel
from aggregation import aggregate
from witness_protocol import WitnessProtocol


class FLServer:
    """
    Parameter server for the decentralised UAV authentication network.
    """

    def __init__(self, uav_nodes: list, aggregation_method: str = AGGREGATION_METHOD):
        self.nodes              = uav_nodes
        self.aggregation_method = aggregation_method
        self.global_model       = UAVAuthModel(seed=0)
        self.round_history: list[dict] = []
        self.witness_protocol   = None
        os.makedirs(RESULTS_DIR, exist_ok=True)
        os.makedirs(LOGS_DIR, exist_ok=True)

    # ── Witness setup ─────────────────────────────────────────────────────────

    def setup_witness_protocol(self):
        witnesses = [n for n in self.nodes if n.role == "witness"]
        self.witness_protocol = WitnessProtocol(witnesses)
        print(f"  Witness protocol active - {len(witnesses)} witnesses registered")

    # ── Client selection ──────────────────────────────────────────────────────

    def _select_clients(self) -> list:
        n_select = max(MIN_FIT_CLIENTS,
                       int(FRACTION_FIT * len(self.nodes)))
        selected = random.sample(self.nodes, min(n_select, len(self.nodes)))
        return selected

    # ── One FL round ──────────────────────────────────────────────────────────

    def run_round(self, round_num: int, attack_scenario: str = "none") -> dict:
        global_weights = self.global_model.get_weights()
        selected       = self._select_clients()

        client_updates = []
        client_metrics = []

        print(f"\n  +-- Round {round_num:02d} - {len(selected)} clients "
              f"| attack={attack_scenario} | agg={self.aggregation_method}")

        for node in selected:
            # Distribute global model
            node.set_global_weights(global_weights)
            # Local training
            metrics = node.local_train(LOCAL_EPOCHS, LOCAL_BATCH_SIZE)
            weights = node.get_weights()
            client_updates.append((weights, node.get_num_samples()))
            client_metrics.append({
                "uav_id"      : node.uav_id,
                "role"        : node.role,
                "is_malicious": node.is_malicious,
                **{k: metrics[k] for k in ["accuracy", "loss", "f1", "precision", "recall"]},
                "samples"     : node.get_num_samples(),
            })
            flag = " [!MALICIOUS]" if node.is_malicious else ""
            print(f"  |  UAV-{node.uav_id:02d} [{node.role:7s}]{flag:14s} "
                  f"acc={metrics['accuracy']:.3f}  f1={metrics['f1']:.3f}  "
                  f"loss={metrics['loss']:.4f}")

        # Aggregate
        new_weights = aggregate(
            self.aggregation_method,
            client_updates,
            global_weights if self.aggregation_method == "fedprox" else None
        )
        self.global_model.set_weights(new_weights)

        # Global evaluation on all nodes
        global_metrics = self._evaluate_global()

        # Run witness authentication event (every round)
        auth_report = None
        if self.witness_protocol is not None:
            sender   = next(n for n in self.nodes if n.role == "sender")
            receiver = next(n for n in self.nodes if n.role == "receiver")
            # Synthesise a handover feature sample with the current attack scenario
            features = self._synthesise_handover_features(attack_scenario)
            auth_report = self.witness_protocol.authenticate(
                sender, receiver, features, attack_scenario
            )

        round_record = {
            "round"          : round_num,
            "attack_scenario": attack_scenario,
            "aggregation"    : self.aggregation_method,
            "global"         : global_metrics,
            "clients"        : client_metrics,
            "auth_event"     : auth_report,
        }
        self.round_history.append(round_record)

        print(f"  +-- Global acc={global_metrics['accuracy']:.3f}  "
              f"f1={global_metrics['f1']:.3f}  "
              f"decision={auth_report['decision'] if auth_report else 'N/A'}")

        return round_record

    # ── Global evaluation ─────────────────────────────────────────────────────

    def _evaluate_global(self) -> dict:
        """Average global model performance across all nodes."""
        acc_list, f1_list, loss_list, prec_list, rec_list = [], [], [], [], []
        global_weights = self.global_model.get_weights()
        for node in self.nodes:
            node.set_global_weights(global_weights)
            m = node.evaluate_global_model()
            acc_list.append(m["accuracy"])
            f1_list.append(m["f1"])
            loss_list.append(m["loss"])
            prec_list.append(m["precision"])
            rec_list.append(m["recall"])
        return {
            "accuracy" : round(float(np.mean(acc_list)), 4),
            "f1"       : round(float(np.mean(f1_list)), 4),
            "loss"     : round(float(np.mean(loss_list)), 4),
            "precision": round(float(np.mean(prec_list)), 4),
            "recall"   : round(float(np.mean(rec_list)), 4),
        }

    # ── Synthesise a handover feature vector ─────────────────────────────────

    @staticmethod
    def _synthesise_handover_features(scenario: str) -> np.ndarray:
        """
        Generate a single realistic feature vector for one handover attempt.
        Used to drive the witness authentication event each round.
        """
        from dataset_generator import (
            generate_legitimate_samples,
            generate_attack_samples,
        )
        if scenario == "none":
            df = generate_legitimate_samples(1)
        else:
            df = generate_attack_samples(1, scenario)
        from config import FEATURE_NAMES
        return df[FEATURE_NAMES].values.astype(float)

    # ── Full training loop ────────────────────────────────────────────────────

    def train(self, num_rounds: int = FL_ROUNDS) -> list[dict]:
        """
        Run the complete FL training loop.
        Attack scenarios rotate across rounds to simulate a mixed-threat
        environment as recommended by Gyawali & Qian (2021).
        """
        attack_schedule = self._build_attack_schedule(num_rounds)

        print("\n" + "=" * 65)
        print("  UAV Federated Learning - Handover Authentication Simulation")
        print(f"  Rounds={num_rounds} | Nodes={len(self.nodes)} "
              f"| Agg={self.aggregation_method}")
        print("=" * 65)

        for rnd in range(1, num_rounds + 1):
            scenario = attack_schedule[rnd - 1]
            self.run_round(rnd, scenario)

        self.save_results()
        return self.round_history

    # ── Attack schedule ───────────────────────────────────────────────────────

    @staticmethod
    def _build_attack_schedule(num_rounds: int) -> list[str]:
        """
        Build a round-by-round attack scenario schedule.
        First 1/3 clean, then alternating attacks.
        """
        schedule = []
        clean_rounds  = num_rounds // 3
        attack_rounds = num_rounds - clean_rounds
        scenarios     = [s for s in ATTACK_SCENARIOS if s != "none"]
        for i in range(num_rounds):
            if i < clean_rounds:
                schedule.append("none")
            else:
                schedule.append(scenarios[(i - clean_rounds) % len(scenarios)])
        return schedule

    # ── Save results ──────────────────────────────────────────────────────────

    def save_results(self):
        path = os.path.join(RESULTS_DIR, "fl_training_history.json")
        with open(path, "w") as f:
            json.dump(self.round_history, f, indent=2)
        print(f"\n[OK] Training history saved -> {path}")

        if self.witness_protocol:
            self.witness_protocol.save_log()
