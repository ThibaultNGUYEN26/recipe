all: build deploy

build:
	npm run build

deploy:
	npm run deploy

.PHONY: all build deploy
