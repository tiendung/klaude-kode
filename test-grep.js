// Test script to check if GrepTool works after the fix
import * as GrepTool from './tools/grep.js';

async function testGrepTool() {
  console.log("Testing GrepTool with real project pattern...");
  
  try {
    const result = await GrepTool.handler({
      input: {
        pattern: "PersistentShell",
        path: ".",
        include: "*.js"
      }
    });
    
    if (result.error) {
      console.error("Error:", result.error);
      return;
    }
    
    console.log("Success! Results:");
    console.log(result.output);
  } catch (error) {
    console.error("Exception:", error);
  }
}

testGrepTool();