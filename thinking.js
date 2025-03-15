// thinking.js - A tool for deep thinking and problem-solving using Together AI

import fetch from 'node-fetch';

const name = "ThinkingTool";
const DESCRIPTION = `
A thinking tool that helps to brainstorm and solve hard or creative problems
including coding / debugging and planning tasks.

Usage:
- Provide a clear problem statement or question

Parameters:
- prompt (required): The problem or task to think about and all relevent context
- model (optional): The Together AI model to use, for now only deepseek-ai/DeepSeek-R1 is available
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

  const body = JSON.stringify({
    model, messages, 
    temperature, 
    max_tokens,
    top_p: 0.95,
    top_k: 50, 
    repetition_penalty: 1,
    stop: ["<｜end▁of▁sentence｜>"]
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HTTP error! status: ${response.status}, error: ${JSON.stringify(error)}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error querying Together AI:", error);
    throw error;
  }
}

const handler = async (toolCall) => {
  try {
    const { prompt, model = "deepseek-ai/DeepSeek-R1", temperature = 0.6, max_tokens = 8000 } = toolCall.input;

    // Format the thinking prompt with <think> tag to encourage step-by-step reasoning
    const messages = [
      {
        role: "user",
        content: prompt
      },
      {
        role: "assistant",
        content: "<think>\n"
      }
    ];

    // Call the Together AI API
    const response = await queryTogetherAI({
      model,
      messages,
      temperature,
      max_tokens
    });

    // Extract the thinking response and split into think/answer parts
    const fullResponse = response.choices?.[0]?.message?.content || "";
    const [thinking, answer] = fullResponse.split('</think>').map(s => s.trim());
    console.log(`\x1b[33m${model}:\x1b[0m\n\x1b[36mThinking:\x1b[0m ${thinking}\n\x1b[32mAnswer:\x1b[0m ${answer}`);

    return {
      thinking: answer || thinking, // Return answer if available, otherwise full thinking
      summary: "Thinking process completed"
    };
  } catch (error) {
    return {
      error: `Error in ThinkingTool: ${error.message}`,
      thinking: "",
      summary: "Error during thinking process"
    };
  }
};

export { name, schema, handler };