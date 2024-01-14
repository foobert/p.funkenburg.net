#!/bin/bash
set -euo pipefail
./generate.sh
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
docker buildx build . --platform linux/amd64 --push -t "$AWS_ACCOUNT_ID.dkr.ecr.eu-central-1.amazonaws.com/p.funkenburg.net:latest"
