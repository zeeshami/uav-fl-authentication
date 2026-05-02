"""
fl_runner.py - Event-driven FL runner for the API server
==========================================================
Subclasses FLServer to emit granular events at every stage so the
WebSocket server can push live updates to the browser frontend.

Events emitted (all passed to a callback):
  simulation_start     - overall params
  round_start          - round num, attack scenario
  client_update        - per-node training result
  aggregation_done     - round aggregated weights
  auth_event           - handover authentication result
  round_complete       - global metrics
  comparison_start     - comparison experiment starting
  comparison_method    - one method done
  simulation_complete  - final summary
  error                - exception message
"""

import threading
import traceback
from config import (
    NUM_UAVS, NUM_WITNESS_UAVS, FL_ROUNDS,
    ATTACK_FRACTION, AGGREGATION_METHOD, RANDOM_SEED
)
from fl_server import FLServer
from uav_node import UAVNode
from model import UAVAuthModel
import random, numpy as np


def build_swarm(attack_fraction=ATTACK_FRACTION):
    random.seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)
    nodes = []
    for uid in range(NUM_UAVS):
        if uid == 0:       role = "sender"
        elif uid == 1:     role = "receiver"
        elif uid < 2 + NUM_WITNESS_UAVS: role = "witness"
        else:              role = "relay"
        is_mal = (role == "relay") and (random.random() < attack_fraction)
        nodes.append(UAVNode(uid, role, is_malicious=is_mal))
    return nodes


class EventFLServer(FLServer):
    """FLServer patched to fire callback events at each stage."""

    def __init__(self, uav_nodes, aggregation_method, emit):
        super().__init__(uav_nodes, aggregation_method)
        self._emit = emit

    def run_round(self, round_num, attack_scenario="none"):
        global_weights = self.global_model.get_weights()
        selected = self._select_clients()

        self._emit("round_start", {
            "round": round_num,
            "attack_scenario": attack_scenario,
            "selected_count": len(selected),
            "aggregation": self.aggregation_method,
        })

        client_updates = []
        client_metrics = []

        for node in selected:
            node.set_global_weights(global_weights)
            metrics = node.local_train()
            weights = node.get_weights()
            client_updates.append((weights, node.get_num_samples()))
            record = {
                "uav_id":       node.uav_id,
                "role":         node.role,
                "is_malicious": node.is_malicious,
                "accuracy":     metrics["accuracy"],
                "f1":           metrics["f1"],
                "loss":         metrics["loss"],
                "precision":    metrics["precision"],
                "recall":       metrics["recall"],
                "samples":      node.get_num_samples(),
            }
            client_metrics.append(record)
            self._emit("client_update", record)

        from aggregation import aggregate
        new_weights = aggregate(
            self.aggregation_method, client_updates,
            global_weights if self.aggregation_method == "fedprox" else None
        )
        self.global_model.set_weights(new_weights)

        global_metrics = self._evaluate_global()
        self._emit("aggregation_done", {"round": round_num, "global": global_metrics})

        # Witness auth event
        auth_report = None
        if self.witness_protocol is not None:
            sender   = next(n for n in self.nodes if n.role == "sender")
            receiver = next(n for n in self.nodes if n.role == "receiver")
            features = self._synthesise_handover_features(attack_scenario)
            auth_report = self.witness_protocol.authenticate(
                sender, receiver, features, attack_scenario
            )
            self._emit("auth_event", {
                "round":          round_num,
                "attack_scenario": attack_scenario,
                "crypto_score":   auth_report["crypto"]["score"],
                "ai_score":       auth_report["ai_model"]["score"],
                "witness_score":  auth_report["witness"]["witness_score"],
                "total_score":    auth_report["total_score"],
                "decision":       auth_report["decision"],
                "quorum_met":     auth_report["witness"]["quorum_met"],
                "malicious_flags":auth_report["witness"]["malicious_flags"],
                "votes":          auth_report["witness"]["votes"],
            })

        round_record = {
            "round":           round_num,
            "attack_scenario": attack_scenario,
            "aggregation":     self.aggregation_method,
            "global":          global_metrics,
            "clients":         client_metrics,
            "auth_event":      auth_report,
        }
        self.round_history.append(round_record)

        self._emit("round_complete", {
            "round":           round_num,
            "global":          global_metrics,
            "attack_scenario": attack_scenario,
        })
        return round_record


