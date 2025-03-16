import { SMALL_MODEL, LARGE_MODEL } from './constants.js';
import { writeFile } from 'fs/promises';
import promptSync from 'prompt-sync';
const prompt = promptSync();

function cacheControl(messages) {
  let lastContent = messages.at(-1).content;
  if (typeof lastContent === "object") {
    lastContent = lastContent.at(-1); 
    lastContent.cache_control = {type: "ephemeral"}; // prompt cache the last message
  } else messages.at(-1).content = [{type: "text", text: lastContent, cache_control: {type: "ephemeral"}}];
  console.log("!! prompt cache at", lastCacheUsedToken);
}

const maxCacheControls = 4; // we have total 4 cache controls per chat session, use it wisely
var ccc = 0, lastCacheUsedToken = 3000;
let maxUncached = [ 0, 3000, 5000, 7000 ]; // last cache at 18k tokens

export async function api({ messages, tools, systemPrompt, model, maxTokens = 1024, usedTokens = 0 }) {
  const url = "https://api.anthropic.com/v1/messages";
  const headers = {
    "content-type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  };
  const system = systemPrompt.map(prompt => ({ type: "text", text: prompt }));

  if (model === LARGE_MODEL) { headers["anthropic-beta"] = "token-efficient-tools-2025-02-19"; }
  if (ccc === 0) {
    ccc = 1; lastCacheUsedToken = 3000; // ước chừng, cần tính chi tiết
    cacheControl(messages, lastCacheUsedToken); // 1st cache control
  }
  const uncached = usedTokens - lastCacheUsedToken;
  if (ccc < maxCacheControls && uncached > maxUncached[ccc]) { 
    ccc += 1; lastCacheUsedToken = usedTokens;
    cacheControl(messages, lastCacheUsedToken); // next cache control
  }
  const body = { system, model, messages, tools, max_tokens: maxTokens };
  writeFile('./llm_call.json', JSON.stringify(body, 2, null));

  const response = await fetch(url, {method: "POST", headers, body: JSON.stringify(body)});

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`HTTP error! status: ${response.status}, error: ${JSON.stringify(error)}`);
  }
  return await response.json();
}

const log = (block) => {
  const logTypes = {
    string: (b) => console.log(b),
    object: (b) => {
      if (Array.isArray(b)) for(const x of block) log(x); 
      else if (b.role) { console.log(`\x1b[36m> ${b.role}\x1b[0m`); log(b.content); } 
      else if (b.text) console.log(`${b.text.trim()}\n`);
      else if (b.type === "tool_use") console.log(`\x1b[32m> ${b.name}\x1b[0m: ${JSON.stringify(b.input)}`);
      else if (b.type === "tool_result") console.log(`\x1b[34m> ${b.tool_use_id}\x1b[0m: ${b.content}`);
    }
  };
  (logTypes[typeof block] || (b => console.log(b)))(block);
};

export async function query({ userPrompt, tools, systemPrompt, shouldExit = false,
  model = SMALL_MODEL, maxTokens = 1024, acceptUserInput = false }) {
  let messages = [];
  
  // Compact user input handler
  const userInput = () => {
    const input = prompt('\x1b[32muser: \x1b[0m').trim();
    messages.push({ role: "user", content: input });
    if (input === "q") process.exit(); // [q]uit program
  }

  if (acceptUserInput && userPrompt === null) userInput();
  else messages.push({ role: "user", content: [{ type: "text", text: userPrompt }] });

  const toolSchema = tools.map(tool => ({
    name: tool.name, description: tool.schema.description,
    input_schema: tool.schema.input_schema || tool.schema.parameters,
  }));

  let usedTokens = 0;
  while (true) { // Main tool use loop
    const apiResponse = await api({ messages, tools: toolSchema, systemPrompt, model, maxTokens, usedTokens });
    const assistantMessage = { role: apiResponse.role, content: apiResponse.content };
    messages.push(assistantMessage);
    log(assistantMessage);

    let u = apiResponse.usage;
    usedTokens = u.input_tokens + u.output_tokens + u.cache_read_input_tokens;
    u = `${apiResponse.model} (i_${u.input_tokens} o_${u.output_tokens} c_${u.cache_read_input_tokens})`;
    console.log(`\x1b[35m${u}\x1b[0m`);

    const toolCalls = apiResponse.content?.filter(block => block.type === 'tool_use') || [];
    if (toolCalls.length === 0) { 
      if (!acceptUserInput) { return shouldExit ? process.exit() : apiResponse; }
      else { userInput(); } // Continue dialog with LLM
    } else {
      // Execute all tool calls in parallel
      const toolResults = await Promise.all(toolCalls.map(async (toolCall) => {
        const tool = tools.find(t => t.name === toolCall.name);
        const result = tool ? await tool.handler(toolCall) : '<tool-not-found>';
        return { type: "tool_result", tool_use_id: toolCall.id, content: JSON.stringify(result) };
      }));
      messages.push({ role: "user", content: toolResults }); // Send single message with all tool results
    }
  } // End main loop
}