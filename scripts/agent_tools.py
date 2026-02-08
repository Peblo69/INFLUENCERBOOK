"""
Agent Tools for GOONERPROJECT
==============================

Pre-configured agents for common development tasks.

Usage:
    python scripts/agent_tools.py review src/services/grokService.ts
    python scripts/agent_tools.py refactor src/lib/kiaraTools.ts
    python scripts/agent_tools.py docs src/services/
"""

import asyncio
import sys
import argparse
import os
from pathlib import Path
from kimi_agent_sdk import Config, Session, prompt
from kaos.path import KaosPath

# Load API key from config file
CONFIG_PATH = Path(__file__).parent.parent / "kimi_config.toml"
if CONFIG_PATH.exists():
    import tomllib
    with open(CONFIG_PATH, "rb") as f:
        _config_data = tomllib.load(f)
    _kimi_provider = _config_data.get("providers", {}).get("kimi", {})
    os.environ["KIMI_API_KEY"] = _kimi_provider.get("api_key", "")
    os.environ["KIMI_BASE_URL"] = _kimi_provider.get("base_url", "https://api.moonshot.ai/v1")
    os.environ["KIMI_MODEL_NAME"] = _config_data.get("default_model", "kimi-k2-thinking-turbo")

# Agent configurations for different tasks
AGENTS = {
    "review": {
        "name": "Code Reviewer",
        "system_prompt": """You are a senior TypeScript/React code reviewer. Focus on:
- Type safety and proper use of TypeScript features
- React best practices (hooks, memoization, performance)
- Error handling and edge cases
- Code clarity and maintainability
- Security concerns

Provide specific, actionable feedback with code examples.""",
    },
    "refactor": {
        "name": "Refactoring Expert", 
        "system_prompt": """You are a refactoring specialist. Your job is to:
- Simplify complex code while preserving behavior
- Extract reusable functions and components
- Improve naming and code organization
- Apply modern TypeScript/React patterns
- Reduce duplication

Provide the refactored code with explanations of changes.""",
    },
    "docs": {
        "name": "Documentation Writer",
        "system_prompt": """You are a technical documentation expert. Create:
- Clear JSDoc/TSDoc comments for functions and types
- Usage examples
- Architecture overviews
- README sections

Focus on clarity and completeness.""",
    },
    "test": {
        "name": "Test Engineer",
        "system_prompt": """You are a testing expert. Generate:
- Unit tests with Jest/Vitest
- React component tests with React Testing Library
- Edge case coverage
- Mock setups for external dependencies

Focus on test quality and maintainability.""",
    },
}


def create_config(system_prompt: str) -> Config:
    """Create config - API key loaded from env (set from kimi_config.toml)."""
    model_name = os.environ.get("KIMI_MODEL_NAME", "kimi-k2-thinking-turbo")
    return Config(
        default_model=model_name,
        providers={
            "kimi": {
                "type": "kimi",
                "base_url": os.environ.get("KIMI_BASE_URL", "https://api.moonshot.ai/v1"),
                "api_key": os.environ.get("KIMI_API_KEY", ""),
            }
        },
        models={
            model_name: {
                "provider": "kimi",
                "model": model_name,
                "max_context_size": 131072,
            }
        },
        system_prompt=system_prompt,
    )


async def run_review_agent(target_path: str, yolo: bool = True):
    """Run code review agent on a file or directory."""
    path = Path(target_path)
    
    if not path.exists():
        print(f"Error: Path not found: {target_path}")
        return
    
    if path.is_file():
        content = path.read_text(encoding="utf-8")
        prompt_text = f"""Review this TypeScript/React code file: {path.name}

```typescript
{content}
```

Provide a detailed code review covering:
1. Type safety issues
2. React anti-patterns
3. Performance concerns
4. Error handling gaps
5. Security considerations
6. Specific improvement suggestions with code examples"""
    else:
        # Directory - list structure
        files = list(path.rglob("*.ts")) + list(path.rglob("*.tsx"))
        file_list = "\n".join([f"- {f.relative_to(path)}" for f in files[:20]])
        prompt_text = f"""Review the architecture of this directory: {path.name}

Files:
{file_list}

Provide:
1. Architecture assessment
2. Code organization suggestions
3. Potential refactoring opportunities
4. Pattern consistency issues"""
    
    config = create_config(AGENTS["review"]["system_prompt"])
    
    print(f"\n{'='*60}")
    print(f"Running {AGENTS['review']['name']} on: {target_path}")
    print(f"YOLO mode: {yolo}")
    print(f"{'='*60}\n")
    
    async for msg in prompt(prompt_text, config=config, yolo=yolo):
        text = msg.extract_text()
        if text:
            print(text, end="", flush=True)
    print("\n")


