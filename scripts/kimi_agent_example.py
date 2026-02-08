"""
Kimi Agent SDK Example Script
==============================

This demonstrates how to use the Kimi Agent SDK for programmatic AI interactions.

Usage:
    cd D:\GOONERPROJECT
    python scripts/kimi_agent_example.py

Requirements:
    pip install kimi-agent-sdk
    
Configuration (choose one):
    1. Set env vars: KIMI_API_KEY, KIMI_BASE_URL
    2. Use Config object (see below)
    3. Use config.toml file
"""

import asyncio
from kimi_agent_sdk import Config, Session, prompt


# Example 1: Simple prompt (high-level API)
async def simple_prompt_example():
    """Simple one-shot prompt with auto-approval (YOLO mode)."""
    print("=" * 50)
    print("Example 1: Simple Prompt (YOLO Mode)")
    print("=" * 50)
    
    async for msg in prompt("Write a hello world program in Python", yolo=True):
        text = msg.extract_text()
        if text:
            print(text, end="", flush=True)
    print("\n")


# Example 2: Prompt with custom config
async def config_prompt_example():
    """Using a custom configuration object."""
    print("=" * 50)
    print("Example 2: Prompt with Custom Config")
    print("=" * 50)
    
    config = Config(
        default_model="kimi-k2-thinking-turbo",
        providers={
            "kimi": {
                "type": "kimi",
                "base_url": "https://api.moonshot.ai/v1",
                # Can also use env var: KIMI_API_KEY
                "api_key": "${KIMI_API_KEY}",  
            }
        },
        models={
            "kimi-k2-thinking-turbo": {
                "provider": "kimi",
                "model": "kimi-k2-thinking-turbo",
            }
        },
    )
    
    async for msg in prompt("Explain React hooks in one paragraph", config=config, yolo=True):
        text = msg.extract_text()
        if text:
            print(text, end="", flush=True)
    print("\n")


# Example 3: Session-based with manual approval
async def session_example():
    """Low-level Session API for fine-grained control."""
    print("=" * 50)
    print("Example 3: Session with Manual Approval")
    print("=" * 50)
    
    from kaos.path import KaosPath
    from kimi_agent_sdk import ApprovalRequest, TextPart
    
    async with await Session.create(work_dir=KaosPath.cwd()) as session:
        async for wire_msg in session.prompt("List files in current directory"):
            match wire_msg:
                case TextPart(text=text):
                    print(text, end="", flush=True)
                case ApprovalRequest() as req:
                    # Manual approval handling
                    print(f"\n[APPROVAL REQUESTED: {req.tool_name}]")
                    req.resolve("approve")  # or "reject"
    print("\n")


# Example 4: Multi-turn conversation
async def conversation_example():
    """Multiple prompts in the same session."""
    print("=" * 50)
    print("Example 4: Multi-turn Conversation")
    print("=" * 50)
    
    from kaos.path import KaosPath
    from kimi_agent_sdk import TextPart
    
    async with await Session.create(work_dir=KaosPath.cwd()) as session:
        # First prompt
        print("User: What is the capital of France?\nAssistant: ", end="")
        async for msg in session.prompt("What is the capital of France?"):
            if isinstance(msg, TextPart):
                print(msg.text, end="", flush=True)
        print("\n")
        
        # Second prompt (maintains context)
        print("User: What is its population?\nAssistant: ", end="")
        async for msg in session.prompt("What is its population?"):
            if isinstance(msg, TextPart):
                print(msg.text, end="", flush=True)
        print("\n")


# Main runner
async def main():
    """Run all examples."""
    print("\n" + "=" * 50)
    print("Kimi Agent SDK Examples")
    print("=" * 50 + "\n")
    
    # Run examples (comment out ones you don't want to run)
    try:
        await simple_prompt_example()
    except Exception as e:
        print(f"Example 1 failed: {e}\n")
    
    # Uncomment to run other examples:
    # await config_prompt_example()
    # await session_example()
    # await conversation_example()
    
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
