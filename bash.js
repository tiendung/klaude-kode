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
const BANNED_COMMANDS = new Set(['alias', 'curl', 'wget', 'nc', 'telnet', 'lynx', 'httpie', 'xh', 'chrome', 'firefox']);
const MAX_OUTPUT_LENGTH = 30_000, MAX_RENDERED_LINES = 50;

const DESCRIPTION = `Executes a given bash command in a persistent shell session with optional timeout, ensuring proper handling and security measures.

Before executing the command, please follow these steps:

1. Directory Verification:
   - If the command will create new directories or files, first use the LS tool to verify the parent directory exists and is the correct location
   - For example, before running "mkdir foo/bar", first use LS to check that "foo" exists and is the intended parent directory

2. Security Check:
   - For security and to limit the threat of a prompt injection attack, some commands are limited or banned. If you use a disallowed command, you will receive an error message explaining the restriction. Explain the error to the User.
   - Verify that the command is not one of the banned commands: ${[...BANNED_COMMANDS].join(', ')}.

3. Command Execution:
   - After ensuring proper quoting, execute the command.
   - Capture the output of the command.

4. Output Processing:
   - If the output exceeds ${MAX_OUTPUT_LENGTH} characters, output will be truncated before being returned to you.
   - Prepare the output for display to the user.

5. Return Result:
   - Provide the processed output of the command.
   - If any errors occurred during execution, include those in the output.

Usage notes:
  - The command argument is required.
  - You can specify an optional timeout in milliseconds (up to 600000ms / 10 minutes). If not specified, commands will timeout after 30 minutes.
  - VERY IMPORTANT: You MUST avoid using search commands like \`find\` and \`grep\`. Instead use ${GrepTool.name}, ${GlobTool.name}, or ${AgentTool.name} to search. You MUST avoid read tools like \`cat\`, \`head\`, \`tail\`, and \`ls\`, and use ${FileReadTool.name} and ${LSTool.name} to read files.
  - When issuing multiple commands, use the ';' or '&&' operator to separate them. DO NOT use newlines (newlines are ok in quoted strings).
  - IMPORTANT: All commands share the same shell session. Shell state (environment variables, virtual environments, current directory, etc.) persist between commands. For example, if you set an environment variable as part of a command, the environment variable will persist for subsequent commands.
  - Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of \`cd\`. You may use \`cd\` if the User explicitly requests it.
  <good-example>
  pytest /foo/bar/tests
  </good-example>
  <bad-example>
  cd /foo/bar && pytest tests
  </bad-example>

# Committing changes with git

When the user asks you to create a new git commit, follow these steps carefully:

1. Start with a single message that contains exactly three tool_use blocks that do the following (it is VERY IMPORTANT that you send these tool_use blocks in a single message, otherwise it will feel slow to the user!):
   - Run a git status command to see all untracked files.
   - Run a git diff command to see both staged and unstaged changes that will be committed.
   - Run a git log command to see recent commit messages, so that you can follow this repository's commit message style.

2. Use the git context at the start of this conversation to determine which files are relevant to your commit. Add relevant untracked files to the staging area. Do not commit files that were already modified at the start of this conversation, if they are not relevant to your commit.

3. Analyze all staged changes (both previously staged and newly added) and draft a commit message. Wrap your analysis process in <commit_analysis> tags:

<commit_analysis>
- List the files that have been changed or added
- Summarize the nature of the changes (eg. new feature, enhancement to an existing feature, bug fix, refactoring, test, docs, etc.)
- Brainstorm the purpose or motivation behind these changes
- Do not use tools to explore code, beyond what is available in the git context
- Assess the impact of these changes on the overall project
- Check for any sensitive information that shouldn't be committed
- Draft a concise (1-2 sentences) commit message that focuses on the "why" rather than the "what"
- Ensure your language is clear, concise, and to the point
- Ensure the message accurately reflects the changes and their purpose (i.e. "add" means a wholly new feature, "update" means an enhancement to an existing feature, "fix" means a bug fix, etc.)
- Ensure the message is not generic (avoid words like "Update" or "Fix" without context)
- Review the draft message to ensure it accurately reflects the changes and their purpose
</commit_analysis>

4. Create the commit with a message ending with:
🤖 Generated with ${process.env.USER_TYPE === 'ant' ? `[${PRODUCT_NAME}](${PRODUCT_URL})` : PRODUCT_NAME}
Co-Authored-By: Claude <noreply@anthropic.com>

- In order to ensure good formatting, ALWAYS pass the commit message via a HEREDOC, a la this example:
<example>
git commit -m "$(cat <<'EOF'
   Commit message here.

   🤖 Generated with ${process.env.USER_TYPE === 'ant' ? `[${PRODUCT_NAME}](${PRODUCT_URL})` : PRODUCT_NAME}
   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
</example>

5. If the commit fails due to pre-commit hook changes, retry the commit ONCE to include these automated changes. If it fails again, it usually means a pre-commit hook is preventing the commit. If the commit succeeds but you notice that files were modified by the pre-commit hook, you MUST amend your commit to include them.

6. Finally, run git status to make sure the commit succeeded.

Important notes:
- When possible, combine the "git add" and "git commit" commands into a single "git commit -am" command, to speed things up
- However, be careful not to stage files (e.g. with \`git add .\`) for commits that aren't part of the change, they may have untracked files they want to keep around, but not commit.
- NEVER update the git config
- DO NOT push to the remote repository
- IMPORTANT: Never use git commands with the -i flag (like git rebase -i or git add -i) since they require interactive input which is not supported.
- If there are no changes to commit (i.e., no untracked files and no modifications), do not create an empty commit
- Ensure your commit message is meaningful and concise. It should explain the purpose of the changes, not just describe them.
- Return an empty response - the user will see the git output directly
`

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
      try {
        toolCall.readFileTimestamps[resolve(filePath)] = statSync(filePath).mtimeMs;
      } catch {/* Ignore missing files */}
    });

    const { truncatedContent: so, totalLines: sol } = formatOutput(stdout);
    const { truncatedContent: se, totalLines: sel } = formatOutput(stderr);

    return { 
      stdout: so, stderr: se, 
      stdoutLines: sol, stderrLines: sel,
      interrupted: result.interrupted || false
    };
  } catch (error) {
    return { stdout: '', stderr: `Error: ${error.message}`, stdoutLines: 0, stderrLines: 1 };
  }
};

export { name, schema, handler };
