import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import * as path from 'path';
import { dirname, isAbsolute, resolve } from 'path';

const name = "FileEditTool";

export const DESCRIPTION = `This is a tool for editing files. For moving or renaming files, you should generally use the Bash tool with the 'mv' command instead. For larger edits, use the Write tool to overwrite files. For Jupyter notebooks (.ipynb files), use the NotebookEditTool instead.

Before using this tool:

1. Use the View tool to understand the file's contents and context

2. Verify the directory path is correct (only applicable when creating new files):
   - Use the LS tool to verify the parent directory exists and is the correct location

To make a file edit, provide the following:
1. file_path: The absolute path to the file to modify (must be absolute, not relative)
2. old_string: The text to replace (must be unique within the file, and must match the file contents exactly, including all whitespace and indentation)
3. new_string: The edited text to replace the old_string

The tool will replace ONE occurrence of old_string with new_string in the specified file.

CRITICAL REQUIREMENTS FOR USING THIS TOOL:

1. UNIQUENESS: The old_string MUST uniquely identify the specific instance you want to change. This means:
   - Include AT LEAST 3-5 lines of context BEFORE the change point
   - Include AT LEAST 3-5 lines of context AFTER the change point
   - Include all whitespace, indentation, and surrounding code exactly as it appears in the file

2. SINGLE INSTANCE: This tool can only change ONE instance at a time. If you need to change multiple instances:
   - Make separate calls to this tool for each instance
   - Each call must uniquely identify its specific instance using extensive context

3. VERIFICATION: Before using this tool:
   - Check how many instances of the target text exist in the file
   - If multiple instances exist, gather enough context to uniquely identify each one
   - Plan separate tool calls for each instance

WARNING: If you do not follow these requirements:
   - The tool will fail if old_string matches multiple locations
   - The tool will fail if old_string doesn't match exactly (including whitespace)
   - You may change the wrong instance if you don't include enough context

When making edits:
   - Ensure the edit results in idiomatic, correct code
   - Do not leave the code in a broken state
   - Always use absolute file paths (starting with /)

If you want to create a new file, use:
   - A new file path, including dir name if needed
   - An empty old_string
   - The new file's contents as new_string

Remember: when making multiple file edits in a row to the same file, you should prefer to send all edits in a single message with multiple calls to this tool, rather than multiple messages with a single call each.`;

// Number of lines of context to include before/after the change in our result message
const N_LINES_SNIPPET = 4;

const schema = {
  name: name,
  description: DESCRIPTION,
  parameters: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "The absolute path to the file to modify"
      },
      old_string: {
        type: "string",
        description: "The text to replace"
      },
      new_string: {
        type: "string",
        description: "The text to replace it with"
      }
    },
    required: ["file_path", "old_string", "new_string"]
  }
};

/**
 * Detects the encoding of a file
 * @param {string} filePath - Path to the file
 * @returns {string} - Encoding to use
 */
function detectFileEncoding(filePath) {
  // Simple implementation - in a real app you might use a library to detect encoding
  return 'utf8';
}

/**
 * Detects line endings in a file
 * @param {string} filePath - Path to the file
 * @returns {string} - Line ending type ('LF' or 'CRLF')
 */
function detectLineEndings(filePath) {
  try {
    const sample = readFileSync(filePath, 'utf8').slice(0, 1000);
    return sample.includes('\r\n') ? 'CRLF' : 'LF';
  } catch (error) {
    return 'LF'; // Default to LF
  }
}

/**
 * Writes text content to a file with the specified encoding and line endings
 * @param {string} filePath - Path to the file
 * @param {string} content - Content to write
 * @param {string} encoding - File encoding
 * @param {string} lineEndings - Line ending type ('LF' or 'CRLF')
 */
function writeTextContent(filePath, content, encoding, lineEndings) {
  const normalizedContent = lineEndings === 'CRLF' 
    ? content.replace(/\n/g, '\r\n').replace(/\r\r\n/g, '\r\n')
    : content.replace(/\r\n/g, '\n');
  
  writeFileSync(filePath, normalizedContent, encoding);
}

/**
 * Adds line numbers to content
 * @param {Object} params - Parameters
 * @param {string} params.content - Content to add line numbers to
 * @param {number} params.startLine - Starting line number
 * @returns {string} - Content with line numbers
 */
function addLineNumbers({ content, startLine }) {
  const lines = content.split(/\r?\n/);
  return lines.map((line, i) => {
    const lineNum = startLine + i;
    const paddedNum = lineNum.toString().padStart(4, ' ');
    return `${paddedNum} | ${line}`;
  }).join('\n');
}

/**
 * Gets a snippet of the edited file
 * @param {string} initialText - Original file content
 * @param {string} oldStr - Text that was replaced
 * @param {string} newStr - New text
 * @returns {Object} - Snippet and start line
 */
