import { exec } from 'child_process';

const name = 'GlobTool';
const MAX_RESULTS = 100;
const DESCRIPTION = `- Fast file search tool that works with any codebase size
- Finds files by name pattern using glob syntax
- Supports full glob syntax (eg. "*.js", "**/*.{ts,tsx}", "src/**/*.test.js")
- Exclude files with the exclude parameter (eg. "node_modules/**")
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name pattern
- When you are doing an open ended search that may require multiple rounds of globbing and grepping,  use the Agent tool instead`;

const schema = {
  name, description: DESCRIPTION,
  parameters: {
    type: "object", required: ["pattern"],
    properties: {
      pattern: { type: "string", description: "Glob pattern to search" },
      path: { type: "string", default: ".", description: "Search directory" },
      exclude: { type: "string", description: "Exclusion glob pattern" }
    }
  }
};

const execCommand = (cmd) => new Promise(resolve => {
  let stdout = '', stderr = '';
  const child = exec(cmd, { maxBuffer: 10 * 1024 * 1024 });
  child.stdout.on('data', d => stdout += d);
  child.stderr.on('data', d => stderr += d);
  child.on('close', code => resolve({ stdout, stderr, code }));
});

const handler = async ({ input: { pattern, path = '.', exclude } }) => {
  try {
    const command = `find "${path}" -type f -path "${pattern}"`
      + (exclude ? ` | grep -v "${exclude}"` : '')
      + ` | head -n ${MAX_RESULTS + 1}`;

    const { stdout, stderr, code } = await execCommand(command);
    if (code !== 0) return { error: stderr || 'Pattern match failed' };

    const files = stdout.trim().split('\n').filter(Boolean);
    const isTruncated = files.length > MAX_RESULTS;
    const results = files.slice(0, MAX_RESULTS);

    return {
      count: results.length,
      files: results,
      output: `${results.length} matches${isTruncated ? ' (truncated)' : ''}:\n${results.join('\n')}`
    };
  } catch (error) {
    return { error: `Glob search failed: ${error.message}` };
  }
};

export { name, schema, handler };
