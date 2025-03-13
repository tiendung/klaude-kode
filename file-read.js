import { existsSync, readFileSync, statSync } from 'fs';
import * as path from 'path';
import { extname } from 'path';

const name = "FileReadTool";
const MAX_OUTPUT_SIZE = 0.25 * 1024 * 1024; // 0.25MB in bytes
const MAX_LINES_TO_RENDER = 50;
const MAX_LINES_TO_READ = 2000;
const MAX_LINE_LENGTH = 2000;

// Common image extensions
const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp',
]);

export const DESCRIPTION = `Reads a file from the local filesystem. The file_path parameter must be an absolute path, not a relative path. By default, it reads up to ${MAX_LINES_TO_READ} lines starting from the beginning of the file. You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters. Any lines longer than ${MAX_LINE_LENGTH} characters will be truncated. For image files, the tool will display the image for you.`;

// Original PROMPT for reference
// const PROMPT = `Reads the contents of a file at the specified path.
// 
// Usage:
// - Provide the absolute file_path to read
// - Optionally specify offset (line number to start reading from) and limit (number of lines to read)
// - For large files, use offset and limit to read specific portions
// 
// Notes:
// - Maximum file size is ${Math.round(MAX_OUTPUT_SIZE / 1024)}KB
// - For images, the file will be returned as base64-encoded data
// - For text files, the content will be returned as text
// - Line numbers are 1-indexed (first line is line 1)`;

const schema = {
  name: name,
  description: DESCRIPTION,
  parameters: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "The absolute path to the file to read"
      },
      offset: {
        type: "number",
        description: "The line number to start reading from (1-indexed). Only provide if the file is too large to read at once"
      },
      limit: {
        type: "number",
        description: "The number of lines to read. Only provide if the file is too large to read at once"
      }
    },
    required: ["file_path"]
  }
};

const handler = async (toolCall) => {
  const { file_path, offset = 1, limit } = toolCall.input;
  
  try {
    // Check if file exists
    if (!existsSync(file_path)) {
      return {
        error: `File does not exist: ${file_path}`
      };
    }

    const stats = statSync(file_path);
    const fileSize = stats.size;
    const ext = path.extname(file_path).toLowerCase();

    // Handle image files
    if (IMAGE_EXTENSIONS.has(ext)) {
      try {
        const buffer = readFileSync(file_path);
        return {
          type: 'image',
          base64: buffer.toString('base64'),
          mediaType: `image/${ext.slice(1)}`,
          fileName: path.basename(file_path)
        };
      } catch (error) {
        return {
          error: `Error reading image file: ${error.message}`
        };
      }
    }

    // Handle text files
    // Check file size for text files
    if (fileSize > MAX_OUTPUT_SIZE && !offset && !limit) {
      return {
        error: `File content (${Math.round(fileSize / 1024)}KB) exceeds maximum allowed size (${Math.round(MAX_OUTPUT_SIZE / 1024)}KB). Please use offset and limit parameters to read specific portions of the file.`
      };
    }

    // Read file content
    const content = readFileSync(file_path, 'utf8');
    const lines = content.split('\n');
    const totalLines = lines.length;
    
    // Apply offset and limit
    const lineOffset = offset === 0 ? 0 : offset - 1;
    const effectiveLimit = limit || MAX_LINES_TO_READ;
    const selectedLines = lines.slice(lineOffset, lineOffset + effectiveLimit);
    
    // Truncate long lines
    const truncatedLines = selectedLines.map(line => 
      line.length > MAX_LINE_LENGTH ? line.substring(0, MAX_LINE_LENGTH) + '...' : line
    );
    
    const selectedContent = truncatedLines.join('\n');
    
    // Check if selected content is too large
    if (selectedContent.length > MAX_OUTPUT_SIZE) {
      return {
        error: `Selected content (${Math.round(selectedContent.length / 1024)}KB) exceeds maximum allowed size (${Math.round(MAX_OUTPUT_SIZE / 1024)}KB). Please use a smaller limit or read a different portion of the file.`
      };
    }

    return {
      type: 'text',
      content: selectedContent,
      numLines: truncatedLines.length,
      startLine: offset,
      totalLines,
      fileName: path.basename(file_path),
      extension: extname(file_path).slice(1)
    };
  } catch (error) {
    return {
      error: `Error reading file: ${error.message}`
    };
  }
};

export { name, schema, handler };
