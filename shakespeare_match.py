"""
Shakespeare Personality Matcher
================================
Compares a user's trait scores against Shakespeare characters
and returns a ranked list of closest matches.

Usage:
  - Edit USER_SCORES below with your values (1–10 scale), OR
  - Pass a CSV path as a command-line argument:
      python shakespeare_match.py my_scores.csv

Similarity methods available: 'cosine', 'euclidean', 'pearson'
"""

import csv
import math
import sys
import os

# ── Configuration ────────────────────────────────────────────────────────────

CHARACTERS_CSV = "shakespeare3.csv"  # path to character data

SIMILARITY_METHOD = "cosine"  # 'cosine' | 'euclidean' | 'pearson'

TRAITS = [
    "Ambition", "Forgiving", "Repressed", "Action Oriented", "Morality",
    "Emotion", "Idealism", "Chaos", "Humor", "Romance", "Pining",
    "Duty", "Loyalty", "Power Hunger", 
    "Gender (having it)", "Gender (binary but its a spectrum)",
    "Self-Awareness", "Charisma", "performance", "Honor", "Intention"
]

# ── Manual user input (edit these values, 0–10 scale) ────────────────────────
# GRACE
# USER_SCORES = {
#     "Ambition":                           5,
#     "Forgiving":                          8,
#     "Repressed":                          3,
#     "Action Oriented":                    6,
#     "Morality":                           7,
#     "Emotion":                            9,
#     "Idealism":                           6,
#     "Chaos":                              4,
#     "Humor":                              8,
#     "Romance":                            9,
#     "Pining":                             8,
#     "Duty":                               6,
#     "Loyalty":                            9,
#     "Power Hunger":                       5,
#     "Gender (having it)":                 8,
#     "Gender (binary but its a spectrum)": 9,
#     "Self-Awareness":                     7,
#     "Charisma":                           7,
#     ""
# }
USER_SCORES = {
    "Ambition":                           5,
    "Forgiving":                          8,
    "Repressed":                          3,
    "Action Oriented":                    6,
    "Morality":                           7,
    "Emotion":                            9,
    "Idealism":                           6,
    "Chaos":                              4,
    "Humor":                              8,
    "Romance":                            9,
    "Pining":                             8,
    "Duty":                               6,
    "Loyalty":                            9,
    "Power Hunger":                       5,
    "Gender (having it)":                 8,
    "Gender (binary but its a spectrum)": 9,
    "Self-Awareness":                     7,
    "Charisma":                           7,
    "performance":                        7,
    "Honor":                              5,
    "Intention":                          7,
}

# #sadie
# USER_SCORES = {
#     "Ambition":                           3,
#     "Forgiving":                          8,
#     "Repressed":                          8,
#     "Action Oriented":                    6,
#     "Morality":                           9,
#     "Emotion":                            7,
#     "Idealism":                           8,
#     "Chaos":                              5,
#     "Humor":                              8,
#     "Romance":                            7,
#     "Pining":                             7,
#     "Duty":                               8,
#     "Loyalty":                            8,
#     "Power Hunger":                       4,
#     "Gender (having it)":                 5,
#     "Gender (binary but its a spectrum)": 4,
#     "Self-Awareness":                     5,
#     "Charisma":                           7,
#     "performance":                        5,
#     "Honor":                              6,
#     "Intention":                          6,
# }

# #emily v1
# USER_SCORES = {
#     "Ambition":                           7,
#     "Forgiving":                          7,
#     "Repressed":                          8,
#     "Action Oriented":                    9,
#     "Morality":                           4,
#     "Emotion":                            7,
#     "Idealism":                           4,
#     "Chaos":                              6,
#     "Humor":                              4,
#     "Romance":                            4,
#     "Pining":                             7,
#     "Duty":                               9,
#     "Loyalty":                            10,
#     "Power Hunger":                       5,
#     "Gender (having it)":                 5,
#     "Gender (binary but its a spectrum)": 7,
#     "Self-Awareness":                     8,
#     "Charisma":                           8,
# # # }
# USER_SCORES = {
#     "Ambition":                           8,
#     "Forgiving":                          8,
#     "Repressed":                          8,
#     "Action Oriented":                    9,
#     "Morality":                           4,
#     "Emotion":                            10,
#     "Idealism":                           6,
#     "Chaos":                              4,
#     "Humor":                              3,
#     "Romance":                            3,
#     "Pining":                             6,
#     "Duty":                               10,
#     "Loyalty":                            10,
#     "Power Hunger":                       4,
#     "Gender (having it)":                 3,
#     "Gender (binary but its a spectrum)": 5,
#     "Self-Awareness":                     7,
#     "Charisma":                           8,
#     "performance":                        2,
#     "Honor":                              4,
#     "Intention":                          7,
# }
#sita 
# USER_SCORES = {
#     "Ambition":                           8,
#     "Forgiving":                          1,
#     "Repressed":                          6,
#     "Action Oriented":                    9,
#     "Morality":                           6,
#     "Emotion":                            9,
#     "Idealism":                           3,
#     "Chaos":                              3,
#     "Humor":                              7,
#     "Romance":                            9,
#     "Pining":                             9,
#     "Duty":                               3,
#     "Loyalty":                            6,
#     "Power Hunger":                       6,
#     "Gender (having it)":                 5,
#     "Gender (binary but its a spectrum)": 5,
#     "Self-Awareness":                     8,
#     "Charisma":                           7,
#     "performance":                        8,
#     "Honor":                              8,
#     "Intention":                          8,
# }

