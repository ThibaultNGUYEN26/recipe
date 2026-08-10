all: build deploy

install:
	npm install
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
	docker run -d \
		--name recipe-postgres \
		-e POSTGRES_USER=I769706 \
		-e POSTGRES_DB=recipes \
		-e POSTGRES_HOST_AUTH_METHOD=trust \
		-p 5432:5432 \
		postgres:16

# --------------------------------------------------
# Dev servers
# --------------------------------------------------

db:
	docker start recipe-postgres
	cd backend && npx prisma migrate deploy && cd ..

backend:
	cd backend && npm run dev

frontend:
	npm run dev

prisma:
	cd backend && npx prisma studio

# --------------------------------------------------

.PHONY: all install build deploy \
        db-install \
        db backend frontend prisma
