const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const ora = require('ora');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { deriveWalletFromPrivateKey } = require('./wallet');
const { createPublicClient, http } = require('viem');
const { moksha } = require('viem/chains');

/**
 * Generate a complete DataDAO project from templates
 */
async function generateTemplate(targetDir, config) {
  const spinner = ora('Generating DataDAO project...').start();

  try {
    // Ensure wallet credentials are derived
    if (!config.address || !config.publicKey) {
      spinner.text = 'Deriving wallet credentials...';
      const derivedWallet = deriveWalletFromPrivateKey(config.privateKey);
      config.address = derivedWallet.address;
      config.publicKey = derivedWallet.publicKey;
    }

    // Ensure target directory exists
    fs.ensureDirSync(targetDir);

    // Clone repositories
    await cloneRepositories(targetDir, config);
    spinner.text = 'Repositories cloned successfully';

    // Generate configuration files
    await generateConfigFiles(targetDir, config);
    spinner.text = 'Configuration files generated';

    // Generate root package.json
    await generateRootPackageJson(targetDir, config);
    spinner.text = 'Root package.json generated';

    // Generate deployment scripts
    await generateDeploymentScripts(targetDir, config);
    spinner.text = 'Deployment scripts generated';

    // Install dependencies
    console.log(); // Add space before dependency installation
    const depSpinner = ora({
      text: 'Installing project dependencies...\n' +
            chalk.yellow('💡 This usually takes 1-3 minutes depending on your internet connection\n') +
            chalk.gray('   • Installing root dependencies\n') +
            chalk.gray('   • Installing smart contract dependencies\n') +
            chalk.gray('   • Installing UI dependencies'),
      spinner: 'dots'
    }).start();

    try {
      // Install root dependencies
      depSpinner.text = chalk.blue('Installing root dependencies...\n') +
                        chalk.gray('This includes deployment scripts and CLI tools');
      execSync('npm install', { cwd: targetDir, stdio: 'pipe' });
      depSpinner.text = chalk.green('✅ Root dependencies installed\n') +
                        chalk.blue('Installing smart contract dependencies...\n') +
                        chalk.gray('This includes Hardhat, OpenZeppelin, and Viem');

      // Install contract dependencies
      execSync('npm install', { cwd: path.join(targetDir, 'contracts'), stdio: 'pipe' });
      depSpinner.text = chalk.green('✅ Root dependencies installed\n') +
                        chalk.green('✅ Smart contract dependencies installed\n') +
                        chalk.blue('Installing UI dependencies...\n') +
                        chalk.gray('This includes Next.js, React, and authentication libraries');

      // Install UI dependencies
      execSync('npm install', { cwd: path.join(targetDir, 'ui'), stdio: 'pipe' });
      depSpinner.succeed(chalk.green('✅ All dependencies installed successfully!'));
    } catch (error) {
      depSpinner.fail(chalk.red('❌ Failed to install some dependencies automatically'));
      console.log(chalk.yellow('You may need to run these commands manually:'));
      console.log(chalk.cyan('  cd ' + path.basename(targetDir)));
      console.log(chalk.cyan('  npm install'));
      console.log(chalk.cyan('  cd contracts && npm install'));
      console.log(chalk.cyan('  cd ../ui && npm install'));
      console.log();
    }

    spinner.succeed('DataDAO project generated successfully');
    return true;
  } catch (error) {
    spinner.fail('Error generating DataDAO project');
    throw error;
  }
}

/**
 * Clone repositories into the target directory
 */
async function cloneRepositories(targetDir, config) {
  const spinner = ora('Setting up repositories...').start();

  try {
    // Create subdirectories for each component
    const dirs = ['contracts', 'proof', 'refiner', 'ui'];
    dirs.forEach(dir => {
      fs.ensureDirSync(path.join(targetDir, dir));
    });

    // Clone repositories
    const repositories = [
      {
        url: 'https://github.com/vana-com/vana-smart-contracts.git',
        dir: 'contracts',
        branch: 'develop',
        removeGit: true // Contracts are never pushed back
      },
      {
        url: config.proofRepo || 'https://github.com/vana-com/vana-satya-proof-template-py.git',
        dir: 'proof',
        branch: 'main',
        removeGit: false // Keep git for pushing changes
      },
      {
        url: config.refinerRepo || 'https://github.com/vana-com/vana-data-refinement-template.git',
        dir: 'refiner',
        branch: 'main',
        removeGit: false // Keep git for pushing changes
      },
      {
        url: 'https://github.com/vana-com/dlp-ui-template.git',
        dir: 'ui',
        branch: 'main',
        removeGit: true // UI template, not pushed back
      }
    ];

    for (const repo of repositories) {
      spinner.text = `Cloning ${repo.dir}...`;

      const targetPath = path.join(targetDir, repo.dir);

      // Clone repository with full history for repos we'll push to
      const cloneCmd = repo.removeGit
        ? `git clone --depth 1 --branch ${repo.branch} ${repo.url} ${targetPath}`
        : `git clone --branch ${repo.branch} ${repo.url} ${targetPath}`;

      execSync(cloneCmd, { stdio: 'pipe' });

      // Only remove .git for repos we don't push back to
      if (repo.removeGit) {
        const gitDir = path.join(targetPath, '.git');
        if (fs.existsSync(gitDir)) {
          fs.removeSync(gitDir);
        }
      }
    }

    spinner.succeed('Repositories cloned successfully');
    return true;
  } catch (error) {
    spinner.fail('Error cloning repositories');
    throw error;
  }
}

/**
 * Generate configuration files for all components
 */
async function generateConfigFiles(targetDir, config) {
  const spinner = ora('Generating configuration files...').start();

  try {
    // Generate contracts .env
    const contractsEnv = `DEPLOYER_PRIVATE_KEY=${config.privateKey}
OWNER_ADDRESS=${config.address}
DLP_NAME=${config.dlpName}
DLP_PUBLIC_KEY=${config.publicKey}
DLP_TOKEN_NAME=${config.tokenName}
DLP_TOKEN_SYMBOL=${config.tokenSymbol}
DLP_TOKEN_SALT=${config.tokenSymbol}
DLP_FILE_REWARD_FACTOR=10000000000000000000
DAT_TYPE=0

# Vesting parameters
VESTING_BENEFICIARY=${config.address}
VESTING_AMOUNT=1000
VESTING_START=
VESTING_DURATION=
VESTING_CLIFF=

# Core contracts
DLP_REGISTRY_CONTRACT_ADDRESS=0x4D59880a924526d1dD33260552Ff4328b1E18a43
DATA_REGISTRY_CONTRACT_ADDRESS=0x8C8788f98385F6ba1adD4234e551ABba0f82Cb7C
TEE_POOL_CONTRACT_ADDRESS=0xE8EC6BD73b23Ad40E6B9a6f4bD343FAc411bD99A
DAT_FACTORY_CONTRACT_ADDRESS=0xcc63F29C559fF2420B0C525F28eD6e9801C9CAfB

# External dependencies
TRUSTED_FORWARDER_ADDRESS=0x0000000000000000000000000000000000000000

# Networks
VANA_RPC_URL=http://rpc.vana.org
VANA_API_URL=https://vanascan.io/api
VANA_BROWSER_URL=https://vanascan.io

MOKSHA_RPC_URL=https://rpc.moksha.vana.org
MOKSHA_API_URL=https://moksha.vanascan.io/api
MOKSHA_BROWSER_URL=https://moksha.vanascan.io
`;

    fs.writeFileSync(path.join(targetDir, 'contracts', '.env'), contractsEnv);

    // Generate refiner .env
    const refinerEnv = `PINATA_API_KEY=${config.pinataApiKey}
PINATA_API_SECRET=${config.pinataApiSecret}
`;

    fs.writeFileSync(path.join(targetDir, 'refiner', '.env'), refinerEnv);

    // Generate UI .env
    const uiEnv = `PINATA_API_KEY=${config.pinataApiKey}
PINATA_API_SECRET=${config.pinataApiSecret}
GOOGLE_CLIENT_ID=${config.googleClientId}
GOOGLE_CLIENT_SECRET=${config.googleClientSecret}
`;

    fs.writeFileSync(path.join(targetDir, 'ui', '.env'), uiEnv);

    // Generate initial deployment.json
    const deployment = {
      dlpName: config.dlpName,
      tokenName: config.tokenName,
      tokenSymbol: config.tokenSymbol,
      address: config.address,
      githubUsername: config.githubUsername,
      publicKey: config.publicKey,
      proofRepo: config.proofRepo || null,
      refinerRepo: config.refinerRepo || null,
      state: {
        contractsDeployed: false,
        dataDAORegistered: false,
        proofConfigured: false,
        proofPublished: false,
        refinerConfigured: false,
        refinerPublished: false,
        uiConfigured: false,
        proofGitSetup: config.proofRepo ? true : false,
        refinerGitSetup: config.refinerRepo ? true : false
      }
    };

    fs.writeFileSync(
      path.join(targetDir, 'deployment.json'),
      JSON.stringify(deployment, null, 2)
    );

    spinner.succeed('Configuration files generated successfully');
    return true;
  } catch (error) {
    spinner.fail('Error generating configuration files');
    throw error;
  }
}

