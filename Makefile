.PHONY: setup run-server run-host run-play run-stage build-remote-clients build-stage check-contracts generate-mobile-contracts check-mobile-contracts test-remote check-scenario-wasm check-cloudflare rehearse-packaged-stage rehearse-stage-pairing-boundaries rehearse-remote-lifecycle rehearse-remote-game test

setup:
	@echo "Checking dependencies..."
	@command -v cargo > /dev/null || (echo "Rust/Cargo not found. Install it from https://rustup.rs/" && exit 1)
	@command -v python3 > /dev/null || (echo "Python 3 is required to serve the current static Host Console." && exit 1)
	@command -v node > /dev/null || (echo "Node.js 22 or later is required for project tooling." && exit 1)
	@command -v npm > /dev/null || (echo "npm is required to install development tooling." && exit 1)
	@node -e 'const major = Number(process.versions.node.split(".")[0]); if (major < 22) { console.error("Node.js 22 or later is required."); process.exit(1); }'
	@npm ci --ignore-scripts --cache .cache/npm
	@command -v xcodebuild > /dev/null || echo "Optional: install Xcode before creating the iOS Companion."
	@command -v ares-package > /dev/null || echo "Optional: install LG webOS CLI before packaging the Stage."
	@echo "Core dependencies OK."

run-server:
	cd apps/server && cargo run -p gp_server

run-host:
	@$(MAKE) build-remote-clients
	@echo "Serving remote Host Console at http://localhost:8080"
	@python3 -m http.server 8080 -d .tmp/remote-clients/host

run-play:
	@$(MAKE) build-remote-clients
	@echo "Serving browser Companion fallback at http://localhost:8082"
	@python3 -m http.server 8082 -d .tmp/remote-clients/play

run-stage:
	@echo "Serving browser-tested Stage at http://localhost:8081"
	@python3 -m http.server 8081 -d apps/tv/lg-webos

build-stage:
	@command -v ares-package > /dev/null || (echo "LG webOS CLI command ares-package is required." && exit 1)
	@test -f apps/tv/lg-webos/appinfo.json || (echo "LG webOS Stage packaging metadata is required." && exit 1)
	@node tooling/build_webos_stage.mjs
	@mkdir -p .tmp/webos-packages
	@ares-package --check .tmp/lg-webos-stage-app
	@ares-package -o .tmp/webos-packages .tmp/lg-webos-stage-app

build-remote-clients:
	@node tooling/build_remote_clients.mjs

check-contracts:
	@python3 tooling/check_contract_artifacts.py
	@npm run --silent check:contracts:standard

generate-mobile-contracts:
	@$(MAKE) check-contracts
	@python3 -m unittest tooling/test_mobile_contracts.py
	@python3 tooling/mobile_contracts.py --mode generate

check-mobile-contracts:
	@$(MAKE) check-contracts
	@python3 -m unittest tooling/test_mobile_contracts.py
	@python3 tooling/mobile_contracts.py --mode check

test-remote:
	@npm run --silent test:remote

check-scenario-wasm:
	@node tooling/check_scenario_wasm.mjs

check-cloudflare:
	@WRANGLER_LOG_PATH=.tmp/wrangler-check.log WRANGLER_LOG_SANITIZE=true npm run --silent cloudflare:check

rehearse-packaged-stage:
	@node tooling/rehearse_packaged_stage.mjs

rehearse-stage-pairing-boundaries:
	@node tooling/rehearse_stage_pairing_boundaries.mjs

rehearse-remote-lifecycle:
	@node tooling/rehearse_remote_lifecycle.mjs

rehearse-remote-game:
	@node tooling/rehearse_remote_game.mjs

test:
	@$(MAKE) check-contracts
	@$(MAKE) test-remote
	@$(MAKE) check-scenario-wasm
	cd apps/server && cargo test --locked
