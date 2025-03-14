import { SMALL_MODEL, LARGE_MODEL } from './constants.js';
import promptSync from 'prompt-sync';
const prompt = promptSync();

export async function api({ messages, tools, systemPrompt, model, maxTokens = 2048 }) {

  const url = "https://api.anthropic.com/v1/messages";
  const headers = {
    "content-type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  };


  // https://www.anthropic.com/news/token-saving-updates
  // Claude 3.7 Sonnet. These include: cache-aware rate limits, 
  // simpler prompt caching, and token-efficient tool use
  if (model == LARGE_MODEL) {
    // messages.at(-1).cache_control = {type: "ephemeral"};
    headers["anthropic-beta"] = "token-efficient-tools-2025-02-19";
  }

  let system = systemPrompt.map(prompt => ({ type: "text", text: prompt }));
  system.at(-1).cache_control = {type: "ephemeral"};

  const body = JSON.stringify({ system, model, messages, tools, max_tokens: maxTokens });

  console.log(`=== SENDING PROMPT TO ${model} ===`);
  console.log("Messages:", JSON.stringify(messages, null, 2));
  console.log("=== END OF PROMPT ===");

  const response = await fetch(url, {method: "POST", headers, body});

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`HTTP error! status: ${response.status}, error: ${JSON.stringify(error)}`);
  }
  return await response.json();
}


function log(block) {
    if(typeof block === "string") {
        console.log(block);

    } else if(Array.isArray(block)) {
        for(const item of block) { log(item); }

    } else if(typeof block === "object") {
        if(block.role) {
            console.log(`\x1b[36m> ${block.role}\x1b[0m`);
            log(block.content);
            console.log("\n");
            return

        } else if (block.text) {
            console.log(`${block.text.trim()}\n`);

        } else {
            if(block.type === "tool_use") {
                console.log(`\x1b[32m> ${block.name}\x1b[0m: ${JSON.stringify(block.input)}`);

            } else if(block.type === "tool_result") {
                console.log(`\x1b[34m> ${block.tool_use_id}\x1b[0m: ${block.content}`);
            }
        }
    }
}


export async function query({ userPrompt, tools, systemPrompt, 
  model = SMALL_MODEL, maxTokens = 1024, acceptUserInput = false }) {

  let messages = [];

    function userInput() {
      const input = prompt('\x1b[32muser: \x1b[0m').trim();
      messages.push({ role: "user", content: input });
      if (input === "q") { process.exit(); } // [q]uit program
    }

  if (acceptUserInput && userPrompt === null) userInput();
  else messages.push({ role: "user", content: [{ type: "text", text: userPrompt }] });

  const toolSchema = tools.map(tool => ({
    name: tool.name, description: tool.schema.description,
    input_schema: tool.schema.input_schema || tool.schema.parameters,
  }));
  
  while (true) { // tool use main loop
    const apiResponse = await api({ messages, tools: toolSchema, systemPrompt, model, maxTokens });
    const assistantMessage = { role: apiResponse.role, content: apiResponse.content };
    // const assistantMessage = { role: "assistant", content: "hello" }; // dump message

    messages.push(assistantMessage);
    log(assistantMessage);

    // Extract tool calls and wait for all results before continuing
    const toolCalls = apiResponse.content?.filter(block => block.type === 'tool_use') || [];

    if (toolCalls.length === 0) { 
      if (!acceptUserInput) { return; } // thoát khỏi main loop khi không còn tool calls 
      // Tiếp tục đối thoại với LLM
      userInput();

    } else {

      const toolResults = await Promise.all(toolCalls.map(async (toolCall) => {
        const tool = tools.find(t => t.name === toolCall.name);
        const result = tool ? await tool.handler(toolCall) : '<tool-not-found>';
        return { type: "tool_result", tool_use_id: toolCall.id, content: JSON.stringify(result) };
      }));

      // Note: Chỉ gửi 1 message duy nhất cho nhiều tool uses
      messages.push({ role: "user", content: toolResults });
    }
  } // the main loop
}