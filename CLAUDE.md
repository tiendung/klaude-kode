# Project Overview: koding.js

## Project Description
A lightweight CLI tool for interacting with Claude AI for coding tasks, implemented without external dependencies.

## Key Features
- Command-line interface for Claude interactions
- Persistent shell session management
- File manipulation tools (read, write, edit)
- File search capabilities
- Agent-based task execution

## Prerequisites
- Node.js
- Bun runtime
- Anthropic API key (set via ANTHROPIC_API_KEY environment variable)

## Project Structure
- `index.js`: CLI entry point
- `api.js`: Anthropic API interaction
- `prompts.js`: System prompts
- `tools.js`: Tool registration
- `tools/`: Individual tool implementations
- `persistent_shell.js`: Shell session management

## Available Tools
1. BashTool: Execute bash commands
2. FileReadTool: Read file contents
3. FileWriteTool: Write to files
4. FileEditTool: Edit existing files
5. GrepTool: Search through files (uses `find` and `grep` commands)
6. GlobTool: Find files by pattern
7. LSTool: List directory contents
8. AgentTool: Complex task execution

## Common Commands
```bash
# Run with default prompt
bun run index.js

# Run with custom prompt
bun run index.js -p "create a simple express server"
```

## Development Notes
- Uses ES modules
- No external dependencies
- Designed for flexible Claude interactions
- Prefers simple Unix tools (find, grep) over specialized tools like ripgrep
- Aims for code that is concise, minimal, and easy to read

## Ignore files and folders
-  Alway ignore files or folders started with `.` for example .git, .save, ...

## Coding Humor Corner 🤖😂
- Bug: A feature with an attitude problem
- Code Review: Where dreams of perfect code go to die
- Debugging: Removing the bugs you just added while fixing other bugs
- My code doesn't always work, but when it does, I have no idea why 🤷‍♂️