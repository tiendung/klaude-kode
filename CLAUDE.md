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
- Anthropic API key (set via ANTHROPIC_API_KEY environment variable)
- Together API key (set via TOGETHER_API_KEY environment variable) for ThinkingTool

## Project Structure
- `index.js`: CLI entry point
- `api.js`: Anthropic API interaction
- `prompts.js`: System prompts
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
9. ThinkingTool: Planning, solve hard problem, coding, debugging

## Common Commands
```bash
# Run in interactive mode with small model (haiku 3.5)
node index.js

# Run in interactive mode with large model (sonnet 3.7)
node index.js -l

# Run with custom prompt
node index.js -p "commit changes"

# Use ThinkingTool for complex problem-solving
node index.js -p "Use ThinkingTool to solve this problem: <problem description>"
```

## Development Notes
- Uses ES modules
- No external dependencies
- Designed for flexible Claude interactions
- Prefers simple Unix tools (find, grep) over specialized tools like ripgrep
- Aims for code that is concise, minimal, and easy to read

## Ignore files and folders
-  Alway ignore files or folders started with `.` for example .git, .save, ...


# Use Humor Commit Messages 🤖😂
- Bug: A feature with an attitude problem
- Code Review: Where dreams of perfect code go to die
- Debugging: Removing the bugs you just added while fixing other bugs
- My code doesn't always work, but when it does, I have no idea why 🤷‍♂️


# Code Style Preferences

## JSON Schema Formatting
- Prefer compact, single-line JSON schema definitions
- Keep properties concise and on a single line when possible
- Example preferred format:
  ```json
  {
    name: name, description: DESCRIPTION,
    parameters: {
      type: "object", required: ["prompt"],
      properties: { prompt: { type: "string", description: "Task description" } }
    }
  }
  ```

## Function Calls
- Prefer single-line function calls for compact method signatures
- Keep parameters concise and on a single line when possible
- Example preferred format:
  ```javascript
  const result = await query({ userPrompt: prompt, tools, systemPrompt, model: SMALL_MODEL, maxTokens: 1024 });
  ```

### Return Statements
- Prefer single-line object return statements
- Keep properties concise and on a single line when possible
- Example preferred format:
  ```javascript
  return { summary, output: finalResponse || "Default message" };
  ```

# Project Source Files

SOURCE FILES: 
- Only JavaScript files in the root directory (`./*.js`)
- EXCLUDE files in `node_modules`
- Do NOT search or modify files outside this directory

## Key Constraints
- Scope: Current directory JS files only (excluding node_modules)
- Ignore subdirectories, other file types, or external sources

## Source File List
- agent.js
- api.js
- bash.js
- constants.js
- file-edit.js
- file-read.js
- file-write.js
- glob.js
- grep.js
- index.js
- ls.js
- persistent_shell.js
- prompts.js
- thinking.js
