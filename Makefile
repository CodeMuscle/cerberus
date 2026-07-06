.PHONY: install lint fmt test run web build-web precommit

PY := .venv/bin/python
RUFF := .venv/bin/ruff

install:            ## backend + frontend deps
	uv venv
	uv pip install -e ".[dev]"
	cd web && npm install

lint:               ## ruff (backend) + eslint (frontend)
	$(RUFF) check cerberus tests
	$(RUFF) format --check cerberus tests
	cd web && npm run lint

fmt:                ## ruff format (backend) — frontend uses eslint/next
	$(RUFF) check --fix cerberus tests
	$(RUFF) format cerberus tests

test:               ## pytest with coverage
	$(PY) -m pytest

run:                ## backend API on :8030
	.venv/bin/uvicorn cerberus.api:app --reload --port 8030

web:                ## frontend dev server on :3000
	cd web && npm run dev

build-web:          ## production build of the frontend
	cd web && npm run build

precommit:          ## run all pre-commit hooks
	.venv/bin/pre-commit run --all-files
