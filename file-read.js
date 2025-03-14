import { existsSync, readFileSync, statSync } from 'fs';
import * as path from 'path';
import { extname } from 'path';

const name = "FileReadTool";
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']);
const DESCRIPTION = `Reads a file from the local filesystem. The file_path parameter MUST be an absolute path.`;

const schema = {
  name: name, description: DESCRIPTION,
  parameters: {
    type: "object", required: ["file_path"],
    properties: { file_path: { type: "string", description: "The absolute path to the file to read" } },
  }
};

const handler = async (toolCall) => {
  const { file_path, offset = 1, limit } = toolCall.input;
  if (!existsSync(file_path)) { return { error: `File does not exist: ${file_path}` }; }
  
  try {
    const stats = statSync(file_path);
    const fileSize = stats.size;
    const ext = path.extname(file_path).toLowerCase();

    // return image file in base64
    if (IMAGE_EXTENSIONS.has(ext)) {
      return {
        type: 'image', base64: readFileSync(file_path).toString('base64'),
        mediaType: `image/${ext.slice(1)}`, fileName: path.basename(file_path),
      };
    } else { // Handle text files
      return {
        type: 'text', content: readFileSync(file_path, 'utf8'),
        fileName: path.basename(file_path), extension: extname(file_path).slice(1)
      };
    }
  } catch (error) { return { error: `Error reading file: ${error.message}` }; }
};

export { name, schema, handler };
