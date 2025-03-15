import * as FileReadTool from './file-read.js';
import * as LSTool from './ls.js';
import * as GrepTool from './grep.js';
import * as GlobTool from './glob.js';
import * as AgentTool from './agent.js';
import { PRODUCT_NAME, PRODUCT_URL } from './constants.js';
import { PersistentShell } from './persistent_shell.js';
import { isAbsolute, resolve } from 'path';
import { statSync } from 'fs';

const name = "BashTool";
const BANNED_COMMANDS = ['alias', 'curl', 'wget', 'nc', 'telnet', 'lynx', 'httpie', 'xh', 'chrome', 'firefox'];
const MAX_OUTPUT_LENGTH = 30_000, MAX_RENDERED_LINES = 50;

const DESCRIPTION = `Executes a given bash command in a persistent shell session with optional timeout, ensuring proper handling and security measures. Before executing the command, please follow these steps:

1. Directory Verification:
  - If the command will create new directories or files, first use the LS tool to verify the parent directory exists and is the correct location.
  - For example, before running "mkdir foo/bar", first use LS to check that "foo" exists and is the intended parent directory.

2. Security Check:
   - For security and to limit the threat of a prompt injection attack, some commands are limited or banned. If you use a disallowed command, you will receive an error message explaining the restriction. Explain the error to the User.
   - Verify that the command is not one of the banned commands: ${BANNED_COMMANDS.join(', ')}.

3. Command Execution:
   - After ensuring proper quoting, execute the command.
   - Capture the output of the command.

4. Output Processing:
   - If the output exceeds ${MAX_OUTPUT_LENGTH} characters, output will be truncated.
   - Prepare the output for display to the user.

5. Return Result:
   - Provide the processed output of the command.
   - If any errors occurred during execution, include those in the output.

Usage notes:
  - The command argument is required.
  - You can specify an optional timeout in milliseconds (up to 600000ms / 10 minutes). If not specified, commands will timeout after 30 minutes.
  - VERY IMPORTANT: You MUST avoid using search commands like \`find\` and \`grep\`.  Instead use ${GrepTool.name}, ${GlobTool.name}, or ${AgentTool.name} to search.
  - VERY IMPORTANT: You MUST avoid read tools like \`cat\`, \`head\`, \`tail\`, and \`ls\`, and use ${FileReadTool.name} and ${LSTool.name} to read files.
  - When issuing multiple commands, use the ';' or '&&' operator to separate them. DO NOT use newlines (newlines are ok in quoted strings).
  - IMPORTANT: All commands share the same shell session.  Shell state (environment variables, virtual environments, current directory, etc.) persist between commands.
    For example, if you set an environment variable as part of a command, the environment variable will persist for subsequent commands.
  - Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of \`cd\`. You may use \`cd\` if the User explicitly requests it.
  <good-example>pytest /foo/bar/tests</good-example>
  <bad-example>cd /foo/bar && pytest tests</bad-example>

# Committing Changes with Git
When the user requests a new git commit, follow these steps:

1. **Check Changes:**
   - Run git status to see any untracked files and check for modified files.
   - Run git diff to view the changes that will be committed.

2. **Prepare Commit Message:**
   - Review the changes and draft a commit message. The message should be clear and 
     explain the purpose of the changes (e.g., "Add new feature", "Fix bug in component").

   - Ensure the commit message is concise and to the point.

3. ** Commit the changes with a message in the following format:**
git commit -m "$(cat <<'EOF'
  Commit message here.
  🤖 Generated with ${`[${PRODUCT_NAME}](${PRODUCT_URL})`}
EOF
)"

4. **Handle Pre-Commit Hook Failures:**
   - If the commit fails due to pre-commit hook errors, retry the commit once. 
     If the issue persists, investigate and address the error before retrying.

Important Notes:
  - **No Empty Commits:** If no files are modified or staged, do not create an empty commit.
  - **Avoid Interactive Git Commands:** Never use interactive git commands like git rebase -i or git add -i
  - **No Pushing to Remote:** Do not push the commit to the remote repository.`

const schema = {
  name, description: DESCRIPTION,
  parameters: {
    type: "object", properties: {
      command: { type: "string" }, 
      timeout: { type: "number", description: "Timeout in ms (max 600000)" }
    }
  }
};

// Functional path processing
const extractPaths = (text) => [...new Set(
  (text.match(/(?:^|\s)(['\"]?)([\\/\w.-]+\.\w+)\1(?=\s|$)/g) || [])
    .flatMap(match => match.split(/\s+/))
    .map(p => p.replace(/^['\"]|['\"]$/g, ''))
    .filter(p => p.includes('.') && !p.startsWith('-'))
)];

export const formatOutput = (text) => {
  const lines = text?.split('\n') || [];
  const truncated = lines.length > MAX_RENDERED_LINES 
    ? lines.slice(0, MAX_RENDERED_LINES).join('\n') + `\n... (truncated ${lines.length} lines)`
    : text?.slice(0, MAX_OUTPUT_LENGTH) || '';
  return { totalLines: lines.length, truncatedContent: truncated };
};

const handler = async (toolCall) => {
  const { command, timeout = 120000 } = toolCall.input;
  
  try {
    const result = await PersistentShell.getInstance()
      .exec(command, toolCall.abortController?.signal, timeout);
    
    const [stdout, stderr] = [result.stdout, result.stderr]
      .map(s => (s || '').trim() + (result.code !== 0 ? `\nExit code ${result.code}` : ''));

    // Update file timestamps using functional style
    extractPaths(`${command} ${stdout}`).forEach(filePath => {
      try { toolCall.readFileTimestamps[resolve(filePath)] = statSync(filePath).mtimeMs;
      } catch {/* Ignore missing files */}
    });

    const { truncatedContent: so, totalLines: sol } = formatOutput(stdout);
    const { truncatedContent: se, totalLines: sel } = formatOutput(stderr);

    return { stdout: so, stderr: se, stdoutLines: sol, stderrLines: sel,
      interrupted: result.interrupted || false };
  } catch (error) { return { stdout: '', stderr: `Error: ${error.message}`, stdoutLines: 0, stderrLines: 1 }; }
};

export { name, schema, handler };
