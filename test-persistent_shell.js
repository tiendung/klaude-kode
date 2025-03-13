import { PersistentShell } from './persistent_shell.js';
import { execSync } from 'child_process';

// Utility function for logging and error handling
async function runShellTest(testName, commandToTest, expectedSuccessLog = '') {
  console.log(`\nTesting PersistentShell with ${testName} command...`);
  
  try {
    const shell = PersistentShell.getInstance();
    
    console.log('\nRunning command...');
    const result = await shell.exec(commandToTest);
    console.log('Exit code:', result.code);
    
    if (result.code === 0) {
      console.log(expectedSuccessLog || 'Command executed successfully:');
      console.log(result.stdout.trim());
    } else {
      console.error(`Error: ${testName} command failed with stderr:`, result.stderr);
    }
    
    shell.close();
    return result;
  } catch (error) {
    console.error(`${testName} test failed with error:`, error);
    return null;
  }
}

// Check system git availability
function checkSystemGit() {
  try {
    const gitPath = execSync('which git').toString().trim();
    console.log('System git found at:', gitPath);
    return true;
  } catch (error) {
    console.error('Git not found on system. You may need to install git.');
    return false;
  }
}

// Specialized tests
async function testGitCommand() {
  const systemHasGit = checkSystemGit();
  
  const shell = PersistentShell.getInstance();
  
  // Additional git-specific environment checks
  console.log('\nChecking shell environment...');
  const pathResult = await shell.exec('echo $PATH');
  console.log('Shell PATH:', pathResult.stdout.trim());
  
  const whichResult = await shell.exec('which git || echo "not found"');
  console.log('Shell can find git at:', whichResult.stdout.trim());
  
  const result = await runShellTest('git', 'git --version', 
    systemHasGit ? undefined : 'Solutions: 1. Install git 2. Update PATH');
  
  shell.close();
  return result;
}

async function testLsCommand() {
  return runShellTest('ls', 'ls *.md');
}

// Run the tests
await testLsCommand();
await testGitCommand();