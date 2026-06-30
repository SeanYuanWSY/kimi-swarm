#!/bin/bash
set -euo pipefail

# kimi-swarm uninstaller
# https://github.com/SeanYuanWSY/kimi-swarm

KIMI_DIR="$HOME/.kimi-code"
AGENTS_DIR="$HOME/.agents/skills"
CONFIG="$KIMI_DIR/config.toml"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

echo "=== kimi-swarm uninstaller ==="
echo ""

# Step 1: Remove symlink
SYMLINK="$KIMI_DIR/skills-curated/kimi-swarm"
if [ -L "$SYMLINK" ] || [ -e "$SYMLINK" ]; then
  rm -rf "$SYMLINK"
  info "Removed symlink: $SYMLINK"
else
  warn "Symlink not found: $SYMLINK"
fi

# Step 2: Remove skill directory
SKILL_DIR="$AGENTS_DIR/kimi-swarm"
if [ -d "$SKILL_DIR" ]; then
  rm -rf "$SKILL_DIR"
  info "Removed skill directory: $SKILL_DIR"
else
  warn "Skill directory not found: $SKILL_DIR"
fi

# Step 3: Remove hook script
HOOK="$KIMI_DIR/scripts/swarm-hook.js"
if [ -f "$HOOK" ]; then
  rm "$HOOK"
  info "Removed hook script: $HOOK"
else
  warn "Hook script not found: $HOOK"
fi

# Step 4: Remove hook registration from config.toml
if [ -f "$CONFIG" ]; then
  if grep -q "swarm-hook.js" "$CONFIG" 2>/dev/null; then
    # Use python to safely remove the [[hooks]] block containing swarm-hook.js
    python3 - "$CONFIG" <<'PYEOF'
import sys, re

config_path = sys.argv[1]
with open(config_path, 'r') as f:
    content = f.read()

# Remove [[hooks]] blocks that contain "swarm-hook.js"
# Each block starts with [[hooks]] and ends before the next [[...]] or [section] or EOF
pattern = r'(\[\[hooks\]\]\s*\n(?:(?!\[\[|\[).+\n)*?swarm-hook\.js[^\n]*\n(?:(?!\[\[|\[).+\n)*?)'
content = re.sub(pattern, '', content)

# Clean up any resulting double blank lines
content = re.sub(r'\n{3,}', '\n\n', content)

with open(config_path, 'w') as f:
    f.write(content)
PYEOF
    info "Removed hook registration from config.toml"
  else
    warn "Hook not found in config.toml, skipping"
  fi
else
  warn "config.toml not found, skipping"
fi

echo ""
echo "=== Uninstall complete! ==="
echo ""
echo "kimi-swarm has been fully removed."
echo "Start a new Kimi Code session to confirm."
echo ""