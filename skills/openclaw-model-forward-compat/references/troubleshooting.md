# Troubleshooting notes

## Symptom: `/model ...` says `Model "..." is not allowed`

This usually means config allowlist, not source code.

Check `/home/node/.openclaw/openclaw.json`:
- `agents.defaults.models`
- `agents.defaults.model.primary`
- `agents.defaults.model.fallbacks`

If `agents.defaults.models` is non-empty, add the new model there.

## Symptom: source patch exists but runtime still behaves old

Likely causes:
- build did not produce the active bundle
- gateway still runs old bundle
- gateway was not restarted

Fix sequence:
1. confirm the patch text exists in built `dist` bundles
2. restart gateway safely
3. retest `/model`

## Symptom: build passes but `/models` does not show the model

This usually points to catalog/list parity gaps, not runtime resolver gaps.

Check:
- `src/agents/model-catalog.ts`
- `src/commands/models/list.list-command.ts`
- `src/commands/models/list.registry.ts`

## GPT-5.4 case memory

What Codex xhigh effectively did in the successful repair:

1. patch runtime forward-compat files
2. build successfully
3. notice `/model openai-codex/gpt-5.4` still failed
4. search for the exact error string
5. trace it to model-selection allowlist logic
6. inspect `openclaw.json`
7. discover `agents.defaults.models` only allowed old models
8. add `openai-codex/gpt-5.4` to allowlist and set it as primary
9. keep safe fallbacks
10. restart gateway
11. retest until user confirmed success

That is the important reusable pattern: **follow the error message into the selection path, not just the model resolver path**.
