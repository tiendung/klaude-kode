import { query } from './api.js';
import { LARGE_MODEL, SMALL_MODEL } from './constants.js';
import { getCwd, isGit } from './persistent_shell.js';

const name = 'AgentTool';

const DESCRIPTION = `
Launch a new agent that has access to various tools.
When you are searching for a keyword or file and are not confident that you will find the 
right match on the first try, use the Agent tool to perform the search for you. For example:

- If you are searching for a keyword like "config" or "logger", the Agent tool is appropriate
- If you want to read a specific file path, use FileReadTool or GlobTool instead
- If you are searching for a specific class definition, use GlobTool

Usage notes:
1. Launch multiple agents concurrently to maximize performance
2. Agent returns a single message
3. Each invocation is stateless
4. Agent's outputs should be trusted
`;

// Simplified tool import with arrow function
const getAvailableTools = async () => Promise.all([
  import('./grep.js'),
  import('./glob.js'),
  import('./ls.js')
]);

const schema = {
  name: name, description: DESCRIPTION,
  parameters: {
    type: "object", required: ["prompt"],
    properties: { prompt: { type: "string", description: "The task for the agent to perform" } },
  }
};

const handler = async (toolCall) => {
  const { prompt } = toolCall.input;
  const startTime = Date.now();
  const tools = await getAvailableTools();
  const systemPrompt = getAgentPrompt();
  const result = await query({ userPrompt: prompt, tools, systemPrompt, model: SMALL_MODEL, maxTokens: 1024 });

  // Compact response processing
  const finalResponse = result?.content
    ?.filter(block => block.type === 'text')
    ?.map(block => block.text)
    ?.join('') || '';

  const toolUseCount = result?.content?.filter(block => block.type === 'tool_use')?.length || 0;
  const totalTokens = Math.round(finalResponse.split(/\s+/).length * 1.3);
  const durationMs = Date.now() - startTime;

  const summary = `Done (${toolUseCount} tool use${toolUseCount !== 1 ? 's' : ''} · ${totalTokens} tokens · ${(durationMs / 1000).toFixed(1)}s)`;
  
  console.log('\x1b[32mAgent query finalResponse:\x1b[0m', summary);
  
  return { summary, output: finalResponse || "Agent completed the task, but no text response." };
};

// Compact env info with template literals and arrow function
const getAgentPrompt = () => [
  `You are a coding agent. Given the user's prompt, use available tools to answer concisely.

Notes:
1. Be direct, one-word answers preferred. Avoid explanations.
2. Share relevant file names and code snippets.
3. Use absolute file paths.`,
  getEnvInfo()
];

// Simplified environment info function
const getEnvInfo = () => `Here is useful environment information:
<env>
Working directory: ${getCwd()}
Is directory a git repo: ${isGit ? 'Yes' : 'No'}
Platform: ${process.platform}
Today's date: ${new Date().toLocaleDateString()}
</env>`;

export { name, schema, handler };