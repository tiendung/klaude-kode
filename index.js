import * as AgentTool from './agent.js';
import * as BashTool from './bash.js';
import * as FileEditTool from './file-edit.js';
import * as FileReadTool from './file-read.js';
import * as FileWriteTool from './file-write.js';
import * as GrepTool from './grep.js';
import * as GlobTool from './glob.js';
import * as LSTool from './ls.js';
import * as ThinkingTool from './thinking.js';

const tools = [AgentTool, BashTool, FileEditTool, FileReadTool, FileWriteTool, 
	GrepTool, GlobTool, LSTool, ...(process.env.TOGETHER_API_KEY ? [ThinkingTool] : [])];

import { query } from './api.js';
import { LARGE_MODEL, SMALL_MODEL } from './constants.js';

const systemPrompt = await getSystemPrompt();
const model = process.argv[2] === '-l' ? LARGE_MODEL : SMALL_MODEL;
const getPrompt = process.argv[2] === '-p';
const getCustomPrompt = process.argv[2] === '-c';
const acceptUserInput = getCustomPrompt || !getPrompt;
const userPrompt = getPrompt || getCustomPrompt ? process.argv.slice(3).join(' ') : null;

// Giải thích: -c prompt giống -p ở chỗ nhập prompt từ terminal nhưng tiếp tục nói chuyện (interactive mode)
await query({ userPrompt, tools, systemPrompt, acceptUserInput, model, shouldExit: true })
  .catch(error => console.error("Error:", error));

import { readFile } from 'fs/promises';
import { getEnvInfo } from './agent.js';

export async function getSystemPrompt() {
  return [`You are agent K, an interactive CLI tool that assists users with software engineering tasks.
**Follow the instructions** below and **use the available tools** to help users.

# Memory
The file CLAUDE.md in the working directory stores:
- Frequently used commands (e.g., build, lint, test)
- User code style preferences (e.g., naming conventions, libraries)
- Codebase structure and key information
Store any relevant commands, code styles, or important codebase details in CLAUDE.md when encountered. 

# Tone and Style
- Be concise, direct, and to the point. Always explain non-trivial commands.
- Output only relevant content. Respond in 1-3 sentences or less.
    
# Proactiveness
- Only take action when explicitly asked.
- Do not surprise the user with unsolicited actions.
- NEVER commit changes unless the user explicitly asks for it.
    
# Respect project conventions
- Follow existing code style
- Never introduce new libraries unless necessary
- Ensure security best practices
- Follow Test-Driven Development
    
# Code Style
- No unnecessary comments
- Follow project naming conventions
- Prefer functional programming
    
# Doing Tasks
1. Search codebase
2. Implement solution using available tools
3. Write test cases
4. Verify with tests
    
# Tool usage policy
- Prefer Agent tool for file searches
- Use function_calls block for independent tool calls`,
    `\n${await getEnvInfo()}`,
    `\n${await getClaudioContent()}`
  ];
}

export async function getClaudioContent() {
  try {
    const content = await readFile(process.cwd() + 'CLAUDE.md', 'utf8');
    return `<memory>\n${content}\n</memory>`;
  } catch { return '<memory>No CLAUDE.md found in the working directory.</memory>'; }
}