/**
 * Generate root package.json with deployment scripts
 */
async function generateRootPackageJson(targetDir, config) {
  const spinner = ora('Generating root package.json...').start();

  try {
    const packageJson = {
      name: config.dlpName.toLowerCase().replace(/\s+/g, ''),
      version: '1.0.0',
      description: `${config.dlpName} - A DataDAO on the Vana network`,
      scripts: {
        deploy: 'node scripts/deploy.js',
        setup: 'node scripts/setup.js',
        configure: 'node scripts/configure.js',
        status: 'node scripts/status.js',
        'deploy:contracts': 'node scripts/deploy-contracts.js',
        'register:datadao': 'node scripts/register-datadao.js',
        'deploy:proof': 'node scripts/deploy-proof.js',
        'deploy:refiner': 'node scripts/deploy-refiner.js',
        'deploy:ui': 'node scripts/deploy-ui.js',
        'deploy:all': 'npm run deploy',
        'ui:dev': 'cd ui && npm run dev',
        'ui:build': 'cd ui && npm run build'
      },
      dependencies: {
        chalk: '^4.1.2',
        'fs-extra': '^11.1.1',
        inquirer: '^8.2.5',
        ora: '^5.4.1',
        viem: '^2.23.11'
      }
    };

    fs.writeFileSync(
      path.join(targetDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    spinner.succeed('Root package.json generated successfully');
    return true;
  } catch (error) {
    spinner.fail('Error generating root package.json');
    throw error;
  }
}

/**
 * Generate deployment scripts
 */
async function generateDeploymentScripts(targetDir, config) {
  const spinner = ora('Generating deployment scripts...').start();

  try {
    // Create scripts directory
    const scriptsDir = path.join(targetDir, 'scripts');
    fs.ensureDirSync(scriptsDir);

    // PRESERVE: Copy all existing automated scripts from templates
    const templateScripts = [
      'state-manager.js',
      'deploy-proof.js',
      'deploy-refiner.js',
      'deploy-ui.js',
      'setup.js',
      'status.js'
    ];

    templateScripts.forEach(scriptName => {
      const templatePath = path.join(__dirname, '..', 'src', 'templates', scriptName);
      const targetPath = path.join(scriptsDir, scriptName);

      if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, targetPath);
        spinner.text = `Copied ${scriptName}`;
      }
    });

    // ENHANCE: Generate enhanced deploy-contracts.js with better error handling
    const deployContractsScript = `const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const { createPublicClient, http } = require('viem');
const { moksha } = require('viem/chains');

/**
 * Check wallet balance before deployment
 */
async function checkWalletBalance(address) {
  const client = createPublicClient({
    chain: moksha,
    transport: http('https://rpc.moksha.vana.org')
  });

  try {
    const balance = await client.getBalance({ address });
    const balanceInVana = Number(balance) / 1e18;

    console.log(chalk.blue('💰 Wallet Information:'));
    console.log(\`  Address: \${address}\`);
    console.log(\`  Balance: \${balanceInVana.toFixed(4)} VANA\`);
    console.log();

    if (balanceInVana < 0.1) {
      console.error(chalk.red('❌ Insufficient balance for deployment!'));
      console.error(chalk.yellow('Please fund your wallet with at least 0.1 VANA from https://faucet.vana.org'));
      console.error(chalk.yellow(\`Your wallet address: \${address}\`));
      process.exit(1);
    }

    console.log(chalk.green('✅ Wallet has sufficient balance for deployment'));
    return balanceInVana;
  } catch (error) {
    console.error(chalk.yellow(\`⚠️  Could not check wallet balance: \${error.message}\`));
    console.log(chalk.yellow('Proceeding with deployment...'));
    return null;
  }
}

/**
 * Deploy smart contracts
 */
async function deployContracts() {
  console.log(chalk.blue('Deploying smart contracts...'));

  try {
    // Load deployment info to get wallet address
    const deploymentPath = path.resolve('deployment.json');
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

    // Check wallet balance first
    await checkWalletBalance(deployment.address);

    // Change to contracts directory
    process.chdir('contracts');

    // Deploy contracts using hardhat with spinner
    const spinner = ora({
      text: 'Running hardhat deployment...\\n' +
            chalk.yellow('💡 This usually takes 2-5 minutes depending on network conditions\\n') +
            chalk.gray('   • Compiling contracts\\n') +
            chalk.gray('   • Deploying to Moksha testnet\\n') +
            chalk.gray('   • Verifying on block explorer'),
      spinner: 'dots'
    }).start();

    let output;
    try {
      output = execSync('npx hardhat deploy --network moksha --tags DLPDeploy', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      spinner.succeed(chalk.green('✅ Hardhat deployment completed successfully!'));
    } catch (deployError) {
      spinner.fail(chalk.red('❌ Hardhat deployment failed'));
      throw deployError;
    }

    console.log();
    console.log(chalk.cyan('📋 Deployment Output:'));
    console.log(output);

    // Extract contract addresses from output - updated patterns for vana-smart-contracts
    const tokenMatch = output.match(/(?:Token|DAT).*?(?:deployed|reusing).*?(?:at|to)\\s+(0x[a-fA-F0-9]{40})/i);
    const dlpMatch = output.match(/(?:DataLiquidityPool|DLP).*?(?:deployed|reusing).*?(?:at|to)\\s+(0x[a-fA-F0-9]{40})/i);
    const vestingMatch = output.match(/(?:Vesting|VestingWallet).*?(?:deployed|reusing).*?(?:at|to)\\s+(0x[a-fA-F0-9]{40})/i);

    if (!tokenMatch) {
      console.error(chalk.red('Error: Failed to extract token address from deployment output.'));
      console.error(chalk.yellow('Please check deployment logs above for contract addresses.'));
      console.error(chalk.yellow('You may need to manually extract addresses from the output.'));
      process.exit(1);
    }

    const tokenAddress = tokenMatch[1];

    // Update deployment.json with state management
    deployment.tokenAddress = tokenAddress;
    deployment.state = deployment.state || {};
    deployment.state.contractsDeployed = true;

    console.log(chalk.green('✅ Contracts deployed successfully!'));
    console.log(chalk.cyan('Token Address:'), tokenAddress);

    if (dlpMatch) {
      const dlpAddress = dlpMatch[1];
      deployment.dlpAddress = dlpAddress;
      console.log(chalk.cyan('DLP Address:'), dlpAddress);
    }

    if (vestingMatch) {
      const vestingAddress = vestingMatch[1];
      deployment.vestingAddress = vestingAddress;
      console.log(chalk.cyan('Vesting Address:'), vestingAddress);
    }

    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  } catch (error) {
    console.error(chalk.red('Contract deployment failed:'));
    console.error(error.message);

    // Check if it's a known error type
    if (error.message.includes('insufficient funds') || error.message.includes('INSUFFICIENT_FUNDS')) {
      console.error(chalk.yellow('💡 This appears to be a funding issue.'));
      console.error(chalk.yellow('Please ensure your wallet has sufficient VANA tokens.'));
    } else if (error.message.includes('execution reverted')) {
      console.error(chalk.yellow('💡 Transaction was reverted by the network.'));
      console.error(chalk.yellow('This could be due to:'));
      console.error(chalk.yellow('  - Insufficient gas or funds'));
      console.error(chalk.yellow('  - Contract deployment restrictions'));
      console.error(chalk.yellow('  - Network congestion'));
    }

    console.error(chalk.yellow('\\nTroubleshooting:'));
    console.error(chalk.yellow('1. Check your wallet balance at https://moksha.vanascan.io'));
    console.error(chalk.yellow('2. Get more VANA from https://faucet.vana.org'));
    console.error(chalk.yellow('3. Wait a few minutes and try again'));

    process.exit(1);
  }
}

// Run deployment
deployContracts();
`;

    fs.writeFileSync(path.join(scriptsDir, 'deploy-contracts.js'), deployContractsScript);

    // ENHANCE: Generate enhanced register-datadao.js with BOTH automated AND manual options
    const registerScript = `const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { createPublicClient, createWalletClient, http, parseEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { moksha } = require('viem/chains');

// DLP Registry contract address and ABI
const DLP_REGISTRY_ADDRESS = '0x4D59880a924526d1dD33260552Ff4328b1E18a43';
const DLP_REGISTRY_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "dlpAddress", "type": "address"}],
    "name": "dlpIds",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "dlpAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "ownerAddress",
            "type": "address"
          },
          {
            "internalType": "address payable",
            "name": "treasuryAddress",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "iconUrl",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "website",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "metadata",
            "type": "string"
          }
        ],
        "internalType": "struct IDLPRegistry.DlpRegistration",
        "name": "registrationInfo",
        "type": "tuple"
      }
    ],
    "name": "registerDlp",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

/**
 * Get dlpId from the registry automatically
 */
async function getDlpId(dlpAddress) {
  const client = createPublicClient({
    chain: moksha,
    transport: http('https://rpc.moksha.vana.org')
  });

  try {
    const dlpId = await client.readContract({
      address: DLP_REGISTRY_ADDRESS,
      abi: DLP_REGISTRY_ABI,
      functionName: 'dlpIds',
      args: [dlpAddress]
    });

    return Number(dlpId);
  } catch (error) {
    console.error(chalk.red('Error querying dlpId:'), error.message);
    return 0;
  }
}

/**
 * Check wallet balance before registration
 */
async function checkWalletBalance(address) {
  const client = createPublicClient({
    chain: moksha,
    transport: http('https://rpc.moksha.vana.org')
  });

  try {
    const balance = await client.getBalance({ address });
    const balanceInVana = Number(balance) / 1e18;

    console.log(chalk.blue('💰 Wallet Information:'));
    console.log(\`  Address: \${address}\`);
    console.log(\`  Balance: \${balanceInVana.toFixed(4)} VANA\`);
    console.log();

    if (balanceInVana < 1.1) {
      console.error(chalk.red('❌ Insufficient balance for registration!'));
      console.error(chalk.yellow('Registration requires 1 VANA + gas fees (recommend at least 1.1 VANA)'));
      console.error(chalk.yellow('Please fund your wallet from https://faucet.vana.org'));
      console.error(chalk.yellow(\`Your wallet address: \${address}\`));
      return false;
    }

    console.log(chalk.green('✅ Wallet has sufficient balance for registration'));
    return true;
  } catch (error) {
    console.error(chalk.yellow(\`⚠️  Could not check wallet balance: \${error.message}\`));
    console.log(chalk.yellow('Proceeding with registration...'));
    return true;
  }
}

/**
 * ENHANCEMENT: Perform automated registration
 */
async function performAutomatedRegistration(deployment) {
  console.log(chalk.blue('⚡ Starting automated registration...'));
  console.log();

  // Load private key from contracts .env
  const contractsEnvPath = path.join(process.cwd(), 'contracts', '.env');
  if (!fs.existsSync(contractsEnvPath)) {
    console.error(chalk.red('No contracts/.env file found. Cannot access private key.'));
    return false;
  }

  const envContent = fs.readFileSync(contractsEnvPath, 'utf8');
  const privateKeyMatch = envContent.match(/DEPLOYER_PRIVATE_KEY=(.+)/);

  if (!privateKeyMatch) {
    console.error(chalk.red('No DEPLOYER_PRIVATE_KEY found in contracts/.env'));
    return false;
  }

  const privateKey = privateKeyMatch[1].trim();

  try {
    // Create account and clients
    const account = privateKeyToAccount(privateKey);

    const publicClient = createPublicClient({
      chain: moksha,
      transport: http('https://rpc.moksha.vana.org')
    });

    const walletClient = createWalletClient({
      account,
      chain: moksha,
      transport: http('https://rpc.moksha.vana.org')
    });

    // Check balance
    const hasBalance = await checkWalletBalance(account.address);
    if (!hasBalance) {
      return false;
    }

    // Prepare registration parameters
    const registrationParams = {
      dlpAddress: deployment.dlpAddress,
      ownerAddress: deployment.address,
      treasuryAddress: deployment.address,
      name: deployment.dlpName,
      iconUrl: '',
      website: '',
      metadata: ''
    };

    console.log(chalk.blue('📋 Registration Parameters:'));
    console.log(\`  DLP Address: \${registrationParams.dlpAddress}\`);
    console.log(\`  Owner: \${registrationParams.ownerAddress}\`);
    console.log(\`  Treasury: \${registrationParams.treasuryAddress}\`);
    console.log(\`  Name: \${registrationParams.name}\`);
    console.log(\`  Registration Fee: 1 VANA\`);
    console.log();

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed with automated registration?',
        default: true
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Registration cancelled.'));
      return false;
    }

    console.log(chalk.blue('🚀 Submitting registration transaction...'));

    // Call registerDlp function
    const hash = await walletClient.writeContract({
      address: DLP_REGISTRY_ADDRESS,
      abi: DLP_REGISTRY_ABI,
      functionName: 'registerDlp',
      args: [
        {
          dlpAddress: registrationParams.dlpAddress,
          ownerAddress: registrationParams.ownerAddress,
          treasuryAddress: registrationParams.treasuryAddress,
          name: registrationParams.name,
          iconUrl: registrationParams.iconUrl,
          website: registrationParams.website,
          metadata: registrationParams.metadata
        }
      ],
      value: parseEther('1') // 1 VANA registration fee
    });

    console.log(chalk.blue(\`📝 Transaction submitted: \${hash}\`));
    console.log(chalk.blue('⏳ Waiting for confirmation...'));

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log(chalk.green('✅ Registration transaction confirmed!'));
      console.log(\`   Block: \${receipt.blockNumber}\`);
      console.log(\`   Gas used: \${receipt.gasUsed}\`);
      console.log();

      // Get the dlpId
      console.log(chalk.blue('🔍 Retrieving dlpId...'));
      const dlpId = await getDlpId(deployment.dlpAddress);

      if (dlpId > 0) {
        console.log(chalk.green(\`✅ Registration successful! dlpId: \${dlpId}\`));
        deployment.dlpId = dlpId;
        deployment.state = deployment.state || {};
        deployment.state.dataDAORegistered = true;
        return true;
      } else {
        console.error(chalk.red('Registration transaction succeeded but could not retrieve dlpId'));
        console.log(chalk.yellow('Please check the transaction and try querying dlpId manually'));
        return false;
      }
    } else {
      console.error(chalk.red('❌ Registration transaction failed'));
      console.log(\`   Transaction hash: \${hash}\`);
      return false;
    }

  } catch (error) {
    console.error(chalk.red('Registration failed:'), error.message);

    if (error.message.includes('insufficient funds')) {
      console.error(chalk.yellow('💡 Insufficient funds for transaction'));
      console.error(chalk.yellow('Please ensure you have at least 1.1 VANA for registration + gas'));
    } else if (error.message.includes('execution reverted')) {
      console.error(chalk.yellow('💡 Transaction reverted - possible causes:'));
      console.error(chalk.yellow('  - DLP already registered'));
      console.error(chalk.yellow('  - Invalid DLP address'));
      console.error(chalk.yellow('  - Network congestion'));
    }

    return false;
  }
}

/**
 * PRESERVED: Manual registration flow
 */
async function performManualRegistration(deployment) {
  console.log();
  console.log(chalk.yellow('🔗 Manual Registration Steps:'));
  console.log('1. Go to https://moksha.vanascan.io/address/0x4D59880a924526d1dD33260552Ff4328b1E18a43?tab=write_proxy');
  console.log('2. Connect your wallet');
  console.log('3. Find the "registerDlp" method');
  console.log('4. Fill in the registration info:');
  console.log(\`   - dlpAddress: \${deployment.dlpAddress}\`);
  console.log(\`   - ownerAddress: \${deployment.address}\`);
  console.log(\`   - treasuryAddress: \${deployment.address}\`);
  console.log(\`   - name: \${deployment.dlpName}\`);
  console.log('   - iconUrl: (optional)');
  console.log('   - website: (optional)');
  console.log('   - metadata: (optional)');
  console.log('5. Set "Send native VANA" to 1 (click ×10^18 button)');
  console.log('6. Submit the transaction');
  console.log();

  const { completed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'completed',
      message: 'Have you completed the registration transaction?',
      default: false
    }
  ]);

  if (!completed) {
    console.log(chalk.yellow('Please complete the registration and run this script again.'));
    process.exit(0);
  }

  // Auto-detect dlpId after manual registration
  console.log();
  console.log(chalk.blue('🔍 Detecting your dlpId...'));

  // Poll for dlpId (it might take a moment for the transaction to be processed)
  let dlpId = 0;
  for (let i = 0; i < 10; i++) {
    dlpId = await getDlpId(deployment.dlpAddress);
    if (dlpId > 0) break;

    console.log(\`   Attempt \${i + 1}/10: Waiting for registration to be processed...\`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  if (dlpId === 0) {
    console.error(chalk.red('Could not detect dlpId automatically.'));
    console.log(chalk.yellow('Please check your transaction and try again, or manually enter the dlpId.'));
    process.exit(1);
  }

  console.log(chalk.green(\`✅ dlpId detected: \${dlpId}\`));
  deployment.dlpId = dlpId;
  deployment.state = deployment.state || {};
  deployment.state.dataDAORegistered = true;
  return true;
}

/**
 * Register DataDAO with BOTH automated AND manual options
 */
async function registerDataDAO() {
  console.log(chalk.blue('📋 DataDAO Registration'));
  console.log();

  // Load deployment info
  const deploymentPath = path.join(process.cwd(), 'deployment.json');
  if (!fs.existsSync(deploymentPath)) {
    console.error(chalk.red('No deployment.json found. Please deploy contracts first.'));
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  if (!deployment.dlpAddress) {
    console.error(chalk.red('No DLP address found. Please deploy contracts first.'));
    process.exit(1);
  }

  console.log(chalk.blue('📋 Registration Information:'));
  console.log(\`  DLP Address: \${deployment.dlpAddress}\`);
  console.log(\`  Owner Address: \${deployment.address}\`);
  console.log(\`  DLP Name: \${deployment.dlpName}\`);
  console.log();

  // Check if already registered
  console.log(chalk.blue('🔍 Checking registration status...'));
  const existingDlpId = await getDlpId(deployment.dlpAddress);

  if (existingDlpId > 0) {
    console.log(chalk.green(\`✅ DataDAO already registered with dlpId: \${existingDlpId}\`));
    deployment.dlpId = existingDlpId;
    deployment.state = deployment.state || {};
    deployment.state.dataDAORegistered = true;
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

    console.log();
    console.log(chalk.blue('🎯 Your DataDAO is registered and ready!'));
    console.log('Next: Configure your proof template and refiner');
    return;
  }

  console.log(chalk.yellow('⏸️  DataDAO not yet registered'));
  console.log();
  console.log(chalk.blue('📋 Registration Options:'));
  console.log();

  const { registrationMethod } = await inquirer.prompt([
    {
      type: 'list',
      name: 'registrationMethod',
      message: 'How would you like to register your DataDAO?',
      choices: [
        { name: '⚡ Automated registration (recommended)', value: 'auto' },
        { name: '🌐 Manual registration via Vanascan', value: 'manual' },
        { name: '⏸️  Skip for now', value: 'skip' }
      ]
    }
  ]);

  if (registrationMethod === 'skip') {
    console.log(chalk.yellow('Registration skipped. You can register later with: npm run register:datadao'));
    return;
  }

  let registrationSuccessful = false;

  if (registrationMethod === 'auto') {
    registrationSuccessful = await performAutomatedRegistration(deployment);
  } else if (registrationMethod === 'manual') {
    registrationSuccessful = await performManualRegistration(deployment);
  }

  if (registrationSuccessful) {
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log();
    console.log(chalk.green('✅ DataDAO registration completed!'));
    console.log();
    console.log(chalk.blue('🎯 What happens next:'));
    console.log('• Update your proof template with the dlpId');
    console.log('• Get the encryption key for your refiner');
    console.log('• Configure your proof-of-contribution logic');
    console.log('• Test the full data contribution flow');
  } else if (registrationMethod === 'auto') {
    console.log();
    console.log(chalk.yellow('⚠️  Automated registration failed'));
    console.log(chalk.yellow('You can try manual registration or run this script again'));
  }
}

// Run registration
registerDataDAO().catch(error => {
  console.error(chalk.red('Registration failed:'), error.message);
  process.exit(1);
});
`;

    fs.writeFileSync(path.join(scriptsDir, 'register-datadao.js'), registerScript);

    // NEW: Add orchestrator script that follows tutorial order
    const deployScript = `const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');

/**
 * Main deployment orchestrator - follows tutorial order
 */
async function deployAll() {
  console.log(chalk.blue('🚀 DataDAO Deployment Orchestrator'));
  console.log();
  console.log('This follows the official tutorial order for best results.');
  console.log();

  try {
    // Load deployment state
    const deploymentPath = path.join(process.cwd(), 'deployment.json');
    let deployment = {};

    if (fs.existsSync(deploymentPath)) {
      deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    }

    const state = deployment.state || {};

    // Show current progress
    console.log(chalk.blue('📊 Current Progress:'));
    console.log(\`  \${state.contractsDeployed ? '✅' : '⏸️'} Smart contracts deployed\`);
    console.log(\`  \${state.dataDAORegistered ? '✅' : '⏸️'} DataDAO registered\`);
    console.log(\`  \${state.proofGitSetup ? '✅' : '⏸️'} GitHub repositories setup\`);
    console.log(\`  \${state.proofConfigured ? '✅' : '⏸️'} Proof of contribution configured\`);
    console.log(\`  \${state.refinerConfigured ? '✅' : '⏸️'} Data refiner configured\`);
    console.log(\`  \${state.uiConfigured ? '✅' : '⏸️'} UI configured\`);
    console.log();

    // Step 1: Deploy Contracts (if not done)
    if (!state.contractsDeployed) {
      console.log(chalk.blue('📋 Step 1: Deploy Smart Contracts'));
      console.log();

      const { deployContracts } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'deployContracts',
          message: 'Deploy smart contracts now?',
          default: true
        }
      ]);

      if (deployContracts) {
        console.log(chalk.blue('Running contract deployment...'));
        execSync('npm run deploy:contracts', { stdio: 'inherit' });
        console.log();
      } else {
        console.log(chalk.yellow('Skipping contract deployment. Run manually: npm run deploy:contracts'));
        return;
      }
    } else {
      console.log(chalk.green('✅ Step 1: Smart contracts already deployed'));
    }

    // Reload state after contracts
    if (fs.existsSync(deploymentPath)) {
      deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    }

    // Step 2: Register DataDAO (if not done)
    if (!deployment.state?.dataDAORegistered) {
      console.log(chalk.blue('📋 Step 2: Register DataDAO'));
      console.log();

      const { registerDataDAO } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'registerDataDAO',
          message: 'Register DataDAO now?',
          default: true
        }
      ]);

      if (registerDataDAO) {
        console.log(chalk.blue('Running DataDAO registration...'));
        execSync('npm run register:datadao', { stdio: 'inherit' });
        console.log();
      } else {
        console.log(chalk.yellow('Skipping DataDAO registration. Run manually: npm run register:datadao'));
        return;
      }
    } else {
      console.log(chalk.green('✅ Step 2: DataDAO already registered'));
    }

    // Reload state after registration
    if (fs.existsSync(deploymentPath)) {
      deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    }

    // Step 3: Configure Proof (follows tutorial order)
    if (!deployment.state?.proofConfigured) {
      console.log(chalk.blue('📋 Step 3: Configure Proof of Contribution'));
      console.log();
      console.log(chalk.yellow('⚠️  This requires GitHub repositories to be set up first.'));
      console.log('If you haven\'t forked the repositories yet, please do so before continuing.');
      console.log();

      const { deployProof } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'deployProof',
          message: 'Configure proof of contribution now?',
          default: true
        }
      ]);

      if (deployProof) {
        console.log(chalk.blue('Running proof configuration...'));
        execSync('npm run deploy:proof', { stdio: 'inherit' });
        console.log();
      } else {
        console.log(chalk.yellow('Skipping proof configuration. Run manually: npm run deploy:proof'));
        console.log(chalk.yellow('Note: This is required for data validation.'));
        return;
      }
    } else {
      console.log(chalk.green('✅ Step 3: Proof of contribution already configured'));
    }

    // Step 4: Configure Refiner (follows tutorial order)
    if (!deployment.state?.refinerConfigured) {
      console.log(chalk.blue('📋 Step 4: Configure Data Refiner'));
      console.log();
      console.log('This structures contributed data into queryable databases.');
      console.log(chalk.yellow('⚠️  Requires GitHub repositories to be set up first.'));

      if (!deployment.state?.refinerGitSetup) {
        console.log(chalk.red('⚠️  GitHub setup required first. Please complete Step 1.'));
        console.log();
      }

      const { deployRefiner } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'deployRefiner',
          message: deployment.state?.refinerGitSetup ? 'Configure data refiner now?' : 'Skip refiner configuration (requires GitHub setup)?',
          default: deployment.state?.refinerGitSetup || false
        }
      ]);

      if (deployRefiner && deployment.state?.refinerGitSetup) {
        console.log();
        console.log(chalk.blue('🔧 Configuring data refiner...'));
        try {
          execSync('npm run deploy:refiner', { stdio: 'inherit', cwd: targetDir });
          console.log();
          console.log(chalk.green('✅ Data refiner configured successfully!'));
        } catch (error) {
          console.log();
          console.log(chalk.red('❌ Refiner configuration failed'));
          console.log(chalk.yellow('You can try again later with: npm run deploy:refiner'));
          console.log();
        }
      } else {
        console.log();
        console.log(chalk.yellow('⏸️  Skipping refiner configuration for now.'));
        if (!deployment.state?.refinerGitSetup) {
          console.log('Complete GitHub setup first, then run: ' + chalk.cyan('npm run deploy:refiner'));
        } else {
          console.log('You can configure later with: ' + chalk.cyan('npm run deploy:refiner'));
        }
        console.log();
      }
    } else {
      console.log(chalk.green('✅ Step 4: Data refiner already configured'));
    }

    // Step 5: Configure UI (follows tutorial order)
    if (!deployment.state?.uiConfigured) {
      console.log(chalk.blue('📋 Step 5: Configure UI'));
      console.log();
      console.log('This sets up the user interface for data contributions.');

      const { deployUI } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'deployUI',
          message: 'Configure UI now?',
          default: true
        }
      ]);

      if (deployUI) {
        console.log();
        console.log(chalk.blue('🎨 Configuring UI...'));
        try {
          execSync('npm run deploy:ui', { stdio: 'inherit', cwd: targetDir });
          console.log();
          console.log(chalk.green('✅ UI configured successfully!'));
        } catch (error) {
          console.log();
          console.log(chalk.red('❌ UI configuration failed'));
          console.log(chalk.yellow('You can try again later with: npm run deploy:ui'));
          console.log();
        }
      } else {
        console.log();
        console.log(chalk.yellow('⏸️  Skipping UI configuration for now.'));
        console.log('You can configure later with: ' + chalk.cyan('npm run deploy:ui'));
        console.log();
      }
    } else {
      console.log(chalk.green('✅ Step 5: UI already configured'));
    }

    // Final status
    console.log(chalk.green('🎉 DataDAO deployment completed!'));
    console.log();
    console.log(chalk.blue('🎯 Your DataDAO is ready to use:'));
    console.log('  • Test the UI: ' + chalk.cyan('npm run ui:dev'));
    console.log('  • Visit: ' + chalk.cyan('http://localhost:3000'));
    console.log('  • Check status: ' + chalk.cyan('npm run status'));
    console.log();
    console.log(chalk.blue('📚 Next steps:'));
    console.log('  • Test the data contribution flow');
    console.log('  • Customize your validation logic');
    console.log('  • Deploy to production when ready');

  } catch (error) {
    console.error(chalk.red('Deployment failed:'), error.message);
    console.log();
    console.log(chalk.yellow('You can resume deployment by running:'));
    console.log('  • ' + chalk.cyan('npm run status') + ' - Check current progress');
    console.log('  • ' + chalk.cyan('npm run deploy') + ' - Resume deployment');
    console.log();
    console.log(chalk.yellow('Or run individual steps:'));
    console.log('  • ' + chalk.cyan('npm run deploy:contracts') + ' - Deploy contracts');
    console.log('  • ' + chalk.cyan('npm run register:datadao') + ' - Register DataDAO');
    console.log('  • ' + chalk.cyan('npm run deploy:proof') + ' - Configure proof');
    console.log('  • ' + chalk.cyan('npm run deploy:refiner') + ' - Configure refiner');
    console.log('  • ' + chalk.cyan('npm run deploy:ui') + ' - Configure UI');
    process.exit(1);
  }
}

// Run deployment
deployAll();
`;

    fs.writeFileSync(path.join(scriptsDir, 'deploy.js'), deployScript);

    spinner.succeed('Deployment scripts generated successfully');
    return true;
  } catch (error) {
    spinner.fail('Error generating deployment scripts');
    throw error;
  }
}

