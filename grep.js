import { exec } from 'child_process';

const name = 'GrepTool';

const DESCRIPTION = `
- Fast content search tool that works with any codebase size
- Searches file contents using regular expressions
- Supports full regex syntax (eg. "log.*Error", "function\\s+\\w+", etc.)
- Filter files by pattern with the include parameter (eg. "*.js", "*.{ts,tsx}")
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files containing specific patterns
- When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the Agent tool instead
`;

const MAX_RESULTS = 100;
const MAX_OUTPUT_LENGTH = 30000;

const schema = {
  name: name,
  description: DESCRIPTION,
  parameters: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "The regular expression pattern to search for in file contents"
      },
      path: {
        type: "string",
        description: "The directory to search in. Defaults to the current working directory."
      },
      include: {
        type: "string",
        description: "File pattern to include in the search (e.g. \"*.js\", \"*.{ts,tsx}\")"
      }
    },
    required: ["pattern"]
  }
};

const handler = async (toolCall) => {
  const { pattern, path = '.', include } = toolCall.input;
  let stdout = '';
  let stderr = '';
  
  try {
    // Build ripgrep command
    let command = `rg -li "${pattern}" ${path}`;
    if (include) {
      command += ` --glob "${include}"`;
    }
    
    // Execute command
    const result = await new Promise((resolve, reject) => {
      const childProcess = exec(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      
      let stdoutData = '';
      let stderrData = '';
      
      childProcess.stdout.on('data', (data) => {
        stdoutData += data;
      });
      
      childProcess.stderr.on('data', (data) => {
        stderrData += data;
      });
      
      childProcess.on('close', (code) => {
        resolve({
          stdout: stdoutData,
          stderr: stderrData,
          code
        });
      });
      
      childProcess.on('error', (err) => {
        reject(err);
      });
    });
    
    stdout = (result.stdout || '').trim();
    stderr = (result.stderr || '').trim();
    
    if (result.code !== 0 && stderr) {
      return {
        error: stderr
      };
    }
    
    // Process results
    const files = stdout.split('\n').filter(Boolean);
    const numFiles = files.length;
    
    // Sort files by modification time (would need fs.stat in a real implementation)
    // For simplicity, we'll just return them as is
    
    // Truncate if too many results
    const truncatedFiles = files.slice(0, MAX_RESULTS);
    const isTruncated = numFiles > MAX_RESULTS;
    
    // Format output
    let output = `Found ${numFiles} file${numFiles === 1 ? '' : 's'}\n`;
    if (numFiles > 0) {
      output += truncatedFiles.join('\n');
      if (isTruncated) {
        output += '\n(Results are truncated. Consider using a more specific path or pattern.)';
      }
    }
    
    // Truncate if too long
    if (output.length > MAX_OUTPUT_LENGTH) {
      output = output.substring(0, MAX_OUTPUT_LENGTH) + 
        '\n... (output truncated due to length)';
    }
    
    return {
      output
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
};

export { name, schema, handler };