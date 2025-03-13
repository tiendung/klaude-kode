import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const stdoutFile = path.join(os.tmpdir(), `shell-stdout-${Date.now()}`);
const stderrFile = path.join(os.tmpdir(), `shell-stderr-${Date.now()}`);
const statusFile = path.join(os.tmpdir(), `shell-status-${Date.now()}`);
const debugFile  = path.join(os.tmpdir(), `shell-debug-${Date.now()}`);

// Tạo các file tạm thời để lưu output
[stdoutFile, stderrFile, statusFile, debugFile].forEach(f => fs.writeFileSync(f, ''));

const cmd = '/usr/bin/git status';
const HOME = '/' + process.env.HOME.split('/').slice(1, 3).join('/');

const fullCommand = [
  `source ${HOME}/.bashrc`,                             // Source bashrc to get full environment
  `export PATH="${process.env.PATH}:/usr/bin"`,         // Đảm bảo PATH chứa vị trí git
  `echo "Current PATH: $PATH" > ${debugFile}`,          // Ghi log PATH
  `echo "Git location: $(which git)" >> ${debugFile}`,  // Kiểm tra vị trí git
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
}, 300);
