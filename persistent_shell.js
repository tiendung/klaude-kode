import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { cwd as processCwd } from 'process';

const TEMPFILE_PREFIX = os.tmpdir() + '/claude-';
const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SIGTERM_CODE = 143; // Standard exit code for SIGTERM
const FILE_SUFFIXES = {
  STATUS: '-status',
  STDOUT: '-stdout',
  STDERR: '-stderr',
     CWD: '-cwd',
};

// Simple function to quote shell commands
function quoteCommand(cmd) {
  if (typeof cmd !== 'string') return '';
  return `'${cmd.replace(/'/g, "'\\''")}'`;
}

export class PersistentShell {
  constructor(cwd) {
    this.binShell = process.env.SHELL || '/bin/bash';
    // Ensure shell inherits the correct PATH and other environment variables
    const shellEnv = { ...process.env };
    
    this.shell = spawn(this.binShell, ['-l'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd,
      env: { ...shellEnv, GIT_EDITOR: 'true'},
    });

    this.cwd = cwd;
    this.commandQueue = [];
    this.isExecuting = false;
    this.isAlive = true;
    this.commandInterrupted = false;

    this.shell.on('exit', (code, signal) => {
      if (code) {
        console.error(`Shell exited with code ${code} and signal ${signal}`);
      }
      for (const file of [this.statusFile, this.stdoutFile, this.stderrFile, this.cwdFile]) {
        if (fs.existsSync(file)) { fs.unlinkSync(file); } // Xoá tệp nếu tồn tại
      }
      this.isAlive = false;
    });

    // Generate unique ID for temp files
    const id = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');

    this.statusFile = TEMPFILE_PREFIX + id + FILE_SUFFIXES.STATUS;
    this.stdoutFile = TEMPFILE_PREFIX + id + FILE_SUFFIXES.STDOUT;
    this.stderrFile = TEMPFILE_PREFIX + id + FILE_SUFFIXES.STDERR;
    this.cwdFile = TEMPFILE_PREFIX + id + FILE_SUFFIXES.CWD;
    
    // Initialize temp files
    for (const file of [this.statusFile, this.stdoutFile, this.stderrFile]) {
      fs.writeFileSync(file, '');
    }
    
    // Initialize CWD file with initial directory
    fs.writeFileSync(this.cwdFile, cwd);
  }

  static instance = null;

  static restart() {
    if (PersistentShell.instance) {
      PersistentShell.instance.close();
      PersistentShell.instance = null;
    }
  }

  static getInstance() {
    if ( !PersistentShell.instance 
      || !PersistentShell.instance.isAlive ) {
      PersistentShell.instance = new PersistentShell(process.cwd());
    }
    return PersistentShell.instance;
  }

  killChildren() {
    const parentPid = this.shell.pid;
    try {
      const childPids = execSync(`pgrep -P ${parentPid}`)
        .toString().trim().split('\n').filter(Boolean); // Filter out empty strings

      childPids.forEach(pid => {
        try {
          process.kill(Number(pid), 'SIGTERM');
        } catch (error) {
          console.error(`Failed to kill process ${pid}: ${error}`);
        }
      });
    } catch {
      // pgrep returns non-zero when no processes are found - this is expected
    } finally {
      this.commandInterrupted = true;
    }
  }

  async processQueue() {
    if (this.isExecuting || this.commandQueue.length === 0) return;

    this.isExecuting = true;
    const { command, abortSignal, timeout, resolve, reject } = this.commandQueue.shift();

    const killChildren = () => this.killChildren();
    if (abortSignal) {
      abortSignal.addEventListener('abort', killChildren);
    }

    try {
      const result = await this.exec_(command, timeout);
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.isExecuting = false;
      if (abortSignal) {
        abortSignal.removeEventListener('abort', killChildren);
      }
      // Process next command in queue
      this.processQueue();
    }
  }

  async exec(command, abortSignal, timeout) {
    return new Promise((resolve, reject) => {
      this.commandQueue.push({ command, abortSignal, timeout, resolve, reject });
      this.processQueue();
    });
  }

