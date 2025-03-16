import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';

const name = "ThinkTool";
const DESCRIPTION = `
A thinking tool that helps to brainstorm, write creatively, code, program, plan, debugs, explain things. 
Really good to solve hard problem that cannot be solved normally.

Usage: Provide a clear problem statement.

Examples:
k -c explain how file-edit.js work
k -c brainstorming how should we make abc.js more concise? follow api.js style, apply the changes right after.
`;

const schema = {
  name, description: DESCRIPTION,
  parameters: {
    type: "object", required: ["prompt"],
    properties: {
      prompt: { type: "string", description: "The problem or task to think about" },
      model: { type: "string", default: "deepseek-ai/DeepSeek-R1" },
      temperature: { type: "number", description: "Controls randomness (0.6-0.65)", default: 0.6 },
      max_tokens: { type: "number", default: 8000 }
    }
  }
};

const readFileContent = async (filePath) => {
  try { return await fs.readFile(filePath, 'utf8'); } 
  catch (error) { return `[Error reading file: ${error.message}]`; }
};

const getAllFiles = async () => {
  const entries = await fs.readdir('.', { withFileTypes: true });
  return entries
    .filter(entry => !entry.isDirectory() && /\.(js|KLAUDE\.md)$/.test(entry.name))
    .map(entry => entry.name);
};

const MAX_DIFF_LENGTH = 10000; // ~10k characters

function getStagedDiff() {
  try {
    const diff = execSync('git diff --cached --no-color', { encoding: 'utf8' });
    return processDiff(diff, 'staged');
  } catch (error) {
    return {  diff: `Error: ${error.message}`, summary: { error: true, files: 0, additions: 0, deletions: 0 } };
  }
}

function getUnstagedDiff() {
  try {
    const diff = execSync('git diff --no-color', { encoding: 'utf8' });
    return processDiff(diff, 'unstaged');
  } catch (error) {
    return { diff: `Error: ${error.message}`, summary: { error: true, files: 0, additions: 0, deletions: 0 } };
  }
}

function processDiff(rawDiff, type) {
  const lines = rawDiff.split('\n');
  let additions = 0, deletions = 0;
  
  lines.forEach(line => {
    if (line.startsWith('+') && !line.startsWith('+++')) additions++;
    if (line.startsWith('-') && !line.startsWith('---')) deletions++;
  });

  const truncated = rawDiff.length > MAX_DIFF_LENGTH
    ? rawDiff.slice(0, MAX_DIFF_LENGTH) + '\n... (truncated)'
    : rawDiff;

  return {
    diff: truncated,
    summary: {
      type, additions, deletions,
      files: rawDiff.match(/^diff --git/g)?.length || 0,
      truncated: rawDiff.length > MAX_DIFF_LENGTH
    }
  };
}

function collectGitDiffs() { return { staged: getStagedDiff(), unstaged: getUnstagedDiff() }; }

const queryTogetherAI = async ({ model, messages, temperature = 0.6, max_tokens = 8000 }) => {
  try {
    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.TOGETHER_API_KEY}`
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens, stop: ["<｜end▁of▁sentence｜>"] })
    });
    return await response.json();
  } catch (error) { console.error("AI Query Error:", error); }
};

const handler = async (toolCall) => {
  const { prompt, model = "deepseek-ai/DeepSeek-R1", temperature = 0.6, max_tokens = 8000 } = toolCall.input;

  const files = await getAllFiles();
  const fileContents = await Promise.all(
    files.map(async (file) => `<file name='${file}'>${await readFileContent(file)}</file>`)
  );
  
  const gitDiffs = collectGitDiffs();
  const diffContext = `\n<git-diffs>\n  <staged-changes files="${gitDiffs.staged.summary.files}">\n    ${gitDiffs.staged.diff}\n  </staged-changes>\n  <unstaged-changes files="${gitDiffs.unstaged.summary.files}">\n    ${gitDiffs.unstaged.diff}\n  </unstaged-changes>\n</git-diffs>`;

  const messages = [
    { role: "user", content: `<context>${fileContents.join('\n')}</context>${diffContext}\n\n${prompt}` },
    { role: "assistant", content: "<think>\n" }
  ];

  const response = await queryTogetherAI({ model, messages, temperature, max_tokens });
  const fullResponse = response.choices?.[0]?.message?.content || "";
  let [think, answer] = fullResponse.split('</think>').map(s => s.trim());
  if (answer) { think += "</think>"; }

  console.log(`\x1b[33m${model}:\x1b[0m ${think}\n\x1b[32m<answer>\x1b[0m${answer}\x1b[32m</answer>\x1b[0m`);
  return { result: answer || think };
};

export { name, schema, handler };
