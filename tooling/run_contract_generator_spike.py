#!/usr/bin/env python3
"""Reproduce the disposable Swift/Kotlin contract-generator compatibility spike."""

from __future__ import annotations

import subprocess
import sys

from mobile_contracts import main


if __name__ == "__main__":
    try:
        sys.exit(main(["--mode", "spike", *sys.argv[1:]]))
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Contract generator spike failed: {error}", file=sys.stderr)
        sys.exit(1)
