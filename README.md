# Koding.js 🤖

A lightweight, dependency-free CLI tool for AI-assisted coding tasks, designed to stay under 2000 lines of code.

## ✨ Core Philosophy

- **Minimalist Design**: Every line of code serves a purpose
- **Zero External Dependencies**: Pure, self-contained functionality
- **Security-First**: Sandboxed shell execution and command validation
- **Rapid AI Interaction**: Fast, stateful CLI for coding tasks

## 🛠 Key Features

- Persistent shell session management
- Atomic file operations (read/write/edit)
- AI-powered file search and task automation
- Secure, context-aware tool chaining

## 🚀 Prerequisites

- Node.js
- Anthropic API Key
- (Optional) Together API Key for advanced reasoning

## 🔧 Installation & Setup

```bash
# Clone the repository
git clone https://github.com/tiendung/koding.js
cd koding.js

# Set API keys
export ANTHROPIC_API_KEY=your_anthropic_key
export TOGETHER_API_KEY=your_together_key  # Optional
```

## 💻 Usage Examples

```bash
# Interactive mode with small model
node index.js

# Large model (Sonnet)
node index.js -l

# Run specific task
node index.js -p "Refactor authentication middleware"

# Use ThinkingTool for complex problems
node index.js -p "Think to solve: <complex coding challenge>"
```

## 🧰 Available Tools

1. **BashTool**: Secure shell command execution
2. **FileTools**: Atomic file read/write/edit
3. **SearchTools**: Regex and glob file searching
4. **AgentTool**: Parallel task solving
5. **ThinkingTool**: Advanced reasoning and brainstorming

## 🔍 Project Structure

- Total source code: <2000 lines
- No external runtime dependencies
- Modular, functional design
- Typescript-like typing with JSDoc

## 🛡️ Security Principles

- Command validation
- No shell injection risks
- Restricted tool execution
- Ephemeral agent instantiation

## 🤝 Contribution

Contributions welcome! Please keep PRs minimal and focused.

## 📄 License

MIT License

*Crafted with ❤️ for developers who love clean, efficient tools*
