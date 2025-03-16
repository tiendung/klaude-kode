import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, isAbsolute, relative } from 'path';

const name = "FileWriteTool";

const schema = { // test prompt: k -c apply api.js concise style into think.js
  name, description: `Write new content to a file or create a brand new file. You MUST prepare content carefully. Content cannot be empty.`,
  parameters: {
    type: "object", required: ["file_path", "content"],
    properties: {
      file_path: { type: "string", description: "The absolute path to the file to write (not relative)" },
      content: { type: "string", description: "The content to write to the file" }
    }
  }
};

// Compact line ending detection
const detectLineEndings = (content) => content.includes('\r\n') ? '\r\n' : '\n';
const detectRepoEndings = () => process.platform === 'win32' ? '\r\n' : '\n';

// Functional-style content normalization
const normalizeContent = (content, endings) => 
  content.replace(/\r\n|\r|\n/g, endings).trim() + '\n';

const addLineNumbers = (content, start=1) => 
  content.split('\n').map((l,i) => `${(start+i).toString().padStart(4)} | ${l}`).join('\n');

// Unified error handler
const handleError = (error, context) => {
  console.error(`\x1b[31mFileWriteError: ${context}\x1b[0m`, error.message);
  return { error: `${context}: ${error.message}` };
};

const handler = async ({ input: { file_path, content } }) => {
  try {
    if (!isAbsolute(file_path)) return { error: "Path must be absolute" };
    
    const cwd = process.cwd();
    const dir = dirname(file_path);
    const exists = existsSync(file_path);
    
    // Read existing content with error suppression
    const oldContent = exists ? readFileSync(file_path, 'utf8') : '';
    const endings = exists ? detectLineEndings(oldContent) : detectRepoEndings();
    
    // Create directory in one line with error handling
    try { mkdirSync(dir, { recursive: true }); } 
    catch (e) { return handleError(e, 'CreateDirFailed'); }

    const normalized = normalizeContent(content, endings);
    writeFileSync(file_path, normalized, 'utf8');

    return exists ? {
      type: 'updated',
      filePath: relative(cwd, file_path),
      patch: [`- ${oldContent.split('\n').length}`, `+ ${oldContent.split('\n').length}`],
      preview: addLineNumbers(normalized)
    } : {
      type: 'created',
      filePath: relative(cwd, file_path),
      preview: `New file created with ${normalized.length} bytes`
    };
  } catch (error) { return handleError(error, 'WriteOperation'); }
};

export { name, schema, handler };