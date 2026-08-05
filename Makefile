.PHONY: setup run-server run-host build-stage test

setup:
	@echo "Checking dependencies..."
	@which cargo > /dev/null || (echo "Rust/Cargo not found. Please install from https://rustup.rs/" && exit 1)
	@echo "Dependencies OK."

run-server:
	cd server && cargo run -p gp_server

run-host:
	@echo "Serving Host Console at http://localhost:8080"
	@python3 -m http.server 8080 -d clients/host

build-stage:
	@echo "Packaging LG webOS Stage app (mocking for MVP)..."
	@cd clients/stage && echo "App packaged."

test:
	cd server && cargo test

