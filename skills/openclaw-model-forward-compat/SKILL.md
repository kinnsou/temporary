---
name: openclaw-model-forward-compat
description: Patch local OpenClaw source to support new forward-compat or synthetic models such as GPT-5.4, GPT-5.5, Codex OAuth variants, or future provider bumps. Use when a model compiles but `/model` still says "not allowed", when new models must be added to runtime/thinking/catalog/config allowlists, or when gateway restart and verification are needed after source edits.
---

# OpenClaw Model Forward Compat

Use this skill when OpenClaw needs to learn a new model before upstream support is fully present.

## Core workflow

1. Inspect current source and config before editing.
2. Decide whether the user needs:
   - **minimal runtime patch**: enough to run the model
   - **full parity patch**: runtime + catalog + list + auth + extra params
3. Patch source files.
4. Build.
5. Update config allowlists/defaults if needed.
6. Restart gateway.
7. Verify `/model` and model listing behavior.

## What to read

Read `references/file-checklist.md` before patching.

Read `references/troubleshooting.md` when:
- `/model <provider/model>` says `is not allowed`
- build succeeds but runtime still behaves like old code
- model exists in code but not in `/models`
- gateway restart did not seem to apply the patch

## High-value lesson from the GPT-5.4 fix

A source patch alone is often **not enough**.

The GPT-5.4 incident required these layers:
- runtime resolver patch
- thinking/xhigh patch
- live-model-filter patch
- default model patch
- build
- gateway restart
- **config allowlist update in `openclaw.json`**

The last item was the real blocker after build. `/model openai-codex/gpt-5.4` kept failing because `agents.defaults.models` only allowlisted `openai-codex/gpt-5.3-codex` and `anthropic/claude-sonnet-4-6`.

## Output style

When reporting status, separate:
1. what was patched
2. what was rebuilt/restarted
3. what still blocks usage
4. what the user should test next

Keep the diagnosis concrete. Prefer naming exact files and blockers over general guesses.
