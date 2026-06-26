#!/bin/bash
# Publish updated pages: workspace → clean pages_publish repo → push to temporary.
# Leak-safe by design: ALLOWLIST (only page artifacts copied) + SECRET GATE (abort if any secret slips in).
# Even if the workspace contains .env/keys/agent files, they are NEVER copied or pushed.
set -u
SRC=/home/kurohime/.openclaw/workspace
DST=/home/kurohime/pages_publish
cd "$DST" || { echo "publish: cannot cd $DST" >&2; exit 1; }

# 1) ALLOWLIST sync — only page files/dirs, nothing else
cp -f "$SRC"/index.html "$DST"/ 2>/dev/null
cp -f "$SRC"/lesson*.html "$DST"/ 2>/dev/null
cp -f "$SRC"/jp-n3-* "$SRC"/jp-n4-* "$DST"/ 2>/dev/null
cp -f "$SRC"/vocab-review.html "$SRC"/vocab-data.json "$SRC"/vocab-difficulty.json "$SRC"/daughter-vocab.md "$DST"/ 2>/dev/null
cp -f "$SRC"/manifest.json "$SRC"/icon-192.png "$SRC"/icon-512.png "$DST"/ 2>/dev/null
mkdir -p "$DST/market-briefs"; cp -f "$SRC"/market-briefs/*.html "$DST/market-briefs/" 2>/dev/null
[ -d "$SRC/market-briefs/data" ] && cp -rf "$SRC/market-briefs/data" "$DST/market-briefs/" 2>/dev/null
for d in Claw_ENG Claw_JP_N4 JLPT NEWS assets data docs; do [ -d "$SRC/$d" ] && cp -rf "$SRC/$d" "$DST"/; done

# 2) Defense: strip any code/secret that could have slipped into copied dirs
find "$DST/" -path "$DST/.git" -prune -o -type f \( -name '*.py' -o -name '*.env' -o -name '.env' \
  -o -name '*.key' -o -name '*.pem' -o -name 'openclaw.json' -o -name '*.pid' -o -name '*.log' -o -name '*.bak' \) -delete 2>/dev/null
find "$DST/" -path "$DST/.git" -prune -o -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null

# 3) SECRET GATE — abort the whole publish if anything sensitive is present
if find "$DST" -path "$DST/.git" -prune -o -type f \( -name '*.env' -o -name 'openclaw.json' -o -name 'SOUL.md' \
     -o -name 'USER.md' -o -name 'MEMORY.md' -o -name '*.key' -o -name '*.pem' \) -print 2>/dev/null | grep -q . \
   || grep -rIlE 'gsk_[A-Za-z0-9]{20}|BINANCE_(API|SECRET)_KEY=|[0-9]{8,12}:[A-Za-z0-9_-]{30,}|-----BEGIN [A-Z]+ PRIVATE KEY' \
        "$DST" --exclude-dir=.git 2>/dev/null | grep -q .; then
  echo "publish ABORTED: secret/sensitive file detected — NOT pushing" >&2
  exit 2
fi

# 4) Commit + push (only if there are changes); key configured via core.sshCommand
git add -A
if git diff --cached --quiet; then echo "publish: no page changes"; exit 0; fi
git commit -q -m "pages update $(date '+%F %H:%M')"
git push origin main && echo "publish: ok ($(git rev-parse --short HEAD))"
