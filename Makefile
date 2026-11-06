# Atalhos do dia a dia. Cada alvo delega a um script do package.json ou ao docker compose.
# No Windows: winget install ezwinports.make
# Nenhum alvo apaga volume ou banco.

.DEFAULT_GOAL := help

.PHONY: help up setup down logs dev build db-generate db-migrate db-studio lint typecheck test qa qa-mutation

help: ## Lista os alvos disponíveis
	@npm run --silent help

up: ## Sobe o MySQL e o Mailpit e espera ficarem saudáveis
	docker compose up -d --wait

setup: up ## Sobe a stack, cria o .env.local, aplica as migrações e instala o Chromium
	npm run env:init
	npm run db:migrate
	npx playwright install chromium

down: ## Para a stack (mantém os volumes)
	docker compose down

logs: ## Acompanha os logs da stack
	docker compose logs -f

dev: ## Inicia o servidor de desenvolvimento do Next.js
	npm run dev

build: ## Gera o build de produção
	npm run build

db-generate: ## Gera uma migração a partir do schema do Drizzle
	npm run db:generate

db-migrate: ## Aplica as migrações no banco de desenvolvimento
	npm run db:migrate

db-studio: ## Abre o Drizzle Studio
	npm run db:studio

lint: ## Roda o ESLint
	npm run lint

typecheck: ## Roda o TypeScript sem emitir arquivos
	npm run typecheck

test: ## Roda os testes unitários, de integração, de contrato e de acessibilidade
	npm run test:unit
	npm run test:integration
	npm run test:contract
	npm run test:a11y

qa: ## Portão de qualidade completo (tipos, lint, knip, testes e páginas)
	npm run qa

qa-mutation: ## Testes de mutação (Stryker, mínimo de 80%)
	npm run qa:mutation
