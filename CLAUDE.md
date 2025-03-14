# Code Style Preferences

## JSON Schema Formatting
- Prefer compact, single-line JSON schema definitions
- Keep properties concise and on a single line when possible
- Example preferred format:
  ```json
  {
    name: name, description: DESCRIPTION,
    parameters: {
      type: "object", required: ["prompt"],
      properties: { prompt: { type: "string", description: "Task description" } }
    }
  }
  ```

## Function Calls
- Prefer single-line function calls for compact method signatures
- Keep parameters concise and on a single line when possible
- Example preferred format:
  ```javascript
  const result = await query({ userPrompt: prompt, tools, systemPrompt, model: SMALL_MODEL, maxTokens: 1024 });
  ```

### Return Statements
- Prefer single-line object return statements
- Keep properties concise and on a single line when possible
- Example preferred format:
  ```javascript
  return { summary, output: finalResponse || "Default message" };
  ```