# Kimi Agent SDK Setup

This project now has the Kimi Agent SDK installed for programmatic AI assistance.

## Installation

```bash
pip install kimi-agent-sdk
```

## Configuration

Choose one of these methods:

### 1. Environment Variables (Recommended)

```bash
export KIMI_API_KEY=your-api-key
export KIMI_BASE_URL=https://api.moonshot.ai/v1
export KIMI_MODEL_NAME=kimi-k2-thinking-turbo
```

### 2. Config File

Create `config.toml` in your project root:

```toml
[providers.kimi]
type = "kimi"
base_url = "https://api.moonshot.ai/v1"
api_key = "your-api-key"

[models.kimi-k2-thinking-turbo]
provider = "kimi"
model = "kimi-k2-thinking-turbo"

default_model = "kimi-k2-thinking-turbo"
```

## Usage Examples

### Simple Prompt

```python
import asyncio
from kimi_agent_sdk import prompt

async def main():
    async for msg in prompt("Write a hello world program", yolo=True):
        print(msg.extract_text(), end="", flush=True)

asyncio.run(main())
```

### Session-based (Multi-turn)

```python
import asyncio
from kimi_agent_sdk import Session, ApprovalRequest, TextPart
from kaos.path import KaosPath

async def main():
    async with await Session.create(work_dir=KaosPath.cwd()) as session:
        async for msg in session.prompt("List files in current directory"):
            match msg:
                case TextPart(text=text):
                    print(text, end="")
                case ApprovalRequest() as req:
                    req.resolve("approve")  # Manual approval

asyncio.run(main())
```

## Pre-built Agent Tools

Located in `scripts/agent_tools.py`:

```bash
# Code review
python scripts/agent_tools.py review src/services/grokService.ts

# Refactoring suggestions
python scripts/agent_tools.py refactor src/lib/kiaraTools.ts

# Generate documentation
python scripts/agent_tools.py docs src/services/

# Generate tests
python scripts/agent_tools.py test src/lib/knowledgeBase/retrieval.ts

# Auto-approve all tool calls (use with caution)
python scripts/agent_tools.py review src/App.tsx --yolo
```

## Available Agents

| Agent | Purpose | Example |
|-------|---------|---------|
| `review` | Code review & quality analysis | `python scripts/agent_tools.py review src/services/chatService.ts` |
| `refactor` | Code refactoring & simplification | `python scripts/agent_tools.py refactor src/components/ChatArea.tsx` |
| `docs` | Documentation generation | `python scripts/agent_tools.py docs src/lib/knowledgeBase/` |
| `test` | Test generation | `python scripts/agent_tools.py test src/lib/kiaraToolExecutor.ts` |

## API Differences: `prompt()` vs `Session`

| Feature | `prompt()` | `Session` |
|---------|-----------|-----------|
| Use case | One-shot queries | Multi-turn conversations |
| State | Temporary | Persistent across prompts |
| Approval | Via `yolo=True` or callback | Manual control over approvals |
| Resume | No | Yes, with `Session.resume()` |
| Complexity | Simple | More control |

## Safety Notes

- `yolo=True` auto-approves ALL tool executions (file writes, shell commands)
- Use `yolo=False` (default) and manual approval for sensitive operations
- Agents can read files but be careful with write operations

## More Info

- [Kimi Agent SDK Docs](https://github.com/MoonshotAI/kimi-cli)
- Configuration follows Kimi CLI conventions
