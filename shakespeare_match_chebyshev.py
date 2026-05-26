"""
Shakespeare Personality Matcher — Chebyshev Distance
======================================================
Compares a user's trait scores against Shakespeare characters
using Chebyshev distance: the single largest trait difference
between two profiles. A low score means no trait is wildly off,
even if many traits differ slightly.

Usage:
  - Edit USER_SCORES below with your values (1–10 scale), OR
  - Pass a CSV path as a command-line argument:
      python shakespeare_match_chebyshev.py my_scores.csv
"""

import csv
import math
import sys
import os

# ── Configuration ────────────────────────────────────────────────────────────

CHARACTERS_CSV = "shakespeare3.csv"  # path to character data

TRAITS = [
    "Ambition", "Forgiving", "Repressed", "Action Oriented", "Morality",
    "Emotion", "Idealism", "Chaos", "Humor", "Romance", "Pining",
    "Duty", "Loyalty", "Power Hunger",
    "Gender (having it)", "Gender (binary but its a spectrum)",
    "Self-Awareness", "Charisma"
]

# ── Manual user input (edit these values, 0–10 scale) ────────────────────────
EMILY_SCORES = {
    "Ambition":                           8,
    "Forgiving":                          8,
    "Repressed":                          8,
    "Action Oriented":                    9,
    "Morality":                           4,
    "Emotion":                            10,
    "Idealism":                           6,
    "Chaos":                              4,
    "Humor":                              3,
    "Romance":                            3,
    "Pining":                             6,
    "Duty":                               10,
    "Loyalty":                            10,
    "Power Hunger":                       4,
    "Gender (having it)":                 3,
    "Gender (binary but its a spectrum)": 5,
    "Self-Awareness":                     7,
    "Charisma":                           8,
    "performance":                        2,
    "Honor":                              4,
    "Intention":                          7,
}

SITA_SCORES = {
    "Ambition":                           8,
    "Forgiving":                          1,
    "Repressed":                          6,
    "Action Oriented":                    9,
    "Morality":                           6,
    "Emotion":                            9,
    "Idealism":                           3,
    "Chaos":                              3,
    "Humor":                              7,
    "Romance":                            9,
    "Pining":                             9,
    "Duty":                               3,
    "Loyalty":                            6,
    "Power Hunger":                       6,
    "Gender (having it)":                 5,
    "Gender (binary but its a spectrum)": 5,
    "Self-Awareness":                     8,
    "Charisma":                           7,
    "performance":                        8,
    "Honor":                              8,
    "Intention":                          8,
}

# ── Load character data ───────────────────────────────────────────────────────

def load_characters(filepath):
    characters = []
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            scores = {}
            for trait in TRAITS:
                val = row.get(trait, "")
                val = val.strip() if val else ""
                if val == "":
                    scores[trait] = None
                else:
                    try:
                        scores[trait] = float(val)
                    except ValueError:
                        print(f"Warning: could not convert '{val}' to float for trait '{trait}' in character '{row.get('Character', '?')}' — treating as missing.")
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
    Accepts a tab-separated two-row format:
      Row 1: trait names (headers)
      Row 2: scores

    Also supports comma-separated with Trait/Score columns,
    or a single-row CSV with trait names as headers.
    """
    scores = {}
    with open(filepath, newline="", encoding="utf-8") as f:
        first_line = f.readline()
        delimiter = "\t" if "\t" in first_line else ","
        f.seek(0)

        reader = csv.DictReader(f, delimiter=delimiter)
        headers = reader.fieldnames or []

        if "Trait" in headers and "Score" in headers:
            for row in reader:
                val = row["Score"].strip()
                try:
                    scores[row["Trait"].strip()] = float(val)
                except ValueError:
                    print(f"Warning: could not convert '{val}' for trait '{row['Trait']}' — skipping.")
        else:
            for row in reader:
                for trait in TRAITS:
                    if trait in row:
                        val = row[trait].strip()
                        if val != "":
                            try:
                                scores[trait] = float(val)
                            except ValueError:
                                print(f"Warning: could not convert '{val}' for trait '{trait}' — skipping.")
                break
    return scores

# ── Chebyshev distance ────────────────────────────────────────────────────────

def get_shared_traits(user, character):
    """Return parallel lists of user and character scores for non-missing traits."""
    u_vals, c_vals, trait_names = [], [], []
    for trait in TRAITS:
        c_score = character["scores"].get(trait)
        u_score = user.get(trait)
        if c_score is not None and u_score is not None:
            u_vals.append(u_score)
            c_vals.append(c_score)
            trait_names.append(trait)
    return u_vals, c_vals, trait_names

def chebyshev_distance(u, c, trait_names):
    """
    Chebyshev distance = max absolute difference across all traits.
    Also returns the trait responsible for the worst mismatch.
    """
    diffs = [(abs(a - b), name) for a, b, name in zip(u, c, trait_names)]
    max_diff, worst_trait = max(diffs, key=lambda x: x[0])
    return max_diff, worst_trait

def compute_similarity(user_scores, character):
    u_vals, c_vals, trait_names = get_shared_traits(user_scores, character)
    if len(u_vals) < 3:
        return None, None, 0
    dist, worst_trait = chebyshev_distance(u_vals, c_vals, trait_names)
    return dist, worst_trait, len(u_vals)

# ── Main matching logic ───────────────────────────────────────────────────────

def rank_characters(user_scores, characters):
    results = []
    for char in characters:
        dist, worst_trait, n_traits = compute_similarity(user_scores, char)
        if dist is None:
            continue
        results.append({
            "name": char["name"],
            "play": char["play"],
            "distance": dist,
            "worst_trait": worst_trait,
            "traits_compared": n_traits,
        })

    # Lower distance = closer match
    results.sort(key=lambda x: x["distance"])
    return results

def print_results(results, top_n=10):
    print(f"\n{'='*70}")
    print(f"  Shakespeare Character Matcher  |  Method: Chebyshev Distance")
    print(f"  (Lower score = no single trait is far off)")
    print(f"{'='*70}")
    print(f"  {'Rank':<5} {'Character':<18} {'Play':<20} {'Distance':<10} {'Biggest Mismatch'}")
    print(f"  {'-'*5} {'-'*18} {'-'*20} {'-'*10} {'-'*20}")
    for i, r in enumerate(results[:top_n], 1):
        print(
            f"  {i:<5} {r['name']:<18} {r['play']:<20} "
            f"{r['distance']:<10.1f} {r['worst_trait']}  ({r['traits_compared']} traits)"
        )
    print(f"{'='*70}\n")
    best = results[0]
    print(f"  Your closest match: {best['name']} from {best['play']}")
    print(f"  Biggest mismatch trait: {best['worst_trait']} (off by {best['distance']:.1f} points)")
    print(f"{'='*70}\n")

# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    char_path = os.path.join(script_dir, CHARACTERS_CSV)
    if not os.path.exists(char_path):
        char_path = CHARACTERS_CSV

    characters = load_characters(char_path)

    if len(sys.argv) > 1:
        print(f"Loading user scores from: {sys.argv[1]}")
        user_scores = load_user_csv(sys.argv[1])
    else:
        print("Using manually defined USER_SCORES from script.")
        # user_scores = EMILY_SCORES
        user_scores = SITA_SCORES


    missing = [t for t in TRAITS if t not in user_scores]
    if missing:
        print(f"Warning: missing user scores for: {missing}")

    results = rank_characters(user_scores, characters)
    print_results(results)

if __name__ == "__main__":
    main()