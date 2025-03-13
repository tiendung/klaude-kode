import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'path';
import { EOL } from 'os';

const name = 'FileWriteTool';

const DESCRIPTION = 'Write a file to the local filesystem.';

const PROMPT = `Write a file to the local filesystem. Overwrites the existing file if there is one.

Before using this tool:

1. Use the ReadFile tool to understand the file's contents and context

2. Directory Verification (only applicable when creating new files):
   - Use the LS tool to verify the parent directory exists and is the correct location`;

const schema = {
  name: name,
  description: DESCRIPTION,
  parameters: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "The absolute path to the file to write (must be absolute, not relative)"
      },
      content: {
        type: "string",
        description: "The content to write to the file"
      }
    },
    required: ["file_path", "content"]
  }
};

// Helper function to detect file encoding
function detectFileEncoding(filePath) {
  try {
    // Simple implementation - in a real tool this would be more sophisticated
    return 'utf-8';
  } catch (error) {
    return 'utf-8'; // Default to UTF-8
  }
}

// Helper function to detect line endings
function detectLineEndings(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    if (content.includes('\r\n')) return '\r\n';
    if (content.includes('\n')) return '\n';
    return EOL; // Default to system EOL
  } catch (error) {
    return EOL; // Default to system EOL
  }
}

// Helper function to detect repository line endings
async function detectRepoLineEndings(cwd) {
  // In a real implementation, this would check .gitattributes or other files
  return EOL; // Default to system EOL
}

// Helper function to write text content with specific encoding and line endings
function writeTextContent(filePath, content, encoding, lineEndings) {
  // Normalize line endings
  const normalizedContent = content.replace(/\r\n|\r|\n/g, lineEndings);
  writeFileSync(filePath, normalizedContent, { encoding });
}

// Helper function to generate a diff patch
function getPatch({ filePath, fileContents, oldStr, newStr }) {
  // In a real implementation, this would generate a proper diff
  // For simplicity, we'll return a basic structure
  return [{
    oldStart: 1,
    oldLines: oldStr.split('\n').length,
    newStart: 1,
    newLines: newStr.split('\n').length,
    lines: []
  }];
}

// Helper function to add line numbers to content
function addLineNumbers({ content, startLine }) {
  const lines = content.split('\n');
  return lines.map((line, index) => {
    const lineNumber = startLine + index;
    return `${lineNumber.toString().padStart(6, ' ')} | ${line}`;
  }).join('\n');
}

const handler = async (toolCall) => {
  const { file_path, content } = toolCall.input;
  
  try {
    // Validate path is absolute
    if (!isAbsolute(file_path)) {
      return {
        error: "Path must be absolute, not relative"
      };
    }
    
    // Get current working directory
    const cwd = process.cwd();
    
    const fullFilePath = file_path;
    const dir = dirname(fullFilePath);
    const oldFileExists = existsSync(fullFilePath);
    const enc = oldFileExists ? detectFileEncoding(fullFilePath) : 'utf-8';
    const oldContent = oldFileExists ? readFileSync(fullFilePath, enc) : null;

    const endings = oldFileExists
      ? detectLineEndings(fullFilePath)
      : await detectRepoLineEndings(cwd);

    // Create directory if it doesn't exist
    mkdirSync(dir, { recursive: true });
    
    // Write content to file
    writeTextContent(fullFilePath, content, enc, endings);

    // Prepare result data
    const MAX_LINES_TO_RENDER_FOR_ASSISTANT = 16000;
    const TRUNCATED_MESSAGE =
      '<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with Grep in order to find the line numbers of what you are looking for.</NOTE>';

    if (oldContent) {
      // File was updated
      const patch = getPatch({
        filePath: file_path,
        fileContents: oldContent,
        oldStr: oldContent,
        newStr: content,
      });

      const assistantOutput = `The file ${file_path} has been updated. Here's the result of running \`cat -n\` on a snippet of the edited file:
${addLineNumbers({
  content:
    content.split(/\r?\n/).length > MAX_LINES_TO_RENDER_FOR_ASSISTANT
      ? content
          .split(/\r?\n/)
          .slice(0, MAX_LINES_TO_RENDER_FOR_ASSISTANT)
          .join('\n') + TRUNCATED_MESSAGE
      : content,
  startLine: 1,
})}`;

      return {
        output: `File updated successfully at: ${relative(cwd, fullFilePath)}`,
        assistantOutput: assistantOutput,
        type: 'update',
        filePath: file_path,
        content,
        structuredPatch: patch
      };
    } else {
      // File was created
      const assistantOutput = `File created successfully at: ${file_path}`;
      
      return {
        output: `File created successfully at: ${relative(cwd, fullFilePath)}`,
        assistantOutput: assistantOutput,
        type: 'create',
        filePath: file_path,
        content,
        structuredPatch: []
      };
    }
  } catch (error) {
    return {
      error: error.message
    };
  }
};

export { name, schema, handler, PROMPT, DESCRIPTION }; 