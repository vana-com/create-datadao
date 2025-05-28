#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const { execSync, exec } = require('child_process');
const { generateTemplate, guideNextSteps, guideGitHubSetup } = require('../lib/generator');
const { setupConfig } = require('../lib/config');
const { validateInput } = require('../lib/validation');
const { deriveWalletFromPrivateKey } = require('../lib/wallet');
const { program } = require('commander');

// Define CLI command
program
  .name('create-datadao')
  .description('Create and manage DataDAO projects on the Vana network')
  .version('1.0.0');

// Main create command
program
  .command('create [project-name]')
  .description('Create a new DataDAO project')
  .action(async (projectName) => {
    await createDataDAO(projectName);
  });

// Status command - works from anywhere
program
  .command('status [project-path]')
  .description('Check DataDAO project status')
  .action(async (projectPath) => {
    await checkStatus(projectPath);
  });

// Deploy commands - work from anywhere
program
  .command('deploy:contracts [project-path]')
  .description('Deploy smart contracts for a DataDAO project')
  .action(async (projectPath) => {
    await runProjectScript(projectPath, 'deploy:contracts');
  });

program
  .command('register [project-path]')
  .description('Register DataDAO on the Vana network')
  .action(async (projectPath) => {
    await runProjectScript(projectPath, 'register:datadao');
  });

program
  .command('ui [project-path]')
  .description('Start the DataDAO UI development server')
  .action(async (projectPath) => {
    await runProjectScript(projectPath, 'ui:dev');
  });

/**
 * Find project directory from current location or provided path
 */
function findProjectDir(providedPath) {
  if (providedPath) {
    const fullPath = path.resolve(providedPath);
    if (fs.existsSync(path.join(fullPath, 'deployment.json'))) {
      return fullPath;
        }
    throw new Error(`No DataDAO project found at: ${fullPath}`);
      }

  // Look in current directory
  if (fs.existsSync('deployment.json')) {
    return process.cwd();
  }

  // Look for common project names in current directory
  const commonNames = fs.readdirSync('.').filter(name => {
    const dirPath = path.join(process.cwd(), name);
    return fs.statSync(dirPath).isDirectory() &&
           fs.existsSync(path.join(dirPath, 'deployment.json'));
  });

  if (commonNames.length === 1) {
    return path.join(process.cwd(), commonNames[0]);
  }

  if (commonNames.length > 1) {
    console.log(chalk.yellow('Multiple DataDAO projects found:'));
    commonNames.forEach(name => console.log(`  • ${name}`));
    console.log(chalk.yellow('Please specify which project: create-datadao status <project-name>'));
          process.exit(1);
        }

  throw new Error('No DataDAO project found. Run from project directory or specify path.');
}

/**
 * Check status of a DataDAO project
 */
async function checkStatus(projectPath) {
  try {
    const projectDir = findProjectDir(projectPath);
    console.log(chalk.blue(`📊 DataDAO Status: ${path.basename(projectDir)}`));
    console.log(chalk.gray(`   Location: ${projectDir}`));
    console.log();

    // Run the status script in the project directory
    const { execSync } = require('child_process');
    execSync('npm run status', {
      stdio: 'inherit',
      cwd: projectDir
    });

        } catch (error) {
    console.error(chalk.red('Error checking status:'), error.message);
    console.log();
    console.log(chalk.yellow('💡 Available projects:'));

    // List available projects
    try {
      const dirs = fs.readdirSync('.').filter(name => {
        const dirPath = path.join(process.cwd(), name);
        return fs.statSync(dirPath).isDirectory() &&
               fs.existsSync(path.join(dirPath, 'deployment.json'));
      });

      if (dirs.length > 0) {
        dirs.forEach(dir => console.log(`   • ${dir}`));
        console.log();
        console.log(chalk.cyan('Usage: create-datadao status <project-name>'));
      } else {
        console.log('   No DataDAO projects found in current directory');
        console.log();
        console.log(chalk.cyan('Create a new project: create-datadao create my-datadao'));
      }
    } catch (e) {
      console.log('   Could not scan current directory');
    }

    process.exit(1);
  }
}

/**
 * Run a project script from anywhere
 */