/**
 * Guide user through next steps in the CORRECT tutorial order
 */
async function guideNextSteps(targetDir, config) {
  console.log();
  console.log(chalk.blue('🚀 Let\'s complete your DataDAO setup step by step!'));
  console.log();
  console.log(chalk.yellow('Following the official tutorial order for best results.'));
  console.log();

  // Load current deployment state
  const deploymentPath = path.join(targetDir, 'deployment.json');
  let deployment = {};
  if (fs.existsSync(deploymentPath)) {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  }
  const state = deployment.state || {};

  // Step 1: GitHub Setup (must come first - registration depends on this)
  if (!state.proofGitSetup || !state.refinerGitSetup) {
    console.log(chalk.blue('📋 Step 1: Set up GitHub repositories'));
    console.log();
    console.log('Your DataDAO needs template repositories for proof validation and data refinement.');
    console.log(chalk.yellow('⚠️  This step is required before configuring proof/refiner components.'));
    console.log();

    const { proceedWithGitHub } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceedWithGitHub',
        message: 'Do you want to set up GitHub repositories now?',
        default: true
      }
    ]);

    if (proceedWithGitHub) {
      await guideGitHubSetup(config);
      // Update state to reflect GitHub setup completion
      deployment.state = deployment.state || {};
      deployment.state.proofGitSetup = true;
      deployment.state.refinerGitSetup = true;
      fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    } else {
      console.log();
      console.log(chalk.yellow('⏸️  Skipping GitHub setup for now.'));
      console.log(chalk.red('⚠️  Warning: Proof and refiner configuration requires GitHub repositories.'));
      console.log('You can complete this later, but it\'s needed for the next steps.');
      console.log();
    }
  } else {
    console.log(chalk.green('✅ Step 1: GitHub repositories already set up'));
  }

  // Reload state after GitHub setup
  if (fs.existsSync(deploymentPath)) {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  }

  // Step 2: Register DataDAO (required before proof configuration)
  if (!deployment.state?.dataDAORegistered) {
    console.log(chalk.blue('📋 Step 2: Register DataDAO'));
    console.log();
    console.log('This registers your DataDAO with the Vana network so it can accept data contributions.');
    console.log(chalk.yellow('⚠️  This requires additional VANA tokens for registration fees.'));
    console.log();

    const { registerDataDAO } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'registerDataDAO',
        message: 'Register DataDAO now?',
        default: true
      }
    ]);

    if (registerDataDAO) {
      console.log();
      console.log(chalk.blue('🏁 Registering your DataDAO...'));
      try {
        execSync('npm run register:datadao', { stdio: 'inherit', cwd: targetDir });
        console.log();
        console.log(chalk.green('✅ DataDAO registered successfully!'));
      } catch (error) {
        console.log();
        console.log(chalk.red('❌ DataDAO registration failed'));
        console.log(chalk.yellow('This is usually due to insufficient VANA tokens or network issues.'));
        console.log(chalk.yellow('You can try again later with: npm run register:datadao'));
        console.log();
      }
    } else {
      console.log();
      console.log(chalk.yellow('⏸️  Skipping DataDAO registration for now.'));
      console.log('You can register later with: ' + chalk.cyan('npm run register:datadao'));
      console.log(chalk.red('⚠️  Warning: Proof configuration requires registration to get dlpId.'));
      console.log();
    }
  } else {
    console.log(chalk.green('✅ Step 2: DataDAO already registered'));
  }

  // Reload state after registration
  if (fs.existsSync(deploymentPath)) {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  }

  // Step 3: Configure Proof of Contribution (requires dlpId from registration)
  if (!deployment.state?.proofConfigured) {
    console.log(chalk.blue('📋 Step 3: Configure Proof of Contribution'));
    console.log();
    console.log('This validates that contributed data is authentic and meets your criteria.');
    console.log(chalk.yellow('⚠️  Requires GitHub repositories and DataDAO registration.'));

    if (!deployment.state?.proofGitSetup) {
      console.log(chalk.red('⚠️  GitHub setup required first. Please complete Step 1.'));
      console.log();
    }

    if (!deployment.state?.dataDAORegistered) {
      console.log(chalk.red('⚠️  DataDAO registration required first. Please complete Step 2.'));
      console.log();
    }

    const canConfigureProof = deployment.state?.proofGitSetup && deployment.state?.dataDAORegistered;

    const { configureProof } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'configureProof',
        message: canConfigureProof ? 'Configure proof of contribution now?' : 'Skip proof configuration (requires GitHub setup and registration)?',
        default: canConfigureProof || false
      }
    ]);

    if (configureProof && canConfigureProof) {
      console.log();
      console.log(chalk.blue('🔍 Configuring proof of contribution...'));
      try {
        execSync('npm run deploy:proof', { stdio: 'inherit', cwd: targetDir });
        console.log();
        console.log(chalk.green('✅ Proof of contribution configured successfully!'));
      } catch (error) {
        console.log();
        console.log(chalk.red('❌ Proof configuration failed'));
        console.log(chalk.yellow('You can try again later with: npm run deploy:proof'));
        console.log();
      }
    } else {
      console.log();
      console.log(chalk.yellow('⏸️  Skipping proof configuration for now.'));
      if (!canConfigureProof) {
        console.log('Complete GitHub setup and registration first, then run: ' + chalk.cyan('npm run deploy:proof'));
      } else {
        console.log('You can configure later with: ' + chalk.cyan('npm run deploy:proof'));
      }
      console.log();
    }
  } else {
    console.log(chalk.green('✅ Step 3: Proof of contribution already configured'));
  }

  // Step 4: Configure Data Refiner (follows tutorial order)
  if (!deployment.state?.refinerConfigured) {
    console.log(chalk.blue('📋 Step 4: Configure Data Refiner'));
    console.log();
    console.log('This structures contributed data into queryable databases.');
    console.log(chalk.yellow('⚠️  Requires GitHub repositories to be set up first.'));

    if (!deployment.state?.refinerGitSetup) {
      console.log(chalk.red('⚠️  GitHub setup required first. Please complete Step 1.'));
      console.log();
    }

    const { configureRefiner } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'configureRefiner',
        message: deployment.state?.refinerGitSetup ? 'Configure data refiner now?' : 'Skip refiner configuration (requires GitHub setup)?',
        default: deployment.state?.refinerGitSetup || false
      }
    ]);

    if (configureRefiner && deployment.state?.refinerGitSetup) {
      console.log();
      console.log(chalk.blue('🔧 Configuring data refiner...'));
      try {
        execSync('npm run deploy:refiner', { stdio: 'inherit', cwd: targetDir });
        console.log();
        console.log(chalk.green('✅ Data refiner configured successfully!'));
      } catch (error) {
        console.log();
        console.log(chalk.red('❌ Refiner configuration failed'));
        console.log(chalk.yellow('You can try again later with: npm run deploy:refiner'));
        console.log();
      }
    } else {
      console.log();
      console.log(chalk.yellow('⏸️  Skipping refiner configuration for now.'));
      if (!deployment.state?.refinerGitSetup) {
        console.log('Complete GitHub setup first, then run: ' + chalk.cyan('npm run deploy:refiner'));
      } else {
        console.log('You can configure later with: ' + chalk.cyan('npm run deploy:refiner'));
      }
      console.log();
    }
  } else {
    console.log(chalk.green('✅ Step 4: Data refiner already configured'));
  }

  // Step 5: Configure UI (follows tutorial order)
  if (!deployment.state?.uiConfigured) {
    console.log(chalk.blue('📋 Step 5: Configure UI'));
    console.log();
    console.log('This sets up the user interface for data contributions.');

    const { configureUI } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'configureUI',
        message: 'Configure UI now?',
        default: true
      }
    ]);

    if (configureUI) {
      console.log();
      console.log(chalk.blue('🎨 Configuring UI...'));
      try {
        execSync('npm run deploy:ui', { stdio: 'inherit', cwd: targetDir });
        console.log();
        console.log(chalk.green('✅ UI configured successfully!'));
      } catch (error) {
        console.log();
        console.log(chalk.red('❌ UI configuration failed'));
        console.log(chalk.yellow('You can try again later with: npm run deploy:ui'));
        console.log();
      }
    } else {
      console.log();
      console.log(chalk.yellow('⏸️  Skipping UI configuration for now.'));
      console.log('You can configure later with: ' + chalk.cyan('npm run deploy:ui'));
      console.log();
    }
  } else {
    console.log(chalk.green('✅ Step 5: UI already configured'));
  }

  // Step 6: Test the UI (NON-BLOCKING)
  console.log(chalk.blue('📋 Step 6: Test your DataDAO UI'));
  console.log();
  console.log('Let\'s verify the user interface is working correctly.');
  console.log(chalk.yellow('💡 This will show you how to start the UI, but won\'t block the setup process.'));
  console.log();

  const { showUIInstructions } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'showUIInstructions',
      message: 'Show UI testing instructions?',
      default: true
    }
  ]);

  if (showUIInstructions) {
    console.log();
    console.log(chalk.blue('🎨 UI Testing Instructions:'));
    console.log();
    console.log(chalk.cyan('To test your UI:'));
    console.log('1. Open a new terminal window');
    console.log(`2. Navigate to your project: ${chalk.yellow(`cd ${targetDir}`)}`);
    console.log(`3. Start the UI: ${chalk.yellow('npm run ui:dev')}`);
    console.log('4. Visit http://localhost:3000 in your browser');
    console.log('5. Test the data contribution flow');
    console.log('6. Press Ctrl+C in the UI terminal when done');
    console.log();
    console.log(chalk.yellow('💡 The UI will run in the background while you continue with other tasks.'));
    console.log();

    const { openUILater } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'openUILater',
        message: 'Got it! I\'ll test the UI separately.',
        default: true
      }
    ]);

    if (openUILater) {
      console.log(chalk.green('✅ UI testing instructions provided'));
    }
  } else {
    console.log();
    console.log(chalk.yellow('⏸️  Skipping UI testing instructions.'));
    console.log('You can test the UI anytime with: ' + chalk.cyan('npm run ui:dev'));
    console.log();
  }

  // Final status and next steps
  console.log();
  console.log(chalk.blue('📊 Setup Summary:'));
  console.log('  ✅ Smart contracts deployed');
  console.log(`  ${deployment.state?.dataDAORegistered ? '✅' : '⏸️'} DataDAO registered`);
  console.log(`  ${deployment.state?.proofGitSetup ? '✅' : '⏸️'} GitHub repositories setup`);
  console.log(`  ${deployment.state?.proofConfigured ? '✅' : '⏸️'} Proof of contribution configured`);
  console.log(`  ${deployment.state?.refinerConfigured ? '✅' : '⏸️'} Data refiner configured`);
  console.log(`  ${deployment.state?.uiConfigured ? '✅' : '⏸️'} UI configured`);
  console.log();

  // Check completion status
  const coreStepsCompleted = deployment.state?.dataDAORegistered && deployment.state?.proofConfigured && deployment.state?.refinerConfigured && deployment.state?.uiConfigured;

  if (coreStepsCompleted) {
    console.log(chalk.green('🎉 Your DataDAO is fully configured and ready!'));
    console.log();
    console.log(chalk.blue('🎯 What you can do now:'));
    console.log('  • Test the UI with: ' + chalk.cyan('npm run ui:dev'));
    console.log('  • Start accepting data contributions');
    console.log('  • Customize your validation logic and schemas');
    console.log('  • Deploy to production when ready');
  } else {
    console.log(chalk.yellow('⚠️  Your DataDAO needs additional configuration to be fully functional'));
    console.log();
    console.log(chalk.blue('🎯 To complete setup:'));
    if (!deployment.state?.dataDAORegistered) {
      console.log('  • Register DataDAO: ' + chalk.cyan('npm run register:datadao'));
    }
    if (!deployment.state?.proofGitSetup || !deployment.state?.refinerGitSetup) {
      console.log('  • Set up GitHub repositories (required for proof/refiner)');
    }
    if (!deployment.state?.proofConfigured) {
      console.log('  • Configure proof of contribution: ' + chalk.cyan('npm run deploy:proof'));
    }
    if (!deployment.state?.refinerConfigured) {
      console.log('  • Configure data refiner: ' + chalk.cyan('npm run deploy:refiner'));
    }
    if (!deployment.state?.uiConfigured) {
      console.log('  • Configure UI: ' + chalk.cyan('npm run deploy:ui'));
    }
  }

  console.log();
  console.log(chalk.blue('📁 Project location: ') + targetDir);
  console.log(chalk.blue('📚 Check progress anytime: ') + chalk.cyan('npm run status'));
  console.log(chalk.blue('📚 Resume setup anytime: ') + chalk.cyan('npm run deploy'));
  console.log();
}