  async exec_(command, timeout) {
    const quotedCommand = quoteCommand(command);

    // Check the syntax of the command
    try {
      execSync(`${this.binShell} -n -c ${quotedCommand}`, {
        stdio: 'ignore',
        timeout: 1000,
      });
    } catch (stderr) {
      // If there's a syntax error, return an error
      const errorStr = typeof stderr === 'string' ? stderr : String(stderr || '');
      return Promise.resolve({stdout: '', stderr: errorStr, code: 128, interrupted: false});
    }

    const commandTimeout = timeout || DEFAULT_TIMEOUT;
    // Reset interrupted state for new command
    this.commandInterrupted = false;
    
    return new Promise(resolve => {
      // Truncate output files
      fs.writeFileSync(this.stdoutFile, '');
      fs.writeFileSync(this.stderrFile, '');
      fs.writeFileSync(this.statusFile, '');
      
      // Break up the command sequence for clarity
      const commandParts = [];

      // 1. Execute the main command with redirections
      commandParts.push(`eval ${quotedCommand} < /dev/null > ${this.stdoutFile} 2> ${this.stderrFile}`);

      // 2. Capture exit code immediately after command execution
      commandParts.push(`EXEC_EXIT_CODE=$?`);

      // 3. Update CWD file
      commandParts.push(`pwd > ${this.cwdFile}`);

      // 4. Write the preserved exit code to status file
      commandParts.push(`echo $EXEC_EXIT_CODE > ${this.statusFile}`);

      // Send the combined commands as a single operation
      this.sendToShell(commandParts.join('\n'));

      // Check for command completion or timeout
      const start = Date.now();
      const checkCompletion = setInterval(() => {
        try {
          let statusFileSize = 0;
          if (fs.existsSync(this.statusFile)) {
            statusFileSize = fs.statSync(this.statusFile).size;
          }

          if ( statusFileSize > 0
            || Date.now() - start > commandTimeout
            || this.commandInterrupted
          ) {
            clearInterval(checkCompletion);
            const stdout = fs.existsSync(this.stdoutFile) ? fs.readFileSync(this.stdoutFile, 'utf8') : '';
            let   stderr = fs.existsSync(this.stderrFile) ? fs.readFileSync(this.stderrFile, 'utf8') : '';
            let     code = null;
            
            if (statusFileSize) {
              code = Number(fs.readFileSync(this.statusFile, 'utf8'));
            } else {
              // Timeout occurred - kill any running processes
              this.killChildren();
              code = SIGTERM_CODE;
              stderr += (stderr ? '\n' : '') + 'Command execution timed out';
            }
            
            resolve({ stdout, stderr, code, interrupted: this.commandInterrupted });
          }
        } catch {
          // Ignore file system errors during polling
        }
      }, 10); // Poll every 10ms
    });
  }

  sendToShell(command) {
    try {
      this.shell.stdin.write(command + '\n'); // ghi cmd ra shell rồi \n = Enter (thực thi)
      console.log(`sendToShell: \`${command}\``)
    } catch (error) {
      console.error(`Error in sendToShell: ${error}`);
      throw error;
    }
  }

  pwd() {
    try {
      const newCwd = fs.readFileSync(this.cwdFile, 'utf8').trim();
      if (newCwd) {
        this.cwd = newCwd;
      }
    } catch (error) {
      console.error(`Shell pwd error ${error}`);
    }
    // Always return the cached value
    return this.cwd;
  }

  async setCwd(cwd) {
    const resolved = path.isAbsolute(cwd) 
      ? cwd 
      : path.resolve(process.cwd(), cwd);
      
    if (!fs.existsSync(resolved)) {
      throw new Error(`Path "${resolved}" does not exist`);
    }
    await this.exec(`cd ${resolved}`);
  }

  close() {
    this.shell.stdin.end();
    this.shell.kill();
  }
}

// DO NOT ADD MORE STATE HERE OR BORIS WILL CURSE YOU
const STATE = {
  originalCwd: processCwd(),
};

export async function setCwd(cwd) {
  await PersistentShell.getInstance().setCwd(cwd);
}

export function setOriginalCwd(cwd) {
  STATE.originalCwd = cwd;
}

export function getOriginalCwd() {
  return STATE.originalCwd;
}

export function getCwd() {
  return PersistentShell.getInstance().pwd();
}

export function isGit() {
  return PersistentShell.getInstance().sendToShell('git status');
}