async function runProjectScript(projectPath, scriptName) {
  try {
    const projectDir = findProjectDir(projectPath);
    console.log(chalk.blue(`🚀 Running ${scriptName} for: ${path.basename(projectDir)}`));
    console.log(chalk.gray(`   Location: ${projectDir}`));
    console.log();

    const { execSync } = require('child_process');
    execSync(`npm run ${scriptName}`, {
      stdio: 'inherit',
      cwd: projectDir
    });

  } catch (error) {
    console.error(chalk.red(`Error running ${scriptName}:`), error.message);
    process.exit(1);
  }
}

/**
 * Collect configuration from user
 */
async function collectConfiguration() {
        console.log('Please provide the following information for your DataDAO:');

  const config = await inquirer.prompt([
          {
            type: 'input',
            name: 'dlpName',
            message: 'DataDAO name:',
            default: 'MyDataDAO',
            validate: (input) => input.trim() !== '' || 'DataDAO name is required'
          },
          {
            type: 'input',
            name: 'tokenName',
            message: 'Token name:',
            default: 'MyDataToken',
            validate: (input) => input.trim() !== '' || 'Token name is required'
          },
          {
            type: 'input',
            name: 'tokenSymbol',
            message: 'Token symbol:',
            default: 'MDT',
            validate: (input) => input.trim() !== '' || 'Token symbol is required'
          }
        ]);

        console.log(chalk.blue('\n💰 Wallet Configuration:'));
        console.log('Your wallet is used to deploy contracts and manage your DataDAO.');
        console.log(chalk.yellow('IMPORTANT: Use a dedicated wallet for testing purposes only.'));
        console.log(chalk.cyan('To get a private key:'));
        console.log('1. Go to https://privatekeys.pw/keys/ethereum/random (for testing only)');
        console.log('2. Pick any random key from the list');
        console.log('3. Copy the Private Key');
        console.log('4. The address and public key will be automatically derived');
        console.log('5. Fund the derived address with testnet VANA at https://faucet.vana.org');
        console.log();

        const walletConfig = await inquirer.prompt([
          {
            type: 'password',
            name: 'privateKey',
            message: 'Private key (0x-prefixed):',
            validate: (input) => {
              if (!input.startsWith('0x')) return 'Private key must start with 0x';
              if (input.length !== 66) return 'Private key must be 64 characters (plus 0x prefix)';

              // Test derivation to ensure it's valid
              try {
                deriveWalletFromPrivateKey(input);
                return true;
              } catch (error) {
                return `Invalid private key: ${error.message}`;
              }
            }
          }
        ]);

        // Derive address and public key from private key
        console.log(chalk.blue('🔑 Deriving wallet credentials...'));
        const derivedWallet = deriveWalletFromPrivateKey(walletConfig.privateKey);

        // Add derived values to wallet config
        walletConfig.address = derivedWallet.address;
        walletConfig.publicKey = derivedWallet.publicKey;

        console.log(chalk.blue('\n📦 Pinata IPFS Setup:'));
        console.log('Pinata is used for IPFS storage of your data schemas.');
        console.log(chalk.cyan('Setup instructions:'));
        console.log('1. Go to https://pinata.cloud and create an account');
        console.log('2. Navigate to API Keys in the sidebar');
        console.log('3. Click "New Key" → Enable Admin toggle → Create');
        console.log('4. Copy the API Key and Secret below');
        console.log();

        const pinataConfig = await inquirer.prompt([
          {
            type: 'input',
            name: 'pinataApiKey',
            message: 'Pinata API Key:',
            validate: (input) => input.trim() !== '' || 'Pinata API Key is required'
          },
          {
            type: 'password',
            name: 'pinataApiSecret',
            message: 'Pinata API Secret:',
            validate: (input) => input.trim() !== '' || 'Pinata API Secret is required'
          }
        ]);

        console.log(chalk.blue('\n🔐 Google OAuth Setup:'));
        console.log('Google OAuth enables users to connect their Google Drive accounts.');
        console.log(chalk.cyan('Setup instructions:'));
        console.log('1. Go to https://console.cloud.google.com');
        console.log('2. Create a new project or select existing one');
        console.log('3. Go to APIs & Services → OAuth consent screen');
        console.log('4. Choose "External" → Fill required fields → Save');
        console.log('5. Go to APIs & Services → Credentials');
        console.log('6. Click "Create Credentials" → "OAuth Client ID"');
        console.log('7. Choose "Web Application"');
        console.log('8. Add Authorized JavaScript origins: http://localhost:3000');
        console.log('9. Add Redirect URIs: http://localhost:3000/api/auth/callback/google');
        console.log('10. Go to APIs & Services → Library → Enable "Google Drive API"');
        console.log('11. Copy the Client ID and Client Secret below');
        console.log();

        const googleConfig = await inquirer.prompt([
          {
            type: 'input',
            name: 'googleClientId',
            message: 'Google OAuth Client ID:',
            validate: (input) => input.trim() !== '' || 'Google OAuth Client ID is required'
          },
          {
            type: 'password',
            name: 'googleClientSecret',
            message: 'Google OAuth Client Secret:',
            validate: (input) => input.trim() !== '' || 'Google OAuth Client Secret is required'
          }
        ]);

        console.log(chalk.blue('\n🐙 GitHub Integration:'));
        console.log('Your GitHub username is needed for creating template repositories.');
        console.log();

        const githubConfig = await inquirer.prompt([
          {
            type: 'input',
            name: 'githubUsername',
            message: 'GitHub username:',
            validate: (input) => input.trim() !== '' || 'GitHub username is required'
          }
        ]);

        // Set up GitHub repositories
        console.log();
        const repoSetup = await guideGitHubSetup({ ...config, ...githubConfig });

        // Merge all configurations
  const finalConfig = {
          ...config,
          ...walletConfig,
          ...pinataConfig,
          ...googleConfig,
          ...githubConfig,
          ...repoSetup
        };

      // Validate input
  validateInput(finalConfig);

  return finalConfig;
}

