# koding.js

- `claude mcp add brave-search -e BRAVE_API_KEY=$BRAVE_API_KEY -- npx -y @modelcontextprotocol/server-brave-search`

- https://x6tdngyarpqy2vydkkdsew.solveit.fast.ai/dialog?did=167dialog?did=167


A lightweight reimplementation of claude-code assistant functionality without any external dependencies. This project provides a simple CLI interface to interact with Claude for coding tasks.

## Features

- Interact with Claude through a command-line interface
- Execute bash commands in a persistent shell
- Read, write, and edit files
- Search through files using grep
- List directory contents
- Run agents for more complex tasks

## Prerequisites

- Node.js
- Bun runtime
- Anthropic API key

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-code.git
cd claude-code

# Install dependencies (note: this project has no external dependencies)
bun install
```

## Configuration

Set your Anthropic API key as an environment variable:

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

## Usage

```bash
# Run with default prompt
bun run index.js

# Run with custom prompt
bun run index.js -p "create a simple express server"
```

## How It Works

Claude-Code uses the Anthropic API to interact with Claude AI models. It provides a set of tools that Claude can use to help with coding tasks:

- **BashTool**: Execute bash commands
- **FileReadTool**: Read file contents
- **FileWriteTool**: Write to files
- **FileEditTool**: Edit existing files
- **GrepTool**: Search through files
- **GlobTool**: Find files matching patterns
- **LSTool**: List directory contents
- **AgentTool**: Run more complex tasks

The system maintains a persistent shell session, allowing for stateful interactions across commands.

## Project Structure

- `api.js`: Core API interaction with Anthropic
- `index.js`: Entry point for the CLI
- `prompts.js`: System prompts for Claude
- `tools.js`: Tool registration
- `tools/`: Individual tool implementations
- `persistent_shell.js`: Manages persistent shell sessions
