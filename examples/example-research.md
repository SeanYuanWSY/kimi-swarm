# Example: Multi-dimensional Research

## Task

```markdown
/fleet 调研：AI在药物发现领域的最新进展，需要从技术、临床、商业三个维度分析
```

> **Dual-mode note:** This example uses `/fleet` for explicit model selection and role assignment. For a zero-config native swarm, use `/swarm` instead — the agent will auto-split the task without asking you to pick models.

## Interactive Flow

### Step 1: Confirm
```
Agent: 我要为以下任务启动多模型协作：调研AI药物发现最新进展。是否继续？
User:  继续，让我选模型
```

### Step 2: Select providers
```
Agent: 选择要浏览的 provider（可多选）：
User:  ollama-cloud + kimi-code
```

### Step 3: Select models
```
User:  ollama-cloud/deepseek-v4-pro + ollama-cloud/glm-5.2 + ollama-cloud/minimax-m3 + kimi-code/kimi-for-coding
```

### Step 4: Assign roles
```
deepseek-v4-pro → research（技术维度）
glm-5.2 → research（临床维度）
minimax-m3 → research（商业维度）
kimi-for-coding → synthesize（综合）
```

### Step 5: Fleet launched

Four subagents run in parallel:
- **deepseek-v4-pro** → searches for latest AI drug discovery papers and models
- **glm-5.2** → searches for clinical trial results and FDA approvals
- **minimax-m3** → searches for market trends, funding, and company landscape
- **kimi-for-coding** → waits for all three to finish, then synthesizes into one report

### Step 6: Synthesized output

The parent agent produces a comprehensive report:
- Technical landscape (models, methods, benchmarks)
- Clinical progress (trials, approvals, real-world results)
- Commercial outlook (market size, key players, investment trends)
- Cross-dimensional insights and recommendations