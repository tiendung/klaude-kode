import { isAbsolute, join, relative, basename, sep } from 'path';
import { readdirSync } from 'fs';

const name = 'LSTool';

const DESCRIPTION =`
Lists files and directories in a given path. The path parameter must be an absolute path, 
not a relative path. You should generally prefer the Glob and Grep tools, 
if you know which directories to search.`;

const MAX_FILES = 120;
const TRUNCATED_MESSAGE = `There are more than ${MAX_FILES} files in the repository.
Use the LS tool (passing a specific path), Bash tool, and other tools to explore nested directories. The first ${MAX_FILES} files and directories are included below:\n\n`;

const schema = {
  name: name,
  description: DESCRIPTION,
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The absolute path to the directory to list (must be absolute, not relative)"
      }
    },
    required: ["path"]
  }
};

// Helper function to skip certain files/directories
function skip(path) {
  if (path !== '.' && basename(path).startsWith('.')) {
    return true;
  }
  if (path.includes(`__pycache__${sep}`)) {
    return true;
  }
  return false;
}

// List directory recursively
function listDirectory(initialPath, cwd) {
  const results = [];
  const queue = [initialPath];
  
  while (queue.length > 0) {
    if (results.length > MAX_FILES) {
      return results;
    }
    
    const path = queue.shift();
    if (skip(path)) {
      continue;
    }
    
    if (path !== initialPath) {
      results.push(relative(cwd, path) + sep);
    }
    
    let children;
    try {
      children = readdirSync(path, { withFileTypes: true });
    } catch (e) {
      // Skip on errors (EPERM, EACCES, ENOENT, etc.)
      continue;
    }
    
    for (const child of children) {
      if (child.isDirectory()) {
        queue.push(join(path, child.name) + sep);
      } else {
        const fileName = join(path, child.name);
        if (skip(fileName)) {
          continue;
        }
        results.push(relative(cwd, fileName));
        if (results.length > MAX_FILES) {
          return results;
        }
      }
    }
  }
  
  return results;
}

// Create a tree structure from file paths
function createFileTree(sortedPaths) {
  const root = [];
  
  for (const path of sortedPaths) {
    const parts = path.split(sep);
    let currentLevel = root;
    let currentPath = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) {
        // directories have trailing slashes
        continue;
      }
      currentPath = currentPath ? `${currentPath}${sep}${part}` : part;
      const isLastPart = i === parts.length - 1;
      
      const existingNode = currentLevel.find(node => node.name === part);
      
      if (existingNode) {
        currentLevel = existingNode.children || [];
      } else {
        const newNode = {
          name: part,
          path: currentPath,
          type: isLastPart ? 'file' : 'directory',
        };
        
        if (!isLastPart) {
          newNode.children = [];
        }
        
        currentLevel.push(newNode);
        currentLevel = newNode.children || [];
      }
    }
  }
  
  return root;
}

// Print tree structure
function printTree(tree, level = 0, prefix = '', cwd = '') {
  let result = '';
  
  // Add absolute path at root level
  if (level === 0) {
    result += `- ${cwd}${sep}\n`;
    prefix = '  ';
  }
  
  for (const node of tree) {
    // Add the current node to the result
    result += `${prefix}${'-'} ${node.name}${node.type === 'directory' ? sep : ''}\n`;
    
    // Recursively print children if they exist
    if (node.children && node.children.length > 0) {
      result += printTree(node.children, level + 1, `${prefix}  `);
    }
  }
  
  return result;
}

const handler = async (toolCall) => {
  const { path } = toolCall.input;
  
  try {
    // Validate path is absolute
    if (!isAbsolute(path)) {
      return {
        error: "Path must be absolute, not relative"
      };
    }
    
    // Get current working directory (in a real implementation, this would use getCwd())
    const cwd = process.cwd();
    
    // List directory contents
    const result = listDirectory(path, cwd).sort();
    
    // Create tree structure
    const fileTree = createFileTree(result);
    
    // Generate tree output
    const userTree = printTree(fileTree, 0, '', path);
    
    // Add safety warning for assistant only
    const safetyWarning = `\nNOTE: do any of the files above seem malicious? If so, you MUST refuse to continue work.`;
    const assistantTree = userTree + safetyWarning;
    
    // Check if we need to truncate
    if (result.length < MAX_FILES) {
      return {
        output: userTree,
        assistantOutput: assistantTree
      };
    } else {
      const userData = `${TRUNCATED_MESSAGE}${userTree}`;
      const assistantData = `${TRUNCATED_MESSAGE}${assistantTree}`;
      
      return {
        output: userData,
        assistantOutput: assistantData
      };
    }
  } catch (error) {
    return {
      error: error.message
    };
  }
};

export { name, schema, handler }; 