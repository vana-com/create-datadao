#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const { execSync, exec } = require('child_process');
const { generateTemplate, guideNextSteps } = require('../lib/generator');
const { setupConfig } = require('../lib/config');
const { validateInput } = require('../lib/validation');
const { deriveWalletFromPrivateKey } = require('../lib/wallet');

// Define CLI command
const program = new Command();

program
  .name('create-datadao')
  .description('Generate and deploy a DataDAO on the Vana network')
  .version('1.0.3')
  .argument('<project-directory>', 'Directory to create the DataDAO project in')
  .option('-y, --yes', 'Skip all confirmation prompts')
  .option('-c, --config <file>', 'Path to configuration JSON file')
  .action(async (projectDirectory, options) => {
    try {
      console.log(chalk.blue('🚀 Creating a new DataDAO project...'));

      // Create project directory
      const targetDir = path.resolve(process.cwd(), projectDirectory);

      // Check if directory exists
      if (fs.existsSync(targetDir)) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Directory ${projectDirectory} already exists. Do you want to overwrite it?`,
            default: false
          }
        ]);

        if (!overwrite) {
          console.log(chalk.yellow('Aborting DataDAO creation.'));
          return;
        }

        fs.emptyDirSync(targetDir);
      }

      fs.ensureDirSync(targetDir);

      let config;

      if (options.config) {
        // Load configuration from file
        const configPath = path.resolve(options.config);
        if (!fs.existsSync(configPath)) {
          console.error(chalk.red(`Error: Config file ${configPath} not found.`));
          process.exit(1);
        }

        try {
          config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          console.log(chalk.green('✓ Configuration loaded from file'));
        } catch (error) {
          console.error(chalk.red(`Error: Invalid JSON in config file: ${error.message}`));
          process.exit(1);
        }
      } else {
        // Interactive prompts
        console.log('Please provide the following information for your DataDAO:');

        config = await inquirer.prompt([
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

        console.log(chalk.green('✓ Wallet credentials derived successfully'));
        console.log(chalk.cyan('Address:'), derivedWallet.address);
        console.log(chalk.cyan('Public Key:'), derivedWallet.publicKey);
        console.log(chalk.yellow('💡 Make sure to fund this address with testnet VANA!'));
        console.log();

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
        console.log('Your GitHub username is needed for forking the template repositories.');
        console.log(chalk.cyan('Note: You\'ll need to manually fork and enable GitHub Actions later.'));
        console.log();

        const githubConfig = await inquirer.prompt([
          {
            type: 'input',
            name: 'githubUsername',
            message: 'GitHub username:',
            validate: (input) => input.trim() !== '' || 'GitHub username is required'
          }
        ]);

        // Merge all configurations
        config = {
          ...config,
          ...walletConfig,
          ...pinataConfig,
          ...googleConfig,
          ...githubConfig
        };
      }

      // Validate input
      validateInput(config);

      // Generate project from template
      const spinner = ora('Generating project structure...').start();
      await generateTemplate(targetDir, config);
      spinner.succeed('Project structure generated successfully');

      console.log(chalk.green('✅ DataDAO project created successfully!'));
      console.log();

      // Continue with automatic setup and deployment
      console.log(chalk.blue('🔄 Continuing with automatic setup and deployment...'));
      console.log();

      // Change to project directory for subsequent commands
      process.chdir(targetDir);

      // Step 1: Setup dependencies with detailed progress
      console.log(chalk.blue('📦 Installing dependencies...'));
      console.log(chalk.yellow('⏳ This may take 2-3 minutes depending on your internet connection'));
      
      const setupSpinner = ora('Installing root project dependencies').start();
      try {
        // Root dependencies
        execSync('npm install', { stdio: 'pipe' });
        setupSpinner.text = 'Installing smart contract dependencies';
        
        // Contract dependencies  
        execSync('npm install', { cwd: 'contracts', stdio: 'pipe' });
        setupSpinner.text = 'Installing UI dependencies (largest step)';
        
        // UI dependencies (this takes the longest)
        execSync('npm install', { cwd: 'ui', stdio: 'pipe' });
        
        setupSpinner.succeed('Dependencies installed successfully');
        console.log(chalk.green('  ✓ Root project dependencies'));
        console.log(chalk.green('  ✓ Smart contract dependencies (Hardhat, Viem)'));
        console.log(chalk.green('  ✓ UI dependencies (Next.js, React, TailwindCSS)'));
      } catch (error) {
        setupSpinner.fail('Failed to install dependencies');
        console.error(chalk.red('Error installing dependencies:'), error.message);
        console.log(chalk.yellow('You can continue manually with: npm run setup'));
        return;
      }

      // Step 2: Deploy contracts with detailed progress
      console.log();
      console.log(chalk.blue('🚀 Deploying smart contracts...'));
      console.log(chalk.yellow('⏳ This may take 1-2 minutes depending on network conditions'));
      console.log(chalk.cyan('📡 Network: Moksha Testnet (https://moksha.vanascan.io)'));
      
      const deploySpinner = ora('Compiling smart contracts').start();
      try {
        // Use async exec to show progress
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        deploySpinner.text = 'Compiling smart contracts';
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause to show status
        
        deploySpinner.text = 'Deploying token contract (DAT)';
        await new Promise(resolve => setTimeout(resolve, 500));
        
        deploySpinner.text = 'Deploying DataDAO contract';
        await new Promise(resolve => setTimeout(resolve, 500));
        
        deploySpinner.text = 'Confirming transactions on Moksha testnet';
        
        // Run the actual deployment
        const { stdout, stderr } = await execAsync('node scripts/deploy-contracts.js');
        
        // Extract contract addresses from output for user feedback
        const tokenAddressMatch = 
          stdout.match(/deploying "DAT"[\s\S]*?deployed at (0x[a-fA-F0-9]{40})/) ||
          stdout.match(/reusing "DAT" at (0x[a-fA-F0-9]{40})/);
        
        const proxyAddressMatch = 
          stdout.match(/deploying "DataLiquidityPoolProxy"[\s\S]*?deployed at (0x[a-fA-F0-9]{40})/) ||
          stdout.match(/reusing "DataLiquidityPoolProxy" at (0x[a-fA-F0-9]{40})/);

        deploySpinner.succeed('Smart contracts deployed successfully');
        
        if (tokenAddressMatch && proxyAddressMatch) {
          console.log(chalk.green('  ✓ Token Contract (DAT):'), chalk.cyan(tokenAddressMatch[1]));
          console.log(chalk.green('  ✓ DataDAO Contract:'), chalk.cyan(proxyAddressMatch[1]));
          console.log(chalk.blue('  🔗 View on VanaScan:'), chalk.cyan(`https://moksha.vanascan.io/address/${proxyAddressMatch[1]}`));
        }

        if (stderr) {
          console.log(chalk.yellow('  ⚠️  Deployment warnings (usually safe to ignore):'));
          console.log(chalk.gray('    ' + stderr.split('\n')[0]));
        }
        
      } catch (error) {
        deploySpinner.fail('Failed to deploy contracts');
        console.error(chalk.red('Error deploying contracts:'), error.message);
        
        // Provide helpful troubleshooting
        if (error.message.includes('insufficient funds')) {
          console.log(chalk.yellow('💡 Troubleshooting:'));
          console.log(chalk.yellow('  • Check that your wallet has sufficient VANA tokens'));
          console.log(chalk.yellow(`  • Fund your wallet: https://faucet.vana.org`));
          console.log(chalk.yellow(`  • Your address: ${config.address}`));
        } else if (error.message.includes('network')) {
          console.log(chalk.yellow('💡 Network issue detected:'));
          console.log(chalk.yellow('  • Check your internet connection'));
          console.log(chalk.yellow('  • Moksha testnet may be experiencing high traffic'));
          console.log(chalk.yellow('  • Try again in a few minutes'));
        }
        
        console.log();
        console.log(chalk.yellow('You can retry manually with: npm run deploy:contracts'));
        return;
      }

      // Step 3: Show status
      console.log();
      console.log(chalk.blue('📊 Checking deployment status...'));
      try {
        execSync('node scripts/status.js', { stdio: 'inherit' });
      } catch (error) {
        console.log(chalk.yellow('Status check failed, but continuing...'));
      }

      console.log();
      console.log(chalk.green('✅ Smart contracts deployed successfully!'));
      console.log();
      console.log(chalk.blue('📊 Current Status:'));
      console.log('  ✅ Smart contracts deployed');
      console.log('  ⏸️  DataDAO registration (next step)');
      console.log('  ⏸️  GitHub repositories setup');
      console.log('  ⏸️  Full end-to-end testing');
      console.log();
      console.log(chalk.blue('🎯 What you can do now:'));
      console.log('  • ' + chalk.cyan('npm run ui:dev') + ' - Test the basic UI');
      console.log('  • ' + chalk.cyan('npm run status') + ' - Check deployment status');
      console.log('  • ' + chalk.cyan('npm run configure') + ' - Update credentials');
      console.log();
      console.log(chalk.yellow('⚠️  Note: Full DataDAO functionality requires completing all setup steps'));
      console.log();

      // Guide user through next steps
      await guideNextSteps(targetDir, config);

    } catch (error) {
      console.error(chalk.red('Error creating DataDAO project:'));
      console.error(error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);