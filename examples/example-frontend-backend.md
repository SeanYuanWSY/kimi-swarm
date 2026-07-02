# Example: Frontend + Backend + Review

## Task

```markdown
/fleet 设计一个登录页面，前端模型负责UI组件和样式，后端模型负责API和数据库设计，审查模型负责检查安全和性能问题
```

> **Dual-mode note:** This example uses `/fleet` for explicit model selection and role assignment. For a zero-config native swarm, use `/swarm` instead — the agent will auto-split the task without asking you to pick models.

## Interactive Flow

### Step 1: Confirm
```
Agent: 我要为以下任务启动多模型协作：设计一个登录页面。是否继续？
User:  继续，让我选模型
```

### Step 2: Select providers
```
Agent: 选择要浏览的 provider（可多选）：
User:  ollama-cloud + deepseek
```

### Step 3: Select models
```
Agent: 从 ollama-cloud 和 deepseek 中选择模型：
       (GLM-5.2 (ollama-cloud) / DeepSeek-V4-Pro (deepseek) / MiniMax-M3 (ollama-cloud) / ...)
User:  GLM-5.2 + DeepSeek-V4-Pro + MiniMax-M3
```

### Step 4: Assign roles + custom instructions
```
Agent: GLM-5.2 (ollama-cloud) 担任什么角色？有什么自定义指令？
User:  角色：frontend。指令：专注组件结构和 Tailwind 样式

Agent: DeepSeek-V4-Pro (deepseek) 担任什么角色？有什么自定义指令？
User:  角色：backend。指令：用默认

Agent: MiniMax-M3 (ollama-cloud) 担任什么角色？有什么自定义指令？
User:  角色：review。指令：重点检查 JWT 安全和性能瓶颈
```

### Step 5: Concurrency limits
```
Agent: 是否需要为某些 provider 设置最大并发数？
       (Ollama Cloud 订阅可能限制并发数)
User:  ollama-cloud 设为 2，deepseek 不限制
```

### Step 6: Build items
```
Items:
  ollama-cloud/glm-5.2|frontend|Focus on component structure and Tailwind styling|设计一个登录页面的前端
  deepseek/deepseek-v4-pro|backend|Use default for this role|设计一个登录页面的后端 API 和数据库
  ollama-cloud/minimax-m3|review|Focus on JWT security and performance bottlenecks|审查登录页面设计的安全和性能
```

### Step 7: Run AgentSwarm
```
AgentSwarm(
  description: "login-page-design",
  subagent_type: "coder",
  prompt_template: <SKILL.md template>,
  items: [3 items above],
  concurrency: {ollama-cloud: 2}
)
```

Three subagents run (batched: 2 ollama-cloud + 1 deepseek in wave 1):
- **GLM-5.2** (frontend) → outputs HTML/CSS for the login page
- **DeepSeek-V4-Pro** (backend) → outputs API endpoints + DB schema
- **MiniMax-M3** (review) → reviews both outputs for security and performance

### Step 8: Synthesize

The parent agent combines all three into a final design document with:
- Frontend code
- Backend API spec
- Security review notes
- Performance recommendations