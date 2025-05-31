#!/usr/bin/env node

/**
 * Manual test runner for Quick Mode
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

const CLI_PATH = path.join(__dirname, '../../bin/create-datadao.js');
const TEST_DIR = path.join(__dirname, '../../test-output');

async function runQuickModeTest() {
  console.log(chalk.blue('🚀 Testing Quick Mode'));
  console.log();

  try {
    // Clean test directory
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
    
    const projectName = 'quick-test-' + Date.now();
    console.log(chalk.blue(`📁 Creating project: ${projectName}`));
    console.log();
    
    // Run quick mode
    const command = `node "${CLI_PATH}" create ${projectName} --quick`;
    console.log(chalk.gray(`Command: ${command}`));
    console.log();
    
    const output = execSync(command, {
      cwd: TEST_DIR,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 60000 // 1 minute
    });
    
    console.log(chalk.green('✅ Quick Mode executed successfully'));
    console.log();
    console.log(chalk.blue('📊 Output:'));
    console.log(output);
    
    // Verify project structure
    const projectPath = path.join(TEST_DIR, projectName);
    console.log(chalk.blue('🔍 Verifying project structure...'));
    
    if (fs.existsSync(path.join(projectPath, 'deployment.json'))) {
      const deployment = await fs.readJson(path.join(projectPath, 'deployment.json'));
      console.log();
      console.log(chalk.blue('📋 Deployment Configuration:'));
      console.log(chalk.cyan(`  DataDAO Name: ${deployment.dlpName}`));
      console.log(chalk.cyan(`  Token Name: ${deployment.tokenName}`));
      console.log(chalk.cyan(`  Token Symbol: ${deployment.tokenSymbol}`));
      console.log(chalk.cyan(`  Wallet Address: ${deployment.address}`));
      console.log(chalk.cyan(`  Private Key: ${deployment.privateKey ? '✅ Saved' : '❌ Missing'}`));
      console.log(chalk.cyan(`  Network: ${deployment.network}`));
      console.log();
      
      // Verify optional services are null
      console.log(chalk.blue('🔧 Optional Services (should be null/empty):'));
      console.log(chalk.gray(`  GitHub Username: ${deployment.githubUsername || 'null'}`));
      console.log(chalk.gray(`  Pinata API Key: ${deployment.pinataApiKey || 'null'}`));
      console.log(chalk.gray(`  Google Client ID: ${deployment.googleClientId || 'null'}`));
    }
    
    console.log();
    console.log(chalk.green('🎉 Quick Mode test completed successfully!'));
    console.log(chalk.gray(`📁 Test project location: ${projectPath}`));
    
  } catch (error) {
    console.log();
    console.log(chalk.red('❌ Quick Mode test failed:'));
    console.log(chalk.red(error.message));
    
    if (error.stdout) {
      console.log();
      console.log(chalk.blue('📊 Command output:'));
      console.log(error.stdout);
    }
    
    if (error.stderr) {
      console.log();
      console.log(chalk.yellow('⚠️ Command errors:'));
      console.log(error.stderr);
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runQuickModeTest().catch(console.error);
}

module.exports = { runQuickModeTest };