class FLRunner:
    """Thread-safe runner. Call .start() to launch FL in background."""

    def __init__(self):
        self._thread  = None
        self._stop_ev = threading.Event()
        self.status   = "idle"   # idle | running | complete | error
        self.config   = {}
        self._callback = None    # set externally

    def set_callback(self, fn):
        """fn(event_type: str, data: dict) called from the FL thread."""
        self._callback = fn

    def _emit(self, event_type, data):
        if self._callback:
            try:
                self._callback(event_type, data)
            except Exception:
                pass

    def start(self, rounds=FL_ROUNDS, agg=AGGREGATION_METHOD,
              attack=ATTACK_FRACTION, compare=False):
        if self.status == "running":
            return False
        self._stop_ev.clear()
        self.config = dict(rounds=rounds, agg=agg, attack=attack, compare=compare)
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        return True

    def stop(self):
        self._stop_ev.set()

    def _run(self):
        try:
            self.status = "running"
            cfg = self.config

            # Generate / refresh dataset
            from dataset_generator import generate_all_uav_datasets
            generate_all_uav_datasets(attack_fraction=cfg["attack"])

            nodes = build_swarm(cfg["attack"])
            n_mal = sum(1 for n in nodes if n.is_malicious)

            self._emit("simulation_start", {
                "rounds":        cfg["rounds"],
                "agg":           cfg["agg"],
                "attack":        cfg["attack"],
                "total_uavs":    NUM_UAVS,
                "malicious_uavs":n_mal,
                "swarm": [{
                    "uav_id":       n.uav_id,
                    "role":         n.role,
                    "is_malicious": n.is_malicious,
                } for n in nodes],
            })

            server = EventFLServer(nodes, cfg["agg"], self._emit)
            server.setup_witness_protocol()

            attack_schedule = FLServer._build_attack_schedule(cfg["rounds"])
            for rnd in range(1, cfg["rounds"] + 1):
                if self._stop_ev.is_set():
                    self._emit("simulation_stopped", {"round": rnd})
                    self.status = "idle"
                    return
                server.run_round(rnd, attack_schedule[rnd - 1])

            server.save_results()

            # Comparison
            comparison = None
            if cfg["compare"]:
                self._emit("comparison_start", {})
                comparison = {}
                for method in ["fedavg", "krum", "median"]:
                    fresh_nodes = build_swarm(cfg["attack"])
                    for n in fresh_nodes:
                        n.model = UAVAuthModel(seed=RANDOM_SEED + n.uav_id)
                    cmp_server = EventFLServer(fresh_nodes, method, self._emit)
                    cmp_server.setup_witness_protocol()
                    cmp_schedule = FLServer._build_attack_schedule(min(10, cfg["rounds"]))
                    for rnd in range(1, min(10, cfg["rounds"]) + 1):
                        cmp_server.run_round(rnd, cmp_schedule[rnd - 1])
                    final = cmp_server.round_history[-1]["global"]
                    comparison[method] = final
                    self._emit("comparison_method", {"method": method, "metrics": final})

            # Plots
            from visualise import generate_all_plots
            generate_all_plots()

            self._emit("simulation_complete", {
                "rounds":     cfg["rounds"],
                "comparison": comparison,
                "plots": [
                    "1_global_accuracy_f1.png",
                    "2_trust_layer_scores.png",
                    "3_decision_heatmap.png",
                    "4_witness_confidence.png",
                    "5_client_accuracy_dist.png",
                ],
            })
            self.status = "complete"

        except Exception as e:
            self._emit("error", {"message": str(e), "trace": traceback.format_exc()})
            self.status = "error"
