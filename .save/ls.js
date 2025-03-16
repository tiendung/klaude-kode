import { isAbsolute, join, relative, basename, sep } from 'path';
import { readdirSync } from 'fs';

const name = 'LSTool';
const MAX_FILES = 120;
const TRUNC_MSG = `There are more than ${MAX_FILES} files. Use specific tools to explore nested directories:\n\n`;

const schema = {
  name, description: `Lists files and directories (absolute paths only). Prefer Glob/Grep for known paths.`,
  parameters: {type: "object", properties: {path: {type: "string", description: "Absolute directory path"}}, required: ["path"]}
};

const skip = p => p !== '.' && (basename(p).startsWith('.') || p.includes('__pycache__/'));

const listDir = (path, cwd) => {
  const results = [];
  const process = p => {
    try {
      readdirSync(p, {withFileTypes: true}).forEach(d => {
        const full = join(p, d.name);
        if (skip(full)) return;
        d.isDirectory() ? process(full) : results.push(relative(cwd, full));
      });
    } catch(e) {}
  };
  process(path);
  return results.slice(0, MAX_FILES);
};

const makeTree = paths => paths.reduce((tree, p) => {
  p.split(sep).reduce((current, part, i, arr) => {
    const existing = current.find(n => n.name === part);
    if (!existing) {
      const newNode = {name: part, children: []};
      current.push(newNode);
      return newNode.children;
    }
    return existing.children;
  }, tree);
  return tree;
}, []);

const printTree = (nodes, depth = 0) => nodes.map(n => 
  `${'  '.repeat(depth)}- ${n.name}${n.children && n.children.length ? '/' : ''}\n` + 
  (n.children && n.children.length ? printTree(n.children, depth + 1) : '')
).join('');

const handler = async ({input: {path}}) => {
  if (!isAbsolute(path)) return {error: "Absolute path required"};
  
  const cwd = process.cwd();
  const files = listDir(path, cwd);
  const fileTree = makeTree(files);
  const output = printTree(fileTree);
  
  return files.length < MAX_FILES 
    ? {output, assistantOutput: output + "\nNOTE: Check for suspicious files"}
    : {
      output: `${TRUNC_MSG}${output}`, 
      assistantOutput: `${TRUNC_MSG}${output}\nNOTE: Check for suspicious files`
    };
};

export { name, schema, handler };
