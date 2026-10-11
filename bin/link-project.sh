#!/usr/bin/env bash
# Point a project's auto-memory at gigaforge/memory/<name>, keeping every other
# key in its .claude/settings.local.json.
#   bin/link-project.sh <project-dir> <memory-name>
# Don't use this for client repos: their memory stays local.
set -euo pipefail
G="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
proj="$(cd "$1" && pwd)"; name="$2"
mkdir -p "$G/memory/$name" "$proj/.claude"
python3 - "$proj/.claude/settings.local.json" "$G/memory/$name" <<'EOF'
import json, os, sys
path, mem = sys.argv[1], sys.argv[2]
data = json.load(open(path)) if os.path.exists(path) else {}
data["autoMemoryDirectory"] = mem
json.dump(data, open(path, "w"), indent=2); open(path, "a").write("\n")
print(f"linked {path} -> {mem}")
EOF
