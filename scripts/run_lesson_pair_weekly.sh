#!/usr/bin/env bash
set -euo pipefail

cd /home/kurohime/.openclaw/workspace

python3 scripts/lesson_page_sequence.py build

mapfile -t LESSON_FILES < <(python3 - <<'PY'
import json
from pathlib import Path
state = json.loads(Path('memory/lesson-page-sequence.json').read_text(encoding='utf-8'))
last = state.get('lastBuilt') or {}
for key in ('wednesday', 'sunday'):
    item = last.get(key) or {}
    file = item.get('file')
    if file:
        print(file)
PY
)

if [ "${#LESSON_FILES[@]}" -eq 0 ]; then
  echo "No lesson files found in state." >&2
  exit 1
fi

git add \
  "${LESSON_FILES[@]}" \
  memory/lesson-page-sequence.json \
  scripts/lesson_page_sequence.py \
  scripts/run_lesson_pair_weekly.sh \
  skills/lesson-page-builder/SKILL.md \
  skills/lesson-page-builder/references/lesson-page-workflow.md \
  prompts/lesson-page-workflow.md

if git diff --cached --quiet; then
  echo "NO_CHANGES_TO_COMMIT"
  exit 0
fi

WEEK_TAG=$(python3 - <<'PY'
import json
from pathlib import Path
state = json.loads(Path('memory/lesson-page-sequence.json').read_text(encoding='utf-8'))
print((state.get('lastBuilt') or {}).get('weekTag', 'unknown-week'))
PY
)

git commit -m "lesson pages: update ${WEEK_TAG} pair"
git push origin master