function getSnippet(initialText, oldStr, newStr) {
  const before = initialText.split(oldStr)[0] ?? '';
  const replacementLine = before.split(/\r?\n/).length - 1;
  const newFileLines = initialText.replace(oldStr, newStr).split(/\r?\n/);
  // Calculate the start and end line numbers for the snippet
  const startLine = Math.max(0, replacementLine - N_LINES_SNIPPET);
  const endLine = replacementLine + N_LINES_SNIPPET + newStr.split(/\r?\n/).length;
  // Get snippet
  const snippetLines = newFileLines.slice(startLine, endLine + 1);
  const snippet = snippetLines.join('\n');
  return { snippet, startLine: startLine + 1 };
}

/**
 * Creates a simple patch representation
 * @param {Object} params - Parameters
 * @param {string} params.filePath - Path to the file
 * @param {string} params.fileContents - Original file contents
 * @param {string} params.oldStr - Old string
 * @param {string} params.newStr - New string
 * @returns {Array} - Array of hunks
 */
function getPatch({ filePath, fileContents, oldStr, newStr }) {
  const oldLines = oldStr.split(/\r?\n/);
  const newLines = newStr.split(/\r?\n/);
  
  // Find the line number where the change starts
  const beforeText = fileContents.split(oldStr)[0] || '';
  const startLineNumber = beforeText.split(/\r?\n/).length;
  
  // Create a simple hunk object
  return [{
    oldStart: startLineNumber,
    oldLines: oldLines.length,
    newStart: startLineNumber,
    newLines: newLines.length,
    lines: [
      ...oldLines.map(line => '-' + line),
      ...newLines.map(line => '+' + line)
    ]
  }];
}

/**
 * Applies an edit to a file and returns the patch and updated file.
 * Does not write the file to disk.
 */
function applyEdit(file_path, old_string, new_string) {
  const fullFilePath = isAbsolute(file_path)
    ? file_path
    : resolve(process.cwd(), file_path);

  let originalFile;
  let updatedFile;
  if (old_string === '') {
    // Create new file
    originalFile = '';
    updatedFile = new_string;
  } else {
    // Edit existing file
    const enc = detectFileEncoding(fullFilePath);
    originalFile = readFileSync(fullFilePath, enc);
    if (new_string === '') {
      if (
        !old_string.endsWith('\n') &&
        originalFile.includes(old_string + '\n')
      ) {
        updatedFile = originalFile.replace(old_string + '\n', () => new_string);
      } else {
        updatedFile = originalFile.replace(old_string, () => new_string);
      }
    } else {
      updatedFile = originalFile.replace(old_string, () => new_string);
    }
    if (updatedFile === originalFile) {
      throw new Error(
        'Original and edited file match exactly. Failed to apply edit.'
      );
    }
  }

  const patch = getPatch({
    filePath: file_path,
    fileContents: originalFile,
    oldStr: old_string,
    newStr: new_string,
  });

  return { patch, updatedFile };
}

const handler = async (toolCall) => {
  const { file_path, old_string, new_string } = toolCall.input;
  
  try {
    // Validate inputs
    if (old_string === new_string) {
      return {
        error: 'No changes to make: old_string and new_string are exactly the same.'
      };
    }

    const fullFilePath = isAbsolute(file_path)
      ? file_path
      : resolve(process.cwd(), file_path);

    // Handle file creation
    if (old_string === '') {
      if (existsSync(fullFilePath)) {
        return {
          error: 'Cannot create new file - file already exists.'
        };
      }
      
      // Create the directory if it doesn't exist
      const dir = dirname(fullFilePath);
      mkdirSync(dir, { recursive: true });
      
      // Write the new file
      writeTextContent(fullFilePath, new_string, 'utf8', 'LF');
      
      return {
        type: 'created',
        filePath: file_path,
        message: `Created new file: ${file_path}`
      };
    }

    // Handle file editing
    if (!existsSync(fullFilePath)) {
      return {
        error: `File does not exist: ${file_path}`
      };
    }

    // Read the file
    const enc = detectFileEncoding(fullFilePath);
    const originalFile = readFileSync(fullFilePath, enc);
    
    // Check if old_string exists in the file
    if (!originalFile.includes(old_string)) {
      return {
        error: 'String to replace not found in file.'
      };
    }
    
    // Check for multiple occurrences
    const matches = originalFile.split(old_string).length - 1;
    if (matches > 1) {
      return {
        error: `Found ${matches} matches of the string to replace. For safety, this tool only supports replacing exactly one occurrence at a time. Add more lines of context to your edit and try again.`
      };
    }
    
    // Apply the edit
    const { patch, updatedFile } = applyEdit(file_path, old_string, new_string);
    
    // Write the updated file
    const endings = detectLineEndings(fullFilePath);
    writeTextContent(fullFilePath, updatedFile, enc, endings);
    
    // Get a snippet of the edited file for the response
    const { snippet, startLine } = getSnippet(originalFile, old_string, new_string);
    
    return {
      type: 'edited',
      filePath: file_path,
      patch: patch,
      snippet: addLineNumbers({
        content: snippet,
        startLine,
      })
    };
  } catch (error) {
    return {
      error: `Error editing file: ${error.message}`
    };
  }
};

export { name, schema, handler }; 