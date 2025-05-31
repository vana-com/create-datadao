const inquirer = require('inquirer');
const chalk = require('chalk');
const { deriveWalletFromPrivateKey } = require('./wallet');
const { validatePrivateKey, normalizePrivateKey } = require('./validation');

/**
 * Prompts the user for DataDAO configuration
 * @returns {Promise<Object>} The configuration object
 */
async function setupConfig() {
  console.log(chalk.blue('Please provide the following information for your DataDAO:'));

  const basicConfig = await inquirer.prompt([
    {
      type: 'input',
      name: 'dlpName',
      message: 'DataDAO name:',
      default: 'MyDataDAO'
    },
    {
      type: 'input',
      name: 'tokenName',
      message: 'Token name:',
      default: 'MyDataToken'
    },
    {
      type: 'input',
      name: 'tokenSymbol',
      message: 'Token symbol:',
      default: 'MDT'
    }
  ]);

  console.log(chalk.blue('\nWallet Configuration:'));
  console.log(chalk.yellow('Your wallet is used to deploy contracts and manage your DataDAO.'));
  console.log(chalk.yellow('IMPORTANT: Use a dedicated wallet for testing purposes only.'));
  console.log(chalk.cyan('To get a private key:'));
  console.log('1. Go to https://privatekeys.pw/keys/ethereum/random (for testing only)');
  console.log('2. Pick any random key from the list');
  console.log('3. Copy the Private Key');
  console.log('4. The address and public key will be automatically derived');
  console.log();

  const walletConfig = await inquirer.prompt([
    {
      type: 'password',
      name: 'privateKey',
      message: 'Private key (with or without 0x prefix):',
      validate: (input) => {
        const validation = validatePrivateKey(input);
        return validation === true ? true : validation;
      }
    }
  ]);

  // Normalize and derive address and public key from private key
  console.log(chalk.blue('🔑 Deriving wallet credentials...'));
  walletConfig.privateKey = normalizePrivateKey(walletConfig.privateKey);
  const derivedWallet = deriveWalletFromPrivateKey(walletConfig.privateKey);

  console.log(chalk.green('✓ Wallet credentials derived successfully'));
  console.log(chalk.cyan('Address:'), derivedWallet.address);
  console.log(chalk.cyan('Public Key:'), derivedWallet.publicKey);
  console.log(chalk.yellow('💡 Make sure to fund this address with testnet VANA!'));
  console.log();

  // Add derived values to wallet config
  walletConfig.address = derivedWallet.address;
  walletConfig.publicKey = derivedWallet.publicKey;

  console.log(chalk.blue('\nExternal Services:'));
  console.log(chalk.yellow('These services are needed for IPFS storage and OAuth integration.'));

  const servicesConfig = await inquirer.prompt([
    {
      type: 'input',
      name: 'pinataApiKey',
      message: 'Pinata API Key:',
      default: ''
    },
    {
      type: 'password',
      name: 'pinataApiSecret',
      message: 'Pinata API Secret:',
      prefix: chalk.red('⚠️  COPY NOW - Won\'t be shown again! '),
      default: ''
    },
    {
      type: 'input',
      name: 'googleClientId',
      message: 'Google OAuth Client ID:',
      default: ''
    },
    {
      type: 'password',
      name: 'googleClientSecret',
      message: 'Google OAuth Client Secret:',
      default: ''
    }
  ]);

  // For GitHub integration
  console.log(chalk.blue('\nGitHub Integration:'));
  console.log(chalk.yellow('Your GitHub username is needed for forking the template repositories.'));

  const githubConfig = await inquirer.prompt([
    {
      type: 'input',
      name: 'githubUsername',
      message: 'GitHub username:',
      validate: input => input.length > 0 ? true : 'GitHub username is required'
    }
  ]);

  return {
    ...basicConfig,
    ...walletConfig,
    ...servicesConfig,
    ...githubConfig,
    // Default network configuration
    network: 'moksha',
    rpcUrl: 'https://rpc.moksha.vana.org',
    chainId: 14800
  };
}

module.exports = {
  setupConfig
};