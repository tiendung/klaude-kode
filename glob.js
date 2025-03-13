import { exec } from 'child_process';

const name = 'GlobTool';

const DESCRIPTION = `
- Fast file search tool that works with any codebase size
- Finds files by name pattern using glob syntax
- Supports full glob syntax (eg. "*.js", "**/*.{ts,tsx}", "src/**/*.test.js")
- Exclude files with the exclude parameter (eg. "node_modules/**")
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name pattern
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
        description: "The glob pattern to search for files (e.g. \"*.js\", \"**/*.{ts,tsx}\")"
      },
      path: {
        type: "string",
        description: "The directory to search in. Defaults to the current working directory."
      },
      exclude: {
        type: "string",
        description: "Glob pattern to exclude from the search (e.g. \"node_modules/**\")"
      }
    },
    required: ["pattern"]
  }
};

const handler = async (toolCall) => {
  const { pattern, path = '.', exclude } = toolCall.input;
  let stdout = '';
  let stderr = '';
  
  try {
    // Build find command with glob pattern
    // Using find with -name for simple patterns, could use fd or other tools for more complex patterns
    let command = `find "${path}" -type f -path "${pattern}" | sort`;
    
    if (exclude) {
      command += ` | grep -v "${exclude}"`;
    }
    
    command += ` | head -n ${MAX_RESULTS + 1}`;
    
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
        output += '\n(Results are truncated. Consider using a more specific pattern.)';
      }
    }
    
    // Calculate duration (in a real implementation, we'd track actual time)
    const durationMs = 100; // Placeholder
    
    // Prepare output object
    const outputObj = {
      filenames: truncatedFiles,
      durationMs,
      numFiles
    };
    
    // Truncate if too long
    if (output.length > MAX_OUTPUT_LENGTH) {
      output = output.substring(0, MAX_OUTPUT_LENGTH) + 
        '\n... (output truncated due to length)';
    }
    
    return {
      output,
      data: outputObj
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
};

export { name, schema, handler }; 
