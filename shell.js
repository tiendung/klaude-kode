import { spawn, execSync } from 'child_process';
import { tmpdir, platform } from 'os';
import { existsSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { cwd as processCwd, env } from 'process';

const SHELL = env.SHELL || '/bin/bash';
const TEMP_PREFIX = `${tmpdir()}/klaude-`;
const FILE_TYPES = ['status', 'stdout', 'stderr', 'cwd'];
const SIGTERM_CODE = 143;

export class PersistentShell {
  static instance = null;
  static getInstance = () => PersistentShell.instance ||
    (PersistentShell.instance = new PersistentShell(processCwd()));

  constructor(cwd) {
    this.shell = spawn(SHELL, ['-l'], {
      stdio: ['pipe', 'pipe', 'pipe'], cwd,
      env: { ...env, GIT_EDITOR: 'true' }
    });
    this.queue = [];
    this.id = Math.random().toString(16).slice(2,6);
    this.files = FILE_TYPES.reduce((a,t) =>
      (a[t] = `${TEMP_PREFIX}${this.id}-${t}`, writeFileSync(a[t], ''), a), {});

    writeFileSync(this.files.cwd, cwd);
    this.shell.on('exit', () => FILE_TYPES.forEach(t =>
      existsSync(this.files[t]) && unlinkSync(this.files[t])));
  }

  exec = (cmd, signal, timeout = 1800000) => new Promise((resolve, reject) => {
    const processCommand = async () => {
      try {
        execSync(`${SHELL} -n -c ${this.quote(cmd)}`, { stdio: 'ignore' });
        const result = await this.runCommand(cmd, timeout);
        signal?.removeEventListener('abort', this.killChildren);
        resolve(result);
      } catch(e) {
        reject({ stdout: '', stderr: e.message, code: 128, interrupted: false });
      } finally {
        this.queue.shift();
        this.queue.length && processCommand();
      }
    };

    signal?.addEventListener('abort', this.killChildren);
    this.queue.push(processCommand);
    this.queue.length === 1 && processCommand();
  });

  runCommand = (cmd, timeout) => new Promise(resolve => {
    const start = Date.now();
    const cleanup = () => clearInterval(check);
    const check = setInterval(() => {
      if (Date.now() - start > timeout || readFileSync(this.files.status).length) {
        cleanup();
        const stdout = readFileSync(this.files.stdout, 'utf8');
        const stderr = readFileSync(this.files.stderr, 'utf8');
        const code = readFileSync(this.files.status, 'utf8') || SIGTERM_CODE;
        resolve({ stdout, stderr, code: +code, interrupted: !this.shell.killed });
      }
    }, 10);

    writeFileSync(this.files.status, '');
    this.shell.stdin.write(`${cmd} >${this.files.stdout} 2>${this.files.stderr}; echo $? >${this.files.status}\n`);
  });

  quote = cmd => `'${cmd.replace(/'/g, "'\\''")}'`;
  killChildren = () => execSync(`pkill -P ${this.shell.pid}`, { stdio: 'ignore' });
  pwd = () => readFileSync(this.files.cwd, 'utf8').trim();
  setCwd = async path => this.exec(`cd ${path} && pwd >${this.files.cwd}`);
}

// Static helpers
export const getCwd = () => PersistentShell.getInstance().pwd();
export const setCwd = path => PersistentShell.getInstance().setCwd(path);
export const isGit = () => PersistentShell.getInstance().exec('git rev-parse --is-inside-work-tree');