/**
 * ENHANCED: Guide GitHub repository setup with fresh repo creation
 */
async function guideGitHubSetup(config) {
  console.log();
  console.log(chalk.blue('🐙 GitHub Repository Setup'));
  console.log();
  console.log('We need to create 2 repositories for your DataDAO:');
  console.log('• Proof of Contribution - validates data authenticity');
  console.log('• Data Refinement - structures data for querying');
  console.log();

  // Check GitHub CLI availability and authentication
  console.log(chalk.blue('🔍 Checking GitHub CLI availability...'));
  const ghStatus = await checkGitHubCLI();

  if (ghStatus.available && ghStatus.authenticated) {
    console.log(chalk.green('✅ GitHub CLI detected and authenticated'));
    console.log(chalk.blue('📋 Available options:'));
    console.log('  1. Automated setup (recommended) - creates repos automatically');
    console.log('  2. Manual setup - you create repos via GitHub web interface');
    console.log();

    const { setupMethod } = await inquirer.prompt([
      {
        type: 'list',
        name: 'setupMethod',
        message: 'How would you like to set up repositories?',
        choices: [
          { name: '⚡ Automated setup using GitHub CLI (recommended)', value: 'auto' },
          { name: '🌐 Manual setup via GitHub website', value: 'manual' }
        ]
      }
    ]);

    if (setupMethod === 'auto') {
      return await createRepositoriesAutomatically(config);
    }
  } else if (ghStatus.available && !ghStatus.authenticated) {
    console.log(chalk.yellow('⚠️  GitHub CLI detected but not authenticated'));
    console.log();

    const { authenticateNow } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'authenticateNow',
        message: 'Would you like to authenticate with GitHub CLI now?',
        default: true
      }
    ]);

    if (authenticateNow) {
      console.log();
      console.log(chalk.blue('🔐 Starting GitHub CLI authentication...'));
      console.log(chalk.yellow('Follow the prompts in your terminal to complete authentication.'));
      console.log();

      try {
        execSync('gh auth login', { stdio: 'inherit' });

        // Re-check authentication after login
        const finalStatus = await checkGitHubCLI();
        if (finalStatus.authenticated) {
          console.log();
          console.log(chalk.green('✅ GitHub CLI authentication successful!'));

          const { useAutomationAfterAuth } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'useAutomationAfterAuth',
              message: 'Create repositories automatically now?',
              default: true
            }
          ]);

          if (useAutomationAfterAuth) {
            return await createRepositoriesAutomatically(config);
          }
        } else {
          console.log(chalk.yellow('⚠️  Authentication may not have completed successfully.'));
          console.log(chalk.yellow('For now, we\'ll continue with manual setup.'));
        }
      } catch (error) {
        console.log(chalk.yellow('⚠️  GitHub CLI authentication failed or was cancelled.'));
        console.log(chalk.yellow('For now, we\'ll continue with manual setup.'));
      }
    } else {
      console.log(chalk.yellow('You can authenticate later with: gh auth login'));
      console.log();

      const { nextStep } = await inquirer.prompt([
        {
          type: 'list',
          name: 'nextStep',
          message: 'What would you like to do?',
          choices: [
            { name: '🔄 Retry GitHub setup (check CLI status again)', value: 'retry' },
            { name: '🌐 Continue with manual setup', value: 'manual' }
          ]
        }
      ]);

      if (nextStep === 'retry') {
        console.log();
        return await guideGitHubSetup(config);
      }
    }
  } else {
    console.log(chalk.yellow('⚠️  GitHub CLI not detected'));
    console.log();
    console.log(chalk.blue('📋 Available options:'));
    console.log('  1. Install GitHub CLI for automated setup');
    console.log('  2. Use manual setup via GitHub website');
    console.log();

    const { installChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'installChoice',
        message: 'What would you like to do?',
        choices: [
          { name: '📥 Install GitHub CLI (opens installation guide)', value: 'install' },
          { name: '🌐 Continue with manual setup', value: 'manual' }
        ]
      }
    ]);

    if (installChoice === 'install') {
      console.log();
      console.log(chalk.blue('📥 GitHub CLI Installation:'));
      console.log();
      console.log(chalk.cyan('Installation instructions:'));
      console.log('• Visit: https://cli.github.com/');
      console.log('• Follow installation instructions for your OS');
      console.log('• Run: gh auth login');
      console.log('• Then re-run this setup');
      console.log();

      const { installCompleted } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'installCompleted',
          message: 'Have you installed and authenticated GitHub CLI?',
          default: false
        }
      ]);

      if (installCompleted) {
        console.log();
        console.log(chalk.blue('🔍 Re-checking GitHub CLI...'));
        const newStatus = await checkGitHubCLI();

        if (newStatus.available && newStatus.authenticated) {
          console.log(chalk.green('✅ GitHub CLI detected and authenticated!'));

          const { useAutomationAfterInstall } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'useAutomationAfterInstall',
              message: 'Create repositories automatically now?',
              default: true
            }
          ]);

          if (useAutomationAfterInstall) {
            return await createRepositoriesAutomatically(config);
          }
        } else if (newStatus.available && !newStatus.authenticated) {
          console.log(chalk.yellow('⚠️  GitHub CLI detected but not authenticated'));
          console.log();

          const { authenticateNow } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'authenticateNow',
              message: 'Would you like to authenticate with GitHub CLI now?',
              default: true
            }
          ]);

          if (authenticateNow) {
            console.log();
            console.log(chalk.blue('🔐 Starting GitHub CLI authentication...'));
            console.log(chalk.yellow('Follow the prompts in your terminal to complete authentication.'));
            console.log();

            try {
              execSync('gh auth login', { stdio: 'inherit' });

              // Re-check authentication after login
              const finalStatus = await checkGitHubCLI();
              if (finalStatus.authenticated) {
                console.log();
                console.log(chalk.green('✅ GitHub CLI authentication successful!'));

                const { useAutomationAfterAuth } = await inquirer.prompt([
                  {
                    type: 'confirm',
                    name: 'useAutomationAfterAuth',
                    message: 'Create repositories automatically now?',
                    default: true
                  }
                ]);

                if (useAutomationAfterAuth) {
                  return await createRepositoriesAutomatically(config);
                }
              } else {
                console.log(chalk.yellow('⚠️  Authentication may not have completed successfully.'));
                console.log(chalk.yellow('For now, we\'ll continue with manual setup.'));
              }
            } catch (error) {
              console.log(chalk.yellow('⚠️  GitHub CLI authentication failed or was cancelled.'));
              console.log(chalk.yellow('For now, we\'ll continue with manual setup.'));
            }
          } else {
            console.log(chalk.yellow('You can authenticate later with: gh auth login'));
            console.log();

            const { nextStep } = await inquirer.prompt([
              {
                type: 'list',
                name: 'nextStep',
                message: 'What would you like to do?',
                choices: [
                  { name: '🔄 Retry GitHub setup (check CLI status again)', value: 'retry' },
                  { name: '🌐 Continue with manual setup', value: 'manual' }
                ]
              }
            ]);

            if (nextStep === 'retry') {
              console.log();
              return await guideGitHubSetup(config);
            }
          }
        } else {
          console.log(chalk.yellow('⚠️  GitHub CLI not detected'));
          console.log(chalk.yellow('Please ensure installation completed successfully'));
          console.log(chalk.yellow('For now, we\'ll continue with manual setup.'));
        }
      } else {
        console.log(chalk.yellow('For now, we\'ll continue with manual setup.'));
      }
      console.log();
    }
  }

  // Manual setup fallback
  return await guideManualRepositorySetup(config);
}

