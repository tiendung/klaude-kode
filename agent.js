import { query } from './api.js';
import { LARGE_MODEL, SMALL_MODEL } from './constants.js';
import { getCwd, isGit } from './persistent_shell.js';

const name = 'AgentTool';

const DESCRIPTION = `
Launch a new agent that has access to various tools.
When you are searching for a keyword or file and are not confident that you will find the 
right match on the first try, use the Agent tool to perform the search for you. For example:

- If you are searching for a keyword like "config" or "logger", the Agent tool is appropriate

- If you want to read a specific file path, 
  use the FileReadTool or GlobTool tool instead of the Agent tool, to find the match more quickly

- If you are searching for a specific class definition like "class Foo",
  use the GlobTool tool instead, to find the match more quickly

Usage notes:

1. Launch multiple agents concurrently whenever possible, to maximize performance

2. When the agent is done, it will return a single message back to you

3. Each agent invocation is stateless

4. The agent's outputs should generally be trusted
`;

// Function to get available tools
async function getAvailableTools() {
  // Import tools dynamically to avoid circular dependencies
  return await Promise.all([
    import('./grep.js'),
    import('./glob.js'),
    import('./ls.js'),
  ]);
}

const schema = {
  name: name, description: DESCRIPTION,
  parameters: {
    type: "object", required: ["prompt"],
    properties: { prompt: { type: "string", description: "The task for the agent to perform" } },
  }
};

const handler = async (toolCall) => {
  console.log('\x1b[32mInitializing agent...\x1b[0m', toolCall.input);  
  const { prompt } = toolCall.input;
  const startTime = Date.now();
  const tools = await getAvailableTools();
  let systemPrompt = getAgentPrompt();
  const result = await query({ userPrompt: prompt, tools, systemPrompt, model: SMALL_MODEL, maxTokens: 1024 });

  let toolUseCount = 0;
  let finalResponse = '';
  if (result && result.content) {
    for (const block of result.content) {
      if (block.type === 'text') { finalResponse += block.text; }
      if (block.type === 'tool_use') { toolUseCount++; }
    }
  }
  console.log("\x1b[32mAgent query finalResponse: \x1b[0m", finalResponse);
  
  // Estimate tokens (in a real implementation, this would come from the API response)
  const totalTokens = Math.round(finalResponse.split(/\s+/).length * 1.3);
  const durationMs = Date.now() - startTime;
  const p = toolUseCount === 1 ? '' : 's';
  const s = (durationMs / 1000).toFixed(1);
  return {
    summary: `Done (${toolUseCount} tool use${p} · ${totalTokens} tokens · ${s}s)`,
    output: finalResponse || "The agent completed the task but didn't provide a text response.",
  };
};


function getAgentPrompt() {
  return [
`You are an coding agent. Given the user's prompt,
you should use the tools available to you to answer the user's question.


Notes:

1. IMPORTANT: You should be concise, direct, and to the point, since your responses 
   will be displayed on a command line interface. Answer the user's question directly, 
   without elaboration, explanation, or details. One word answers are best.
   Avoid introductions, conclusions, and explanations.

   You MUST avoid text before/after your response, such as
   "The answer is <answer>.", 
   "Here is the content of the file..." or 
   "Based on the information provided, the answer is..." or 
   "Here is what I will do next...".

2. When relevant, share file names and code snippets relevant to the query.

3. Any file paths you return in your final response MUST be absolute. DO NOT use relative paths.`,
    `${getEnvInfo()}`,
  ]
}

function getEnvInfo() {
  return `Here is useful information about the environment you are running in:
<env>
Working directory: ${getCwd()}
Is directory a git repo: ${isGit ? 'Yes' : 'No'}
Platform: ${process.platform}
Today's date: ${new Date().toLocaleDateString()}
</env>`
}

export { name, schema, handler };
