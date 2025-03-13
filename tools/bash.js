import { exec } from 'child_process';
import * as FileReadTool from './file-read.js';
import * as LSTool from './ls.js';
import * as GrepTool from './grep.js';
import * as GlobTool from './glob.js';
import * as AgentTool from './agent.js';
import { PRODUCT_NAME, PRODUCT_URL } from '../constants.js';
import { PersistentShell } from '../persistent_shell.js';
import { isAbsolute, relative, resolve } from 'path';
import { statSync } from 'fs';

const name = "BashTool";
const BANNED_COMMANDS = [
  'alias',
  'curl',
  'curlie',
  'wget',
  'axel',
  'aria2c',
  'nc',
  'telnet',
  'lynx',
  'w3m',
  'links',
  'httpie',
  'xh',
  'http-prompt',
  'chrome',
  'firefox',
  'safari',
]

const MAX_OUTPUT_LENGTH = 30000
const MAX_RENDERED_LINES = 50

const DESCRIPTION = `
Executes a given bash command in a persistent shell session with optional timeout, 
ensuring proper handling and security measures.


Before executing the command, please follow these steps:


1. Directory Verification:

  - If the command will create new directories or files, 
    first use the LS tool to verify the parent directory exists and is the correct location.

  - For example, before running "mkdir foo/bar", 
    first use LS to check that "foo" exists and is the intended parent directory


2. Security Check:

   - For security and to limit the threat of a prompt injection attack, 
     some commands are limited or banned. If you use a disallowed command, 
     you will receive an error message explaining the restriction.
     Explain the error to the User.

   - Verify that the command is not one of the banned commands: ${BANNED_COMMANDS.join(', ')}.


3. Command Execution:

   - After ensuring proper quoting, execute the command.

   - Capture the output of the command.


4. Output Processing:

   - If the output exceeds ${MAX_OUTPUT_LENGTH} characters, 
     output will be truncated before being returned to you.

   - Prepare the output for display to the user.


5. Return Result:

   - Provide the processed output of the command.

   - If any errors occurred during execution, include those in the output.


Usage notes:

  - The command argument is required.

  - You can specify an optional timeout in milliseconds (up to 600000ms / 10 minutes).
    If not specified, commands will timeout after 30 minutes.

  - VERY IMPORTANT: You MUST avoid using search commands like \`find\` and \`grep\`. 
    Instead use ${GrepTool.name}, ${GlobTool.name}, or ${AgentTool.name} to search.

  - VERY IMPORTANT: You MUST avoid read tools like \`cat\`, \`head\`, \`tail\`, and \`ls\`, 
    and use ${FileReadTool.name} and ${LSTool.name} to read files.

  - When issuing multiple commands, use the ';' or '&&' operator to separate them. 
    DO NOT use newlines (newlines are ok in quoted strings).

  - IMPORTANT: All commands share the same shell session.  Shell state (environment variables, 
    virtual environments, current directory, etc.) persist between commands.

    For example, if you set an environment variable as part of a command, 
    the environment variable will persist for subsequent commands.

  - Try to maintain your current working directory throughout the session by using absolute paths 
    and avoiding usage of \`cd\`. You may use \`cd\` if the User explicitly requests it.

  <good-example>
  pytest /foo/bar/tests
  </good-example>
  <bad-example>
  cd /foo/bar && pytest tests
  </bad-example>


# Committing Changes with Git

When the user requests a new git commit, follow these steps:

1. **Check Changes:**
   - Run git status to see any untracked files and check for modified files.
   - Run git diff to view the changes that will be committed.

2. **Prepare Commit Message:**
   - Review the changes and draft a commit message. The message should be clear and 
     explain the purpose of the changes (e.g., "Add new feature", "Fix bug in component").

   - Ensure the commit message is concise and to the point.

3. **Create Commit:**
   - Commit the changes with a message in the following format:
   git commit -m "$(cat <<'EOF'
      Commit message here.
      
      🤖 Generated with ${`[${PRODUCT_NAME}](${PRODUCT_URL})`}
   EOF
   )"

4. **Handle Pre-Commit Hook Failures:**
   - If the commit fails due to pre-commit hook errors, retry the commit once. If the issue persists, investigate and address the error before retrying.

5. **Final Check:**
   - Run git status after the commit to verify that the changes were successfully committed.


Important Notes:

  - **No Empty Commits:**  
    If no files are modified or staged, do not create an empty commit.

  - **Avoid Interactive Git Commands:**
    Never use git commands that require interactive input (e.g., git rebase -i or git add -i) 
    as they are not supported.

  - **No Pushing to Remote:**  
    Do not push the commit to the remote repository.
`

