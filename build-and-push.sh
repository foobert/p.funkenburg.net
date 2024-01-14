#!/bin/bash
set -euo pipefail
./generate.sh
rsync -av --delete output/ copper:/var/container/p.funkenburg.net/output/
