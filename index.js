import * as BashTool from './bash.js';
import * as FileReadTool from './file-read.js';
import * as FileWriteTool from './file-write.js';
import * as FileEditTool from './file-edit.js';
import * as GrepTool from './grep.js';
import * as GlobTool from './glob.js';
import * as LSTool from './ls.js';
import * as AgentTool from './agent.js';

export const tools = [
  BashTool,
  FileReadTool,
  FileWriteTool,
  FileEditTool,
  GrepTool,
  GlobTool,
  LSTool,
  AgentTool
];

import { query } from './api.js';
import { getSystemPrompt } from './prompts.js';

async function main() { 
  const systemPrompt = await getSystemPrompt();

  const userPrompt = process.argv[2] == '-p' ? process.argv.slice(3).join(' ') : "list the files in the current directory";
  await query({ userPrompt, tools, systemPrompt }).catch(error => console.error("Error:", error));
}

main();
