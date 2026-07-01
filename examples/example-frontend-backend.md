# Example: Frontend + Backend + Review

## Task

```markdown
/fleet 设计一个登录页面，前端模型负责UI组件和样式，后端模型负责API和数据库设计，审查模型负责检查安全和性能问题
```

> **Dual-mode note:** Use `/fleet` when you want to pick specific models and assign roles interactively. Use `/swarm` if you just want the agent to auto-split the task without model selection.

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
User:  ollama-cloud/glm-5.2 + deepseek/deepseek-v4-pro + ollama-cloud/minimax-m3
```

### Step 4: Assign roles
```
Agent: glm-5.2 担任什么角色？
User:  frontend（前端）

Agent: deepseek-v4-pro 担任什么角色？
User:  backend（后端）

Agent: minimax-m3 担任什么角色？
User:  review（审查）
```

### Step 5: Fleet launched

Three subagents run in parallel:
- **glm-5.2** (frontend) → outputs HTML/CSS for the login page
- **deepseek-v4-pro** (backend) → outputs API endpoints + DB schema
- **minimax-m3** (review) → reviews both outputs for security and performance

### Step 6: Synthesized output

The parent agent combines all three into a final design document with:
- Frontend code
- Backend API spec
- Security review notes
- Performance recommendations