const schema = {
  name: name,
  description: DESCRIPTION,
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The bash command to run"
      }, 
      timeout: {
        type: "number",
        description: "Optional timeout in milliseconds (max 600000)"
      }
    }
  }
}

// Helper function to get file paths from command and stdout
const getCommandFilePaths = (command, stdout) => {
  const paths = [];
  
  // Extract paths from command
  const commandPaths = command.match(/(?:^|\s)(['"]?)([\/\w\.-]+\.\w+)\1(?=\s|$)/g);
  if (commandPaths) {
    commandPaths.forEach(path => {
      const cleanPath = path.trim().replace(/^['"]|['"]$/g, '');
      if (cleanPath.includes('.') && !cleanPath.startsWith('-')) {
        paths.push(cleanPath);
      }
    });
  }
  
  // Extract paths from stdout (e.g., from ls or find commands)
  const stdoutPaths = stdout.match(/(?:^|\s)([\/\w\.-]+\.\w+)(?=\s|$)/g);
  if (stdoutPaths) {
    stdoutPaths.forEach(path => {
      const cleanPath = path.trim();
      if (cleanPath.includes('.') && !cleanPath.startsWith('-')) {
        paths.push(cleanPath);
      }
    });
  }
  
  return [...new Set(paths)]; // Remove duplicates
};

// Format output function
const formatOutput = (text) => {
  if (!text) return { totalLines: 0, truncatedContent: '' };
  
  const lines = text.split('\n');
  const totalLines = lines.length;
  
  // Truncate if too long
  if (text.length > MAX_OUTPUT_LENGTH) {
    const truncatedContent = text.substring(0, MAX_OUTPUT_LENGTH) + 
      `\n... (output truncated, ${totalLines} lines total)`;
    return { totalLines, truncatedContent };
  }
  
  return { totalLines, truncatedContent: text };
};

const handler = async (toolCall) => {
  const { command, timeout = 120000 } = toolCall.input;
  let stdout = '';
  let stderr = '';
  
  try {
    // Execute command using PersistentShell
    const result = await PersistentShell.getInstance().exec(
      command,
      toolCall.abortController?.signal,
      timeout
    );
    
    stdout += (result.stdout || '').trim() + '\n';
    stderr += (result.stderr || '').trim() + '\n';
    
    if (result.code !== 0) {
      stderr += `Exit code ${result.code}`;
    }
    
    // Update read timestamps for any files referenced by the command
    if (toolCall.readFileTimestamps) {
      getCommandFilePaths(command, stdout).forEach(filePath => {
        const fullFilePath = isAbsolute(filePath)
          ? filePath
          : resolve(process.cwd(), filePath);

        // Try/catch in case the file doesn't exist
        try {
          toolCall.readFileTimestamps[fullFilePath] = statSync(fullFilePath).mtimeMs;
        } catch (e) {
          console.error(e);
        }
      });
    }
    
    const { totalLines: stdoutLines, truncatedContent: stdoutContent } =
      formatOutput(stdout.trim());
    const { totalLines: stderrLines, truncatedContent: stderrContent } =
      formatOutput(stderr.trim());
    
    const data = {
      stdout: stdoutContent,
      stdoutLines,
      stderr: stderrContent,
      stderrLines,
      interrupted: result.interrupted || false
    };
    
    return data;
  } catch (error) {
    return {
      stdout: '',
      stdoutLines: 0,
      stderr: `Error executing command: ${error.message}`,
      stderrLines: 1,
      interrupted: false
    };
  }
};

export { name, schema, handler, formatOutput, getCommandFilePaths };