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
User:  ollama-cloud + managed:kimi-code
```

### Step 3: Select models
```
Agent: 从 ollama-cloud 和 managed:kimi-code 中选择模型：
       (DeepSeek-V4-Pro (ollama-cloud) / GLM-5.2 (ollama-cloud) / MiniMax-M3 (ollama-cloud) / Kimi-K2.7-Code (managed:kimi-code) / ...)
User:  DeepSeek-V4-Pro + GLM-5.2 + MiniMax-M3 + Kimi-K2.7-Code
```

### Step 4: Assign roles + custom instructions
```
Agent: DeepSeek-V4-Pro (ollama-cloud) 担任什么角色？有什么自定义指令？
User:  角色：research。指令：聚焦技术维度，搜索最新论文和模型

Agent: GLM-5.2 (ollama-cloud) 担任什么角色？有什么自定义指令？
User:  角色：research。指令：聚焦临床维度，搜索临床试验和 FDA 批准

Agent: MiniMax-M3 (ollama-cloud) 担任什么角色？有什么自定义指令？
User:  角色：research。指令：聚焦商业维度，搜索市场趋势和融资

Agent: Kimi-K2.7-Code (managed:kimi-code) 担任什么角色？有什么自定义指令？
User:  角色：synthesize。指令：用默认
```

### Step 5: Concurrency limits
```
Agent: 是否需要为某些 provider 设置最大并发数？
User:  不设置，全部并行
```

### Step 6: Build items
```
Items:
  ollama-cloud/deepseek-v4-pro|research|Focus on technical dimension, search latest papers and models|调研AI药物发现的技术维度
  ollama-cloud/glm-5.2|research|Focus on clinical dimension, search trials and FDA approvals|调研AI药物发现的临床维度
  ollama-cloud/minimax-m3|research|Focus on commercial dimension, search market trends and funding|调研AI药物发现的商业维度
  managed:kimi-code/kimi-k2.7-code|synthesize|Use default for this role|综合以上三个维度的调研结果，输出完整报告
```

### Step 7: Run AgentSwarm
```
AgentSwarm(
  description: "ai-drug-discovery-research",
  subagent_type: "coder",
  prompt_template: <SKILL.md template>,
  items: [4 items above]
)
```

Four subagents run in parallel:
- **DeepSeek-V4-Pro** → searches for latest AI drug discovery papers and models
- **GLM-5.2** → searches for clinical trial results and FDA approvals
- **MiniMax-M3** → searches for market trends, funding, and company landscape
- **Kimi-K2.7-Code** → waits for all three to finish, then synthesizes into one report

### Step 8: Synthesize

The parent agent produces a comprehensive report:
- Technical landscape (models, methods, benchmarks)
- Clinical progress (trials, approvals, real-world results)
- Commercial outlook (market size, key players, investment trends)
- Cross-dimensional insights and recommendations