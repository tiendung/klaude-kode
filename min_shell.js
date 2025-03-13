import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const stdoutFile = path.join(os.tmpdir(), `shell-stdout-${Date.now()}`);
const stderrFile = path.join(os.tmpdir(), `shell-stderr-${Date.now()}`);
const statusFile = path.join(os.tmpdir(), `shell-status-${Date.now()}`);
const debugFile  = path.join(os.tmpdir(), `shell-debug-${Date.now()}`);

// Tạo các file tạm thời để lưu output
[stdoutFile, stderrFile, statusFile, debugFile].forEach(f => fs.writeFileSync(f, ''));

// Tìm vị trí của Git
const gitLocation = spawnSync('which', ['git']).stdout.toString().trim();
if (!gitLocation) {
  console.error('Git không được cài đặt hoặc không tìm thấy trong PATH.');
  // process.exit(1);
}

const cmd = 'git status';
const HOME = '/' + process.env.HOME.split('/').slice(1, 3).join('/');

const fullCommand = [
  `source ${HOME}/.bashrc`,                             // Source bashrc to get full environment
  `export PATH="${process.env.PATH}:/usr/bin"`,         // Đảm bảo PATH chứa vị trí git

  `echo "Current user: $USER" >> ${debugFile}`,
  `echo "Current home: $HOME" >> ${debugFile}`,
  `echo "Current PATH: $PATH" >> ${debugFile}`,
  `echo "Which git: $(which git)" >> ${debugFile}`,
  `for dir in $(echo $PATH | tr ':' ' '); do if [ -x "$dir/git" ]; then echo "git found in $dir" >> ${debugFile}; break; fi; done`,

  `${cmd} > ${stdoutFile} 2> ${stderrFile}`,            // Thực thi cmd, đầu ra ghi vào files
  `echo $? > ${statusFile}`                             // Ghi mã thoát vào file status
].join('\n');

// Gửi lệnh đến shell
const shell = spawn('/bin/bash', ['-l'], { 
  env: {
    ...process.env,
    BASH_ENV: HOME + '/.bashrc',
    PATH: process.env.PATH // Ensure PATH is passed through
  },
  stdio: ['pipe', 'pipe', 'pipe'] 
});

console.log(`Executing:\n\`\`\`bash\n${fullCommand}\n\`\`\``);
shell.stdin.write(fullCommand + '\n');

// Theo dõi đầu ra của shell (nếu có lỗi từ shell)
shell.stdout.on('data', (data) => {
  console.log('Shell stdout:', data.toString());
});

shell.stderr.on('data', (data) => {
  console.error('Shell stderr:', data.toString());
});

// Kiểm tra kết quả sau một khoảng thời gian
setTimeout(() => {
  try {
    console.log('\n--- DEBUG INFO ---');
    console.log(fs.readFileSync(debugFile, 'utf8'));
    
    console.log('--- RESULTS ---');
    const stdout = fs.readFileSync(stdoutFile, 'utf8');
    const stderr = fs.readFileSync(stderrFile, 'utf8');
    const status = fs.readFileSync(statusFile, 'utf8').trim();
    
    console.log('Exit code:', status);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
    
    // Dọn dẹp
    [stdoutFile, stderrFile, statusFile, debugFile].forEach(f => fs.unlinkSync(f, ''));
    shell.stdin.end();
  } catch (error) {
    console.error('Error reading results:', error);
  }
}, 600);


/* Bị lỗi sau:

bun min_shell.js 
Git không được cài đặt hoặc không tìm thấy trong PATH.
Executing:
```bash
source /home/t/.bashrc
export PATH="/snap/bun-js/62/usr/sbin:/snap/bun-js/62/usr/bin:/snap/bun-js/62/sbin:/snap/bun-js/62/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/usr/bin"
echo "Current user: $USER" >> /tmp/shell-debug-1741879458191
echo "Current home: $HOME" >> /tmp/shell-debug-1741879458191
echo "Current PATH: $PATH" >> /tmp/shell-debug-1741879458191
echo "Which git: $(which git)" >> /tmp/shell-debug-1741879458191
for dir in $(echo $PATH | tr ':' ' '); do if [ -x "$dir/git" ]; then echo "git found in $dir" >> /tmp/shell-debug-1741879458191; break; fi; done
git status > /tmp/shell-stdout-1741879458191 2> /tmp/shell-stderr-1741879458191
echo $? > /tmp/shell-status-1741879458191
```

--- DEBUG INFO ---
Current user: t
Current home: /home/t/snap/bun-js/62
Current PATH: /snap/bun-js/62/usr/sbin:/snap/bun-js/62/usr/bin:/snap/bun-js/62/sbin:/snap/bun-js/62/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/usr/bin
Which git:

--- RESULTS ---
Exit code: 127
stdout:
stderr: /bin/bash: line 8: git: command not found

*/