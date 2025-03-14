import * as AgentTool from './agent.js';
import * as BashTool from './bash.js';
import * as FileReadTool from './file-read.js';
import * as FileWriteTool from './file-write.js';
import * as GrepTool from './grep.js';
import * as GlobTool from './glob.js';
import * as LSTool from './ls.js';

const tools = [AgentTool, BashTool, FileReadTool, FileWriteTool, GrepTool, GlobTool, LSTool];

import { query } from './api.js';
import { getSystemPrompt } from './prompts.js';
import { LARGE_MODEL, SMALL_MODEL } from './constants.js';

const systemPrompt = await getSystemPrompt();
const model = ( process.argv[2] === '-l' ) ? LARGE_MODEL : SMALL_MODEL;
const getPrompt = process.argv[2] === '-p';
const acceptUserInput = true;
const userPrompt = getPrompt ? process.argv.slice(3).join(' ') : null;

// Gọi LLM xử lý userPrompt bằng các tools được cung cấp theo hướng dẫn từ systemPrompt
await query({ userPrompt, tools, systemPrompt, acceptUserInput,  model, shouldExit: true }).
	catch(error => console.error("Error:", error));
