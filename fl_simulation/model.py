"""
model.py — Local UAV Authentication Model
==========================================
A lightweight Multi-Layer Perceptron (MLP) used as the local model
on each UAV node.  Designed to operate within the strict memory and
compute constraints of an embedded flight-controller (e.g. NVIDIA
Jetson Nano equivalent).

Architecture mirrors Ferrag et al. (2020) two-hidden-layer design
adapted for tabular RF + kinematic features.
"""

import numpy as np
from config import NUM_FEATURES, NUM_CLASSES, LEARNING_RATE


# ─── Pure-NumPy MLP (no external ML library required) ─────────────────────────

def _relu(x):
    return np.maximum(0.0, x)

def _relu_grad(x):
    return (x > 0).astype(float)

def _sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -30, 30)))

def _softmax(x):
    ex = np.exp(x - x.max(axis=1, keepdims=True))
    return ex / ex.sum(axis=1, keepdims=True)

def _cross_entropy(probs, y_one_hot):
    eps = 1e-9
    return -np.mean(np.sum(y_one_hot * np.log(probs + eps), axis=1))


class UAVAuthModel:
    """
    Lightweight MLP: INPUT → 64 → 32 → OUTPUT
    Parameters are stored as flat numpy arrays for easy federated averaging.
    """
    def __init__(self, input_dim: int = NUM_FEATURES,
                 hidden1: int = 64, hidden2: int = 32,
                 num_classes: int = NUM_CLASSES,
                 lr: float = LEARNING_RATE,
                 seed: int = 0):
        rng = np.random.default_rng(seed)
        # Xavier initialisation
        self.W1 = rng.normal(0, np.sqrt(2.0 / input_dim),  (input_dim, hidden1))
        self.b1 = np.zeros(hidden1)
        self.W2 = rng.normal(0, np.sqrt(2.0 / hidden1),    (hidden1, hidden2))
        self.b2 = np.zeros(hidden2)
        self.W3 = rng.normal(0, np.sqrt(2.0 / hidden2),    (hidden2, num_classes))
        self.b3 = np.zeros(num_classes)
        self.lr = lr

    # ── Forward ──────────────────────────────────────────────────────────────
    def _forward(self, X):
        self._z1 = X @ self.W1 + self.b1
        self._a1 = _relu(self._z1)
        self._z2 = self._a1 @ self.W2 + self.b2
        self._a2 = _relu(self._z2)
        self._z3 = self._a2 @ self.W3 + self.b3
        self._probs = _softmax(self._z3)
        return self._probs

    # ── Backward ─────────────────────────────────────────────────────────────
    def _backward(self, X, y_one_hot):
        n = X.shape[0]
        dz3 = (self._probs - y_one_hot) / n
        dW3 = self._a2.T @ dz3
        db3 = dz3.sum(axis=0)

        da2 = dz3 @ self.W3.T
        dz2 = da2 * _relu_grad(self._z2)
        dW2 = self._a1.T @ dz2
        db2 = dz2.sum(axis=0)

        da1 = dz2 @ self.W2.T
        dz1 = da1 * _relu_grad(self._z1)
        dW1 = X.T @ dz1
        db1 = dz1.sum(axis=0)

        # SGD update
        self.W3 -= self.lr * dW3;  self.b3 -= self.lr * db3
        self.W2 -= self.lr * dW2;  self.b2 -= self.lr * db2
        self.W1 -= self.lr * dW1;  self.b1 -= self.lr * db1

    # ── Train for one epoch ───────────────────────────────────────────────────
    def train_epoch(self, X: np.ndarray, y: np.ndarray,
                    batch_size: int = 32) -> float:
        n    = X.shape[0]
        idx  = np.random.permutation(n)
        X, y = X[idx], y[idx]
        losses = []
        for start in range(0, n, batch_size):
            Xb = X[start:start+batch_size]
            yb = y[start:start+batch_size]
            yb_oh = np.eye(NUM_CLASSES)[yb]
            probs = self._forward(Xb)
            losses.append(_cross_entropy(probs, yb_oh))
            self._backward(Xb, yb_oh)
        return float(np.mean(losses))

    # ── Evaluate ─────────────────────────────────────────────────────────────
    def evaluate(self, X: np.ndarray, y: np.ndarray) -> dict:
        probs = self._forward(X)
        preds = probs.argmax(axis=1)
        acc   = float((preds == y).mean())
        loss  = _cross_entropy(probs, np.eye(NUM_CLASSES)[y])

        # Per-class precision / recall
        tp = float(((preds == 1) & (y == 1)).sum())
        fp = float(((preds == 1) & (y == 0)).sum())
        fn = float(((preds == 0) & (y == 1)).sum())
        precision = tp / (tp + fp + 1e-9)
        recall    = tp / (tp + fn + 1e-9)
        f1        = 2 * precision * recall / (precision + recall + 1e-9)

        return {
            "accuracy"  : round(acc, 4),
            "loss"      : round(float(loss), 4),
            "precision" : round(precision, 4),
            "recall"    : round(recall, 4),
            "f1"        : round(f1, 4),
            "tp": int(tp), "fp": int(fp), "fn": int(fn),
        }

    # ── Predict single sample (for live trust scoring) ────────────────────────
    def predict_proba(self, x: np.ndarray) -> np.ndarray:
        """x : (1, NUM_FEATURES) → returns class probabilities [p_legit, p_attack]"""
        return self._forward(x.reshape(1, -1))[0]

    # ── Serialise parameters (for FL aggregation) ─────────────────────────────
    def get_weights(self) -> list[np.ndarray]:
        return [self.W1.copy(), self.b1.copy(),
                self.W2.copy(), self.b2.copy(),
                self.W3.copy(), self.b3.copy()]

    def set_weights(self, weights: list[np.ndarray]):
        self.W1, self.b1 = weights[0].copy(), weights[1].copy()
        self.W2, self.b2 = weights[2].copy(), weights[3].copy()
        self.W3, self.b3 = weights[4].copy(), weights[5].copy()
