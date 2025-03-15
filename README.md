# koding.js

A lightweight reimplementation of claude-code assistant functionality without any external dependencies. This project provides a simple CLI interface to interact with Claude for coding tasks.

## TODOs
- [x] Let user tương tác với `node index.js` khi cần input từ user
- [x] Sửa lỗi gọi nhiều tools 1 lúc để AgentTool có thể read nhiều files 1 lúc

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
export TOGETHER_API_KEY=your_together_api_key_here
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

## Project Structure

- `api.js`: Core API interaction with Anthropic
- `index.js`: Tool registration & Entry point for the CLI
- `prompts.js`: System prompts for Claude
- `agent.js`: Agent tool implementation
- `bash.js`: Bash command execution tool
- `file-edit.js`: File editing tool
- `file-read.js`: File reading tool
- `file-write.js`: File writing tool
- `glob.js`: File pattern matching tool
- `grep.js`: File content search tool
- `ls.js`: Directory listing tool
- `persistent_shell.js`: Manages persistent shell sessions (only used by BashTool)
- `thinking.js`: Step-by-step reasoning tool using Together AI
