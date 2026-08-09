#!/usr/bin/env python3
"""Generate, verify, or reproduce Guilty Party mobile control contracts."""

from __future__ import annotations

import argparse
import glob
import hashlib
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


REPOSITORY = Path(__file__).resolve().parent.parent
SERVER = REPOSITORY / "apps" / "server"
SCHEMA = REPOSITORY / "contracts" / "control-plane" / "v1" / "control-plane.schema.json"
MANIFEST = REPOSITORY / "tests" / "contracts" / "v1" / "manifest.json"
GENERATOR = SERVER / "target" / "debug" / "gp_contract_gen"
GENERATOR_MANIFEST = SERVER / "crates" / "gp_contract_gen" / "Cargo.toml"
CANONICAL_SOURCE = "contracts/control-plane/v1/control-plane.schema.json"
PROTOCOL_MAJOR = "1"
STANDARD_KOTLIN_HOMES = (
    Path("/opt/homebrew/opt/kotlin/libexec"),
    Path("/usr/local/opt/kotlin/libexec"),
)
COMMITTED_OUTPUTS = {
    "swift": REPOSITORY
    / "contracts"
    / "generated"
    / "control-plane"
    / "v1"
    / "swift"
    / "ControlPlaneV1.generated.swift",
    "kotlin": REPOSITORY
    / "contracts"
    / "generated"
    / "control-plane"
    / "v1"
    / "kotlin"
    / "ControlPlaneV1.generated.kt",
}
FORBIDDEN_SWIFT = ("URLSession", "WebSocket", "Logger", "os_log", "http://", "https://")
FORBIDDEN_KOTLIN = ("println(", "System.out", "System.err", "Logger", "http://", "https://")


def command(arguments: list[str], *, capture: bool = False) -> str:
    result = subprocess.run(
        arguments,
        cwd=REPOSITORY,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.STDOUT if capture else None,
    )
    return result.stdout.strip() if capture else ""


def parse_arguments(arguments: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mode",
        choices=("spike", "generate", "check"),
        default="check",
        help="run disposable evidence, replace committed outputs, or check drift",
    )
    parser.add_argument("--swiftc", help="Swift compiler path; defaults to PATH")
    parser.add_argument("--kotlin-home", type=Path, help="Kotlin compiler home")
    parser.add_argument("--java", type=Path, help="Java executable for the Kotlin compiler")
    parser.add_argument(
        "--expected-swift-version",
        default=os.environ.get("GP_EXPECTED_SWIFT_VERSION"),
        help="require this exact Apple Swift semantic version",
    )
    parser.add_argument(
        "--expected-kotlin-version",
        default=os.environ.get("GP_EXPECTED_KOTLIN_VERSION"),
        help="require this exact kotlinc-jvm semantic version",
    )
    return parser.parse_args(arguments)


def discover_swiftc(explicit: str | None) -> Path:
    candidate = explicit or shutil.which("swiftc")
    if not candidate:
        raise RuntimeError("Swift compiler not found; pass --swiftc")
    path = Path(candidate).resolve()
    if not path.is_file():
        raise RuntimeError(f"Swift compiler does not exist: {path}")
    return path


def discover_kotlin_home(explicit: Path | None) -> Path:
    if explicit:
        candidates = [explicit]
    else:
        patterns = [
            "/Applications/Android Studio*.app/Contents/plugins/Kotlin/kotlinc",
            str(
                Path.home()
                / "Applications"
                / "Android Studio*.app"
                / "Contents"
                / "plugins"
                / "Kotlin"
                / "kotlinc"
            ),
            "/Volumes/Android Studio*/Android Studio.app/Contents/plugins/Kotlin/kotlinc",
        ]
        candidates = [Path(path) for pattern in patterns for path in glob.glob(pattern)]
        executable = shutil.which("kotlinc")
        if executable:
            candidates.append(Path(executable).resolve().parent.parent)
        candidates.extend(STANDARD_KOTLIN_HOMES)
    for candidate in candidates:
        if (candidate / "lib" / "kotlin-compiler.jar").is_file():
            return candidate.resolve()
    raise RuntimeError("Kotlin compiler home not found; pass --kotlin-home")


def discover_java(explicit: Path | None, kotlin_home: Path) -> Path:
    if explicit:
        candidates = [explicit]
    else:
        app_contents = kotlin_home.parents[2]
        candidates = [
            app_contents / "jbr" / "Contents" / "Home" / "bin" / "java",
            Path(shutil.which("java") or ""),
        ]
    for candidate in candidates:
        if candidate and candidate.is_file():
            return candidate.resolve()
    raise RuntimeError("Java runtime not found; pass --java")


def generate(language: str, output: Path) -> None:
    command([str(GENERATOR), "generate", str(SCHEMA), language, str(output)])
    add_reproducibility_header(output)


