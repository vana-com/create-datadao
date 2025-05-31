#!/usr/bin/env node

/**
 * Headless test runner for create-datadao CLI
 * Uses provided credentials to test the full flow
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

const CLI_PATH = path.join(__dirname, '../../bin/create-datadao.js');
const TEST_CONFIG_PATH = path.join(__dirname, '../config/test-config.json');
const TEST_DIR = path.join(__dirname, '../../test-output');

async function runHeadlessTest() {
  console.log(chalk.blue('🧪 Starting Headless DataDAO Test'));
  console.log();

  try {
    // Clean test directory
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
    
    const projectName = 'headless-test-' + Date.now();
    console.log(chalk.blue(`📁 Creating project: ${projectName}`));
    
    // Load and modify test config
    const testConfig = await fs.readJson(TEST_CONFIG_PATH);
    testConfig.projectName = projectName;
    
    const configPath = path.join(TEST_DIR, 'test-config.json');
    await fs.writeJson(configPath, testConfig);
    
    console.log(chalk.blue(`💳 Using wallet: ${testConfig.address}`));
    console.log(chalk.blue(`🔧 Config file: ${configPath}`));
    console.log();
    
    // Run the CLI
    console.log(chalk.blue('🚀 Running create-datadao CLI...'));
    const command = `node "${CLI_PATH}" create ${projectName} --config "${configPath}"`;
    console.log(chalk.gray(`Command: ${command}`));
    console.log();
    
    const output = execSync(command, {
      cwd: TEST_DIR,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 120000 // 2 minutes
    });
    
    console.log(chalk.green('✅ CLI executed successfully'));
    console.log();
    console.log(chalk.blue('📊 Output:'));
    console.log(output);
    
    // Verify project structure
    const projectPath = path.join(TEST_DIR, projectName);
    console.log(chalk.blue('🔍 Verifying project structure...'));
    
    const checks = [
      { path: projectPath, name: 'Project directory' },
      { path: path.join(projectPath, 'deployment.json'), name: 'Deployment config' },
      { path: path.join(projectPath, 'package.json'), name: 'Package.json' },
      { path: path.join(projectPath, 'scripts'), name: 'Scripts directory' },
      { path: path.join(projectPath, 'contracts'), name: 'Contracts directory' },
      { path: path.join(projectPath, 'proof'), name: 'Proof directory' },
      { path: path.join(projectPath, 'refiner'), name: 'Refiner directory' },
      { path: path.join(projectPath, 'ui'), name: 'UI directory' }
    ];
    
    for (const check of checks) {
      if (fs.existsSync(check.path)) {
        console.log(chalk.green(`✅ ${check.name}`));
      } else {
        console.log(chalk.red(`❌ ${check.name} - Missing`));
      }
    }
    
    // Check deployment.json content
    if (fs.existsSync(path.join(projectPath, 'deployment.json'))) {
      const deployment = await fs.readJson(path.join(projectPath, 'deployment.json'));
      console.log();
      console.log(chalk.blue('📋 Deployment Configuration:'));
      console.log(chalk.cyan(`  DataDAO Name: ${deployment.dlpName}`));
      console.log(chalk.cyan(`  Wallet Address: ${deployment.address}`));
      console.log(chalk.cyan(`  Pinata API Key: ${deployment.pinataApiKey}`));
      console.log(chalk.cyan(`  Google Client ID: ${deployment.googleClientId}`));
    }
    
    // Test status command
    console.log();
    console.log(chalk.blue('🔍 Testing status command...'));
    const statusOutput = execSync(`node "${CLI_PATH}" status ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    console.log(chalk.green('✅ Status command works'));
    console.log(chalk.blue('📊 Status output:'));
    console.log(statusOutput);
    
    console.log();
    console.log(chalk.green('🎉 Headless test completed successfully!'));
    console.log(chalk.gray(`📁 Test project location: ${projectPath}`));
    
  } catch (error) {
    console.log();
    console.log(chalk.red('❌ Headless test failed:'));
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
  runHeadlessTest().catch(console.error);
}

module.exports = { runHeadlessTest };