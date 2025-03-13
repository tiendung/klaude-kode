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