.PHONY: help install test clean

# Self-documenting Makefile: `make help` lists all targets
help:  ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

install:  ## Install dev dependencies
	npm ci

test:  ## Run tests (Vitest)
	npm test

clean:  ## Remove node_modules, dist, and coverage
	rm -rf node_modules dist coverage
