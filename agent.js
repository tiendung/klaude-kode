import { query } from './api.js';
import { LARGE_MODEL } from './constants.js';

const name = 'AgentTool';

const DESCRIPTION = `Launch a new agent that has access to various tools.
When you are searching for a keyword or file and are not confident that you will find the 
right match on the first try, use the Agent tool to perform the search for you. For example:

- If you are searching for a keyword like "config" or "logger", the Agent tool is appropriate
- If you want to read a specific file path, use the FileReadTool or GlobTool tool instead of the Agent tool, to find the match more quickly
- If you are searching for a specific class definition like "class Foo", use the GlobTool tool instead, to find the match more quickly

Usage notes:
1. Launch multiple agents concurrently whenever possible, to maximize performance
2. When the agent is done, it will return a single message back to you
3. Each agent invocation is stateless
4. The agent's outputs should generally be trusted`;

// Function to get available tools
async function getAvailableTools() {
  // Import tools dynamically to avoid circular dependencies
  const [grepModule, globModule, lsModule] = await Promise.all([
    import('./grep.js'),
    import('./glob.js'),
    import('./ls.js')
  ]);
  
  return [
    grepModule,
    globModule,
    lsModule
  ];
}

const schema = {
  name: name,
  description: DESCRIPTION,
  parameters: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "The task for the agent to perform"
      }
    },
    required: ["prompt"]
  }
};

const handler = async (toolCall) => {
  const { prompt } = toolCall.input;
  
  try {
    const startTime = Date.now();
    
    // Get available tools
    const tools = await getAvailableTools();
    // console.log('getAvailableTools()', tools);
    
    // Log initialization
    console.log('Initializing agent...');
    
    // Create system prompt for the agent
    const systemPrompt = [`You are a helpful assistant with access to various tools. 
Your task is to help the user with their request: "${prompt}"
Be thorough and use the tools available to you to find the most relevant information.
When you're done, provide a clear and concise summary of what you found.`];
    // console.log('systemPrompt', systemPrompt);
    
    // Track tool usage
    let toolUseCount = 0;
    let totalTokens = 0;
    
    // Call the LLM with the prompt and tools
    const result = await query({
      userPrompt: prompt,
      tools: tools,
      systemPrompt: systemPrompt,
      model: LARGE_MODEL,
      maxTokens: 2048
    });
    
    // Extract the final response from the LLM
    let finalResponse = '';
    if (result && result.content) {
      for (const block of result.content) {
        if (block.type === 'text') {
          finalResponse += block.text;
        }
        if (block.type === 'tool_use') {
          toolUseCount++;
        }
      }
      
      // Estimate tokens (in a real implementation, this would come from the API response)
      totalTokens = finalResponse.split(/\s+/).length * 1.3; // Rough estimate
    }
    
    const durationMs = Date.now() - startTime;
    
    // Create summary
    const summary = `Done (${toolUseCount === 1 ? '1 tool use' : `${toolUseCount} tool uses`} · ${Math.round(totalTokens)} tokens · ${(durationMs / 1000).toFixed(1)}s)`;
    
    return {
      output: finalResponse || "The agent completed the task but didn't provide a text response.",
      summary: summary
    };
  } catch (error) {
    console.error('Agent error:', error);
    return {
      error: `Error running agent: ${error.message}`
    };
  }
};

export { name, schema, handler };