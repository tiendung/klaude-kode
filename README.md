# koding.js

A lightweight reimplementation of claude-code assistant functionality without any external dependencies. This project provides a simple CLI interface to interact with Claude for coding tasks.

## TODOs
- [x] Let user tương tác với `node index.js` khi cần input từ user
- [x] Sửa lỗi gọi nhiều tools 1 lúc để AgentTool có thể read nhiều files 1 lúc
- [x] Thinking Tool for brainstorming and creative writing

## Features

- Interact with Claude through a command-line interface
- Execute bash commands in a persistent shell
- Read, write, and edit files
- Search through files using grep
- List directory contents
- Run agents for more complex tasks

## Prerequisites

- Node.js
- Anthropic API key
- Together API key (for ThinkingTool)

## Installation

```bash
# Clone the repository
git clone https://github.com/tiendung/koding.js
cd koding.js
```

## Configuration

Set your API keys as environment variables:

```bash
export ANTHROPIC_API_KEY=your_api_key_here
export TOGETHER_API_KEY=your_together_api_key_here # optional
```

## Usage

```bash
node index.js 	 # interactive mode with small model (haiku 3.5)
node index.js -l # interactive mode with large model (sonnet 3.7)
node index.js -p "commit changes" # run and terminate
node index.js -p "Use ThinkingTool to solve: <problem>" # deep thinking with Together AI
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
- **ThinkingTool**: Deep thinking and step-by-step reasoning using Together AI

The system maintains a persistent shell session, allowing for stateful interactions across commands.
