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
const { validateConfig } = require('../lib/validation');
const { deriveWalletFromPrivateKey } = require('../lib/wallet');
const { formatDataDAOName, formatTokenName, formatTokenSymbol } = require('../lib/formatting');
const { generatePrivateKey, privateKeyToAccount } = require('viem/accounts');
const { createPublicClient, http } = require('viem');
const { moksha } = require('viem/chains');
const { checkPrerequisites } = require('../lib/prerequisites');
const { program } = require('commander');
const { DLP_REGISTRY_ABI, DLP_REGISTRY_ADDRESS } = require('../lib/blockchain');

// Define CLI command
program
  .name('create-datadao')
  .description('Create and manage DataDAO projects on the Vana network')
  .version('1.0.0');

// Main create command
program
  .command('create [project-name]')
  .description('Create a new DataDAO project')
  .option('-c, --config <path>', 'Load configuration from JSON file')
  .option('-q, --quick', 'Quick setup with minimal prompts')
  .action(async (projectName, options) => {
    if (options.quick) {
      await createDataDAOQuick(projectName);
    } else {
      await createDataDAO(projectName, options);
    }
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
 * Check if DLP name is already taken on the network
 */
async function checkDlpNameAvailability(dlpName) {
  const client = createPublicClient({
    chain: moksha,
    transport: http('https://rpc.moksha.vana.org')
  });
  const dlpRegistryAddress = DLP_REGISTRY_ADDRESS;
  try {
    const dlpId = await client.readContract({
      address: dlpRegistryAddress, 
      abi: DLP_REGISTRY_ABI,
      functionName: 'dlpNameToId',
      args: [dlpName]
    });

    const nameExists = Number(dlpId) > 0;
    return {
      available: !nameExists,
      existingId: nameExists ? Number(dlpId) : null
    };
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Could not check name availability: ${error.message}`));
    return { available: true, existingId: null }; // Assume available if check fails
  }
}

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
 * Show helpful exit message with available commands
 */
function showExitMessage() {
  console.log();
  console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blue.bold('📌 Useful Commands:'));
  console.log();
  console.log(chalk.cyan('  create-datadao status     ') + '- Check progress & resume setup');
  console.log(chalk.cyan('  create-datadao status .   ') + '- Status for current directory');
  console.log();
  console.log(chalk.gray('💡 Tip: Run commands from your project directory'));
  console.log(chalk.gray('💡 Tip: Provide config via JSON: --config my-config.json'));
  console.log(chalk.gray('💡 Tip: Get testnet VANA at https://faucet.vana.org'));
  console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
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
async function collectConfiguration(projectName) {
  console.log(chalk.blue('🏛️ DataDAO Configuration'));
  console.log(chalk.gray('Please provide the following information for your DataDAO:'));
  console.log(chalk.yellow('💡 These values will be used for smart contracts and cannot be changed later'));
  console.log();

  // Generate smart defaults based on project name
  const defaultDataDAOName = projectName ? formatDataDAOName(projectName) : 'MyDataDAO';
  const defaultTokenName = projectName ? formatTokenName(projectName) : 'MyDataToken';
  const defaultTokenSymbol = projectName ? formatTokenSymbol(projectName) : 'MDT';

  const config = await inquirer.prompt([
    {
      type: 'input',
      name: 'dlpName',
      message: 'DataDAO name:',
      default: defaultDataDAOName,
      validate: async (input) => {
        if (input.trim() === '') return 'DataDAO name is required';
        
        // Check name availability
        console.log(chalk.blue(`\n🔍 Checking availability of "${input.trim()}"...`));
        const nameCheck = await checkDlpNameAvailability(input.trim());
        
        if (!nameCheck.available) {
          return `DataDAO name "${input.trim()}" is already taken (dlpId: ${nameCheck.existingId}). Please choose a different name.`;
        }
        
        console.log(chalk.green(`✅ "${input.trim()}" is available!`));
        return true;
      }
    },
    {
      type: 'input',
      name: 'tokenName',
      message: 'Token name:',
      default: defaultTokenName,
      validate: (input) => input.trim() !== '' || 'Token name is required'
    },
    {
      type: 'input',
      name: 'tokenSymbol',
      message: 'Token symbol (3-5 characters recommended):',
      default: defaultTokenSymbol,
      validate: (input) => {
        if (input.trim() === '') return 'Token symbol is required';
        if (input.trim().length < 2) return 'Token symbol should be at least 2 characters';
        if (input.trim().length > 10) return 'Token symbol should be 10 characters or less';
        if (!/^[A-Za-z0-9]+$/.test(input.trim())) return 'Token symbol should contain only letters and numbers';
        return true;
      },
      filter: (input) => input.trim().toUpperCase()
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
            validate: (input) => input.trim() !== '' || 'Pinata API Key is required',
            filter: (input) => input.trim().replace(/^["']|["']$/g, '') // Remove surrounding quotes
          },
          {
            type: 'password',
            name: 'pinataApiSecret',
            message: 'Pinata API Secret:',
            validate: (input) => input.trim() !== '' || 'Pinata API Secret is required',
            filter: (input) => input.trim().replace(/^["']|["']$/g, '') // Remove surrounding quotes
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
            validate: (input) => input.trim() !== '' || 'Google OAuth Client ID is required',
            filter: (input) => input.trim().replace(/^["']|["']$/g, '') // Remove surrounding quotes
          },
          {
            type: 'password',
            name: 'googleClientSecret',
            message: 'Google OAuth Client Secret:',
            validate: (input) => input.trim() !== '' || 'Google OAuth Client Secret is required',
            filter: (input) => input.trim().replace(/^["']|["']$/g, '') // Remove surrounding quotes
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
  validateConfig(finalConfig);

  return finalConfig;
}

/**
 * Main DataDAO creation flow
 */
async function createDataDAO(projectName, options = {}) {
  console.log(chalk.blue('🚀 Welcome to DataDAO Creator!'));
  console.log();

  // Check prerequisites before starting
  const prerequisitesPassed = await checkPrerequisites();
  if (!prerequisitesPassed) {
    process.exit(1);
  }

  // Load configuration from file if provided
  let config = null;
  if (options.config) {
    try {
      const configPath = path.resolve(options.config);
      console.log(chalk.blue(`📄 Loading configuration from ${configPath}`));
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Use project name from config if not provided as argument
      if (!projectName && config.projectName) {
        projectName = config.projectName;
      }

      console.log(chalk.green('✅ Configuration loaded successfully'));
      console.log();
    } catch (error) {
      console.error(chalk.red(`❌ Failed to load config file: ${error.message}`));
      process.exit(1);
    }
  }

  // Get project name if not provided
  if (!projectName) {
    if (config) {
      console.error(chalk.red('❌ Project name not found in config file or command line'));
      process.exit(1);
    }

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

  // Ask user about setup mode (unless config file provided)
  let useQuickMode = false;
  if (!config) {
    console.log();
    console.log(chalk.blue('🎯 Setup Mode Selection:'));
    console.log();
    console.log(chalk.cyan('Quick Setup (10 minutes):'));
    console.log('  • Auto-generates wallet');
    console.log('  • Uses smart defaults');
    console.log('  • Minimal prompts for required services');
    console.log('  • Streamlined for faster deployment');
    console.log();
    console.log(chalk.cyan('Full Setup (30-45 minutes):'));
    console.log('  • Complete configuration');
    console.log('  • External service integration');
    console.log('  • Production-ready deployment');
    console.log('  • Guided step-by-step process');
    console.log();

    const { setupMode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'setupMode',
        message: 'Which setup mode would you prefer?',
        choices: [
          { name: '⚡ Quick Setup - Get started in 10 minutes', value: 'quick' },
          { name: '🔧 Full Setup - Complete configuration', value: 'full' }
        ],
        default: 'quick'
      }
    ]);

    useQuickMode = (setupMode === 'quick');
  }

  // Route to appropriate setup flow
  if (useQuickMode) {
    return await createDataDAOQuick(projectName);
  }

  const targetDir = path.resolve(projectName);

  // Check if directory already exists
  if (fs.existsSync(targetDir)) {
    console.error(chalk.red(`Directory ${projectName} already exists!`));
    process.exit(1);
  }

  try {
    // Collect configuration (use loaded config or prompt user)
    const finalConfig = config ? config : await collectConfiguration(projectName);

    // Generate the project
    console.log();
    console.log(chalk.blue('📦 Generating your DataDAO project...'));
      await generateTemplate(targetDir, finalConfig);

    console.log();
      console.log(chalk.green('✅ DataDAO project created successfully!'));
      console.log();
    console.log(chalk.blue('📁 Project location:'), targetDir);
    console.log();

    // Show wallet credentials with confirmation
    console.log(chalk.green('✓ Wallet credentials derived successfully'));
    console.log(chalk.cyan('Address:'), finalConfig.address);
    console.log(chalk.cyan('Public Key:'), finalConfig.publicKey);
    console.log(chalk.yellow('💡 Make sure to fund this address with testnet VANA!'));
      console.log();

    // Add confirmation step (skip if using config file for headless operation)
    if (!config) {
      let walletConfirmed = false;
      while (!walletConfirmed) {
        const { confirmWallet } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmWallet',
            message: 'Have you reviewed and saved these wallet credentials?',
            default: false
          }
        ]);

        if (!confirmWallet) {
          console.log();
          const { walletAction } = await inquirer.prompt([
            {
              type: 'list',
              name: 'walletAction',
              message: 'What would you like to do?',
              choices: [
                { name: '📝 I\'ve saved them now, let\'s continue', value: 'continue' },
                { name: '🔄 Show me the credentials again', value: 'show' },
                { name: '💡 Why do I need to save these?', value: 'explain' },
                { name: '⏸️  Exit and resume later', value: 'exit' }
              ]
            }
          ]);

          if (walletAction === 'continue') {
            walletConfirmed = true;
          } else if (walletAction === 'show') {
            console.log();
            console.log(chalk.green('✓ Your wallet credentials:'));
            console.log(chalk.cyan('Address:'), finalConfig.address);
            console.log(chalk.cyan('Public Key:'), finalConfig.publicKey);
            console.log(chalk.red('Private Key:'), finalConfig.privateKey);
            console.log(chalk.yellow('💡 Make sure to fund this address with testnet VANA!'));
            console.log();
          } else if (walletAction === 'explain') {
            console.log();
            console.log(chalk.blue('🔐 Why save wallet credentials?'));
            console.log('• Your private key is needed to manage your DataDAO');
            console.log('• The address is where you receive tokens and fees');
            console.log('• You\'ll need these for future operations');
            console.log('• Store them securely - they can\'t be recovered if lost');
            console.log();
          } else if (walletAction === 'exit') {
            const { confirmExit } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirmExit',
                message: 'Are you sure you want to exit? You can resume anytime with create-datadao status.',
                default: false
              }
            ]);

            if (confirmExit) {
              console.log();
              console.log(chalk.yellow('Please save your wallet credentials before continuing.'));
              console.log(chalk.yellow('You can resume setup later with: create-datadao status ' + projectName));
              console.log();
              return;
            }
          }
        } else {
          walletConfirmed = true;
        }
      }
    } else {
      console.log(chalk.blue('📝 Using provided wallet configuration for headless deployment'));
    }

    // Deploy contracts immediately after funding confirmation
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
      console.log();
      console.log(chalk.blue.bold('🎉 Contracts deployed! Let\'s continue setup...'));
      console.log();
      console.log(chalk.cyan('Next: Register your DataDAO and complete configuration'));
      console.log('  • Registration requires 1 VANA + gas fees');
      console.log('  • We\'ll guide you through each step');
      console.log();

      // Automatically continue with guided setup - no need to ask since they chose quick mode
      console.log(chalk.blue('🚀 Continuing with guided setup...'));
      execSync('npm run status', {
        stdio: 'inherit',
        cwd: targetDir
      });

    } catch (deployError) {
      console.log();
      console.log(chalk.red('❌ Contract deployment failed'));
      console.log(chalk.yellow('This is usually due to insufficient VANA tokens or network issues.'));
      console.log();
      console.log(chalk.blue('🎯 To continue setup:'));
      console.log(`  1. Fund your wallet: ${finalConfig.address}`);
      console.log(`  2. Resume deployment: cd ${projectName} && npm run deploy:contracts`);
      console.log(`  3. Check status: create-datadao status`);
      console.log();
    }

    } catch (error) {
    console.error(chalk.red('Error creating DataDAO:'), error.message);
      process.exit(1);
    }
}

/**
 * Quick setup flow with minimal prompts
 */
async function createDataDAOQuick(projectName) {
  console.log(chalk.blue('⚡ Quick Setup Mode'));
  console.log(chalk.gray('Auto-generating wallet and using smart defaults...'));
  console.log();

  // Check prerequisites before starting
  const prerequisitesPassed = await checkPrerequisites();
  if (!prerequisitesPassed) {
    process.exit(1);
  }

  const targetDir = path.resolve(projectName);

  // Check if directory already exists
  if (fs.existsSync(targetDir)) {
    console.error(chalk.red(`Directory ${projectName} already exists!`));
    process.exit(1);
  }

  // EARLY CHECK: Verify DLP name is available BEFORE doing any expensive operations
  const dlpName = formatDataDAOName(projectName);
  console.log(chalk.blue('🔍 Checking DataDAO name availability...'));
  console.log(chalk.gray(`   Checking if "${dlpName}" is already taken...`));
  
  const nameCheck = await checkDlpNameAvailability(dlpName);
  
  if (!nameCheck.available) {
    console.log();
    console.error(chalk.red(`❌ DataDAO name "${dlpName}" is already taken (dlpId: ${nameCheck.existingId})`));
    console.error(chalk.yellow('   You need to choose a different name for your DataDAO.'));
    console.log();

    recoverySteps = [
      `Check existing DataDAO names: https://moksha.vanascan.io/address/${DLP_REGISTRY_ADDRESS}`,
      'Retry DataDAO creation with a unique DataDAO name'
    ];

    // Display recovery steps
    console.error(chalk.cyan('\n📋 Next Steps:'));
    recoverySteps.forEach((step, index) => {
      console.error(chalk.white(`${index + 1}. ${step}`));
    });
    console.log();

    process.exit(1);
  } else {
    console.log(chalk.green('✅ DataDAO name is available!'));
    console.log();
  }

  try {
    // Generate wallet automatically
    console.log(chalk.blue('🔑 Generating wallet...'));
    const wallet = generateWallet();

    console.log();
    console.log(chalk.green('✅ Generated wallet:'));
    console.log(chalk.cyan(`   Address: ${wallet.address}`));
    console.log(chalk.red(`   Private Key: ${wallet.privateKey}`));
    console.log(chalk.yellow('   ⚠️  Save this private key securely!'));
    console.log();

    // Collect required external services
    console.log(chalk.blue('🔐 Required Services Setup'));
    console.log(chalk.yellow('These services are required for data collection and storage:'));
    console.log(chalk.gray('• Pinata: Sign up at https://pinata.cloud'));
    console.log(chalk.gray('• Google OAuth: Create credentials at https://console.cloud.google.com'));
    console.log();

    const servicesConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'pinataApiKey',
        message: 'Pinata API Key:',
        validate: input => input.trim().length > 0 ? true : 'Pinata API Key is required for IPFS storage'
      },
      {
        type: 'password',
        name: 'pinataApiSecret',
        message: 'Pinata API Secret:',
        validate: input => input.trim().length > 0 ? true : 'Pinata API Secret is required for IPFS storage'
      },
      {
        type: 'input',
        name: 'googleClientId',
        message: 'Google OAuth Client ID:',
        validate: input => input.trim().length > 0 ? true : 'Google Client ID is required for user authentication'
      },
      {
        type: 'password',
        name: 'googleClientSecret',
        message: 'Google OAuth Client Secret:',
        validate: input => input.trim().length > 0 ? true : 'Google Client Secret is required for user authentication'
      },
      {
        type: 'input',
        name: 'githubUsername',
        message: 'GitHub username:',
        validate: (input) => input.trim() !== '' || 'GitHub username is required'
      }
    ]);

    // Get DataDAO configuration with smart defaults
    console.log(chalk.blue('🏛️ DataDAO Configuration'));
    console.log(chalk.gray('Customize your DataDAO details or use the suggested defaults:'));
    console.log(chalk.yellow('💡 These values will be written onchain and cannot be changed later'));
    console.log();

    const defaultDlpName = formatDataDAOName(projectName);
    const defaultTokenName = formatTokenName(projectName);
    const defaultTokenSymbol = formatTokenSymbol(projectName);

    const dataDAOConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'dlpName',
        message: 'DataDAO name:',
        default: defaultDlpName,
        validate: async (input) => {
          if (input.trim() === '') return 'DataDAO name is required';
          
          // Check name availability
          console.log(chalk.blue(`\n🔍 Checking availability of "${input.trim()}"...`));
          const nameCheck = await checkDlpNameAvailability(input.trim());
          
          if (!nameCheck.available) {
            return `DataDAO name "${input.trim()}" is already taken (dlpId: ${nameCheck.existingId}). Please choose a different name.`;
          }
          
          console.log(chalk.green(`✅ "${input.trim()}" is available!`));
          return true;
        }
      },
      {
        type: 'input',
        name: 'tokenName',
        message: 'Token name:',
        default: defaultTokenName,
        validate: (input) => input.trim() !== '' || 'Token name is required'
      },
             {
         type: 'input',
         name: 'tokenSymbol',
         message: 'Token symbol (3-5 characters recommended):',
         default: defaultTokenSymbol,
         validate: (input) => {
           if (input.trim() === '') return 'Token symbol is required';
           if (input.trim().length < 2) return 'Token symbol should be at least 2 characters';
           if (input.trim().length > 10) return 'Token symbol should be 10 characters or less';
           if (!/^[A-Za-z0-9]+$/.test(input.trim())) return 'Token symbol should contain only letters and numbers';
           return true;
         },
         filter: (input) => input.trim().toUpperCase()
       }
    ]);

    // Minimal config with smart defaults
    const config = {
      projectName: projectName,
      dlpName: dataDAOConfig.dlpName.trim(),
      tokenName: dataDAOConfig.tokenName.trim(),
      tokenSymbol: dataDAOConfig.tokenSymbol, // Already filtered to uppercase
      ...wallet,
      githubUsername: servicesConfig.githubUsername,
      pinataApiKey: servicesConfig.pinataApiKey,
      pinataApiSecret: servicesConfig.pinataApiSecret,
      googleClientId: servicesConfig.googleClientId,
      googleClientSecret: servicesConfig.googleClientSecret,
      network: 'moksha',
      rpcUrl: 'https://rpc.moksha.vana.org',
      chainId: 14800,
      quickMode: true  // Flag for scripts to detect quick mode
    };

    // Generate project (this will include GitHub setup)
    console.log(chalk.blue('📦 Generating your DataDAO project...'));
    await generateTemplate(targetDir, config);

    console.log();
    console.log(chalk.green('✅ Project created successfully!'));
    console.log();
    console.log(chalk.blue('📁 Project location:'), targetDir);
    console.log();

    // Offer to fund wallet and continue immediately
    console.log(chalk.blue.bold('🎯 Continue Setup:'));
    console.log();
    console.log(chalk.cyan('Your wallet needs VANA tokens to deploy contracts.'));
    console.log(`Visit: ${chalk.underline('https://faucet.vana.org')}`);
    console.log(`Address: ${wallet.address}`);
    console.log();

    // Single consolidated prompt instead of two separate ones
    let readyToDeploy = false;
    while (!readyToDeploy) {
      const { fundingAction } = await inquirer.prompt([
        {
          type: 'list',
          name: 'fundingAction',
          message: 'What would you like to do?',
          choices: [
            { name: '💰 I\'ve funded my wallet, let\'s deploy', value: 'deploy' },
            { name: '⏳ I need more time to fund my wallet', value: 'wait' },
            { name: '🔄 Show funding instructions again', value: 'instructions' },
            { name: '💡 Check my wallet balance', value: 'check' },
            { name: '⏸️  Exit and resume later', value: 'exit' }
          ]
        }
      ]);

      if (fundingAction === 'deploy') {
        readyToDeploy = true;
      } else if (fundingAction === 'wait') {
        console.log(chalk.blue('Take your time! We\'ll wait here for you.'));
        console.log();
      } else if (fundingAction === 'instructions') {
        console.log();
        console.log(chalk.cyan('💰 Funding Instructions:'));
        console.log(`1. Visit: ${chalk.underline('https://faucet.vana.org')}`);
        console.log(`2. Enter your wallet address: ${wallet.address}`);
        console.log('3. Request testnet VANA tokens');
        console.log('4. Wait 1-2 minutes for tokens to arrive');
        console.log('5. Come back here and choose "I\'ve funded my wallet"');
        console.log();
      } else if (fundingAction === 'check') {
        console.log(chalk.blue('💡 Check your balance at:'));
        console.log(`https://moksha.vanascan.io/address/${wallet.address}`);
        console.log();
      } else if (fundingAction === 'exit') {
        const { confirmExit } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmExit',
            message: 'Are you sure you want to exit? You can resume anytime with create-datadao status.',
            default: false
          }
        ]);

        if (confirmExit) {
          console.log();
          console.log(chalk.yellow('No problem! Resume anytime with:'));
          console.log(`  cd ${projectName}`);
          console.log('  create-datadao status');
          console.log();
          return;
        }
      }
    }

    // Deploy contracts immediately after funding confirmation
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
      console.log();
      console.log(chalk.blue.bold('🎉 Contracts deployed! Let\'s continue setup...'));
      console.log();
      console.log(chalk.cyan('Next: Register your DataDAO and complete configuration'));
      console.log('  • Registration requires 1 VANA + gas fees');
      console.log('  • We\'ll guide you through each step');
      console.log();

      // Automatically continue with guided setup - no need to ask since they chose quick mode
      console.log(chalk.blue('🚀 Continuing with guided setup...'));
      execSync('npm run status', {
        stdio: 'inherit',
        cwd: targetDir
      });

    } catch (deployError) {
      console.log();
      console.log(chalk.red('❌ Contract deployment failed'));
      console.log(chalk.yellow('This is usually due to insufficient VANA tokens or network issues.'));
      console.log();
      console.log(chalk.blue('🎯 To continue setup:'));
      console.log(`  1. Fund your wallet: ${wallet.address}`);
      console.log(`  2. Resume deployment: cd ${projectName} && npm run deploy:contracts`);
      console.log(`  3. Check status: create-datadao status`);
      console.log();
    }

  } catch (error) {
    console.error(chalk.red('Error creating DataDAO:'), error.message);
    process.exit(1);
  }
}

/**
 * Generate a new wallet using viem
 */
function generateWallet() {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  return {
    privateKey,
    address: account.address,
    publicKey: account.publicKey
  };
}

program.parse(process.argv);

// Add exit handlers to show helpful commands
process.on('exit', showExitMessage);
process.on('SIGINT', () => {
  console.log('\n\n' + chalk.yellow('⚠️  Setup interrupted'));
  showExitMessage();
  process.exit(1);
});