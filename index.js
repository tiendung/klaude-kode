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
import { getSystemPrompt } from './prompts.js';
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
