import { exec } from 'child_process';
import { statSync } from 'fs';
import { promisify } from 'util';
import { formatOutput } from './bash.js';

const execAsync = promisify(exec);
const name = 'GrepTool';
const DEFAULT_MAX_RESULTS = 100;
const MAX_OUTPUT_LENGTH = 30_000;

const DESCRIPTION = `- Fast content search tool that works with any codebase size
- Searches file contents using regular expressions
- Supports full regex syntax (eg. "log.*Error", "function\\s+\\w+", etc.)
- Filter files by pattern with the include parameter (eg. "*.js", "*.{ts,tsx}")
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files containing specific patterns
- When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the Agent tool instead`;

const schema = {
  name, description: DESCRIPTION,
  parameters: {
    type: "object", required: ["pattern"],
    properties: {
      pattern: { type: "string", description: "Search pattern (regex)" },
      path: { type: "string", default: ".", description: "Search root directory" },
      include: { type: "string", description: "Glob pattern to include files" },
      ignoreCase: { type: "boolean", default: false, description: "Case-insensitive search" },
      maxResults: { type: "number", default: DEFAULT_MAX_RESULTS, description: "Max files to return" }
    }
  }
};

const getModificationTime = (file) => {
  try { return statSync(file).mtimeMs; } 
  catch { return 0; }
};

const handler = async ({ input }) => {
  const { pattern, path = '.', include, ignoreCase = false, maxResults = DEFAULT_MAX_RESULTS } = input;

  try {
    const args = [
      ignoreCase && '-i',
      '--no-heading',
      '--line-number',
      '--color never',
      include && `--glob \"${include}\"`,
      `\"${pattern}\"`,
      path
    ].filter(Boolean).join(' ');

    const { stdout, stderr } = await execAsync(`rg ${args}`, {  maxBuffer: 10 * 1024 * 1024  });

    if (stderr) throw new Error(stderr);

    const results = stdout.trim().split('\n')
      .map(line => {
        const [file, lineNo, ...rest] = line.split(/[:]/);
        return { file, line: lineNo, text: rest.join(':') };
      })
      .sort((a, b) => getModificationTime(b.file) - getModificationTime(a.file))
      .slice(0, maxResults);

    return formatOutput(results.map(r => 
      `${r.file}:${r.line}\t${r.text}`).join('\n'), MAX_OUTPUT_LENGTH);
    
  } catch (error) {
    return { 
      error: error.message.includes('No matches found') 
        ? 'No matches found' 
        : `Search failed: ${error.message}`,
      code: error.code || 500
    };
  }
};

export { name, schema, handler };
