import { SMALL_MODEL } from './constants.js';

export async function api({ messages, tools, systemPrompt, model = SMALL_MODEL, maxTokens = 2048 }) {
  const url = "https://api.anthropic.com/v1/messages";
  const headers = {
    "content-type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01"
  };
  const body = {
    system: systemPrompt.map(prompt => ({ type: "text", text: prompt })),
    model: model,
    messages: messages,
    tools: tools,
    max_tokens: maxTokens
  };

  // In ra toàn bộ prompt trước khi gửi lên LLM
  console.log("=== SENDING PROMPT TO LLM ===");
  // console.log("System prompt:", JSON.stringify(systemPrompt, null, 2));
  console.log("Messages:", JSON.stringify(messages, null, 2));
  // console.log("Tools:", JSON.stringify(tools, null, 2));
  console.log("=== END OF PROMPT ===");

  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body)
  });

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
    for(const item of block) {
      log(item);
    }
  } else if(typeof block === "object") {
    if(block.role) {
      console.log(`\x1b[36m> ${block.role}\x1b[0m`);
      log(block.content);
      console.log("\n");
      return
    } else if (block.text) {
      console.log(block.text);
      console.log("\n");
    } else {
      if(block.type === "tool_use") {
        console.log(`\x1b[32m> ${block.name}\x1b[0m: ${JSON.stringify(block.input)}`);
      } else if(block.type === "tool_result") {
        console.log(`\x1b[34m> ${block.tool_use_id}\x1b[0m: ${block.content}`);
      }
    }
  }
}

export async function query({ userPrompt, tools, systemPrompt, model = SMALL_MODEL, maxTokens = 1024 }) {
  let messages = [{ role: "user", content: [{ type: "text", text: userPrompt }] }];

  const toolSchema = tools.map(tool => ({
    name: tool.name,
    description: tool.schema.description,
    input_schema: tool.schema.input_schema || tool.schema.parameters
  }));
  
  while (true) {
    try {
      const apiResponse = await api({ messages, tools: toolSchema, systemPrompt, model, maxTokens });
      const assistantMessage = { role: apiResponse.role, content: apiResponse.content };
      messages.push(assistantMessage);
      log(assistantMessage);
      const toolCalls = [];
      if(Array.isArray(apiResponse.content)) {
        for(const block of apiResponse.content) {
          if(block.type === "tool_use") {
            toolCalls.push(block);
          }
        }
      } else {
        return;
      }

      if(toolCalls.length > 0) {
        await Promise.all(toolCalls.map(async (toolCall) => {
          const toolResult = await tools.find(tool => tool.name === toolCall.name)?.handler?.(toolCall) || '<tool-not-found>';

          const message = {
            role: "user",
            content: [{
              type: "tool_result",
              tool_use_id: toolCall.id,
              content: JSON.stringify(toolResult)
            }]
          }
          log(message);
          messages.push(message);
        }));
      } else {
        return;
      }
    } catch (error) {
      console.error("Error:", error.message);
      break;
    }
  }
}