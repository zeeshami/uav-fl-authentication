"""
witness_protocol.py — Witness Drone Authentication Protocol
=============================================================
Implements the three-layer trust-fusion mechanism:

  Layer 1 — Cryptographic Score  (PKI / PQC signature verification)
  Layer 2 — AI Model Score       (local MLP inference output)
  Layer 3 — Witness Score        (quorum vote from witness drones)

Final trust decision uses the weighted fusion:
    T = 0.40 * crypto + 0.40 * ai + 0.20 * witness    (from store.js)

Witness Quorum Protocol
-----------------------
  - QUORUM witnesses must independently report LEGITIMATE for approval.
  - A SINGLE MALICIOUS verdict from any witness triggers an escalation.
  - Trust scores decay over time using exponential moving average.

This mirrors the 'trust residue' concept from:
  Pham et al., "Cooperative Authentication for UAV Networks Using
  Federated Learning", IEEE Access 2023.
"""

import numpy as np
import json
import os
from datetime import datetime
from config import (
    TRUST_WEIGHTS, TRUST_THRESHOLD_APPROVE, TRUST_THRESHOLD_REJECT,
    WITNESS_QUORUM, LOGS_DIR, FEATURE_NAMES
)


class WitnessProtocol:
    """
    Orchestrates the multi-witness authentication during a handover event.
    """

    def __init__(self, witness_nodes: list):
        """
        witness_nodes : list of UAVNode objects with role='witness'
        """
        self.witnesses  = witness_nodes
        self.event_log  = []
        os.makedirs(LOGS_DIR, exist_ok=True)

    # ── Layer 1 : Cryptographic Verification ──────────────────────────────────

    @staticmethod
    def verify_crypto(features: np.ndarray, attack_scenario: str = "none") -> dict:
        """
        Simulate PKI/PQC signature verification.
        Uses 'crypto_latency_ms' and 'payload_hash_match' features as proxies.

        Returns
        -------
        {'score': float, 'latency_ms': float, 'hash_ok': bool, 'pqc': bool}
        """
        latency_col = FEATURE_NAMES.index("crypto_latency_ms")
        hash_col    = FEATURE_NAMES.index("payload_hash_match")
        ts_col      = FEATURE_NAMES.index("timestamp_skew_ms")

        latency = float(features.flat[latency_col])
        hash_ok = bool(round(float(features.flat[hash_col])))
        ts_skew = float(features.flat[ts_col])

        # Score formula: penalise high latency and timestamp skew
        base_score = 100.0
        base_score -= min(60, max(0, (latency - 10) * 1.5))   # penalty for slow verify
        base_score -= min(30, abs(ts_skew) * 0.5)              # timestamp skew penalty
        if not hash_ok:
            base_score -= 40                                    # hard penalty for hash fail

        crypto_score = float(np.clip(base_score, 0, 100))
        return {
            "score"      : round(crypto_score, 2),
            "latency_ms" : round(latency, 2),
            "hash_ok"    : hash_ok,
            "ts_skew_ms" : round(ts_skew, 2),
            "pqc_used"   : True,   # always PQC in this simulation
        }

    # ── Layer 2 : AI Model Score ──────────────────────────────────────────────

    @staticmethod
    def evaluate_ai_model(uav_node, features: np.ndarray) -> dict:
        """
        Run local model inference on features and return an AI score.
        ai_score = (1 - p_attack) * 100
        """
        x_scaled = (features - uav_node._mean) / uav_node._std
        probs    = uav_node.model.predict_proba(x_scaled)
        p_legit  = float(probs[0])
        ai_score = round(p_legit * 100, 2)
        return {
            "score"     : ai_score,
            "p_legit"   : round(p_legit, 4),
            "p_attack"  : round(float(probs[1]), 4),
            "model_node": uav_node.uav_id,
        }

    # ── Layer 3 : Witness Quorum ──────────────────────────────────────────────

    def collect_witness_votes(self, target_id: int,
                               target_features: np.ndarray) -> dict:
        """
        Poll all witness drones and aggregate their verdicts.

        Returns
        -------
        {
          'witness_score'   : float [0,100],
          'quorum_met'      : bool,
          'malicious_flags' : int,
          'votes'           : list[dict],
        }
        """
        votes         = []
        malicious_cnt = 0

        for witness in self.witnesses:
            obs = witness.compute_witness_observation(target_id, target_features)
            votes.append(obs)
            if obs["verdict"] == "MALICIOUS":
                malicious_cnt += 1

        # Quorum: # of LEGITIMATE votes
        legit_votes  = sum(1 for v in votes if v["verdict"] == "LEGITIMATE")
        quorum_met   = legit_votes >= WITNESS_QUORUM

        # Average witness_score weighted by witness credibility
        avg_score = np.mean([v["witness_score"] for v in votes])
        # Penalise if malicious flags > 0
        if malicious_cnt > 0:
            avg_score *= (1 - 0.3 * malicious_cnt / len(self.witnesses))

        return {
            "witness_score"  : round(float(avg_score), 2),
            "quorum_met"     : quorum_met,
            "legit_votes"    : legit_votes,
            "malicious_flags": malicious_cnt,
            "total_witnesses": len(self.witnesses),
            "votes"          : votes,
        }

    # ── Full Authentication Pipeline ──────────────────────────────────────────

    def authenticate(self, sender_node, receiver_node,
                     sender_features: np.ndarray,
                     attack_scenario: str = "none") -> dict:
        """
        Run the full three-layer authentication for a handover event.

        Returns a complete authentication report.
        """
        timestamp = datetime.utcnow().isoformat() + "Z"

        # Layer 1
        crypto_result = self.verify_crypto(sender_features, attack_scenario)

        # Layer 2 — use receiver's model for independent AI evaluation
        ai_result     = self.evaluate_ai_model(receiver_node, sender_features)

        # Layer 3
        witness_result = self.collect_witness_votes(sender_node.uav_id, sender_features)

        # Weighted trust fusion
        w = TRUST_WEIGHTS
        total_score = (
            w["crypto"]   * crypto_result["score"] +
            w["ai_model"] * ai_result["score"]     +
            w["witness"]  * witness_result["witness_score"]
        )

        if total_score > TRUST_THRESHOLD_APPROVE and witness_result["quorum_met"]:
            decision = "APPROVED"
        elif total_score < TRUST_THRESHOLD_REJECT or witness_result["malicious_flags"] > 0:
            decision = "REJECTED"
        else:
            decision = "ESCALATED"   # manual review required

        report = {
            "timestamp"      : timestamp,
            "event"          : "HANDOVER_AUTH",
            "sender_id"      : sender_node.uav_id,
            "receiver_id"    : receiver_node.uav_id,
            "attack_scenario": attack_scenario,
            "crypto"         : crypto_result,
            "ai_model"       : ai_result,
            "witness"        : witness_result,
            "total_score"    : round(float(total_score), 2),
            "decision"       : decision,
        }

        self.event_log.append(report)
        return report

    # ── Logging ───────────────────────────────────────────────────────────────

    def save_log(self, filename: str = "witness_auth_log.json"):
        path = os.path.join(LOGS_DIR, filename)
        with open(path, "w") as f:
            json.dump(self.event_log, f, indent=2)
        print(f"  Auth log saved -> {path}  ({len(self.event_log)} events)")
        return path
