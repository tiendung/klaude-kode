import * as AgentTool from './agent.js';
import * as BashTool from './bash.js';
import * as FileReadTool from './file-read.js';
import * as FileWriteTool from './file-write.js';
import * as FileEditTool from './file-edit.js';
import * as GrepTool from './grep.js';
import * as GlobTool from './glob.js';
import * as LSTool from './ls.js';

const tools = [AgentTool, BashTool, FileReadTool, FileWriteTool, FileEditTool, GrepTool, GlobTool, LSTool];

import { query } from './api.js';
import { getSystemPrompt } from './prompts.js';

const systemPrompt = await getSystemPrompt();

const userPrompt = process.argv[2] == '-p' ? process.argv.slice(3).join(' ') : // all args after the -p flag
  "list the files in the current directory"; // default user prompt

// Gọi LLM xử lý userPrompt bằng các tools được cung cấp theo hướng dẫn từ systemPrompt 
await query({ userPrompt, tools, systemPrompt }).catch(error => console.error("Error:", error));
