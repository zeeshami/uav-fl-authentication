"""
aggregation.py — Federated Aggregation Algorithms
===================================================
Implements three aggregation strategies referenced in the research
literature on Byzantine-robust federated learning:

  1. FedAvg  — McMahan et al. (2017)
  2. FedProx — Li et al. (2020) — adds proximal regularisation
  3. Krum    — Blanchard et al. (2017) — Byzantine-fault tolerant

All functions accept a list of (weights, n_samples) tuples and
return a single aggregated weight list.
"""

import numpy as np
from config import FEDPROX_MU, KRUM_F


# ─── 1. FedAvg ────────────────────────────────────────────────────────────────
def fedavg(client_updates: list[tuple[list[np.ndarray], int]]) -> list[np.ndarray]:
    """
    Weighted average of client weights, weighted by dataset size.

    client_updates : list of (weights_list, n_samples)
    Returns        : aggregated weights_list
    """
    total_samples = sum(n for _, n in client_updates)
    if total_samples == 0:
        return client_updates[0][0]

    agg = None
    for weights, n in client_updates:
        w_frac = n / total_samples
        if agg is None:
            agg = [w * w_frac for w in weights]
        else:
            for i in range(len(agg)):
                agg[i] += weights[i] * w_frac
    return agg


# ─── 2. FedProx ───────────────────────────────────────────────────────────────
def fedprox(client_updates: list[tuple[list[np.ndarray], int]],
            global_weights: list[np.ndarray],
            mu: float = FEDPROX_MU) -> list[np.ndarray]:
    """
    FedProx: FedAvg + proximal term pulling local weights toward global.
    Equation: w_new = fedavg_result - mu * (fedavg_result - global_weights)
    """
    avg  = fedavg(client_updates)
    prox = [avg[i] - mu * (avg[i] - global_weights[i]) for i in range(len(avg))]
    return prox


# ─── 3. Krum — Byzantine-Fault Tolerant ──────────────────────────────────────
def _flatten(weights: list[np.ndarray]) -> np.ndarray:
    return np.concatenate([w.flatten() for w in weights])


def krum(client_updates: list[tuple[list[np.ndarray], int]],
         f: int = KRUM_F) -> list[np.ndarray]:
    """
    Multi-Krum aggregation — select the (n - f - 2) 'most central' clients
    and average their weights.  Robust to up to f Byzantine attackers.

    Blanchard et al., NeurIPS 2017.
    """
    n = len(client_updates)
    if n <= 2 * f + 2:
        # Fall back to FedAvg if not enough clients
        return fedavg(client_updates)

    vecs = [_flatten(w) for w, _ in client_updates]
    n_select = n - f - 2

    # Pairwise squared L2 distances
    dists = np.zeros((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            d = float(np.sum((vecs[i] - vecs[j]) ** 2))
            dists[i, j] = dists[j, i] = d

    # For each client, sum distances to its (n - f - 1) nearest neighbours
    scores = np.zeros(n)
    for i in range(n):
        sorted_dists = np.sort(dists[i])
        scores[i] = sorted_dists[1:n_select + 1].sum()   # skip self (0)

    # Select clients with lowest scores
    selected_idx = np.argsort(scores)[:n_select]
    selected     = [client_updates[i] for i in selected_idx]
    return fedavg(selected)


# ─── 4. Coordinate-wise Median (robustness baseline) ─────────────────────────
def coordinate_median(client_updates: list[tuple[list[np.ndarray], int]]) -> list[np.ndarray]:
    """
    Replace each coordinate with the median over all clients.
    Extremely robust to arbitrary Byzantine manipulations.
    """
    weight_lists = [w for w, _ in client_updates]
    n_layers     = len(weight_lists[0])
    median_weights = []
    for layer_idx in range(n_layers):
        stacked = np.stack([wl[layer_idx] for wl in weight_lists], axis=0)
        median_weights.append(np.median(stacked, axis=0))
    return median_weights


# ─── Factory ─────────────────────────────────────────────────────────────────
def aggregate(method: str,
              client_updates: list[tuple[list[np.ndarray], int]],
              global_weights: list[np.ndarray] | None = None) -> list[np.ndarray]:
    """
    Unified aggregation entry-point.
    method : 'fedavg' | 'fedprox' | 'krum' | 'median'
    """
    if method == "fedavg":
        return fedavg(client_updates)
    elif method == "fedprox":
        assert global_weights is not None, "FedProx requires global_weights"
        return fedprox(client_updates, global_weights)
    elif method == "krum":
        return krum(client_updates)
    elif method == "median":
        return coordinate_median(client_updates)
    else:
        raise ValueError(f"Unknown aggregation method: {method}")
