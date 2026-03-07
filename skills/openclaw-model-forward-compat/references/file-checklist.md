# File checklist for forward-compat model support

Use this checklist when adding models like GPT-5.4 / GPT-5.5 / future Codex OAuth variants.

## Minimal runtime patch

Patch these first:

1. `src/agents/model-forward-compat.ts`
   - add forward-compat resolver
   - add synthetic Codex fallback if needed
   - keep resolver order correct

2. `src/auto-reply/thinking.ts`
   - add model refs to `XHIGH_MODEL_REFS` if the model should support xhigh

3. `src/agents/live-model-filter.ts`
   - add model ids so filtering does not hide them

4. `src/commands/openai-codex-model-default.ts`
   - update default only if the user wants the new model as default

## Often-missed runtime/config layer

5. `/home/node/.openclaw/openclaw.json`
   - `agents.defaults.model.primary`
   - `agents.defaults.model.fallbacks`
   - `agents.defaults.models`

If `agents.defaults.models` is non-empty, it acts like an allowlist. New models must be added there or `/model ...` will fail with `is not allowed`.

## Full parity patch

Also patch these when list/catalog/auth behavior matters:

6. `src/agents/pi-embedded-runner/model.ts`
7. `src/agents/pi-embedded-runner/extra-params.ts`
8. `src/agents/model-auth.ts`
9. `src/agents/model-catalog.ts`
10. `src/commands/models/list.list-command.ts`
11. `src/commands/models/list.registry.ts`

## Validate after edits

- build the repo
- restart gateway
- test `/model <provider/model>`
- test `/models <provider>`
- test the session with the actual target model
