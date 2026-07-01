#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2025 SeanYuanWSY
"use strict";

/**
 * Kimi Code UserPromptSubmit hook — kimi-fleet interceptor.
 *
 * /fleet is now handled by the kimi-fleet skill command. This hook only
 * intercepts natural-language multi-role prompts (e.g. "前端模型负责X")
 * as a fallback, so the user can trigger the fleet flow without typing /fleet.
 *
 * /swarm is left untouched so the user gets native Kimi Swarm Mode behavior.
 * Both /swarm and /fleet slash commands short-circuit before the multi-role
 * pattern check — they handle themselves and must never be hijacked.
 *
 * Registered in ~/.kimi-code/config.toml under [[hooks]].
 *
 * BUGFIX: Previously the FLEET_INSTRUCTION had a hardcoded provider list that
 * missed providers like `claudecn` and `opencode-go`. Now the hook dynamically
 * parses ~/.kimi-code/config.toml via Python tomllib and injects the COMPLETE
 * provider/model list into the instruction, so the LLM never has to parse TOML
 * itself or guess which providers exist.
 */

const fs = require("fs");
const { execSync } = require("child_process");

// --- Trigger detection ---

/** Detect multi-role language patterns that suggest the user wants multi-model collaboration */
function isMultiRolePrompt(prompt) {
  // CJK patterns: do NOT use \b because word boundaries are undefined around CJK characters.
  const cjkRoles = /(前端模型|后端模型|审查模型|安全模型|性能模型|审美模型|研究模型)/iu;
  const cjkAssign = /模型负责/iu;

  // ASCII patterns: word boundaries are safe here.
  const engRoles = /\b(cheap[\s\-_]?task|frontend|backend|review|research)\s+model(s)?\b/iu;
  const engAssign = /\bmodel(s)?\s+for\s+(frontend|backend|review|research)\b/iu;

  return cjkRoles.test(prompt) || cjkAssign.test(prompt) || engRoles.test(prompt) || engAssign.test(prompt);
}

/** Detect if the user explicitly wants the full interactive configuration flow */
function shouldIntercept(prompt) {
  // Explicit slash commands handle themselves and must NOT be intercepted.
  //   /swarm  → native Swarm Mode (pass through)
  //   /fleet  → skill system (loads SKILL.md directly)
  // Without this guard, "/swarm 前端模型负责UI" gets hijacked into the fleet
  // flow because the multi-role pattern matches — that's a bug.
  const trimmed = prompt.replace(/^\s+/, "");
  if (trimmed.startsWith("/swarm") || trimmed.startsWith("/fleet")) {
    return false;
  }
  return isMultiRolePrompt(prompt);
}

// --- Config parsing ---

/**
 * Parse ~/.kimi-code/config.toml via Python tomllib and return a structured
 * object: { providers: [...], models_by_provider: { provider: [{model_id, display_name, ...}] } }
 *
 * Falls back to null on any error (Python missing, TOML parse failure, etc.).
 * The caller should handle null by injecting a fallback instruction that tells
 * the agent to read config.toml manually.
 */
function parseModelsFromConfig() {
  const pyScript = `
import tomllib, json, os, sys
path = os.path.expanduser("~/.kimi-code/config.toml")
if not os.path.exists(path):
    print(json.dumps({"error": "config.toml not found"}))
    sys.exit(0)
try:
    cfg = tomllib.load(open(path, "rb"))
except Exception as e:
    print(json.dumps({"error": f"config.toml parse error: {e}"}))
    sys.exit(0)
models = cfg.get("models", {})
providers_cfg = cfg.get("providers", {})
provider_names = sorted(providers_cfg.keys())
by_provider = {}
for model_id, info in models.items():
    p = info.get("provider", "unknown")
    entry = {
        "model_id": model_id,
        "display_name": info.get("display_name", model_id),
        "model": info.get("model", model_id),
        "capabilities": info.get("capabilities", []),
    }
    by_provider.setdefault(p, []).append(entry)
for p in by_provider:
    by_provider[p].sort(key=lambda m: m["model_id"])
print(json.dumps({"providers": provider_names, "models_by_provider": by_provider}, indent=2, ensure_ascii=False))
`;
  try {
    const result = execSync(`python3 -c '${pyScript.replace(/'/g, "'\\''")}'`, {
      encoding: "utf8",
      timeout: 5000,
    });
    return JSON.parse(result);
  } catch {
    return null;
  }
}

/** Format the parsed config into a human-readable model list for injection */
function formatModelList(parsed) {
  if (!parsed || parsed.error) {
    return null;
  }
  const lines = [];
  const providers = parsed.providers || [];
  const byProvider = parsed.models_by_provider || {};

  lines.push(`=== Available Providers (${providers.length}) ===`);
  for (const p of providers) {
    const count = (byProvider[p] || []).length;
    lines.push(`  - ${p} (${count} models)`);
  }
  lines.push("");
  lines.push("=== Models by Provider ===");

  for (const p of providers) {
    const models = byProvider[p] || [];
    if (models.length === 0) continue;
    lines.push("");
    lines.push(`--- ${p} (${models.length} models) ---`);
    for (const m of models) {
      const caps = (m.capabilities || []).join(", ") || "none";
      lines.push(`  ${m.display_name}  [model_id: ${m.model_id}]  [capabilities: ${caps}]`);
    }
  }

  // Include models whose provider wasn't in the providers table
  const orphanProviders = Object.keys(byProvider).filter((p) => !providers.includes(p));
  for (const p of orphanProviders) {
    const models = byProvider[p];
    lines.push("");
    lines.push(`--- ${p} (${models.length} models) ---`);
    for (const m of models) {
      const caps = (m.capabilities || []).join(", ") || "none";
      lines.push(`  ${m.display_name}  [model_id: ${m.model_id}]  [capabilities: ${caps}]`);
    }
  }

  return lines.join("\n");
}