/**
 * Check GitHub CLI availability and authentication status
 */
async function checkGitHubCLI() {
  let available = false;
  let authenticated = false;

  // Check if GitHub CLI is installed
  try {
    execSync('gh --version', { stdio: 'pipe' });
    available = true;
  } catch (error) {
    return { available: false, authenticated: false };
  }

  // Check if user is authenticated
  try {
    const authStatus = execSync('gh auth status', { stdio: 'pipe', encoding: 'utf8' });
    // If gh auth status succeeds and doesn't contain "not logged in", user is authenticated
    authenticated = !authStatus.toLowerCase().includes('not logged in') &&
                   !authStatus.toLowerCase().includes('not authenticated');
  } catch (error) {
    // gh auth status exits with non-zero code when not authenticated
    authenticated = false;
  }

  return { available, authenticated };
}

/**
 * Create repositories automatically using GitHub CLI
 */
async function createRepositoriesAutomatically(config) {
  console.log(chalk.blue('🚀 Creating repositories automatically...'));

  // Defensive programming - ensure required config values exist
  if (!config.dlpName || !config.githubUsername) {
    console.error(chalk.red('❌ Missing required configuration:'));
    if (!config.dlpName) console.error('  • dlpName is required');
    if (!config.githubUsername) console.error('  • githubUsername is required');
    throw new Error('Missing required configuration for repository creation');
  }

  const repos = [
    {
      name: `${config.dlpName.toLowerCase().replace(/\s+/g, '-')}-proof`,
      description: `Proof of Contribution for ${config.dlpName} DataDAO`,
      template: 'vana-com/vana-satya-proof-template-py'
    },
    {
      name: `${config.dlpName.toLowerCase().replace(/\s+/g, '-')}-refiner`,
      description: `Data Refinement for ${config.dlpName} DataDAO`,
      template: 'vana-com/vana-data-refinement-template'
    }
  ];

  const createdRepos = [];

  for (const repo of repos) {
    try {
      console.log(chalk.blue(`Creating ${repo.name}...`));

      // Check if repo already exists
      try {
        execSync(`gh repo view ${config.githubUsername}/${repo.name}`, { stdio: 'pipe' });
        console.log(chalk.yellow(`⚠️  Repository ${repo.name} already exists, skipping...`));
        createdRepos.push(`https://github.com/${config.githubUsername}/${repo.name}`);
        continue;
      } catch (error) {
        // Repo doesn't exist, proceed with creation
      }

      // Create repository from template
      execSync(`gh repo create ${repo.name} --template ${repo.template} --public --description "${repo.description}"`, { stdio: 'pipe' });

      // Enable GitHub Actions
      execSync(`gh api repos/${config.githubUsername}/${repo.name}/actions/permissions --method PUT --field enabled=true --field allowed_actions=all`, { stdio: 'pipe' });

      const repoUrl = `https://github.com/${config.githubUsername}/${repo.name}`;
      createdRepos.push(repoUrl);
      console.log(chalk.green(`✅ Created: ${repoUrl}`));

    } catch (error) {
      console.log(chalk.red(`❌ Failed to create ${repo.name}: ${error.message}`));

      // Provide specific guidance based on error type
      if (error.message.includes('authentication') || error.message.includes('401') || error.message.includes('403')) {
        console.log(chalk.yellow('💡 This appears to be an authentication issue.'));
        console.log(chalk.yellow('Try running: gh auth login'));
      } else if (error.message.includes('already exists')) {
        console.log(chalk.yellow('💡 Repository already exists. You can continue with manual setup.'));
      } else if (error.message.includes('rate limit')) {
        console.log(chalk.yellow('💡 GitHub API rate limit reached. Please wait a few minutes and try again.'));
      } else {
        console.log(chalk.yellow('💡 You can create this repository manually later.'));
      }
    }
  }

  if (createdRepos.length > 0) {
  console.log();
    console.log(chalk.green('🎉 Repositories created successfully!'));
  console.log();
    console.log(chalk.blue('📋 Your repositories:'));
    createdRepos.forEach(url => console.log(`  ${url}`));
  console.log();

    return {
      proofRepo: createdRepos[0],
      refinerRepo: createdRepos[1],
      automated: true
    };
  } else {
    console.log(chalk.yellow('⚠️  No repositories were created automatically.'));
    console.log(chalk.yellow('This might be due to authentication issues or other GitHub API problems.'));
  console.log();
    console.log(chalk.blue('💡 Troubleshooting:'));
    console.log('• Check authentication: ' + chalk.cyan('gh auth status'));
    console.log('• Re-authenticate if needed: ' + chalk.cyan('gh auth login'));
    console.log('• Or continue with manual setup below');
    console.log();
    return await guideManualRepositorySetup(config);
  }
}

