import { isGit } from './shell.js'
import * as Bash from './bash-tool.js';
import * as FileEdit from './file-edit-tool.js';
import * as FileRead from './file-read-tool.js';
import * as FileWrite from './file-write-tool.js';
import * as Think from './think-tool.js';
const tools = [Bash, FileEdit, FileRead, FileWrite, ...(process.env.TOGETHER_API_KEY ? [Think] : [])];

import { query } from './api.js';
import { LARGE_MODEL, SMALL_MODEL } from './constants.js';

const systemPrompt = await getSystemPrompt();
const model = process.argv[2] === '-l' ? LARGE_MODEL : SMALL_MODEL;
const getPrompt = process.argv[2] === '-p';
const getCustomPrompt = process.argv[2] === '-c';
const acceptUserInput = getCustomPrompt || !getPrompt;
const userInput = process.argv.slice(3).join(' ');
const userPrompt = getPrompt || getCustomPrompt ? userInput : null;

await query({ userPrompt, tools, systemPrompt, acceptUserInput, model, shouldExit: true })
  .catch(error => console.error("Error:", error));


import { readFile } from 'fs/promises';

export async function getSystemPrompt() {
  return [`You are agent K, an interactive CLI tool that assists users with software engineering tasks.
**Follow the instructions** below and **use the available tools** to help users.

# Memory
The file KLAUDE.md in the working directory stores:
- Frequently used commands (e.g., build, lint, test)
- User code style preferences (e.g., naming conventions, libraries)
- Codebase structure and key information
Store any relevant commands, code styles, or important codebase details in KLAUDE.md when encountered. 

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
- Use function_calls block for independent tool calls (multiple read for examples)`,
    `\n${await getMemory()}`,
    `\n${await getEnvInfo()}`,
  ];
}

export async function getMemory() {
  try {
    const content = await readFile(process.cwd() + '/KLAUDE.md', 'utf8');
    return `<memory>\n${content}\n</memory>`;
  } catch { return '<memory>No KLAUDE.md found in the working directory.</memory>'; }
}

export async function getEnvInfo() {
  const envInfo = {
    workingDirectory: process.cwd(),
    platform: process.platform,
    nodeVersion: process.version,
    isGitRepo: await isGit(),
    date: new Date().toISOString().split('T')[0]
  };
  return `\n# Environment Information\n${Object.entries(envInfo)
    .map(([key, value]) => `- **${key}**: ${value}`).join('\n')}`;
}