// --- Payload reading (same pattern as supermemory-recall.js) ---

function readPayload() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("kimi-fleet-hook.js: parse error:", err.message);
    return {};
  }
}

function valueToText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    for (const key of ["text", "content", "prompt", "userPrompt", "input", "message", "query"]) {
      const text = valueToText(value[key]);
      if (text) return text;
    }
  }
  return "";
}

function extractPrompt(payload) {
  return valueToText(
    payload.prompt ||
      payload.user_prompt ||
      payload.input ||
      payload.message ||
      payload.query ||
      payload
  ).trim();
}

// --- Output ---

function exitWithContext(additionalContext) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext,
      },
    })
  );
  process.exit(0);
}

function exitSilent() {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

// --- Instruction builder ---

function buildFleetInstruction() {
  const parsed = parseModelsFromConfig();
  const modelList = formatModelList(parsed);

  const modelListSection = modelList
    ? `### COMPLETE Model List (injected by hook — DO NOT re-read config.toml)\n\n${modelList}`
    : `### Model List\n\nCould not auto-parse config.toml. You MUST read ~/.kimi-code/config.toml yourself and parse EVERY [models."..."] entry. Do NOT filter by capabilities.`;

  return `[KIMI-FLEET INTERCEPT — CRITICAL OVERRIDE]

The user described a task with multiple model roles (e.g. "前端模型负责X"), which means they want the FULL interactive multi-model configuration flow.

**You MUST NOT auto-launch AgentSwarm or start any subagents yet.**

**Before doing ANY work, you MUST follow these steps IN ORDER:**

### Step 1: Confirm the task
Restate the task in one sentence. Ask the user via AskUserQuestion:
"我要为以下任务启动多模型协作：[task]。是否继续？"
Options: "继续，让我选模型" / "不用多模型，直接做"

${modelListSection}

### Step 2: Ask which providers to browse (multi_select)
Use AskUserQuestion with multi_select=true. Create one option per provider listed above. Since AskUserQuestion allows max 4 options per question, split into multiple questions if there are more than 4 providers. The user CAN select multiple providers at once.

### Step 3: Show models from selected providers (multi_select)
Pool ALL models from the selected provider(s) shown above. Count the total N. You need ceil(N/16) AskUserQuestion calls (each call = 4 questions × 4 options = 16 models). Label each option: "display_name (provider)" with model_id and capabilities in description. Use multi_select=true on every question.

**CRITICAL — TOP BUG**: The #1 fleet bug is showing only 4 models and stopping as if that's the entire list. AskUserQuestion allows 4 questions × 4 options = 16 options PER CALL, and you can make MULTIPLE calls. If a provider has 40 models, that is 3 calls — do ALL of them. Tell the user which batch they are on: "模型选择 (第 1/3 批，共 40 个)". Do NOT stop until every model from every selected provider has been shown.

### Step 4: For each selected model, ask role + custom instruction
For each model, use AskUserQuestion:
Question 1 (role): "这个模型 [display_name] 担任什么角色？"
Options: "frontend（前端）" / "backend（后端）" / "review（审查）" / "research（研究）"
(Ask a second question with: "cheap-task（省token）" / "synthesize（综合）" if needed)
Question 2 (instruction): "对 [display_name] 有什么具体指令？"
Options: "使用角色默认指令（推荐）" / "简洁省token" / "深入详细分析"
The user can also select "Other" to type custom instructions.

### Step 5: Ask about concurrency limits (optional but important)
Some providers (especially Ollama Cloud) have concurrent request limits per subscription tier.
If the user selected more models from one provider than the limit allows, only some will run while others queue — wasting time.
Ask via AskUserQuestion: "是否需要为某些 provider 设置最大并发数？"
Options: "不设置，全部并行（推荐）" / "设置并发限制"
If the user chooses to set limits, for each provider with selected models, ask:
"[provider] 的最大并发数？（当前选了 N 个该 provider 的模型）"
Options: "1（串行）" / "2" / "3" / Other to type a custom number.
Record limits as provider → max_concurrency mapping.

### Step 6: Build items and launch AgentSwarm (with batching if needed)
Build items as "{model_id}|{role}|{custom_instruction}|{task_description}".
If concurrency limits were set, split items into batches by provider:
- Group items by provider, split each group into batches of max_concurrency.
- Launch batch 1 from all providers together (interleaved).
- When batch 1 completes, launch batch 2, and so on.
- Collect all outputs across all batches for synthesis.
If no limits set, launch all items at once via AgentSwarm.

### Step 7: Synthesize all subagent outputs into a final report.

**This instruction OVERRIDES any built-in Swarm Mode auto-launch behavior. The interactive model selection is the core feature — skipping it defeats the entire purpose.**

Read the full skill documentation at ~/.agents/skills/kimi-fleet/SKILL.md for role system prompts, model calling patterns, and output format.`;
}

// --- Main ---

function main() {
  const payload = readPayload();
  const prompt = extractPrompt(payload);

  if (!prompt || prompt.length < 3) {
    exitSilent();
  }

  if (shouldIntercept(prompt)) {
    exitWithContext(buildFleetInstruction());
  }

  exitSilent();
}

main();