def harness(language: str, output: Path) -> None:
    command([str(GENERATOR), "harness", str(MANIFEST), language, str(output)])


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def generator_version() -> str:
    for line in GENERATOR_MANIFEST.read_text(encoding="utf-8").splitlines():
        key, separator, value = line.partition("=")
        if separator and key.strip() == "version":
            return value.strip().strip('"')
    raise RuntimeError("gp_contract_gen package version is missing")


def add_reproducibility_header(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    lines = source.splitlines()
    if (
        len(lines) < 2
        or not lines[0].startswith("// Generated by gp_contract_gen")
        or not lines[1].startswith("// Canonical source:")
    ):
        raise RuntimeError(f"unexpected generated header in {path}")
    schema_digest = hashlib.sha256(SCHEMA.read_bytes()).hexdigest()
    header = [
        f"// Generated by gp_contract_gen {generator_version()}. Do not edit.",
        f"// Protocol major: {PROTOCOL_MAJOR}",
        f"// Canonical source: {CANONICAL_SOURCE}",
        f"// Canonical source SHA-256: {schema_digest}",
    ]
    content = "\n".join(header + lines[2:]).rstrip("\n") + "\n"
    path.write_text(content, encoding="utf-8")


def verify_determinism(language: str, directory: Path) -> tuple[Path, str]:
    outputs: list[Path] = []
    for run in range(1, 6):
        suffix = "swift" if language == "swift" else "kt"
        output = directory / f"{language}-{run}.{suffix}"
        generate(language, output)
        outputs.append(output)
    hashes = {digest(output) for output in outputs}
    if len(hashes) != 1:
        raise RuntimeError(f"{language} generation is not deterministic: {sorted(hashes)}")
    return outputs[0], hashes.pop()


def verify_generated_boundaries(path: Path, language: str) -> None:
    source = path.read_text(encoding="utf-8")
    forbidden = FORBIDDEN_SWIFT if language == "swift" else FORBIDDEN_KOTLIN
    found = [token for token in forbidden if token in source]
    if found:
        raise RuntimeError(f"{language} output contains forbidden behavior markers: {found}")
    imports = [line for line in source.splitlines() if line.startswith("import ")]
    expected = ["import Foundation"] if language == "swift" else []
    if imports != expected:
        raise RuntimeError(f"{language} output has unexpected imports: {imports}")


def compile_swift(swiftc: Path, generated: Path, directory: Path) -> str:
    main = directory / "main.swift"
    executable = directory / "swift-contract-fixtures"
    module_cache = directory / "swift-module-cache"
    module_cache.mkdir()
    harness("swift", main)
    command(
        [
            str(swiftc),
            "-swift-version",
            "6",
            "-warnings-as-errors",
            "-module-cache-path",
            str(module_cache),
            str(generated),
            str(main),
            "-o",
            str(executable),
        ]
    )
    result = command([str(executable)], capture=True)
    version = command([str(swiftc), "--version"], capture=True).splitlines()[0]
    return f"{version}; {result}"


def compile_kotlin(java: Path, kotlin_home: Path, generated: Path, directory: Path) -> str:
    harness_path = directory / "Harness.kt"
    jar = directory / "kotlin-contract-fixtures.jar"
    harness("kotlin", harness_path)
    classpath = str(kotlin_home / "lib" / "*")
    compiler = "org.jetbrains.kotlin.cli.jvm.K2JVMCompiler"
    command(
        [
            str(java),
            "-cp",
            classpath,
            compiler,
            "-kotlin-home",
            str(kotlin_home),
            "-Werror",
            "-include-runtime",
            "-d",
            str(jar),
            str(generated),
            str(harness_path),
        ]
    )
    result = command([str(java), "-jar", str(jar)], capture=True)
    version_output = command(
        [str(java), "-cp", classpath, compiler, "-version"], capture=True
    ).splitlines()
    version = next(
        (line for line in version_output if "kotlinc-jvm" in line),
        version_output[0] if version_output else "unknown Kotlin compiler",
    )
    return f"{version}; {result}"


def semantic_version(output: str, marker: str) -> str:
    line = next((line for line in output.splitlines() if marker in line), "")
    words = line.split()
    try:
        return words[words.index(marker) + 1]
    except (ValueError, IndexError) as error:
        raise RuntimeError(f"could not determine {marker} version from {output!r}") from error


def verify_expected_versions(
    swift_result: str,
    kotlin_result: str,
    expected_swift: str | None,
    expected_kotlin: str | None,
) -> None:
    actual_swift = semantic_version(swift_result, "version")
    actual_kotlin = semantic_version(kotlin_result, "kotlinc-jvm")
    if expected_swift and actual_swift != expected_swift:
        raise RuntimeError(
            f"expected Apple Swift {expected_swift}, found {actual_swift}"
        )
    if expected_kotlin and actual_kotlin != expected_kotlin:
        raise RuntimeError(f"expected kotlinc-jvm {expected_kotlin}, found {actual_kotlin}")


def compare_committed(outputs: dict[str, Path]) -> None:
    drift = []
    for language, generated in outputs.items():
        committed = COMMITTED_OUTPUTS[language]
        if not committed.is_file():
            drift.append(f"missing {committed.relative_to(REPOSITORY)}")
        elif committed.read_bytes() != generated.read_bytes():
            drift.append(f"stale {committed.relative_to(REPOSITORY)}")
    if drift:
        details = ", ".join(drift)
        raise RuntimeError(
            f"committed mobile contracts drifted ({details}); "
            "run make generate-mobile-contracts"
        )


def replace_committed(outputs: dict[str, Path]) -> None:
    staged: list[tuple[Path, Path]] = []
    backups: dict[Path, Path | None] = {}
    replaced: list[Path] = []
    preserved_backups: set[Path] = set()
    try:
        for language, generated in outputs.items():
            destination = COMMITTED_OUTPUTS[language]
            destination.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                prefix=f".{destination.name}.", dir=destination.parent, delete=False
            ) as temporary:
                temporary.write(generated.read_bytes())
                staged_path = Path(temporary.name)
                staged.append((staged_path, destination))
            if destination.is_file():
                os.chmod(staged_path, destination.stat().st_mode)
                with tempfile.NamedTemporaryFile(
                    prefix=f".{destination.name}.backup.",
                    dir=destination.parent,
                    delete=False,
                ) as backup:
                    backup.write(destination.read_bytes())
                    backup_path = Path(backup.name)
                os.chmod(backup_path, destination.stat().st_mode)
                backups[destination] = backup_path
            else:
                os.chmod(staged_path, 0o644)
                backups[destination] = None
        for temporary, destination in staged:
            os.replace(temporary, destination)
            replaced.append(destination)
    except OSError as replacement_error:
        rollback_errors = []
        for destination in reversed(replaced):
            backup = backups[destination]
            try:
                if backup is None:
                    destination.unlink(missing_ok=True)
                else:
                    os.replace(backup, destination)
            except OSError as rollback_error:
                recovery = ""
                if backup is not None:
                    preserved_backups.add(backup)
                    recovery = f"; original preserved at {backup}"
                rollback_errors.append(
                    f"{destination}: {rollback_error}{recovery}"
                )
        if rollback_errors:
            details = "; ".join(rollback_errors)
            raise RuntimeError(
                "mobile contract replacement failed and rollback was incomplete: "
                f"{details}"
            ) from replacement_error
        raise
    finally:
        for temporary, _ in staged:
            temporary.unlink(missing_ok=True)
        for backup in backups.values():
            if backup is not None and backup not in preserved_backups:
                backup.unlink(missing_ok=True)