# ── Load character data ───────────────────────────────────────────────────────

def load_characters(filepath):
    characters = []
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            scores = {}
            valid = True
            for trait in TRAITS:
                val = row.get(trait, "").strip()
                if val == "" or val is None:
                    scores[trait] = None  # missing
                else:
                    try:
                        scores[trait] = float(val)
                    except ValueError:
                        scores[trait] = None
            characters.append({
                "name": row["Character"].strip(),
                "play": row["Play"].strip(),
                "scores": scores,
            })
    return characters

# ── Load user scores from CSV ─────────────────────────────────────────────────

def load_user_csv(filepath):
    """
    Expects a CSV with columns 'Trait' and 'Score', e.g.:
        Trait,Score
        Ambition,7
        Forgiving,4
        ...
    Or a single-row CSV with trait names as headers.
    """
    scores = {}
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        if "Trait" in headers and "Score" in headers:
            for row in reader:
                scores[row["Trait"].strip()] = float(row["Score"].strip())
        else:
            # Single-row format: headers are trait names
            for row in reader:
                for trait in TRAITS:
                    if trait in row:
                        scores[trait] = float(row[trait].strip())
                break  # only first row
    return scores

# ── Similarity functions ──────────────────────────────────────────────────────

def get_shared_traits(user, character):
    """Return parallel lists of user and character scores for non-missing traits."""
    u_vals, c_vals = [], []
    for trait in TRAITS:
        c_score = character["scores"].get(trait)
        u_score = user.get(trait)
        if c_score is not None and u_score is not None:
            u_vals.append(u_score)
            c_vals.append(c_score)
    return u_vals, c_vals

def cosine_similarity(u, c):
    dot = sum(a * b for a, b in zip(u, c))
    mag_u = math.sqrt(sum(a ** 2 for a in u))
    mag_c = math.sqrt(sum(b ** 2 for b in c))
    if mag_u == 0 or mag_c == 0:
        return 0.0
    return dot / (mag_u * mag_c)

def euclidean_distance(u, c):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(u, c)))

def pearson_correlation(u, c):
    n = len(u)
    if n == 0:
        return 0.0
    mean_u = sum(u) / n
    mean_c = sum(c) / n
    num = sum((a - mean_u) * (b - mean_c) for a, b in zip(u, c))
    den = math.sqrt(
        sum((a - mean_u) ** 2 for a in u) *
        sum((b - mean_c) ** 2 for b in c)
    )
    return num / den if den != 0 else 0.0

def compute_similarity(user_scores, character, method):
    u_vals, c_vals = get_shared_traits(user_scores, character)
    if len(u_vals) < 3:
        return None, 0  # too many missing traits to be meaningful
    if method == "cosine":
        score = cosine_similarity(u_vals, c_vals)
        return score, len(u_vals)
    elif method == "euclidean":
        dist = euclidean_distance(u_vals, c_vals)
        return dist, len(u_vals)
    elif method == "pearson":
        score = pearson_correlation(u_vals, c_vals)
        return score, len(u_vals)
    else:
        raise ValueError(f"Unknown method: {method}")

# ── Main matching logic ───────────────────────────────────────────────────────

def rank_characters(user_scores, characters, method="cosine"):
    results = []
    for char in characters:
        sim, n_traits = compute_similarity(user_scores, char, method)
        if sim is None:
            continue
        results.append({
            "name": char["name"],
            "play": char["play"],
            "similarity": sim,
            "traits_compared": n_traits,
        })

    # Sort: higher is better for cosine/pearson; lower is better for euclidean
    reverse = method in ("cosine", "pearson")
    results.sort(key=lambda x: x["similarity"], reverse=reverse)
    return results

def print_results(results, method, top_n=10):
    label = "Similarity" if method in ("cosine", "pearson") else "Distance (lower = closer)"
    print(f"\n{'='*55}")
    print(f"  Shakespeare Character Matcher  |  Method: {method.capitalize()}")
    print(f"{'='*55}")
    print(f"  {'Rank':<5} {'Character':<18} {'Play':<20} {label}")
    print(f"  {'-'*5} {'-'*18} {'-'*20} {'-'*15}")
    for i, r in enumerate(results[:top_n], 1):
        sim_str = f"{r['similarity']:.4f}"
        print(f"  {i:<5} {r['name']:<18} {r['play']:<20} {sim_str}  ({r['traits_compared']} traits)")
    print(f"{'='*55}\n")
    print(f"  Your closest match: {results[0]['name']} from {results[0]['play']}")
    print(f"{'='*55}\n")

# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    # Resolve character CSV path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    char_path = os.path.join(script_dir, CHARACTERS_CSV)
    if not os.path.exists(char_path):
        # Try current working directory
        char_path = CHARACTERS_CSV
    
    characters = load_characters(char_path)

    # Resolve user scores
    if len(sys.argv) > 1:
        user_csv = sys.argv[1]
        print(f"Loading user scores from: {user_csv}")
        user_scores = load_user_csv(user_csv)
    else:
        print("Using manually defined USER_SCORES from script.")
        user_scores = USER_SCORES

    # Validate user scores
    missing = [t for t in TRAITS if t not in user_scores]
    if missing:
        print(f"Warning: missing user scores for: {missing}")

    # Run matching
    results = rank_characters(user_scores, characters, method=SIMILARITY_METHOD)
    print_results(results, method=SIMILARITY_METHOD)

if __name__ == "__main__":
    main()
