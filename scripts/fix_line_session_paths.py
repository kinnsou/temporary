#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path('/home/kurohime/.openclaw/agents/line-groups/sessions')
SESSIONS_JSON = ROOT / 'sessions.json'

OLD_PREFIX = '/home/node/.openclaw'
NEW_PREFIX = '/home/kurohime/.openclaw'
OLD_MODEL = 'openai-codex/gpt-5.4'
NEW_MODEL = 'openai-codex/gpt-5.3-codex'


def transform(value):
    if isinstance(value, dict):
        return {k: transform(v) for k, v in value.items()}
    if isinstance(value, list):
        return [transform(v) for v in value]
    if isinstance(value, str):
        out = value.replace(OLD_PREFIX, NEW_PREFIX)
        out = out.replace(OLD_MODEL, NEW_MODEL)
        return out
    return value


def count_occurrences(obj, needle):
    if isinstance(obj, dict):
        return sum(count_occurrences(v, needle) for v in obj.values())
    if isinstance(obj, list):
        return sum(count_occurrences(v, needle) for v in obj)
    if isinstance(obj, str):
        return obj.count(needle)
    return 0


def main():
    raw = json.loads(SESSIONS_JSON.read_text(encoding='utf-8'))
    before_old_prefix = count_occurrences(raw, OLD_PREFIX)
    before_old_model = count_occurrences(raw, OLD_MODEL)

    fixed = transform(raw)

    after_old_prefix = count_occurrences(fixed, OLD_PREFIX)
    after_old_model = count_occurrences(fixed, OLD_MODEL)

    backup = SESSIONS_JSON.with_suffix('.json.bak-fix-line-paths')
    backup.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding='utf-8')
    SESSIONS_JSON.write_text(json.dumps(fixed, ensure_ascii=False, indent=2), encoding='utf-8')

    print(f'backup={backup}')
    print(f'old_prefix_before={before_old_prefix} old_prefix_after={after_old_prefix}')
    print(f'old_model_before={before_old_model} old_model_after={after_old_model}')


if __name__ == '__main__':
    main()
