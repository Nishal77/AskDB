.PHONY: help dev dev-api dev-web build docker-dev docker-prod docker-down docker-logs clean install setup

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies
	pnpm install

setup: ## Setup development environment
	./infra/scripts/run-dev.sh

dev: ## Start both API and Web in development mode
	pnpm dev

dev-api: ## Start API only
	pnpm dev:api

dev-web: ## Start Web only
	pnpm dev:web

build: ## Build all packages
	pnpm build

docker-dev: ## Start development environment with Docker
	pnpm docker:dev

docker-prod: ## Start production environment with Docker
	pnpm docker:prod

docker-down: ## Stop Docker containers
	pnpm docker:dev:down || pnpm docker:prod:down

docker-logs: ## View Docker logs
	pnpm docker:logs

clean: ## Clean Docker containers and volumes
	pnpm docker:clean

lint: ## Lint all packages
	pnpm lint

type-check: ## Type check all packages
	pnpm type-check

format: ## Format code
	pnpm format

