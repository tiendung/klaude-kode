# Agent K 🤖
Minimal CLI tool for AI-assisted coding and multi-purpose tasks.
Simple (under 2000 lines of code) and easy to use and extend (see `think.js` tool).

## ✨ Core Philosophy
- **Minimalist Design**: Every line of code serves a purpose; every token counts.
- **Rapid AI Interaction**: Fast, stateful CLI for coding tasks
- **Multi-purpose and extensible**: Just add tools.

## 🧰 Available Tools
1. **BashTool**: Secure shell command execution (can do virtually anything)
2. **FileTools**: Atomic file read/write/edit
3. **ThinkTool**: Advanced reasoning and brainstorming

### 🌟 Context Expansion
- Dynamically inject file contents into system prompt (for caching)
- Support for single files, multiple files
- Glob pattern matching (e.g., `*.js`, `src/**/*.ts`)
- Automatically handles file reading and error scenarios

## 🚀 Prerequisites
- Node.js
- Anthropic API Key
- (Optional) Together API Key for advanced reasoning

## 🔧 Installation & Setup
```bash
# Clone the repository
git clone https://github.com/tiendung/koding.js
cd koding.js && npm install

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

# Use ThinkTool for complex problems
node index.js -p "Think to solve: <complex coding challenge>"
```

## 🤝 Contribution
Contributions welcome! Please keep PRs minimal and focused.

## 📄 License
MIT License
*Crafted with ❤️ for developers who love clean, efficient tools*

## TODOs
- [ ] enhance prompt caching, reset ccc after reach max
