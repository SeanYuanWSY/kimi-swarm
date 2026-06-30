#!/bin/bash
set -euo pipefail

# kimi-swarm installer — idempotent, safe to run multiple times
# https://github.com/SeanYuanWSY/kimi-swarm

KIMI_DIR="$HOME/.kimi-code"
AGENTS_DIR="$HOME/.agents/skills"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

echo "=== kimi-swarm installer ==="
echo ""

# Step 0: Check Kimi Code is installed
if [ ! -d "$KIMI_DIR" ]; then
  error "Kimi Code directory not found at $KIMI_DIR"
  error "Please install Kimi Code CLI first: https://github.com/anthropics/kimi-code"
  exit 1
fi

# Step 1: Create skill directory
mkdir -p "$AGENTS_DIR/kimi-swarm"

# Step 2: Copy SKILL.md
if [ -f "$AGENTS_DIR/kimi-swarm/SKILL.md" ]; then
  warn "SKILL.md already exists, overwriting with latest version"
fi
cp "$SCRIPT_DIR/skills/kimi-swarm/SKILL.md" "$AGENTS_DIR/kimi-swarm/SKILL.md"
info "Installed SKILL.md → $AGENTS_DIR/kimi-swarm/SKILL.md"

# Step 3: Create symlink in skills-curated
SYMLINK="$KIMI_DIR/skills-curated/kimi-swarm"
if [ -L "$SYMLINK" ]; then
  warn "Symlink already exists at $SYMLINK, recreating"
  rm "$SYMLINK"
elif [ -e "$SYMLINK" ]; then
  warn "Non-symlink file exists at $SYMLINK, replacing"
  rm -rf "$SYMLINK"
fi
ln -s "$AGENTS_DIR/kimi-swarm" "$SYMLINK"
info "Created symlink → $SYMLINK → $AGENTS_DIR/kimi-swarm"

# Step 4: Create scripts directory if needed
mkdir -p "$KIMI_DIR/scripts"

# Step 5: Copy swarm-hook.js
if [ -f "$KIMI_DIR/scripts/swarm-hook.js" ]; then
  warn "swarm-hook.js already exists, overwriting with latest version"
fi
cp "$SCRIPT_DIR/hooks/swarm-hook.js" "$KIMI_DIR/scripts/swarm-hook.js"
chmod +x "$KIMI_DIR/scripts/swarm-hook.js"
info "Installed hook → $KIMI_DIR/scripts/swarm-hook.js"

# Step 6: Register hook in config.toml (idempotent)
CONFIG="$KIMI_DIR/config.toml"
if [ ! -f "$CONFIG" ]; then
  warn "config.toml not found, creating one"
  touch "$CONFIG"
fi

if grep -q "swarm-hook.js" "$CONFIG" 2>/dev/null; then
  warn "Hook already registered in config.toml, skipping"
else
  # Append the hook block
  echo "" >> "$CONFIG"
  echo "[[hooks]]" >> "$CONFIG"
  echo 'event = "UserPromptSubmit"' >> "$CONFIG"
  echo 'command = "node ~/.kimi-code/scripts/swarm-hook.js"' >> "$CONFIG"
  echo 'timeout = 5' >> "$CONFIG"
  info "Registered hook in config.toml"
fi

echo ""
echo "=== Installation complete! ==="
echo ""
echo "Usage:"
echo "  Start a new Kimi Code session and type:"
echo "    /swarm [your task description]"
echo ""
echo "  Or just describe a task with multiple model roles:"
echo "    前端模型负责UI，后端模型负责API，审查模型负责检查"
echo ""
echo "Uninstall:"
echo "  Run ./uninstall.sh"
echo ""