import { PersistentShell } from './persistent_shell.js';
import { execSync } from 'child_process';

// Test function to run git command
async function testGitCommand() {
  console.log('\nTesting PersistentShell with git command...');
  
  // Check if git is available on the system
  let systemHasGit = false;
  try {
    const gitPath = execSync('which git').toString().trim();
    console.log('System git found at:', gitPath);
    systemHasGit = true;
  } catch (error) {
    console.error('Git not found on system. This is the root cause of error03.md issue.');
    console.log('You need to install git to resolve this issue.');
  }
  
  try {
    // Get the shell instance
    const shell = PersistentShell.getInstance();
    
    // Check shell environment
    console.log('\nChecking shell environment...');
    const pathResult = await shell.exec('echo $PATH');
    console.log('Shell PATH:', pathResult.stdout.trim());
    
    // Try to locate git in the shell
    const whichResult = await shell.exec('which git || echo "not found"');
    console.log('Shell can find git at:', whichResult.stdout.trim());
    
    // Try to execute git command
    console.log('\nTesting git command...');
    const gitResult = await shell.exec('git --version');
    console.log('Exit code:', gitResult.code);
    
    if (gitResult.code === 0) {
      console.log('Success! Git command executed:', gitResult.stdout.trim());
    } else {
      console.error('Error: Git command failed with stderr:', gitResult.stderr);
      
      if (systemHasGit) {
        console.log('\nSuggested solutions:');
        console.log('1. Make sure git is installed and in your PATH');
        console.log('2. Ensure the shell in persistent_shell.js can access git');
      }
    }
    
    // Clean up
    shell.close();
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Test function to run ls command
async function testLsCommand() {
  console.log('\nTesting PersistentShell with ls command...');
  
  try {
    // Get the shell instance
    const shell = PersistentShell.getInstance();
    
    // Execute ls command in current directory
    console.log('\nRunning ls command...');
    const lsResult = await shell.exec('ls *.md');
    console.log('Exit code:', lsResult.code);
    
    if (lsResult.code === 0) {
      console.log('Successful ls command:');
      console.log(lsResult.stdout.trim());
    } else {
      console.error('Error: ls command failed with stderr:', lsResult.stderr);
    }
    
    // Clean up
    shell.close();
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the tests
await testLsCommand();
await testGitCommand();
