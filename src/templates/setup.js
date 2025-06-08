const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { createWalletClient, hexToBytes } = require('viem');

/**
 * Main setup function
 */
async function setup() {
  try {
    console.log(chalk.blue('Setting up your DataDAO project...'));

    // Collect configuration through interactive prompts
    const config = await promptForConfig();

    // Generate environment files
    await generateEnvFiles(config);

    console.log(chalk.green('Setup completed successfully!'));
    console.log();
    console.log('Next steps:');
    console.log(chalk.cyan('1.') + ' Deploy your contracts:');
    console.log('   ' + chalk.cyan('npm run deploy:contracts'));
    console.log();
    console.log(chalk.cyan('2.') + ' Register your DataDAO on-chain:');
    console.log('   ' + chalk.cyan('npm run register:datadao'));
    console.log();
  } catch (error) {
    console.error(chalk.red('Setup failed:'), error.message);
    process.exit(1);
  }
}

/**
 * Prompt for configuration
 */
async function promptForConfig() {
  console.log(chalk.blue('Please provide the following information:'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'dlpName',
      message: 'DataDAO Name:',
      default: 'QuickstartDAO',
      validate: (input) => input.trim() !== '' ? true : 'Name is required'
    },
    {
      type: 'input',
      name: 'tokenName',
      message: 'Token Name:',
      default: 'QuickToken',
      validate: (input) => input.trim() !== '' ? true : 'Token name is required'
    },
    {
      type: 'input',
      name: 'tokenSymbol',
      message: 'Token Symbol:',
      default: 'QTKN',
      validate: (input) => input.trim() !== '' ? true : 'Token symbol is required'
    },
    {
      type: 'password',
      name: 'privateKey',
      message: 'Wallet Private Key (used for deployment):',
      validate: (input) => {
        if (input.trim() === '') return 'Private key is required';
        if (!input.startsWith('0x')) return 'Private key must start with 0x';
        return true;
      }
    },
    {
      type: 'input',
      name: 'address',
      message: 'Wallet Address:',
      validate: (input) => {
        if (input.trim() === '') return 'Address is required';
        if (!input.startsWith('0x')) return 'Address must start with 0x';
        return true;
      }
    },
    {
      type: 'input',
      name: 'publicKey',
      message: 'Wallet Public Key:',
      validate: (input) => {
        if (input.trim() === '') return 'Public key is required';
        if (!input.startsWith('0x')) return 'Public key must start with 0x';
        return true;
      }
    },
    {
      type: 'input',
      name: 'pinataApiKey',
      message: 'Pinata API Key:',
      validate: (input) => input.trim() !== '' ? true : 'Pinata API Key is required'
    },
    {
      type: 'input',
      name: 'pinataApiSecret',
      message: 'Pinata API Secret:',
      validate: (input) => input.trim() !== '' ? true : 'Pinata API Secret is required'
    },
    {
      type: 'input',
      name: 'googleClientId',
      message: 'Google Client ID (for UI):',
      validate: (input) => input.trim() !== '' ? true : 'Google Client ID is required'
    },
    {
      type: 'input',
      name: 'googleClientSecret',
      message: 'Google Client Secret (for UI):',
      validate: (input) => input.trim() !== '' ? true : 'Google Client Secret is required'
    }
  ]);

  return answers;
}

/**
 * Generate environment files for each component
 */
async function generateEnvFiles(config) {
  console.log(chalk.blue('Generating environment files...'));

  // Contracts .env
  const contractsEnv = `DEPLOYER_PRIVATE_KEY=${config.privateKey}
OWNER_ADDRESS=${config.address}
DLP_NAME=${config.dlpName}
DLP_PUBLIC_KEY=${config.publicKey}
DLP_TOKEN_NAME=${config.tokenName}
DLP_TOKEN_SYMBOL=${config.tokenSymbol}
DLP_TOKEN_SALT=${config.tokenSymbol}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}
`;

  fs.writeFileSync(path.join(process.cwd(), 'contracts', '.env'), contractsEnv);

  // Create a blank .env for refiner
  const refinerEnv = `# Will be populated with refinement encryption key after DataDAO registration
PINATA_API_KEY=${config.pinataApiKey}
PINATA_API_SECRET=${config.pinataApiSecret}
`;

  fs.writeFileSync(path.join(process.cwd(), 'refiner', '.env'), refinerEnv);

  // Create a blank .env for UI
  const uiEnv = `# Will be populated with additional values after deployment
GOOGLE_CLIENT_ID=${config.googleClientId}
GOOGLE_CLIENT_SECRET=${config.googleClientSecret}
PINATA_API_KEY=${config.pinataApiKey}
PINATA_API_SECRET=${config.pinataApiSecret}
REFINEMENT_ENDPOINT=https://a7df0ae43df690b889c1201546d7058ceb04d21b-8000.dstack-prod5.phala.network
`;

  fs.writeFileSync(path.join(process.cwd(), 'ui', '.env'), uiEnv);

  // Copy example .env files if they don't exist
  if (fs.existsSync(path.join(process.cwd(), 'contracts', '.env.example'))) {
    fs.copyFileSync(
      path.join(process.cwd(), 'contracts', '.env.example'),
      path.join(process.cwd(), 'contracts', '.env.example.backup')
    );
  }

  if (fs.existsSync(path.join(process.cwd(), 'ui', '.env.example'))) {
    fs.copyFileSync(
      path.join(process.cwd(), 'ui', '.env.example'),
      path.join(process.cwd(), 'ui', '.env.example.backup')
    );
  }

  // Create deployment.json to track state
  const deployment = {
    dlpName: config.dlpName,
    tokenName: config.tokenName,
    tokenSymbol: config.tokenSymbol,
    address: config.address,
    publicKey: config.publicKey
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'deployment.json'),
    JSON.stringify(deployment, null, 2)
  );

  console.log(chalk.green('Environment files generated successfully.'));
}

// Run the setup
setup();