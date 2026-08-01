all: build deploy

install:
	npm ci
	npm --prefix backend ci

build:
	npm run build

deploy:
	npm run deploy

# --------------------------------------------------
# Database (local dev with Homebrew PostgreSQL)
# --------------------------------------------------

db-install:
	brew install postgresql@16
	echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$$PATH"' >> ~/.zshrc
	@echo "✅ Done. Open a new terminal to pick up the updated PATH, then run: make db-setup"

db-start:
	brew services start postgresql@16

db-stop:
	brew services stop postgresql@16

db-create:
	createdb recipes || echo "Database already exists"

db-setup: db-start db-create
	cd backend && npm install
	cd backend && npx prisma migrate deploy
	cd backend && node prisma/seedCategories.js
	cd backend && node prisma/importRecipes.js

db-reset:
	dropdb --if-exists recipes
	createdb recipes
	cd backend && npx prisma migrate deploy
	cd backend && node prisma/seedCategories.js
	cd backend && node prisma/importRecipes.js

# --------------------------------------------------
# Dev servers
# --------------------------------------------------

dev-backend:
	cd backend && npm run dev

dev-frontend:
	npm run dev

# --------------------------------------------------

.PHONY: all install build deploy \
        db-install db-start db-stop db-create db-setup db-reset \
        dev-backend dev-frontend
