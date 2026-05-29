#!/bin/sh
# Wrapper de planification : lance cohabit watch --due dans le conteneur.
# Adapter COHABIT_IMAGE et le chemin du volume hôte de travail (WORK_DIR).
set -e
COHABIT_IMAGE="${COHABIT_IMAGE:-ghcr.io/rojld/fork-cohabitation:latest}"
WORK_DIR="${WORK_DIR:-/srv/cohabit/work}"
exec docker run --rm \
  -v "$WORK_DIR:/work" \
  -e COHABIT_REGISTRY=/work/repos.json \
  "$COHABIT_IMAGE" watch --due