def main(command_line: list[str] | None = None) -> int:
    arguments = parse_arguments(command_line)
    swiftc = discover_swiftc(arguments.swiftc)
    kotlin_home = discover_kotlin_home(arguments.kotlin_home)
    java = discover_java(arguments.java, kotlin_home)

    command(
        [
            "cargo",
            "build",
            "--manifest-path",
            str(SERVER / "Cargo.toml"),
            "--locked",
            "--offline",
            "-p",
            "gp_contract_gen",
        ]
    )

    with tempfile.TemporaryDirectory(prefix="guiltyparty-mobile-contracts-") as temporary:
        directory = Path(temporary)
        swift, swift_hash = verify_determinism("swift", directory)
        kotlin, kotlin_hash = verify_determinism("kotlin", directory)
        verify_generated_boundaries(swift, "swift")
        verify_generated_boundaries(kotlin, "kotlin")
        swift_result = compile_swift(swiftc, swift, directory)
        kotlin_result = compile_kotlin(java, kotlin_home, kotlin, directory)
        verify_expected_versions(
            swift_result,
            kotlin_result,
            arguments.expected_swift_version,
            arguments.expected_kotlin_version,
        )
        outputs = {"swift": swift, "kotlin": kotlin}
        if arguments.mode == "check":
            compare_committed(outputs)
        elif arguments.mode == "generate":
            replace_committed(outputs)

    print(f"Swift SHA-256: {swift_hash}")
    print(f"Kotlin SHA-256: {kotlin_hash}")
    print(swift_result)
    print(kotlin_result)
    if arguments.mode == "generate":
        print("Committed mobile contract outputs updated with rollback protection.")
    elif arguments.mode == "check":
        print("Committed mobile contract outputs match deterministic generation.")
    print("Disposable generated and compiled output removed.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Mobile contract generation failed: {error}", file=sys.stderr)
        sys.exit(1)