/**
 * Guide manual repository setup
 */
async function guideManualRepositorySetup(config) {
  console.log(chalk.blue('📝 Manual Repository Setup'));
  console.log();
  console.log('Please create these repositories on GitHub:');
  console.log();

  // Defensive programming - ensure required config values exist
  if (!config.dlpName || !config.githubUsername) {
    console.error(chalk.red('❌ Missing required configuration:'));
    if (!config.dlpName) console.error('  • dlpName is required');
    if (!config.githubUsername) console.error('  • githubUsername is required');
    throw new Error('Missing required configuration for repository setup');
  }

  const suggestedNames = {
    proof: `${config.dlpName.toLowerCase().replace(/\s+/g, '-')}-proof`,
    refiner: `${config.dlpName.toLowerCase().replace(/\s+/g, '-')}-refiner`
  };

  console.log(chalk.yellow('1. Proof of Contribution Repository:'));
  console.log(`   a) Go to: https://github.com/vana-com/vana-satya-proof-template-py`);
  console.log(`   b) Click "Use this template" → "Create a new repository"`);
  console.log(`   c) Name: ${suggestedNames.proof}`);
  console.log(`   d) Make it Public`);
  console.log(`   e) Click "Create repository"`);
  console.log(`   f) Go to Settings → Actions → General`);
  console.log(`   g) Enable "Allow all actions and reusable workflows"`);
  console.log();

  console.log(chalk.yellow('2. Data Refinement Repository:'));
  console.log(`   a) Go to: https://github.com/vana-com/vana-data-refinement-template`);
  console.log(`   b) Click "Use this template" → "Create a new repository"`);
  console.log(`   c) Name: ${suggestedNames.refiner}`);
  console.log(`   d) Make it Public`);
  console.log(`   e) Click "Create repository"`);
  console.log(`   f) Go to Settings → Actions → General`);
  console.log(`   g) Enable "Allow all actions and reusable workflows"`);
  console.log();

  const { proofRepo, refinerRepo } = await inquirer.prompt([
    {
      type: 'input',
      name: 'proofRepo',
      message: 'Enter the URL of your Proof repository:',
      default: `https://github.com/${config.githubUsername}/${suggestedNames.proof}`,
      validate: (input) => {
        if (!input.includes('github.com')) return 'Please enter a valid GitHub URL';
        return true;
      }
    },
    {
      type: 'input',
      name: 'refinerRepo',
      message: 'Enter the URL of your Refiner repository:',
      default: `https://github.com/${config.githubUsername}/${suggestedNames.refiner}`,
      validate: (input) => {
        if (!input.includes('github.com')) return 'Please enter a valid GitHub URL';
        return true;
      }
    }
  ]);

  return {
    proofRepo,
    refinerRepo,
    automated: false
  };
}

module.exports = {
  generateTemplate,
  guideNextSteps,
  guideGitHubSetup,
  checkGitHubCLI,
  createRepositoriesAutomatically,
  guideManualRepositorySetup
};