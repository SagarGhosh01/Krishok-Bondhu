"""
AgriShield AI - Perceptual Hashing and Dataset Deduplication
Detects exact cryptographic duplicates and perceptual near-duplicates (e.g. same leaf photographed
from slightly different angles or augmented duplicates) using Union-Find transitive clustering
to prevent test-set contamination.
"""

import hashlib
import os
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple
from PIL import Image
import numpy as np


class UnionFind:
    """Disjoint Set Union (DSU) with path compression and union by rank."""

    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, i: int) -> int:
        if self.parent[i] == i:
            return i
        self.parent[i] = self.find(self.parent[i])
        return self.parent[i]

    def union(self, i: int, j: int):
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i != root_j:
            if self.rank[root_i] < self.rank[root_j]:
                self.parent[root_i] = root_j
            elif self.rank[root_i] > self.rank[root_j]:
                self.parent[root_j] = root_i
            else:
                self.parent[root_j] = root_i
                self.rank[root_i] += 1


def compute_sha256(file_path: Path) -> str:
    """Computes SHA-256 cryptographic hash of a file."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def compute_dhash(image_path: Path, hash_size: int = 8) -> int:
    """
    Computes difference hash (dHash) for an image using PIL.
    Resizes image to (hash_size + 1, hash_size) grayscale, compares adjacent horizontal pixels.
    Returns 64-bit integer representation of perceptual hash.
    """
    try:
        with Image.open(image_path) as img:
            img_gray = img.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
            pixels = np.array(img_gray, dtype=np.int32)
            diff = pixels[:, :-1] > pixels[:, 1:]
            hash_int = 0
            for bit in diff.flatten():
                hash_int = (hash_int << 1) | int(bit)
            return hash_int
    except Exception as e:
        raise RuntimeError(f"Error computing dHash for {image_path}: {e}")


def hamming_distance(hash1: int, hash2: int) -> int:
    """Computes Hamming distance between two 64-bit hashes."""
    return bin(hash1 ^ hash2).count("1")


class DuplicateDetector:
    """
    Identifies exact duplicates and perceptual near-duplicate clusters across a dataset.
    """

    def __init__(self, hamming_threshold: int = 4):
        self.hamming_threshold = hamming_threshold

    def scan_directory(self, root_dir: Path) -> Dict[str, Any]:
        root = Path(root_dir)
        valid_extensions = {".jpg", ".jpeg", ".png", ".webp"}
        image_files = [p for p in root.rglob("*") if p.suffix.lower() in valid_extensions]

        sha_map: Dict[str, List[Path]] = {}
        dhash_list: List[Tuple[Path, int]] = []

        for p in image_files:
            try:
                sha = compute_sha256(p)
                sha_map.setdefault(sha, []).append(p)
                dh = compute_dhash(p)
                dhash_list.append((p, dh))
            except Exception as e:
                print(f"[Warning] Failed to process {p}: {e}")

        exact_duplicates = {k: [str(p) for p in v] for k, v in sha_map.items() if len(v) > 1}

        n = len(dhash_list)
        dsu = UnionFind(n)
        for i in range(n):
            for j in range(i + 1, n):
                if hamming_distance(dhash_list[i][1], dhash_list[j][1]) <= self.hamming_threshold:
                    dsu.union(i, j)

        groups: Dict[int, List[str]] = {}
        for i in range(n):
            root_idx = dsu.find(i)
            groups.setdefault(root_idx, []).append(str(dhash_list[i][0]))

        clusters = [g for g in groups.values() if len(g) > 1]

        return {
            "total_images": len(image_files),
            "exact_duplicate_groups": len(exact_duplicates),
            "exact_duplicate_files": sum(len(v) for v in exact_duplicates.values()),
            "near_duplicate_clusters": len(clusters),
            "near_duplicate_files": sum(len(c) for c in clusters),
            "clusters": clusters,
        }
