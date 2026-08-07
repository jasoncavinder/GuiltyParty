.PHONY: setup run-server run-host run-stage build-stage check-contracts test-remote test

setup:
	@echo "Checking dependencies..."
	@command -v cargo > /dev/null || (echo "Rust/Cargo not found. Install it from https://rustup.rs/" && exit 1)
	@command -v python3 > /dev/null || (echo "Python 3 is required to serve the current static Host Console." && exit 1)
	@command -v node > /dev/null || (echo "Node.js 20 or later is required for standards contract validation." && exit 1)
	@command -v npm > /dev/null || (echo "npm is required to install development tooling." && exit 1)
	@node -e 'const major = Number(process.versions.node.split(".")[0]); if (major < 20) { console.error("Node.js 20 or later is required."); process.exit(1); }'
	@npm ci --ignore-scripts --cache .cache/npm
	@command -v xcodebuild > /dev/null || echo "Optional: install Xcode before creating the iOS Companion."
	@command -v ares-package > /dev/null || echo "Optional: install LG webOS CLI before packaging the Stage."
	@echo "Core dependencies OK."

run-server:
	cd server && cargo run -p gp_server

run-host:
	@echo "Serving Host Console at http://localhost:8080"
	@python3 -m http.server 8080 -d clients/host

run-stage:
	@echo "Serving browser-tested Stage at http://localhost:8081"
	@python3 -m http.server 8081 -d clients/stage

build-stage:
	@command -v ares-package > /dev/null || (echo "LG webOS CLI command ares-package is required." && exit 1)
	@test -f clients/stage/appinfo.json || (echo "Stage packaging metadata and original placeholder icons are not yet present; see known limitations." && exit 1)
	@ares-package clients/stage

check-contracts:
	@python3 tooling/check_contract_artifacts.py
	@npm run --silent check:contracts:standard

test-remote:
	@npm run --silent test:remote

test:
	@$(MAKE) check-contracts
	@$(MAKE) test-remote
	cd server && cargo test --locked
