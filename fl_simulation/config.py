"""
config.py — Centralised configuration for the UAV Federated-Learning
             Authentication simulation.

Reference basis:
  [1] McMahan et al., "Communication-Efficient Learning of Deep Networks
      from Decentralised Data", AISTATS 2017  (FedAvg)
  [2] Ferrag et al., "Deep Learning for Cyber Security Intrusion Detection:
      Approaches, Datasets, and Comparative Study", 2020
  [3] Gyawali & Qian, "Challenges and Solution for Secure and Trustworthy
      Federated Learning", 2021
"""

import os

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
DATA_DIR     = os.path.join(BASE_DIR, "data")
MODELS_DIR   = os.path.join(BASE_DIR, "models")
RESULTS_DIR  = os.path.join(BASE_DIR, "results")
LOGS_DIR     = os.path.join(BASE_DIR, "logs")

# ─── UAV Network Topology ─────────────────────────────────────────────────────
NUM_UAVS          = 10   # total UAV nodes in the swarm
NUM_WITNESS_UAVS  = 3    # how many act as witness/validator drones
NUM_SENDER_UAVS   = 1    # parcel-carrying senders
NUM_RECEIVER_UAVS = 1    # handover receivers
# Remaining UAVs are edge relays / bystanders

# ─── Federated Learning ───────────────────────────────────────────────────────
FL_ROUNDS          = 30    # total global FL rounds
LOCAL_EPOCHS       = 3     # local training epochs per round
LOCAL_BATCH_SIZE   = 32
LEARNING_RATE      = 1e-3
FRACTION_FIT       = 0.8   # fraction of clients selected per round (C in FedAvg)
MIN_FIT_CLIENTS    = 5
MIN_EVAL_CLIENTS   = 3

# ─── Dataset / Features ──────────────────────────────────────────────────────
# Features captured at handover time (per-sample)
FEATURE_NAMES = [
    "rssi_dbm",            # received signal strength
    "snr_db",              # signal-to-noise ratio
    "doppler_hz",          # Doppler shift (motion authenticity)
    "crypto_latency_ms",   # PKI / PQC signature verify time
    "pkt_loss_rate",       # packet-loss ratio [0,1]
    "inter_pkt_delay_ms",  # inter-packet delay (timing fingerprint)
    "manoeuvre_energy_j",  # energy used during approach manoeuvre
    "hover_variance",      # positional jitter (witness-measured)
    "heading_delta_deg",   # heading change vs. expected trajectory
    "payload_hash_match",  # binary: 1 = hash OK
    "timestamp_skew_ms",   # clock skew with network time
    "witness_confidence",  # aggregate witness credibility [0,1]
]
NUM_FEATURES   = len(FEATURE_NAMES)
NUM_CLASSES    = 2   # 0 = legitimate, 1 = adversarial/anomalous

SAMPLES_PER_UAV = 500   # synthetic samples generated per UAV node

# ─── Attack / Adversarial Scenarios ─────────────────────────────────────────
ATTACK_FRACTION  = 0.25   # fraction of nodes that are adversarial each round
ATTACK_SCENARIOS = ["none", "spoofing", "replay", "rogue_node", "sybil"]

# ─── Trust Fusion Weights (matches store.js logic) ───────────────────────────
TRUST_WEIGHTS = {
    "crypto"  : 0.40,
    "ai_model": 0.40,
    "witness" : 0.20,
}
TRUST_THRESHOLD_APPROVE = 85.0
TRUST_THRESHOLD_REJECT  = 50.0

# ─── Federated Aggregation ───────────────────────────────────────────────────
AGGREGATION_METHOD = "fedavg"   # "fedavg" | "fedprox" | "krum"
FEDPROX_MU         = 0.01       # proximal term coefficient (FedProx)
KRUM_F             = 2          # Byzantine faults tolerated (Krum)

# ─── Witness Protocol ────────────────────────────────────────────────────────
WITNESS_QUORUM     = 2   # minimum witnesses required to validate
WITNESS_DECAY      = 0.95  # exponential decay on witness trust score

# ─── Reproducibility ─────────────────────────────────────────────────────────
RANDOM_SEED = 42
