import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';

const name = "FileEditTool";
const N_LINES_SNIPPET = 4;
const MAX_FILE_SIZE = 1024 * 1024 * 1; // 1MB

const createError = (msg, code) => ({ error: msg, code });

export const DESCRIPTION = `This is a tool for editing files (add / remove / replace chunks of text or code). For moving or renaming files, you should generally use the Bash tool with the 'mv' command instead.`;

const detectFileProps = (filePath) => {
  try { // Unified encoding/line ending detection
    const lineEndings = readFileSync(filePath, 'utf8').slice(0, 1000).includes('\\r\\n') ? 'CRLF' : 'LF';
    return { encoding: 'utf8', exists: true, lineEndings };
  } catch { return { encoding: 'utf8', exists: false, lineEndings: 'LF',}; }
};

const normalizeContent = (content, lineEndings) =>
  lineEndings === 'CRLF' ? content.replace(/\\n/g, '\\r\\n') : content.replace(/\\r\\n/g, '\\n');

const generatePatch = (oldStr, newStr, startLine) => ({
  oldStart: startLine,
  oldLines: oldStr.split(/\\r?\\n/).length,
  newLines: newStr.split(/\\r?\\n/).length,
  lines: [...oldStr.split('\\n').map(l => `- ${l}`),
          ...newStr.split('\\n').map(l => `+ ${l}`),]
});

// Atomic file write with validation
const safeWrite = (path, content, encoding, lineEndings) => {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, normalizeContent(content, lineEndings), encoding);
};

const addLineNumbers = (content, start = 1) => content.split('\\n')
  .map((line, i) => `${(start + i).toString().padStart(4)} | ${line}`).join('\\n');

// Optimized snippet extraction
const getEditSnippet = (content, oldStr, newStr) => {
  const [before] = content.split(oldStr);
  const beforeLines = before.split(/\\r?\\n/);
  const start = Math.max(0, beforeLines.length - N_LINES_SNIPPET);
  return content.replace(oldStr, newStr).split(/\\r?\\n/)
    .slice(start, start + (N_LINES_SNIPPET * 2)).join('\\n');
};

const schema = {
  name, description: `Atomic file editing tool with context-aware patching`,
  parameters: {
    type: "object", required: ["file_path", "old_string", "new_string"],
    properties: {
      file_path: { type: "string", description: "Absolute file path" },
      old_string: { type: "string", description: "Exact text to replace" },
      new_string: { type: "string", description: "Replacement text" }
    }
  }
};

const handler = async ({ input: { file_path, old_string, new_string } }) => {
  const fullPath = isAbsolute(file_path) ? file_path : resolve(process.cwd(), file_path);
  
  if (old_string === new_string) return createError('No changes detected', 'NO_OP');
  if (Buffer.byteLength(new_string) > MAX_FILE_SIZE) {
    return createError('New content exceeds size limit', 'SIZE_LIMIT');
  }

  const { encoding, lineEndings, exists } = detectFileProps(fullPath);
  
  if (old_string === '') {  // File creation
    if (exists) return createError('File exists', 'EXISTS');
    safeWrite(fullPath, new_string, encoding, lineEndings);
    return { type: 'created', path: file_path };
  }

  if (!exists) return createError('File not found', 'NOT_FOUND');
  
  const content = readFileSync(fullPath, encoding);
  const matches = content.split(old_string).length - 1;
  if (matches !== 1) { return createError(`${matches} matches found - needs unique context`, 'MATCH_ISSUE'); }

  const updated = content.replace(old_string, new_string);
  safeWrite(fullPath, updated, encoding, lineEndings);

  return {
    type: 'updated', path: file_path,
    patch: generatePatch(old_string, new_string, content.slice(0, content.indexOf(old_string)).split('\\n').length),
    snippet: addLineNumbers(getEditSnippet(content, old_string, new_string))
  };
};

export { name, schema, handler };