/**
 * Main DataDAO creation flow
 */
async function createDataDAO(projectName) {
  console.log(chalk.blue('🚀 Welcome to DataDAO Creator!'));
  console.log();

  // Get project name if not provided
  if (!projectName) {
    const { name } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'What is your DataDAO project name?',
        validate: (input) => input.trim() !== '' || 'Project name is required'
      }
    ]);
    projectName = name;
  }

  const targetDir = path.resolve(projectName);

  // Check if directory already exists
  if (fs.existsSync(targetDir)) {
    console.error(chalk.red(`Directory ${projectName} already exists!`));
    process.exit(1);
  }

  try {
    // Collect configuration
    const config = await collectConfiguration();

    // Generate the project
    console.log();
    console.log(chalk.blue('📦 Generating your DataDAO project...'));
      await generateTemplate(targetDir, config);

    console.log();
      console.log(chalk.green('✅ DataDAO project created successfully!'));
      console.log();
    console.log(chalk.blue('📁 Project location:'), targetDir);
    console.log();

    // Show wallet credentials with confirmation
    console.log(chalk.green('✓ Wallet credentials derived successfully'));
    console.log(chalk.cyan('Address:'), config.address);
    console.log(chalk.cyan('Public Key:'), config.publicKey);
    console.log(chalk.yellow('💡 Make sure to fund this address with testnet VANA!'));
      console.log();

    // Add confirmation step
    const { confirmWallet } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmWallet',
        message: 'Have you reviewed and saved these wallet credentials?',
        default: false
      }
    ]);

    if (!confirmWallet) {
      console.log(chalk.yellow('Please save your wallet credentials before continuing.'));
      console.log(chalk.yellow('You can resume setup later with: create-datadao status ' + projectName));
      console.log();
        return;
      }

    // Deploy contracts immediately
    console.log();
    console.log(chalk.blue('🚀 Deploying smart contracts...'));

    try {
      const { execSync } = require('child_process');
      execSync('npm run deploy:contracts', {
        stdio: 'inherit',
        cwd: targetDir
      });

      console.log();
      console.log(chalk.green('✅ Smart contracts deployed successfully!'));

      // Guide through next steps
      await guideNextSteps(targetDir, config);

    } catch (deployError) {
      console.log();
      console.log(chalk.red('❌ Contract deployment failed'));
      console.log(chalk.yellow('This is usually due to insufficient VANA tokens or network issues.'));
      console.log();
      console.log(chalk.blue('🎯 To continue setup:'));
      console.log(`  1. Fund your wallet: ${config.address}`);
      console.log(`  2. Resume deployment: create-datadao deploy:contracts ${projectName}`);
      console.log(`  3. Check status: create-datadao status ${projectName}`);
      console.log();
    }

    } catch (error) {
    console.error(chalk.red('Error creating DataDAO:'), error.message);
      process.exit(1);
    }
}

program.parse(process.argv);