async def run_refactor_agent(target_path: str, yolo: bool = True):
    """Run refactoring agent on a file."""
    path = Path(target_path)
    
    if not path.is_file():
        print("Error: Refactor agent requires a file path")
        return
    
    content = path.read_text(encoding="utf-8")
    
    prompt_text = f"""Refactor this TypeScript/React code: {path.name}

```typescript
{content}
```

Provide:
1. Refactored code with improvements
2. List of changes made and why
3. Any potential breaking changes to watch for"""
    
    config = create_config(AGENTS["refactor"]["system_prompt"])
    
    print(f"\n{'='*60}")
    print(f"Running {AGENTS['refactor']['name']} on: {target_path}")
    print(f"{'='*60}\n")
    
    async for msg in prompt(prompt_text, config=config, yolo=yolo):
        text = msg.extract_text()
        if text:
            print(text, end="", flush=True)
    print("\n")


async def run_docs_agent(target_path: str, yolo: bool = True):
    """Run documentation agent on a file or directory."""
    path = Path(target_path)
    
    if path.is_file():
        content = path.read_text(encoding="utf-8")
        prompt_text = f"""Add JSDoc/TSDoc documentation to this code: {path.name}

```typescript
{content}
```

Provide the fully documented code with:
- Function/method documentation
- Parameter and return type docs
- Interface/type documentation
- Usage examples in comments"""
    else:
        prompt_text = f"""Create a README.md for this directory: {path.name}

List the main files and their purposes, then provide a summary of the module's architecture and usage."""
    
    config = create_config(AGENTS["docs"]["system_prompt"])
    
    print(f"\n{'='*60}")
    print(f"Running {AGENTS['docs']['name']} on: {target_path}")
    print(f"{'='*60}\n")
    
    async for msg in prompt(prompt_text, config=config, yolo=yolo):
        text = msg.extract_text()
        if text:
            print(text, end="", flush=True)
    print("\n")


async def run_test_agent(target_path: str, yolo: bool = True):
    """Run test generation agent on a file."""
    path = Path(target_path)
    
    if not path.is_file():
        print("Error: Test agent requires a file path")
        return
    
    content = path.read_text(encoding="utf-8")
    
    prompt_text = f"""Generate unit tests for this code: {path.name}

```typescript
{content}
```

Provide:
1. Complete test file using Jest/Vitest
2. Tests for all exported functions
3. Mock examples for external dependencies
4. Edge case coverage
5. React component tests if applicable (use React Testing Library)"""
    
    config = create_config(AGENTS["test"]["system_prompt"])
    
    print(f"\n{'='*60}")
    print(f"Running {AGENTS['test']['name']} on: {target_path}")
    print(f"{'='*60}\n")
    
    async for msg in prompt(prompt_text, config=config, yolo=yolo):
        text = msg.extract_text()
        if text:
            print(text, end="", flush=True)
    print("\n")


def main():
    parser = argparse.ArgumentParser(
        description="Run specialized agents on codebase",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/agent_tools.py review src/services/grokService.ts
  python scripts/agent_tools.py refactor src/lib/kiaraTools.ts --yolo
  python scripts/agent_tools.py docs src/services/ --yolo
  python scripts/agent_tools.py test src/lib/knowledgeBase/retrieval.ts
        """
    )
    
    parser.add_argument(
        "agent",
        choices=["review", "refactor", "docs", "test"],
        help="Type of agent to run"
    )
    parser.add_argument(
        "target",
        help="File or directory path to analyze"
    )
    parser.add_argument(
        "--no-yolo",
        action="store_true",
        help="Require manual approval for tool executions (default: auto-approve)"
    )
    
    args = parser.parse_args()
    
    # Change to project root
    project_root = Path(__file__).parent.parent
    import os
    os.chdir(project_root)
    
    # Run appropriate agent
    agents = {
        "review": run_review_agent,
        "refactor": run_refactor_agent,
        "docs": run_docs_agent,
        "test": run_test_agent,
    }
    
    yolo = not args.no_yolo
    asyncio.run(agents[args.agent](args.target, yolo))


if __name__ == "__main__":
    main()
