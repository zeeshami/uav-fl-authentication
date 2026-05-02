"""
visualise.py — Results Visualisation
======================================
Generates publication-quality plots from the FL simulation results:

  1. Global Accuracy & F1 per round (with attack annotations)
  2. Per-layer trust score evolution (crypto / AI / witness)
  3. Authentication decision heatmap across rounds × scenarios
  4. Witness confidence breakdown per witness drone
  5. Aggregation method comparison (FedAvg vs Krum vs Median)

Saves all figures to results/figures/
"""

import json
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")                 # headless rendering
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.colors import LinearSegmentedColormap
from config import RESULTS_DIR, LOGS_DIR

FIG_DIR = os.path.join(RESULTS_DIR, "figures")
os.makedirs(FIG_DIR, exist_ok=True)

# ── Colour palette (matches frontend theme) ───────────────────────────────────
C_BLUE   = "#3b82f6"
C_AMBER  = "#f59e0b"
C_RED    = "#ef4444"
C_GREEN  = "#22c55e"
C_PURPLE = "#a855f7"
C_BG     = "#050a14"
C_GRID   = "#1e293b"
C_TEXT   = "#cbd5e1"

ATTACK_COLORS = {
    "none"     : C_GREEN,
    "spoofing" : C_RED,
    "replay"   : C_AMBER,
    "rogue_node": C_PURPLE,
    "sybil"    : "#fb923c",
}

plt.rcParams.update({
    "figure.facecolor" : C_BG,
    "axes.facecolor"   : C_BG,
    "axes.edgecolor"   : C_GRID,
    "axes.labelcolor"  : C_TEXT,
    "xtick.color"      : C_TEXT,
    "ytick.color"      : C_TEXT,
    "text.color"       : C_TEXT,
    "grid.color"       : C_GRID,
    "grid.alpha"       : 0.5,
    "font.family"      : "monospace",
    "axes.titlesize"   : 11,
    "axes.labelsize"   : 9,
})


def _load_history() -> list[dict]:
    path = os.path.join(RESULTS_DIR, "fl_training_history.json")
    with open(path) as f:
        return json.load(f)


def _load_auth_log() -> list[dict]:
    path = os.path.join(LOGS_DIR, "witness_auth_log.json")
    if not os.path.exists(path):
        return []
    with open(path) as f:
        return json.load(f)


# ── 1. Global Accuracy & F1 ───────────────────────────────────────────────────
def plot_global_metrics(history: list[dict]):
    rounds  = [r["round"] for r in history]
    acc     = [r["global"]["accuracy"] for r in history]
    f1      = [r["global"]["f1"] for r in history]
    attacks = [r["attack_scenario"] for r in history]

    fig, ax = plt.subplots(figsize=(12, 5))
    ax.set_title("UAV-FL Global Authentication Model - Accuracy & F1 per Round", pad=12)

    # Background shading per attack scenario
    for i, (rnd, sc) in enumerate(zip(rounds, attacks)):
        ax.axvspan(rnd - 0.5, rnd + 0.5,
                   color=ATTACK_COLORS.get(sc, C_GRID), alpha=0.15)

    ax.plot(rounds, acc, color=C_BLUE,   linewidth=2, label="Accuracy", marker="o", markersize=3)
    ax.plot(rounds, f1,  color=C_AMBER,  linewidth=2, label="F1 Score",  marker="s", markersize=3)
    ax.set_xlabel("FL Round")
    ax.set_ylabel("Score")
    ax.set_ylim(0, 1.05)
    ax.grid(True)
    ax.legend(facecolor=C_BG, edgecolor=C_GRID)

    # Attack legend
    patches = [mpatches.Patch(color=c, label=s, alpha=0.6)
               for s, c in ATTACK_COLORS.items()]
    ax.legend(handles=patches + [
        plt.Line2D([], [], color=C_BLUE,  lw=2, label="Accuracy"),
        plt.Line2D([], [], color=C_AMBER, lw=2, label="F1 Score"),
    ], facecolor=C_BG, edgecolor=C_GRID, loc="lower right", fontsize=8)

    plt.tight_layout()
    path = os.path.join(FIG_DIR, "1_global_accuracy_f1.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  Saved: {path}")


# ── 2. Trust Score Layers ─────────────────────────────────────────────────────
def plot_trust_layers(history: list[dict]):
    rounds = [r["round"] for r in history]
    crypto = [r["auth_event"]["crypto"]["score"]            if r["auth_event"] else 0 for r in history]
    ai     = [r["auth_event"]["ai_model"]["score"]          if r["auth_event"] else 0 for r in history]
    wit    = [r["auth_event"]["witness"]["witness_score"]    if r["auth_event"] else 0 for r in history]
    total  = [r["auth_event"]["total_score"]                 if r["auth_event"] else 0 for r in history]

    fig, axes = plt.subplots(2, 2, figsize=(14, 8))
    fig.suptitle("Three-Layer Trust Score Evolution - UAV Handover Authentication", y=1.01)

    data = [
        (axes[0, 0], crypto, C_BLUE,   "Layer 1 — Cryptographic Score"),
        (axes[0, 1], ai,     C_AMBER,  "Layer 2 — AI Model Score"),
        (axes[1, 0], wit,    C_RED,    "Layer 3 — Witness Score"),
        (axes[1, 1], total,  C_GREEN,  "Fused Trust Score"),
    ]

    for ax, vals, color, title in data:
        ax.plot(rounds, vals, color=color, linewidth=2)
        ax.fill_between(rounds, vals, alpha=0.15, color=color)
        ax.axhline(85, color=C_GREEN, linestyle="--", linewidth=1, alpha=0.6, label="Approve threshold")
        ax.axhline(50, color=C_RED,   linestyle="--", linewidth=1, alpha=0.6, label="Reject threshold")
        ax.set_title(title)
        ax.set_ylabel("Score (0-100)")
        ax.set_xlabel("Round")
        ax.set_ylim(-5, 105)
        ax.grid(True)
        ax.legend(facecolor=C_BG, edgecolor=C_GRID, fontsize=7)

    plt.tight_layout()
    path = os.path.join(FIG_DIR, "2_trust_layer_scores.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  Saved: {path}")


