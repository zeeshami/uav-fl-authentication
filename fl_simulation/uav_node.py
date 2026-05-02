"""
uav_node.py — UAV Node (FL Client)
====================================
Each UAV is modelled as a federated-learning client.  The node:
  1. Holds its own local dataset (train + test).
  2. Trains its local model for LOCAL_EPOCHS epochs.
  3. Returns updated weights + training stats to the FL server.
  4. If the node is a Witness UAV, it also computes a witness
     credibility score for the Sender and Receiver using its own
     independent observations.

Byzantine-fault-tolerant design: malicious nodes return poisoned
gradients that the server detects via Krum / median aggregation.
"""

import numpy as np
import pandas as pd
import os
from config import (
    DATA_DIR, FEATURE_NAMES, NUM_FEATURES, NUM_CLASSES,
    LOCAL_EPOCHS, LOCAL_BATCH_SIZE, LEARNING_RATE,
    RANDOM_SEED, TRUST_WEIGHTS, WITNESS_DECAY
)
from model import UAVAuthModel


class UAVNode:
    """
    Represents one UAV in the federated swarm.

    Attributes
    ----------
    uav_id : int
    role   : 'sender' | 'receiver' | 'witness' | 'relay'
    is_malicious : bool   — if True, this node launches a gradient-poisoning attack
    """

    def __init__(self, uav_id: int, role: str, is_malicious: bool = False):
        self.uav_id       = uav_id
        self.role         = role
        self.is_malicious = is_malicious

        # Local model — each node has its own copy initialised independently
        self.model = UAVAuthModel(seed=RANDOM_SEED + uav_id)

        # Load pre-generated CSV dataset
        self.X_train, self.y_train = self._load_split("train")
        self.X_test,  self.y_test  = self._load_split("test")

        # Feature scaler params (fit on local train set only)
        self._mean  = self.X_train.mean(axis=0)
        self._std   = self.X_train.std(axis=0) + 1e-8
        self.X_train = self._scale(self.X_train)
        self.X_test  = self._scale(self.X_test)

        # Running trust state for witness behaviour
        self.witness_trust: dict[int, float] = {}   # uav_id → trust [0,1]
        self.local_history: list[dict] = []

    # ── Data helpers ──────────────────────────────────────────────────────────
    def _load_split(self, split: str) -> tuple[np.ndarray, np.ndarray]:
        path = os.path.join(DATA_DIR, f"uav_{self.uav_id}_{split}.csv")
        df   = pd.read_csv(path)
        X    = df[FEATURE_NAMES].values.astype(float)
        y    = df["label"].values.astype(int)
        return X, y

    def _scale(self, X: np.ndarray) -> np.ndarray:
        return (X - self._mean) / self._std

    # ── Federated Learning Client Interface ───────────────────────────────────

    def set_global_weights(self, weights: list[np.ndarray]):
        """Load the global model weights before local training."""
        self.model.set_weights(weights)

    def local_train(self, epochs: int = LOCAL_EPOCHS,
                    batch_size: int = LOCAL_BATCH_SIZE) -> dict:
        """
        Perform local SGD for `epochs` epochs.
        If this node is malicious, it poisons gradients by flipping labels.
        Returns a training report + updated weights.
        """
        X = self.X_train.copy()
        y = self.y_train.copy()

        if self.is_malicious:
            # Label-flipping attack: flip 60% of adversarial labels to 0
            flip_mask = (y == 1) & (np.random.rand(len(y)) < 0.6)
            y[flip_mask] = 0

        epoch_losses = []
        for ep in range(epochs):
            loss = self.model.train_epoch(X, y, batch_size)
            epoch_losses.append(loss)

        metrics = self.model.evaluate(self.X_test, self.y_test)
        metrics["epoch_losses"] = epoch_losses
        metrics["num_samples"]  = len(self.X_train)
        metrics["is_malicious"] = self.is_malicious
        self.local_history.append(metrics)
        return metrics

    def get_weights(self) -> list[np.ndarray]:
        return self.model.get_weights()

    def get_num_samples(self) -> int:
        return len(self.X_train)

    # ── Witness Protocol ──────────────────────────────────────────────────────

    def compute_witness_observation(self, target_id: int,
                                    target_features: np.ndarray) -> dict:
        """
        As a witness UAV, independently evaluate the authenticity of
        `target_id` using scaled feature observations.

        Returns
        -------
        dict with:
          - 'proba_attack'   : float [0,1]
          - 'witness_score'  : float [0,100]
          - 'verdict'        : 'LEGITIMATE' | 'SUSPICIOUS' | 'MALICIOUS'
          - 'evidence'       : dict of anomalous features
        """
        x_scaled = (target_features - self._mean) / self._std
        probs     = self.model.predict_proba(x_scaled)
        p_attack  = float(probs[1])

        # Exponential moving-average trust
        prev_trust = self.witness_trust.get(target_id, 1.0)
        new_trust  = WITNESS_DECAY * prev_trust + (1 - WITNESS_DECAY) * (1 - p_attack)
        self.witness_trust[target_id] = new_trust

        witness_score = round(new_trust * 100, 2)

        if p_attack > 0.7:
            verdict = "MALICIOUS"
        elif p_attack > 0.4:
            verdict = "SUSPICIOUS"
        else:
            verdict = "LEGITIMATE"

        # Flag anomalous features (outside 2σ of learned legit distribution)
        evidence = {}
        feat_vals = target_features.flatten()
        for i, fname in enumerate(FEATURE_NAMES):
            z = abs((feat_vals[i] - self._mean[i]) / (self._std[i] + 1e-8))
            if z > 2.0:
                evidence[fname] = {
                    "value"    : round(float(feat_vals[i]), 4),
                    "z_score"  : round(float(z), 2),
                }

        return {
            "witness_id"   : self.uav_id,
            "target_id"    : target_id,
            "proba_attack" : round(p_attack, 4),
            "witness_score": witness_score,
            "verdict"      : verdict,
            "evidence"     : evidence,
        }

    def evaluate_global_model(self) -> dict:
        """Evaluate the current (global) model on local test data."""
        return self.model.evaluate(self.X_test, self.y_test)
