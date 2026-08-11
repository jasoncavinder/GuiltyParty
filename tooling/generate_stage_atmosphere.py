#!/usr/bin/env python3
"""Reproduce the approved, sample-free Cinematic Vault atmosphere WAV."""

from __future__ import annotations

import argparse
import math
import random
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 44_100
DURATION_SECONDS = 8
SEED = 4_303


def periodic_component_bank(
    sample_count: int,
    seed: int,
    frequency_range: tuple[float, float],
    component_count: int,
    stereo_width: float,
) -> tuple[list[float], list[float]]:
    randomizer = random.Random(seed)
    minimum_cycles = math.ceil(frequency_range[0] * DURATION_SECONDS)
    maximum_cycles = math.floor(frequency_range[1] * DURATION_SECONDS)
    cycles = randomizer.sample(range(minimum_cycles, maximum_cycles + 1), component_count)
    phases = [randomizer.uniform(0.0, math.tau) for _ in cycles]
    weights = [randomizer.uniform(0.65, 1.0) for _ in cycles]
    normalization = math.sqrt(sum(weight * weight for weight in weights))
    left = [0.0] * sample_count
    right = [0.0] * sample_count

    for index in range(sample_count):
        position = index / sample_count
        left_value = 0.0
        right_value = 0.0
        for cycle_count, phase, weight in zip(cycles, phases, weights, strict=True):
            angle = math.tau * cycle_count * position + phase
            left_value += math.sin(angle) * weight
            right_value += math.sin(angle + stereo_width * math.sin(phase)) * weight
        left[index] = left_value / normalization
        right[index] = right_value / normalization

    return left, right


def render(destination: Path) -> None:
    sample_count = SAMPLE_RATE * DURATION_SECONDS
    stereo_width = 0.34
    low_left, low_right = periodic_component_bank(
        sample_count, SEED, (38.0, 118.0), 23, stereo_width
    )
    air_left, air_right = periodic_component_bank(
        sample_count, SEED + 991, (240.0, 890.0), 27, stereo_width * 1.3
    )
    frames: list[tuple[float, float]] = []
    peak = 0.0

    for index in range(sample_count):
        time_seconds = index / SAMPLE_RATE
        position = index / sample_count
        movement = 0.82 + 0.18 * math.cos(math.tau * position + SEED * 0.001)
        shimmer = math.sin(math.tau * (3 / DURATION_SECONDS) * time_seconds + 0.7)
        shimmer *= 0.6 + 0.4 * math.cos(math.tau * position)
        left = movement * (0.128 * low_left[index] + 0.030 * air_left[index] + 0.025 * shimmer)
        right = movement * (
            0.128 * low_right[index]
            + 0.030 * air_right[index]
            + 0.025
            * math.sin(math.tau * (3 / DURATION_SECONDS) * time_seconds + 0.7 + stereo_width)
        )
        frames.append((left, right))
        peak = max(peak, abs(left), abs(right))

    scale = 0.30 / peak if peak else 1.0
    encoded = bytearray()
    for left, right in frames:
        encoded.extend(
            struct.pack(
                "<hh",
                round(max(-1.0, min(1.0, left * scale)) * 32_767),
                round(max(-1.0, min(1.0, right * scale)) * 32_767),
            )
        )

    destination.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(destination), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(encoded)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="new WAV destination; existing files are refused")
    arguments = parser.parse_args()
    if arguments.output.exists():
        parser.error(f"refusing to overwrite existing file: {arguments.output}")
    render(arguments.output)


if __name__ == "__main__":
    main()
