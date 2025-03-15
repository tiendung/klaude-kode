import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';

// how can we improve thinking.js?
const name = "ThinkingTool";
const DESCRIPTION = `
A thinking tool that helps to brainstorm and creative writing only.
Don't use thinking tool to code related tasks.

Usage:
Provide a clear problem statement only


Parameters:
- prompt (required): The problem or task to think about
- temperature (optional): Controls randomness (0.6-0.65)
- max_tokens (optional): Maximum output length
`;

const schema = {
  name: name, description: DESCRIPTION,
  parameters: {
    type: "object", required: ["prompt"],
    properties: {
      prompt: { type: "string", description: "The problem or task to think about" },
      model: { type: "string", description: "Together AI model to use", default: "deepseek-ai/DeepSeek-R1" },
      temperature: { type: "number", description: "Controls randomness (0.6-0.65)", default: 0.6 },
      max_tokens: { type: "number", description: "Maximum output length", default: 8000 }
    }
  }
};

async function queryTogetherAI({ model, messages, temperature = 0.6, max_tokens = 8000 }) {
  const url = "https://api.together.xyz/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.TOGETHER_API_KEY}`
  };

  const body = JSON.stringify({model, messages, temperature, max_tokens, stop: ["<｜end▁of▁sentence｜>"]});

  try {
    const response = await fetch(url, { method: "POST", headers, body });
    return await response.json();
  } catch (error) { console.error("Error querying Together AI:", JSON.stringify(error)); }
}

/**
 * Read file content from a given path
 * @param {string} filePath - Path to the file to read
 * @returns {Promise<string>} - File content as string
 */
async function readFileContent(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return `[Error reading file: ${error.message}]`;
  }
}

/**
 * Extract file paths from the prompt string
 * @param {string} prompt - The prompt string that may contain file paths
 * @returns {Array<string>} - Array of potential file paths
 */
function extractFilePaths(prompt) {
  // Look for common file path patterns in the prompt
  // This regex looks for strings that look like file paths
  const filePathRegex = /(?:^|\s)(\/[\w\.\-\/]+\.[\w\.]+)(?:\s|$)/g;
  const matches = [...prompt.matchAll(filePathRegex)];
  return matches.map(match => match[1]);
}

const handler = async (toolCall) => {
    const { prompt, model = "deepseek-ai/DeepSeek-R1", temperature = 0.6, max_tokens = 8000 } = toolCall.input;

    // Format the thinking prompt with <think> tag to encourage step-by-step reasoning
    const messages = [ { role: "user", content: prompt }, { role: "assistant", content: "<think>\n" } ];

    // Call the Together AI API
    const response = await queryTogetherAI({ model, messages, temperature, max_tokens });

    // Extract the thinking response and split into think/answer parts
    const fullResponse = response.choices?.[0]?.message?.content || "";
    const [thinking, answer] = fullResponse.split('</think>').map(s => s.trim());
    console.log(`\x1b[33m${model}:\x1b[0m\n\x1b[36mThinking:\x1b[0m ${thinking}\n\x1b` + 
      `[32mAnswer:\x1b[0m ${answer}`);

    return {
      thinking: answer || thinking, // Return answer if available, otherwise full thinking
      summary: "Thinking process completed"
    };
};

export { name, schema, handler };
