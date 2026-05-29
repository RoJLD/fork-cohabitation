FROM node:22-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY bin/ ./bin/
COPY src/ ./src/
COPY deploy/entrypoint.sh ./deploy/entrypoint.sh
RUN chmod +x ./deploy/entrypoint.sh
# Registre + repos suivis vivent sur un volume inscriptible monté en /work.
ENV COHABIT_REGISTRY=/work/repos.json
ENTRYPOINT ["/app/deploy/entrypoint.sh"]
CMD ["watch", "--due"]
