.PHONY: setup run-server run-host build-stage test

setup:
	@echo "Checking dependencies..."
	@command -v cargo > /dev/null || (echo "Rust/Cargo not found. Install it from https://rustup.rs/" && exit 1)
	@command -v python3 > /dev/null || (echo "Python 3 is required to serve the current static Host Console." && exit 1)
	@command -v xcodebuild > /dev/null || echo "Optional: install Xcode before creating the iOS Companion."
	@command -v ares-package > /dev/null || echo "Optional: install LG webOS CLI before packaging the Stage."
	@echo "Core dependencies OK."

run-server:
	cd server && cargo run -p gp_server

run-host:
	@echo "Serving Host Console at http://localhost:8080"
	@python3 -m http.server 8080 -d clients/host

build-stage:
	@command -v ares-package > /dev/null || (echo "LG webOS CLI command ares-package is required." && exit 1)
	@test -f clients/stage/appinfo.json || (echo "Stage packaging metadata and original placeholder icons are not yet present; see known limitations." && exit 1)
	@ares-package clients/stage

test:
	cd server && cargo test --locked
