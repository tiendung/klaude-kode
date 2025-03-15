import fetch from 'node-fetch';
import { promises as fs } from 'fs';

const name = "ThinkingTool";
const DESCRIPTION = `
A thinking tool that helps to brainstorm, write creatively, code, program, plan, debugs, explain things. 
Really good to solve hard problem that cannot be solved normally.

Usage: Provide a clear problem statement.

Examples:
k -c explain how file-edit.js work
k -c brainstorming how should we make abc.js more concise? follow api.js style, apply the changes right after.
`;

const schema = {
  name, description: DESCRIPTION,
  parameters: {
    type: "object", required: ["prompt"],
    properties: {
      prompt: { type: "string", description: "The problem or task to think about" },
      model: { type: "string", default: "deepseek-ai/DeepSeek-R1" },
      temperature: { type: "number", description: "Controls randomness (0.6-0.65)", default: 0.6 },
      max_tokens: { type: "number", default: 8000 }
    }
  }
};

const readFileContent = async (filePath) => {
  try { return await fs.readFile(filePath, 'utf8'); } 
  catch (error) { return `[Error reading file: ${error.message}]`; }
};

const getAllFiles = async () => {
  const entries = await fs.readdir('.', { withFileTypes: true });
  return entries
    .filter(entry => !entry.isDirectory() && /\.(js|KLAUDE\.md)$/.test(entry.name))
    .map(entry => entry.name);
};

const queryTogetherAI = async ({ model, messages, temperature = 0.6, max_tokens = 8000 }) => {
  try {
    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.TOGETHER_API_KEY}`
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens, stop: ["<｜end▁of▁sentence｜>"] })
    });
    return await response.json();
  } catch (error) { console.error("AI Query Error:", error); }
};

const handler = async (toolCall) => {
  const { prompt, model = "deepseek-ai/DeepSeek-R1", temperature = 0.6, max_tokens = 8000 } = toolCall.input;

  const files = await getAllFiles();
  const fileContents = await Promise.all(
    files.map(async (file) => `<file name='${file}'>${await readFileContent(file)}</file>`)
  );
  
  const messages = [
    { role: "user", content: `<context>${fileContents.join('\n')}</context>\n\n${prompt}` },
    { role: "assistant", content: "<think>\n" }
  ];

  const response = await queryTogetherAI({ model, messages, temperature, max_tokens });
  const fullResponse = response.choices?.[0]?.message?.content || "";
  const [thinking, answer] = fullResponse.split('</think>').map(s => s.trim());

  console.log(`\x1b[33m${model}:\x1b[0m\n\x1b[36mThink:\x1b[0m ${thinking}\n\x1b[32mAnswer:\x1b[0m ${answer}`);
  return { thinking: answer || thinking, summary: "Thinking process completed"};
};

export { name, schema, handler };