# ── 3. Authentication Decision Heatmap ────────────────────────────────────────
def plot_decision_heatmap(history: list[dict]):
    scenarios = ["none", "spoofing", "replay", "rogue_node", "sybil"]
    decisions = ["APPROVED", "ESCALATED", "REJECTED"]
    matrix    = {sc: {d: 0 for d in decisions} for sc in scenarios}

    for r in history:
        ev = r.get("auth_event")
        if ev:
            sc = ev["attack_scenario"]
            d  = ev["decision"]
            if sc in matrix and d in decisions:
                matrix[sc][d] += 1

    data = np.array([[matrix[sc][d] for d in decisions] for sc in scenarios])

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.set_title("Authentication Decision Distribution by Attack Scenario")

    cmap = LinearSegmentedColormap.from_list("uav", [C_BG, C_BLUE], N=256)
    im   = ax.imshow(data, cmap=cmap, aspect="auto")
    plt.colorbar(im, ax=ax, label="Event Count")

    ax.set_xticks(range(len(decisions)));  ax.set_xticklabels(decisions)
    ax.set_yticks(range(len(scenarios))); ax.set_yticklabels(scenarios)

    for i in range(len(scenarios)):
        for j in range(len(decisions)):
            ax.text(j, i, str(data[i, j]), ha="center", va="center",
                    color="white", fontsize=10, fontweight="bold")

    plt.tight_layout()
    path = os.path.join(FIG_DIR, "3_decision_heatmap.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  Saved: {path}")


# ── 4. Witness Confidence per Drone ──────────────────────────────────────────
def plot_witness_confidence(history: list[dict]):
    witness_data: dict[int, list[float]] = {}

    for r in history:
        ev = r.get("auth_event")
        if ev and ev.get("witness") and ev["witness"].get("votes"):
            for vote in ev["witness"]["votes"]:
                wid = vote["witness_id"]
                witness_data.setdefault(wid, []).append(vote["witness_score"])

    if not witness_data:
        print("  (No witness vote data — skipping plot 4)")
        return

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.set_title("Witness Drone Confidence Score Evolution")

    colors = [C_RED, C_AMBER, C_PURPLE, C_BLUE, C_GREEN]
    for i, (wid, scores) in enumerate(sorted(witness_data.items())):
        ax.plot(range(1, len(scores) + 1), scores,
                label=f"UAV-{wid:02d} (witness)",
                color=colors[i % len(colors)], linewidth=1.8)

    ax.set_xlabel("Round"); ax.set_ylabel("Confidence Score")
    ax.set_ylim(0, 105); ax.grid(True)
    ax.legend(facecolor=C_BG, edgecolor=C_GRID)
    plt.tight_layout()

    path = os.path.join(FIG_DIR, "4_witness_confidence.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  Saved: {path}")


# ── 5. Client Accuracy Distribution per Round ─────────────────────────────────
def plot_client_distribution(history: list[dict]):
    rounds    = [r["round"] for r in history]
    legit_acc = []
    mal_acc   = []

    for r in history:
        lv = [c["accuracy"] for c in r["clients"] if not c["is_malicious"]]
        mv = [c["accuracy"] for c in r["clients"] if c["is_malicious"]]
        legit_acc.append(lv)
        mal_acc.append(mv)

    fig, ax = plt.subplots(figsize=(12, 5))
    ax.set_title("Client Accuracy Distribution — Legitimate vs Malicious Nodes")

    def box_stats(vals_list):
        return {
            "med" : [np.median(v) if v else 0 for v in vals_list],
            "lo"  : [np.percentile(v, 25) if v else 0 for v in vals_list],
            "hi"  : [np.percentile(v, 75) if v else 0 for v in vals_list],
        }

    ls = box_stats(legit_acc)
    ms = box_stats(mal_acc)

    ax.fill_between(rounds, ls["lo"], ls["hi"], alpha=0.2, color=C_BLUE)
    ax.plot(rounds, ls["med"], color=C_BLUE,  lw=2, label="Legitimate (median)")
    ax.fill_between(rounds, ms["lo"], ms["hi"], alpha=0.2, color=C_RED)
    ax.plot(rounds, ms["med"], color=C_RED,   lw=2, label="Malicious (median)")

    ax.set_xlabel("FL Round"); ax.set_ylabel("Local Accuracy")
    ax.set_ylim(0, 1.05); ax.grid(True)
    ax.legend(facecolor=C_BG, edgecolor=C_GRID)
    plt.tight_layout()

    path = os.path.join(FIG_DIR, "5_client_accuracy_dist.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  Saved: {path}")


# ── Entry point ───────────────────────────────────────────────────────────────
def generate_all_plots():
    print("\n" + "=" * 55)
    print("  Generating Visualisations")
    print("=" * 55)
    history = _load_history()
    plot_global_metrics(history)
    plot_trust_layers(history)
    plot_decision_heatmap(history)
    plot_witness_confidence(history)
    plot_client_distribution(history)
    print(f"\n[OK] All figures saved -> {FIG_DIR}")


if __name__ == "__main__":
    generate_all_plots()
