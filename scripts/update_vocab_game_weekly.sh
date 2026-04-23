#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/kurohime/.openclaw/workspace"
cd "$ROOT"

python3 scripts/build_vocab_data.py

# Only commit the generated data file (keep the repo's other local edits untouched)
if git diff --quiet -- vocab-data.json; then
  echo "No changes in vocab-data.json"
  exit 0
fi

git add vocab-data.json

git commit -m "Update vocab-data.json (auto update)" || {
  echo "Nothing to commit"
  exit 0
}

git push origin master
