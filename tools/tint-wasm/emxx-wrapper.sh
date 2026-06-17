#!/usr/bin/env bash
set -euo pipefail

exec em++ "$@" \
  -Wno-c2y-extensions \
  -Wno-error=c2y-extensions \
  -Wno-deprecated-pragma \
  -Wno-error=deprecated-pragma \
  -Wno-lifetime-safety \
  -Wno-lifetime-safety-intra-tu-suggestions \
  -Wno-lifetime-safety-cross-tu-suggestions \
  -Wno-switch-default \
  -Wno-nrvo
